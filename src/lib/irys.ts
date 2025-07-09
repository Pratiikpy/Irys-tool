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
    const network = IRYS_NETWORK;
    
    const uploader = WebUploader(WebEthereum)
      .withAdapter(EthersV6Adapter(provider))
      .withRpc(IRYS_RPC_URL);
    
    // Apply network selection
    if (network === "devnet") {
      irysInstance = await uploader.devnet();
    } else if (network === "mainnet") {
      irysInstance = await uploader.mainnet();
    } else {
      throw new Error(`Unknown network: ${network}`);
    }
    
    await irysInstance.ready();
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
    return irys.utils.fromAtomic(balance).toString();
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

export async function fundWallet(amount: number) {
  const irys = await getIrys();
  const atomicAmount = irys.utils.toAtomic(amount);
  const fundTx = await irys.fund(atomicAmount);
  return fundTx;
}

export async function saveHaiku(
  haikuText: string, 
  topic: string
): Promise<{ id: string; timestamp: number }> {
  const irys = await getIrys();
  
  const tags = [
    { name: "application-id", value: APP_NAME },
    { name: "user", value: irys.address },
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
    author: irys.address,
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
    // First try to query from Irys using GraphQL
    const query = `
      query {
        transactions(
          tags: [
            { name: "application-id", values: ["${APP_NAME}"] }
            { name: "user", values: ["${walletAddress}"] }
          ]
          sort: HEIGHT_DESC
          first: 50
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) throw new Error('GraphQL query failed');
    
    const result = await response.json();
    const edges = result.data?.transactions?.edges || [];
    
    const haikus = await Promise.all(
      edges.map(async ({ node }: any) => {
        try {
          const textResponse = await fetch(`${IRYS_GATEWAY}/${node.id}`);
          const text = await textResponse.text();
          
          const topicTag = node.tags.find((t: any) => t.name === 'topic');
          const timestampTag = node.tags.find((t: any) => t.name === 'timestamp');
          
          return {
            id: node.id,
            text,
            topic: topicTag?.value || 'Unknown',
            timestamp: timestampTag ? Number(timestampTag.value) : Date.now(),
            author: walletAddress,
          };
        } catch (error) {
          console.error(`Failed to fetch haiku ${node.id}:`, error);
          return null;
        }
      })
    );
    
    return haikus.filter(Boolean) as HaikuData[];
  } catch (error) {
    console.error("Failed to query from blockchain:", error);
    // Fallback to cache
    const cached = JSON.parse(localStorage.getItem('haiku-cache') || '[]');
    return cached.filter((h: HaikuData) => h.author === walletAddress);
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
    return irys.token || "IRYS";
  } catch {
    return "IRYS";
  }
}