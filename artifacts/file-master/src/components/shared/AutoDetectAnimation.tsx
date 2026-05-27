import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, ArrowRight, X } from 'lucide-react';

interface AutoDetectAnimationProps {
  fileName: string;
  detectedType: string;
  targetWorkspace: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AutoDetectAnimation: React.FC<AutoDetectAnimationProps> = ({
  fileName, detectedType, targetWorkspace, onConfirm, onCancel
}) => {
  const [step, setStep] = useState<'analyzing' | 'detected'>('analyzing');

  useEffect(() => {
    const timer = setTimeout(() => setStep('detected'), 1200);
    return () => clearTimeout(timer);
  }, []);

  const workspaceColors: Record<string, { bg: string; text: string; border: string; from: string; to: string; label: string }> = {
    pdf: { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', border: 'border-red-500/30', from: 'from-rose-500', to: 'to-red-600', label: 'PDF Document Suite' },
    image: { bg: 'bg-blue-500/10', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/30', from: 'from-blue-500', to: 'to-indigo-600', label: 'Image Laboratory' },
    video: { bg: 'bg-violet-500/10', text: 'text-violet-500 dark:text-violet-400', border: 'border-violet-500/30', from: 'from-violet-500', to: 'to-purple-600', label: 'Video Processing Studio' },
    office: { bg: 'bg-emerald-500/10', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/30', from: 'from-emerald-500', to: 'to-teal-600', label: 'Office & Text Suite' },
  };

  const wsMeta = workspaceColors[targetWorkspace] || { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', from: 'from-primary', to: 'to-ring', label: 'Standard Workspace' };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-premium relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${wsMeta.from} ${wsMeta.to}`} />
        <button onClick={onCancel} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all" aria-label="Cancel detection">
          <X className="h-4 w-4" />
        </button>
        <AnimatePresence mode="wait">
          {step === 'analyzing' ? (
            <motion.div key="analyzing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 py-4 flex flex-col items-center text-center">
              <div className="relative flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-16 h-16 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center" />
                <Search className="h-6 w-6 text-primary absolute" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-lg text-foreground">Reading Magic Bytes</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] truncate mx-auto">Verifying header signatures of <span className="font-semibold">{fileName}</span></p>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative">
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.2, ease: "easeInOut" }} className="h-full bg-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Inspecting structural metadata...</p>
            </motion.div>
          ) : (
            <motion.div key="detected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-4 flex flex-col">
              <div className="flex items-center space-x-4">
                <div className={`p-3.5 rounded-xl border ${wsMeta.bg} ${wsMeta.text} ${wsMeta.border} shrink-0`}>
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Signature Authenticated</span>
                  <h3 className="font-extrabold text-lg text-foreground leading-tight truncate">{detectedType} detected</h3>
                </div>
              </div>
              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-2 text-sm leading-relaxed">
                <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground uppercase"><span>Target Workspace</span></div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-foreground">{wsMeta.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${wsMeta.bg} ${wsMeta.text} ${wsMeta.border}`}>Direct Mode</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={onConfirm} className={`flex-1 py-3 px-4 bg-gradient-to-r ${wsMeta.from} ${wsMeta.to} text-white font-extrabold rounded-xl shadow-premium hover:scale-[1.02] transition-all flex items-center justify-center space-x-2`}>
                  <span>Enter Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onCancel} className="py-3 px-4 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-bold rounded-xl transition-all">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
