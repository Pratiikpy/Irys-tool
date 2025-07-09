import { WebUploader } from "@irys/web-upload";
import { WebIrys } from "@irys/web-upload-irys";
import { EthersV5Adapter } from "@irys/web-upload-irys-ethers-v5";
import { ethers } from "ethers";
import { IRYS_GATEWAY, IRYS_RPC_URL, IRYS_NETWORK, APP_NAME } from "./constants";
import type { HaikuData, IrysReceipt } from "./types";

let irysInstance: any = null;

export async function getIrys() {
  if (!irysInstance) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed!");
    }

    // Use ethers v5 for compatibility with IRYS adapter
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Configure for IRYS token
    const uploader = WebUploader(WebIrys)
      .withAdapter(EthersV5Adapter(provider))
      .withRpc(IRYS_RPC_URL);
    
    // For IRYS testnet, use mainnet() method
    irysInstance = await uploader.mainnet();
    
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
    console.log("Irys instance:", irys);  // Debug log
    const balance = await irys.getLoadedBalance();
    console.log("Raw balance:", balance);  // Debug log
    const formatted = irys.utils.fromAtomic(balance).toString();
    console.log("Formatted balance:", formatted);  // Debug log
    return formatted;
  } catch (error) {
    console.error("DETAILED Error getting balance:", error);
    // Don't just return "0" - show the actual error
    throw error;  
  }
}

export async function fundWallet(amount: number) {
  const irys = await getIrys();
  
  try {
    // Convert to atomic units
    const atomicAmount = irys.utils.toAtomic(amount);
    console.log(`Funding with ${amount} IRYS (${atomicAmount} atomic units)`);
    
    const fundTx = await irys.fund(atomicAmount);
    console.log("Fund transaction successful:", fundTx);
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
