import { Wallet, CheckCircle2, Loader2, XCircle, ExternalLink, LogOut } from 'lucide-react';
import type { WalletState } from '../hooks/useWallet';

type Props = Pick<WalletState, 'address' | 'walletName' | 'isConnected' | 'isConnecting' | 'error' | 'connect' | 'disconnect'>;

export function WalletConnect({ address, walletName, isConnected, isConnecting, error, connect, disconnect }: Props) {
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Left — brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-xs text-zinc-400">
            MIDNIGHT NODE: <span className="text-green-500 font-bold">PREPROD</span>
          </span>
        </div>
      </div>

      {/* Right — wallet state */}
      <div className="flex items-center gap-3">
        {/* Error toast */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 max-w-xs">
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-[10px] text-red-400 leading-tight">{error}</p>
            {error.includes('detected') && (
              <a
                href="https://1am.xyz"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex-shrink-0 flex items-center gap-0.5"
              >
                Get it <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        )}

        {isConnected && address ? (
          <div className="flex items-center gap-2">
            {/* Address pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <div className="flex flex-col">
                {walletName && (
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider leading-none mb-0.5">{walletName}</span>
                )}
                <span className="text-xs font-mono text-zinc-300" title={address}>
                  {truncate(address)}
                </span>
              </div>
            </div>
            {/* Disconnect */}
            <button
              onClick={disconnect}
              title="Disconnect"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Connect 1AM Wallet
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
