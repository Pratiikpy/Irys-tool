import { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function NeonButton({ 
  children, 
  className, 
  variant = 'primary',
  isLoading = false,
  disabled,
  ...props 
}: NeonButtonProps) {
  return (
    <button
      className={clsx(
        'px-6 py-3 rounded-lg font-mono font-medium',
        'transition-all duration-300 transform hover:scale-105',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && [
          'bg-gradient-to-r from-irys-cyan to-cyan-400',
          'text-black hover:shadow-[0_0_20px_#00FFD1]',
          'animate-glow'
        ],
        variant === 'secondary' && [
          'bg-white/10 text-irys-cyan border border-irys-cyan/50',
          'hover:bg-irys-cyan/20 hover:border-irys-cyan'
        ],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
  <span className="flex items-center gap-2">
    <span className="animate-spin">⟳</span>
    Loading...
  </span>
) : children}
    </button>
  );
}
