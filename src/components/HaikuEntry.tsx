import { useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, Shield, Copy, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { GlassCard } from './GlassCard';
import { getHaikuUrl, verifyReceipt } from '../lib/irys';
import type { HaikuData } from '../lib/types';

interface HaikuEntryProps {
  haiku: HaikuData;
}

export function HaikuEntry({ haiku }: HaikuEntryProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isCopied, setCopied] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const valid = await verifyReceipt(haiku.id);
      setIsVerified(valid);
    } catch (error) {
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getHaikuUrl(haiku.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="hover:border-irys-cyan/50">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm text-gray-400 mb-1">
              Topic: {haiku.topic}
            </p>
            <pre className="font-mono text-white whitespace-pre-wrap">
              {haiku.text}
            </pre>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {format(new Date(haiku.timestamp), 'MMM d, yyyy HH:mm')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="p-1 hover:text-irys-cyan transition-colors"
              title="Copy link"
            >
              {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
            <a
              href={getHaikuUrl(haiku.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:text-irys-cyan transition-colors"
              title="View on Irys"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={handleVerify}
              className={clsx(
                'p-1 transition-colors',
                isVerified === true && 'text-green-400',
                isVerified === false && 'text-red-400',
                isVerified === null && 'hover:text-irys-cyan'
              )}
              title="Verify on blockchain"
              disabled={isVerifying}
            >
              <Shield size={16} className={isVerifying ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}