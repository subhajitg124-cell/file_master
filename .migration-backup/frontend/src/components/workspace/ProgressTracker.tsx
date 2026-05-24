import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, HardDriveUpload, Settings, Cpu, FileCheck } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';

export const ProgressTracker: React.FC = () => {
  const { progress, isProcessing, selectedOperation } = useFileStore();

  if (!isProcessing) return null;

  // Custom step messages depending on percentage
  const getStepDetails = (prog: number) => {
    if (prog < 25) {
      return {
        label: 'Verifying integrity',
        desc: 'Analyzing headers & magic bytes validation...',
        icon: HardDriveUpload,
        color: 'text-blue-500'
      };
    }
    if (prog >= 25 && prog < 55) {
      return {
        label: 'Initializing core',
        desc: 'Parsing parameters and importing plugin modules...',
        icon: Settings,
        color: 'text-violet-500'
      };
    }
    if (prog >= 55 && prog < 90) {
      return {
        label: 'Processing file data',
        desc: selectedOperation === 'compress' 
          ? 'Re-encoding streams & reducing size dimensions...'
          : 'Enhancing content contrast & applying sharpening matrix...',
        icon: Cpu,
        color: 'text-indigo-500'
      };
    }
    return {
      label: 'Wrapping up',
      desc: 'Rebuilding containers & generating temporary download links...',
      icon: FileCheck,
      color: 'text-emerald-500'
    };
  };

  const step = getStepDetails(progress);
  const StepIcon = step.icon;

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-lg p-6 shadow-premium space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">File processing in progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Please keep this window open</p>
          </div>
        </div>
        <span className="text-lg font-black text-primary font-mono">{Math.round(progress)}%</span>
      </div>

      <div className="space-y-4">
        {/* Dynamic Progress Bar */}
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Action Stage Card */}
        <div className="flex items-start space-x-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
          <div className={`p-2 rounded-lg bg-card border border-border shrink-0 ${step.color}`}>
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{step.label}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProgressTracker;
