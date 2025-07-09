export interface HaikuData {
  id: string;
  text: string;
  topic: string;
  timestamp: number;
  author: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string;
}

export interface IrysReceipt {
  id: string;
  timestamp: number;
  version: string;
  signature: string;
}