import React from 'react';
import { m as motion } from 'framer-motion';
import { HardDriveUpload, Settings, Cpu, FileCheck, Loader2 } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';

const STEPS = [
  { threshold: 0,  label: 'Verifying integrity',   desc: 'Analyzing headers & magic-byte validation…',           icon: HardDriveUpload, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { threshold: 25, label: 'Initializing core',       desc: 'Parsing parameters and importing codec modules…',     icon: Settings,        color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  { threshold: 55, label: 'Processing file data',    desc: 'Applying transforms, encoding streams…',              icon: Cpu,             color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
  { threshold: 90, label: 'Wrapping up',             desc: 'Rebuilding containers & generating download link…',   icon: FileCheck,       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
];

export const ProgressTracker: React.FC = () => {
  const { progress, isProcessing } = useFileStore();
  if (!isProcessing) return null;

  const step = [...STEPS].reverse().find(s => progress >= s.threshold) || STEPS[0];
  const StepIcon = step.icon;
  const pct = Math.min(100, Math.round(progress));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-premium">
        {/* Top glow strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 animate-gradient-x" style={{ backgroundSize: '200% 100%' }} />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Processing your file…</h2>
                <p className="text-xs text-muted-foreground">Keep this tab open</p>
              </div>
            </div>
            <span className="text-2xl font-black tabular-nums gradient-text">{pct}%</span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="relative w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)', backgroundSize: '200% 100%' }}
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
              {/* Shimmer overlay */}
              <motion.div
                className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                animate={{ left: ['−10%', '110%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            {/* Step dots */}
            <div className="flex items-center justify-between px-0.5">
              {STEPS.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${progress >= s.threshold ? 'bg-primary scale-125' : 'bg-border'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Active step card */}
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-start gap-4 p-4 rounded-xl border ${step.bg}`}
          >
            <div className={`p-2 rounded-lg bg-card/80 border ${step.bg} shrink-0`}>
              <StepIcon className={`h-5 w-5 ${step.color}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${step.color}`}>{step.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressTracker;
