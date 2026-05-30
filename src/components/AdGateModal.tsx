/**
 * AdGateModal Component
 * Gated view prompting free tier users to watch ads or upgrade.
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Play, Sparkles, Loader, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { AdSenseUnit } from "./AdSenseUnit";

interface AdGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdGateModal({ isOpen, onClose }: AdGateModalProps) {
  const { adWatchCount, useCount, incrementAdWatch } = useSubscription();
  const [, setLocation] = useLocation();

  const [watching, setWatching] = useState(false);
  const [adTimeLeft, setAdTimeLeft] = useState(5);
  const [currentAdIndex, setCurrentAdIndex] = useState(1);

  // Gating calculation
  const targetAds = (useCount + 1) * 2;
  const adsRemaining = Math.max(0, targetAds - adWatchCount);

  useEffect(() => {
    if (!isOpen) {
      setWatching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (watching && adTimeLeft > 0) {
      timer = setTimeout(() => {
        setAdTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (watching && adTimeLeft === 0) {
      setWatching(false);
      incrementAdWatch(1);
      toast.success(`Ad ${currentAdIndex} completed!`);
      if (adsRemaining > 1) {
        setCurrentAdIndex(2);
      }
    }
    return () => clearTimeout(timer);
  }, [watching, adTimeLeft, currentAdIndex, adsRemaining, incrementAdWatch]);

  if (!isOpen) return null;

  const startAd = () => {
    setAdTimeLeft(5);
    setWatching(true);
  };

  const handleUpgrade = () => {
    onClose();
    setLocation("/pricing");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="bg-card border border-border rounded-3xl shadow-premium max-w-md w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner header */}
        <div className="bg-gradient-to-r from-sky-500 via-indigo-500 to-primary p-6 text-white relative">
          <div className="absolute top-3 right-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            Free Tier Support
          </div>
          <ShieldAlert className="h-10 w-10 text-white/90 mb-2" />
          <h2 className="text-xl font-black">Feature Ad Gate</h2>
          <p className="text-xs text-white/80 mt-1 leading-4">
            Support FileNova servers. Watch 2 brief ads to unlock your next tool operation, or remove ads completely.
          </p>
        </div>

        {/* Ad screen area */}
        <div className="p-6 space-y-5">
          {watching ? (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
                {/* Simulated video playback background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 to-slate-950 animate-pulse" />
                
                <div className="z-10 space-y-3">
                  <Loader className="h-8 w-8 text-sky-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-sky-400 tracking-widest uppercase">
                    Streaming Sponsor Ad {currentAdIndex}/2
                  </p>
                  <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                    Closing in {adTimeLeft}s
                  </div>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                  <div 
                    className="h-full bg-sky-400 transition-all duration-1000 ease-linear"
                    style={{ width: `${((5 - adTimeLeft) / 5) * 100}%` }}
                  />
                </div>
              </div>
              <AdSenseUnit />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress summary card */}
              <div className="rounded-2xl border border-border bg-background/50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Your Progress
                  </p>
                  <p className="text-sm font-black text-foreground">
                    {adsRemaining === 0 ? "Unlock criteria met!" : `${adsRemaining} more ad${adsRemaining > 1 ? "s" : ""} required`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border font-bold text-xs ${adWatchCount >= targetAds - 1 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                    {adWatchCount >= targetAds - 1 ? "✓" : "1"}
                  </div>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border font-bold text-xs ${adWatchCount >= targetAds ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                    {adWatchCount >= targetAds ? "✓" : "2"}
                  </div>
                </div>
              </div>

              {adsRemaining > 0 ? (
                <button
                  onClick={startAd}
                  className="w-full py-3.5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-black text-sm transition hover:opacity-90 shadow-glow"
                >
                  <Play className="h-4 w-4" />
                  Watch Ad {currentAdIndex} of 2
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                    Ad verification complete! You can now proceed.
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-3.5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-black text-sm transition hover:opacity-90 shadow-glow"
                  >
                    Unlock Feature Operation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pricing route alternative option */}
          <div className="border-t border-border pt-4">
            <button
              onClick={handleUpgrade}
              className="w-full py-3 inline-flex items-center justify-between px-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition text-xs font-black"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Go Premium – Remove ads & limits from ₹19
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
