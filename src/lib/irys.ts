import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { BrowserProvider } from "ethers";
import { IRYS_GATEWAY, IRYS_RPC_URL, IRYS_NETWORK, APP_NAME } from "./constants";
import type { HaikuData, IrysReceipt } from "./types";

let irysInstance: any = null;

export async function getIrys() {
  if (!irysInstance) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed!");
    }

    const provider = new BrowserProvider(window.ethereum);
    
    // Create uploader - IMPORTANT: this will use the native token of the network
    const uploader = WebUploader(WebEthereum)
      .withAdapter(EthersV6Adapter(provider))
      .withRpc(IRYS_RPC_URL);
    
    // Use mainnet() for Irys testnet
    irysInstance = await uploader.mainnet();
    
    // The key is that when connected to Irys network (chain 1270),
    // it should automatically use IRYS tokens
    await irysInstance.ready();
    
    console.log("Connected to Irys with token:", irysInstance.token);
  }
  return irysInstance;
}

export async function connectWallet() {
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  return accounts[0];
}

export async function getBalance(): Promise<string> {
  try {
    const irys = await getIrys();
    const balance = await irys.getLoadedBalance();
    const formatted = irys.utils.fromAtomic(balance).toString();
    return formatted;
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

export async function fundWallet(amount: number) {
  const irys = await getIrys();
  
  try {
    const atomicAmount = irys.utils.toAtomic(amount);
    console.log(`Funding with ${amount} ${irys.token} (${atomicAmount} atomic units)`);
    
    const fundTx = await irys.fund(atomicAmount);
    console.log("Fund transaction successful:", fundTx);
    return fundTx;
  } catch (error) {
    console.error("Funding error:", error);
    throw error;
  }
}

export async function saveHaiku(
  haikuText: string, 
  topic: string,
  author: string
): Promise<{ id: string; timestamp: number }> {
  const irys = await getIrys();
  
  const tags = [
    { name: "application-id", value: APP_NAME },
    { name: "user", value: author },
    { name: "topic", value: topic },
    { name: "content-type", value: "text/plain" },
    { name: "timestamp", value: Date.now().toString() },
  ];
  
  const receipt = await irys.upload(haikuText, { tags });
  
  // Store receipt for verification
  const receipts = JSON.parse(
    localStorage.getItem('haiku-receipts') || '{}'
  );
  receipts[receipt.id] = receipt;
  localStorage.setItem('haiku-receipts', JSON.stringify(receipts));
  
  // Also cache locally for quick access
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
}

export async function listUserHaiku(
  walletAddress: string
): Promise<HaikuData[]> {
  try {
    // For now, return from cache
    // TODO: Implement proper GraphQL query when Irys indexing is available
    const cached = JSON.parse(localStorage.getItem('haiku-cache') || '[]');
    return cached.filter((h: HaikuData) => h.author === walletAddress);
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
    
    // Fallback: check if exists
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
  try {
    const irys = await getIrys();
    // When on Irys network, this should return "IRYS"
    // The SDK should detect the network and use the appropriate token
    return "IRYS"; // Force IRYS for now
  } catch {
    return "IRYS";
  }
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
