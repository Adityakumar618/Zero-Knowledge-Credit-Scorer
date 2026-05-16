import { useState } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { ScoreFlow } from './components/ScoreFlow';
import { PrivacyView } from './components/PrivacyView';
import { ExtractedDataView } from './components/ExtractedDataView';
import { Shield, Lock, Fingerprint, Database, Info } from 'lucide-react';
import { useWallet } from './hooks/useWallet';
import type { FinancialData } from './types';

export default function App() {
  const wallet = useWallet();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <WalletConnect
        address={wallet.address}
        walletName={wallet.walletName}
        isConnected={wallet.isConnected}
        isConnecting={wallet.isConnecting}
        error={wallet.error}
        connect={wallet.connect}
        disconnect={wallet.disconnect}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full pt-12 pb-24">
        <div className="px-6 mb-12 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mx-auto">
            <Shield className="w-3 h-3" />
            Midnight ZK Protocol
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            Privacy-Preserving <br />
            <span className="text-zinc-500">Credit Score Verification</span>
          </h1>
        </div>

        <section className="bg-zinc-900/10 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-600/5">
          <ScoreFlow financialData={financialData} onDataLoaded={setFinancialData} wallet={wallet} />
          {financialData && <ExtractedDataView financialData={financialData} />}
          <PrivacyView financialData={financialData} />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 mt-16">
          <FeatureCard
            icon={<Lock className="w-5 h-5" />}
            title="Encrypted Locally"
            description="Your financial data is processed on your machine. We never see your bank details."
          />
          <FeatureCard
            icon={<Fingerprint className="w-5 h-5" />}
            title="ZK Evidence"
            description="Generate succinct proofs that verify your eligibility without revealing scalars."
          />
          <FeatureCard
            icon={<Database className="w-5 h-5" />}
            title="Immutable Records"
            description="Proofs are anchored on the Midnight ledger for secure, trustless verification."
          />
        </div>

        <div className="mt-24 px-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-zinc-800">
              <Info className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Integration Status</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Wallet connection uses the real <span className="text-white font-mono">Lace</span> browser extension via{' '}
                <span className="text-white font-mono">window.midnight.mnLace</span>. ZK proof submission requires the
                Compact contract from Dev 2 — see{' '}
                <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">integration.md</code>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 border-t border-zinc-900 text-center">
        <p className="text-xs text-zinc-600 font-mono">MIDNIGHT NETWORK // ZERO KNOWLEDGE CREDIT SCORE // V0.1.0-ALPHA</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-zinc-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}
