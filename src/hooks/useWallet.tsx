import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectWallet, getBalance, getTokenSymbol } from '../lib/irys';
import type { WalletState } from '../lib/types';

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  tokenSymbol: string;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: '0',
  });
  const [tokenSymbol, setTokenSymbol] = useState('IRYS');

  const connect = async () => {
    try {
      const address = await connectWallet();
      const balance = await getBalance();
      const symbol = await getTokenSymbol();
      
      setState({
        isConnected: true,
        address,
        balance,
      });
      setTokenSymbol(symbol);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setState({
      isConnected: false,
      address: null,
      balance: '0',
    });
  };

  const refreshBalance = async () => {
    if (state.isConnected) {
      const balance = await getBalance();
      setState(prev => ({ ...prev, balance }));
    }
  };

  useEffect(() => {
    // Check if already connected
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connect();
          }
        });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ 
      ...state, 
      connect, 
      disconnect, 
      tokenSymbol,
      refreshBalance 
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}