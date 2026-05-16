import { Eye, EyeOff, Lock, Network, FileX } from 'lucide-react';
import type { FinancialData } from '../types';

interface PrivacyViewProps {
  financialData: FinancialData | null;
}

export function PrivacyView({ financialData }: PrivacyViewProps) {
  if (!financialData) {
    return (
      <div className="px-6 pb-12 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-px bg-zinc-800 flex-1" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Privacy Visualization</span>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-4 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/10">
          <FileX className="w-8 h-8 text-zinc-700" />
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">No PDF loaded — upload a statement to preview the privacy split</p>
        </div>
      </div>
    );
  }

  const scoreStrength = Math.round((financialData.creditScore - 300) / 550 * 10);

  return (
    <div className="px-6 pb-12 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-px bg-zinc-800 flex-1" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Privacy Visualization</span>
        <div className="h-px bg-zinc-800 flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* What You See */}
        <div className="space-y-4 group">
          <div className="flex items-center gap-2 text-indigo-400">
            <Eye className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">What You See (Local)</h3>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Score Strength</p>
                <div className="flex gap-1 h-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-full rounded-full ${i < scoreStrength ? 'bg-indigo-500/70' : 'bg-zinc-800'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Raw Score</p>
                <p className="text-lg font-bold text-white tabular-nums">{financialData.creditScore}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-zinc-500/10 space-y-2">
              <p className="text-[10px] text-zinc-500 font-mono"># STATEMENT_DATA</p>
              <p className="text-[11px] text-zinc-300 font-mono">BILLS: {financialData.bills.length} Records</p>
              <p className="text-[11px] text-zinc-300 font-mono">
                EXPENSES: ${financialData.monthlyExpenses.toLocaleString()}
              </p>
              <p className="text-[11px] font-mono">
                <span className="text-zinc-300">STATUS: </span>
                <span className={financialData.riskLevel === 'LOW' ? 'text-green-400' : financialData.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}>
                  {financialData.riskLevel} RISK
                </span>
              </p>
              {financialData.latePayments > 0 && (
                <p className="text-[11px] text-red-400 font-mono">LATE PAYMENTS: {financialData.latePayments}</p>
              )}
            </div>
          </div>
        </div>

        {/* What Blockchain Sees */}
        <div className="space-y-4 group">
          <div className="flex items-center gap-2 text-zinc-500">
            <EyeOff className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">What Blockchain Sees (Network)</h3>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-800 bg-indigo-950/20 border-indigo-500/20 group-hover:bg-indigo-950/30 transition-colors space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
              <Lock className="w-12 h-12" />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Encrypted Payload</p>
                <div className="flex gap-1 h-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-full rounded-full bg-indigo-400/40" />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-indigo-400/60 uppercase mb-1 font-bold">Score Check</p>
                <p className={`text-lg font-bold underline underline-offset-4 decoration-dotted ${financialData.creditScore >= 700 ? 'text-indigo-400' : 'text-amber-400'}`}>
                  {financialData.creditScore >= 700 ? 'PASS' : 'FAIL'}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-zinc-500/10 font-mono overflow-hidden">
              <p className="text-[10px] text-indigo-500/50 mb-2"># ZK_PROOF_BLOB</p>
              <div className="grid grid-cols-4 gap-1 opacity-40">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-2 bg-zinc-800 rounded-sm" />
                ))}
              </div>
              <p className="text-[10px] mt-4 text-zinc-600 truncate">
                SHA256: {Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
        <Network className="w-8 h-8 text-zinc-700 mb-4" />
        <p className="text-xs font-mono text-zinc-500 max-w-xs uppercase leading-relaxed">
          Data is processed within the <span className="text-indigo-400 font-bold">Compact Runtime</span>.
          Zero Knowledge Proof is transmitted as a witness without exposing scalars.
        </p>
      </div>
    </div>
  );
}
