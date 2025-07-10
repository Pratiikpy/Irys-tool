import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { BrowserProvider } from "ethers";
import { IRYS_GATEWAY, IRYS_RPC_URL, IRYS_NETWORK, APP_NAME } from "./constants";
import type { HaikuData, IrysReceipt } from "./types";

let irysInstance: any = null;

// Custom configuration for IRYS testnet
const IRYS_TESTNET_CONFIG = {
  url: "https://testnet.irys.xyz",
  token: "irys",
  providerUrl: IRYS_RPC_URL,
};

export async function getIrys() {
  if (!irysInstance) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed!");
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      
      // Get the network to confirm we're on Irys testnet
      const network = await provider.getNetwork();
      console.log("Connected to network:", network.chainId);
      
      if (network.chainId !== 1270n) {
        throw new Error("Please switch to Irys Testnet (Chain ID: 1270) in MetaMask");
      }
      
      // Create uploader instance
      const uploader = WebUploader(WebEthereum)
        .withAdapter(EthersV6Adapter(provider))
        .withRpc(IRYS_RPC_URL);
      
      // Use mainnet() for Irys testnet (this is correct according to docs)
      irysInstance = await uploader.mainnet();
      
      await irysInstance.ready();
      
      // Log configuration
      console.log("Irys instance created:", {
        address: irysInstance.address,
        token: irysInstance.token,
        url: irysInstance.url,
      });
      
    } catch (error) {
      console.error("Failed to initialize Irys:", error);
      throw error;
    }
  }
  return irysInstance;
}

export async function connectWallet() {
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  // Also request chain switch if needed
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x4F6' }], // 1270 in hex
    });
  } catch (error) {
    console.log("Already on correct chain or user rejected");
  }
  
  return accounts[0];
}

export async function getBalance(): Promise<string> {
  try {
    const irys = await getIrys();
    
    // Get the bundler balance (loaded balance)
    const balanceAtomic = await irys.getLoadedBalance();
    const balance = irys.utils.fromAtomic(balanceAtomic);
    
    console.log("Bundler balance:", {
      atomic: balanceAtomic.toString(),
      human: balance.toString(),
      address: irys.address
    });
    
    return balance.toString();
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

export async function fundWallet(amount: number) {
  const irys = await getIrys();
  
  try {
    console.log("Starting fund process for", amount, "tokens");
    
    // Convert to atomic units
    const atomicAmount = irys.utils.toAtomic(amount);
    console.log("Atomic amount:", atomicAmount.toString());
    
    // Fund the bundler
    const fundTx = await irys.fund(atomicAmount);
    console.log("Fund transaction result:", fundTx);
    
    // Wait for confirmation
    console.log("Waiting for funding confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    // Check new balance
    const newBalance = await getBalance();
    console.log("New balance after funding:", newBalance);
    
    if (parseFloat(newBalance) === 0) {
      throw new Error("Funding may have failed - balance still shows 0. Please try again.");
    }
    
    return fundTx;
  } catch (error) {
    console.error("Detailed funding error:", error);
    throw error;
  }
}

export async function saveHaiku(
  haikuText: string, 
  topic: string,
  author: string
): Promise<{ id: string; timestamp: number }> {
  const irys = await getIrys();
  
  // Check balance before uploading
  const currentBalance = await getBalance();
  console.log("Current balance before upload:", currentBalance);
  
  if (parseFloat(currentBalance) < 0.0001) {
    throw new Error("Insufficient bundler balance. Please fund your account first.");
  }
  
  const tags = [
    { name: "application-id", value: APP_NAME },
    { name: "user", value: author },
    { name: "topic", value: topic },
    { name: "content-type", value: "text/plain" },
    { name: "timestamp", value: Date.now().toString() },
  ];
  
  try {
    console.log("Uploading haiku...");
    const receipt = await irys.upload(haikuText, { tags });
    console.log("Upload successful! Receipt:", receipt);
    
    // Store receipt for verification
    const receipts = JSON.parse(
      localStorage.getItem('haiku-receipts') || '{}'
    );
    receipts[receipt.id] = receipt;
    localStorage.setItem('haiku-receipts', JSON.stringify(receipts));
    
    // Also cache locally
    const newHaiku: HaikuData = {
      id: receipt.id,
      text: haikuText,
      topic,
      timestamp: Date.now(),
      author,
    };
    
    const cached = JSON.parse(
      localStorage.getItem('haiku-cache') || '[]'
    );
    cached.unshift(newHaiku);
    localStorage.setItem('haiku-cache', JSON.stringify(cached));
    
    return { id: receipt.id, timestamp: Date.now() };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export async function listUserHaiku(
  walletAddress: string
): Promise<HaikuData[]> {
  try {
    // Return from local cache for now
    const cached = JSON.parse(localStorage.getItem('haiku-cache') || '[]');
    return cached.filter((h: HaikuData) => 
      h.author.toLowerCase() === walletAddress.toLowerCase()
    );
  } catch (error) {
    console.error("Failed to list haikus:", error);
    return [];
  }
}

export async function verifyReceipt(transactionId: string): Promise<boolean> {
  try {
    const receipts = JSON.parse(
      localStorage.getItem('haiku-receipts') || '{}'
    );
    const receipt = receipts[transactionId];
    
    if (receipt) {
      const irys = await getIrys();
      return irys.utils.verifyReceipt(receipt);
    }
    
    // Check if exists on gateway
    const response = await fetch(`${IRYS_GATEWAY}/${transactionId}`, { 
      method: 'HEAD' 
    });
    return response.ok;
  } catch (error) {
    console.error("Verification failed:", error);
    return false;
  }
}

export function getHaikuUrl(id: string): string {
  return `${IRYS_GATEWAY}/${id}`;
}

export async function getTokenSymbol(): Promise<string> {
  // Force return IRYS for display purposes
  return "IRYS";
}

export async function generateHaiku(topic: string): Promise<string> {
  try {
    const response = await fetch('/api/generateHaiku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim() }),
    });

    if (!response.ok) throw new Error('Failed to generate haiku');
    
    const data = await response.json();
    return data.haiku;
  } catch (error) {
    console.error('Error generating haiku:', error);
    // Fallback haiku
    return `${topic} whispers soft\nNature's gentle melody\nPeace flows through my soul`;
  }
}
