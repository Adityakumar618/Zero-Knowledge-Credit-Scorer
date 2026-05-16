import { useState } from 'react';
import { Building2, User, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import type { FinancialData } from '../types';

interface ExtractedDataViewProps {
  financialData: FinancialData;
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-zinc-400 uppercase tracking-wider">{label}</span>
        <span className="text-white">{value}<span className="text-zinc-600">/{max}</span></span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ExtractedDataView({ financialData: d }: ExtractedDataViewProps) {
  const [visible, setVisible] = useState(false);

  const totalMonthlyIn  = d.months?.reduce((s, m) => s + m.income, 0) ?? d.monthlyIncome ?? 0;
  const totalMonthlyOut = d.months?.reduce((s, m) => s + m.expenses + m.debt_payment, 0) ?? d.monthlyExpenses ?? 0;

  return (
    <div className="border-t border-zinc-800/60 mx-6 mb-10">
      {/* Header with toggle */}
      <div className="flex items-center gap-4 py-6">
        <div className="h-px bg-zinc-800 flex-1" />
        <div className="flex items-center gap-3">
          <Lock className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Private Statement Data</span>
          <button
            onClick={() => setVisible(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all text-[10px] font-semibold text-zinc-400 hover:text-indigo-400"
          >
            {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="h-px bg-zinc-800 flex-1" />
      </div>

      {/* Privacy notice */}
      {!visible && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 mb-6">
          <Lock className="w-6 h-6 text-zinc-600" />
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-400">Only you can see this data</p>
            <p className="text-[10px] text-zinc-600 max-w-xs">
              Your extracted financial details stay on this device. Nothing is sent to the network — only the ZK proof is.
            </p>
          </div>
          <button
            onClick={() => setVisible(true)}
            className="mt-1 px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3 h-3" /> View extracted data
          </button>
        </div>
      )}

      {visible && (<>

      {/* Account info row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <User className="w-3.5 h-3.5" />,      label: 'Account Holder', value: d.account_holder ?? '—' },
          { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Bank',           value: d.bank           ?? '—' },
          { icon: <span className="font-mono text-[10px] font-bold">#</span>, label: 'Account No.', value: d.user_id ?? '—' },
          { icon: <Calendar className="w-3.5 h-3.5" />,  label: 'Period',         value: d.period         ?? '—' },
        ].map(({ icon, label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-500">{icon}<span className="text-[9px] uppercase tracking-widest">{label}</span></div>
            <p className="text-xs text-white font-mono truncate" title={value}>{value}</p>
          </div>
        ))}
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Beginning Balance', value: d.beginning_balance, color: 'text-zinc-300' },
          { label: 'Average Balance',   value: d.average_balance,   color: 'text-indigo-400' },
          { label: 'Ending Balance',    value: d.ending_balance,    color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-lg font-bold font-mono ${color}`}>
              {value != null ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly breakdown table */}
        {d.months && d.months.length > 0 && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Monthly Breakdown</p>
            </div>
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="px-4 py-2 text-left text-zinc-500 font-normal">Month</th>
                  <th className="px-4 py-2 text-right text-green-500/70 font-normal">Income</th>
                  <th className="px-4 py-2 text-right text-red-400/70 font-normal">Expenses</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-normal">Net</th>
                </tr>
              </thead>
              <tbody>
                {d.months.map((m, i) => {
                  const net = m.income - m.expenses - m.debt_payment;
                  return (
                    <tr key={i} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-2.5 text-zinc-300">{m.month}</td>
                      <td className="px-4 py-2.5 text-right text-green-400">${m.income.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-red-400">${(m.expenses + m.debt_payment).toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${net >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                        {net >= 0 ? '+' : ''}{net.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Right column: totals + score breakdown */}
        <div className="space-y-3">
          {/* Totals */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Statement Totals</p>
            </div>
            <div className="p-4 space-y-2.5 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-500" /><span className="text-zinc-400">Total Credits</span></div>
                <span className="text-green-400">${(d.total_credits ?? totalMonthlyIn).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-red-400" /><span className="text-zinc-400">Total Debits</span></div>
                <span className="text-red-400">${(d.total_debits ?? totalMonthlyOut).toLocaleString()}</span>
              </div>
              {(d.service_charges ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Service Charges</span>
                  <span className="text-zinc-300">${d.service_charges!.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  {d.latePayments > 0
                    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  <span className="text-zinc-400">Late Payments</span>
                </div>
                <span className={d.latePayments > 0 ? 'text-amber-400 font-bold' : 'text-green-400'}>{d.latePayments}</span>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Score Inputs</p>
            </div>
            <div className="p-4 space-y-4">
              <ScoreBar label="Payment History" value={d.scoreBreakdown.payment_history} max={35} color="bg-indigo-500" />
              <ScoreBar label="Debt Ratio"      value={d.scoreBreakdown.debt_ratio}      max={30} color="bg-violet-500" />
              <ScoreBar label="Avg Balance"     value={d.scoreBreakdown.average_balance} max={35} color="bg-cyan-500" />
              <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Computed Score</span>
                <span className={`text-2xl font-bold font-mono ${d.creditScore >= 700 ? 'text-indigo-400' : d.creditScore >= 600 ? 'text-amber-400' : 'text-red-400'}`}>
                  {d.creditScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
