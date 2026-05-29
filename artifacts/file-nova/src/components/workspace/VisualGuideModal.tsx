import React, { useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import {
  X,
  ChevronRight,
  ChevronLeft,
  WandSparkles,
  Upload,
  Sliders,
  Download,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface VisualGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisualGuideModal: React.FC<VisualGuideModalProps> = ({ isOpen, onClose }) => {
  const t = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: t.step1Title || "1. Choose Scheme or Tool",
      description: t.step1Desc || "Pick a pre-configured government workflow (like Scholarship ZIP) or select a specific tool (like PDF Merge) from the list.",
      icon: WandSparkles,
      color: "from-red-500 to-rose-500",
      iconColor: "text-red-400",
      bgLight: "bg-red-500/10",
      border: "border-red-500/20"
    },
    {
      title: t.step2Title || "2. Upload Documents",
      description: t.step2Desc || "Drag & drop scans, PDFs, or photos. All file cropping and resizing are handled safely inside your local web browser.",
      icon: Upload,
      color: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-400",
      bgLight: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "3. Adjust Options & Process",
      description: "Customize your file limits (like compression level or dimensions) and click the big 'Process' button to optimize.",
      icon: Sliders,
      color: "from-violet-500 to-purple-500",
      iconColor: "text-violet-400",
      bgLight: "bg-violet-500/10",
      border: "border-violet-500/20"
    },
    {
      title: t.step4Title || "4. Download ZIP/Files",
      description: t.step4Desc || "Configure parameters, click 'Process' and download your optimized files or ZIP archive.",
      icon: Download,
      color: "from-emerald-500 to-teal-500",
      iconColor: "text-emerald-400",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    }
  ];

  if (!isOpen) return null;

  const ActiveIcon = steps[currentStep].icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-6 md:p-8 flex flex-col justify-between"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="absolute top-4 right-4 h-9 w-9 rounded-xl border border-border bg-card/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Stepper Header */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
              <Sparkles className="h-3 w-3" />
              Easy Visual Guide
            </span>
            <h2 className="text-xl font-black text-foreground">
              {t.guideTitle || "How to Use FileNova"}
            </h2>
          </div>

          {/* Progress Indicators */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "bg-primary"
                    : i < currentStep
                    ? "bg-primary/40"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Active Card Content */}
          <div className="flex-1 flex flex-col items-center py-6 text-center">
            {/* Visual Icon Box */}
            <div className={`relative h-28 w-28 rounded-3xl bg-gradient-to-tr ${steps[currentStep].color} p-[1px] shadow-lg flex items-center justify-center mb-6`}>
              <div className="h-full w-full rounded-[23px] bg-card flex items-center justify-center">
                <ActiveIcon className={`h-12 w-12 ${steps[currentStep].iconColor} animate-pulse`} />
              </div>
              <span className="absolute -top-2.5 -right-2.5 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black border border-background shadow-md">
                {currentStep + 1}
              </span>
            </div>

            {/* Step Details */}
            <h3 className="text-lg font-black text-foreground mb-2">
              {steps[currentStep].title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                currentStep === 0
                  ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                  : "bg-card border-border hover:bg-muted text-foreground cursor-pointer"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/95 shadow-glow-sm px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white shadow-glow-emerald px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer animate-bounce"
              >
                <CheckCircle2 className="h-4 w-4" />
                Got it!
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
