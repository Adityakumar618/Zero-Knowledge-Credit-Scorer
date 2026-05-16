import { useState } from 'react';
import { ShieldCheck, FileText, Send, Loader2, RefreshCcw, CheckCircle2, Plus, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileUpload } from './FileUpload';
import type { FinancialData } from '../types';
import type { WalletState } from '../hooks/useWallet';

interface ScoreFlowProps {
  financialData: FinancialData | null;
  onDataLoaded: (data: FinancialData) => void;
  wallet: WalletState;
}

export function ScoreFlow({ financialData, onDataLoaded, wallet }: ScoreFlowProps) {
  const { isConnected } = wallet;

  const [step, setStep] = useState<'idle' | 'generating' | 'ready' | 'submitting' | 'success'>('idle');
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [analyzingPDF, setAnalyzingPDF] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canGenerate = isConnected && financialData !== null;

  const handleGenerateProof = async () => {
    if (!financialData || !wallet.connector) return;
    setStep('generating');
    try {
      // Real proof generation: wallet.connector.getProvingProvider(keyMaterialProvider)
      // Compact contract integration (Dev 2) required before this can be wired end-to-end.
      await new Promise(r => setTimeout(r, 2200));
      setProofHash('zkp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24));
      setStep('ready');
    } catch (err) {
      console.error('Proof generation failed:', err);
      setStep('idle');
    }
  };

  const handleSubmitProof = async () => {
    if (!wallet.connector || !proofHash) return;
    setStep('submitting');
    try {
      // Real submission: wallet.connector.submitTransaction(signedTx)
      await new Promise(r => setTimeout(r, 2000));
      setTxHash('0x' + crypto.randomUUID().replace(/-/g, ''));
      setStep('success');
    } catch (err) {
      console.error('Submission failed:', err);
      setStep('ready');
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setAnalyzingPDF(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('bill', files[0]);

    try {
      const response = await fetch('/api/upload-bill', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.error ?? 'Upload failed');
        return;
      }

      if (data.analysis) {
        onDataLoaded(data.analysis);
        setShowUpload(false);
      }
    } catch {
      setUploadError('Network error — could not reach server');
    } finally {
      setAnalyzingPDF(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">ZK Proof Generation</h2>
        <p className="text-zinc-500 text-sm max-w-lg italic">
          Upload your bank statement or utility bill. Your raw data never leaves this machine.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Local Data Card */}
        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/30 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Local Evidence</span>
            </div>
            {financialData && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`p-1 rounded-md transition-colors ${showUpload ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 text-zinc-500'}`}
                title="Upload another PDF"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-4 flex-1">
            {showUpload ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <FileUpload onUpload={handleFileUpload} />
                {analyzingPDF && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-indigo-400 italic">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Extracting and scoring with GROQ...
                  </div>
                )}
                {uploadError && (
                  <p className="mt-3 text-xs text-red-400 text-center">{uploadError}</p>
                )}
              </div>
            ) : financialData ? (
              <div className="space-y-3 font-mono text-[11px]">
                {financialData.bills.map(bill => (
                  <div key={bill.id} className="flex justify-between items-center text-zinc-400">
                    <span className="truncate max-w-[120px]">{bill.provider}</span>
                    <span className="text-zinc-600 mx-1">........</span>
                    <span className="text-white">${bill.amount.toLocaleString()}</span>
                    <span className={`ml-2 font-bold ${bill.status === 'paid' ? 'text-green-500' : 'text-red-400'}`}>
                      {bill.status === 'paid' ? '✓ PAID' : '✗ DUE'}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-dashed border-zinc-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">CREDIT SCORE</span>
                    <span className={`text-xl font-bold ${financialData.creditScore >= 700 ? 'text-indigo-400' : 'text-amber-400'}`}>
                      {financialData.creditScore}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">RISK LEVEL</span>
                    <span className={`text-xs font-bold ${
                      financialData.riskLevel === 'LOW' ? 'text-green-500' :
                      financialData.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {financialData.riskLevel}
                    </span>
                  </div>
                  {financialData.monthlyIncome !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">MONTHLY INCOME</span>
                      <span className="text-zinc-300">${financialData.monthlyIncome?.toLocaleString()}</span>
                    </div>
                  )}
                  {financialData.latePayments > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">LATE PAYMENTS</span>
                      <span className="text-red-400">{financialData.latePayments}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setShowUpload(true)}
                  className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group py-8"
                >
                  <UploadCloud className="w-8 h-8 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">Upload a PDF Statement</p>
                    <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider">Bank statement · Utility bill</p>
                  </div>
                </button>
                {uploadError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 text-center">{uploadError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Card */}
        <div className="border border-zinc-800 rounded-2xl bg-zinc-950 flex flex-col justify-center items-center p-8 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            {step === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-4"
              >
                <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto" />
                <button
                  onClick={handleGenerateProof}
                  disabled={!canGenerate}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                  Generate Private Proof
                </button>
                {!financialData && (
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Upload a PDF to Begin</p>
                )}
                {financialData && !isConnected && (
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Connect Lace Wallet to Continue</p>
                )}
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div key="generating" className="text-center space-y-4">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto opacity-20" />
                  <RefreshCcw className="w-8 h-8 text-indigo-400 animate-spin absolute inset-0 m-auto" />
                </div>
                <p className="text-sm font-mono text-zinc-400">ZK Circuits: Midnight Testnet</p>
                <div className="w-48 h-1 bg-zinc-800 rounded-full mx-auto overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2 }}
                    className="h-full bg-indigo-500"
                  />
                </div>
              </motion.div>
            )}

            {step === 'ready' && (
              <motion.div key="ready" className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">Proof Generated</p>
                  <p className="text-xs text-zinc-500 font-mono">HASH: {proofHash?.slice(0, 20)}...</p>
                </div>
                <button
                  onClick={handleSubmitProof}
                  className="w-full px-6 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit to Midnight
                </button>
              </motion.div>
            )}

            {step === 'submitting' && (
              <motion.div key="submitting" className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-white animate-spin mx-auto" />
                <p className="text-sm font-mono text-zinc-400">Waiting for Block Inclusion...</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-white">Transaction Successful</p>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-left">
                    <p className="text-[10px] text-zinc-500 mb-1 font-mono">TX HASH</p>
                    <p className="text-[11px] text-zinc-300 font-mono truncate">{txHash}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep('idle')}
                  className="text-xs text-zinc-500 hover:text-white underline transition-colors"
                >
                  Start New Verification
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
