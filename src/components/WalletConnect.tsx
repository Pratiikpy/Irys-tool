import { Wallet } from 'lucide-react';
import { NeonButton } from './NeonButton';
import { useWallet } from '../hooks/useWallet';

export function WalletConnect() {
  const wallet = useWallet();

  if (wallet.isConnected) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-400">Connected</p>
          <p className="font-mono text-irys-cyan">
            {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
          </p>
          <p className="text-xs text-gray-500">
            Balance: {parseFloat(wallet.balance).toFixed(4)} {wallet.tokenSymbol}
          </p>
        </div>
        <NeonButton 
          variant="secondary" 
          onClick={wallet.disconnect}
          className="text-sm"
        >
          Disconnect
        </NeonButton>
      </div>
    );
  }

  return (
    <NeonButton onClick={wallet.connect}>
      <Wallet className="w-5 h-5 mr-2" />
      Connect MetaMask
    </NeonButton>
  );
}