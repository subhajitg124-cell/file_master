/**
 * FeatureGate Component
 * Wraps features to enforce subscription plan checks, ad requirements, and daily limits.
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import { Lock, Sparkles, AlertTriangle } from "lucide-react";
import { useSubscription, type PremiumTier } from "@/hooks/useSubscription";
import { AdGateModal } from "./AdGateModal";
import { toast } from "sonner";

interface FeatureGateProps {
  children: React.ReactNode;
  requiredPlan: PremiumTier;
  featureName: string;
  fallbackMode?: "blur" | "hide";
}

const TIER_RANKS: Record<PremiumTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
};

export function FeatureGate({
  children,
  requiredPlan,
  featureName,
  fallbackMode = "blur",
}: FeatureGateProps) {
  const { premiumTier, shouldShowAdGate, isLimitReached, getDailyLimit, useCount } = useSubscription();
  const [, setLocation] = useLocation();
  const [showAdModal, setShowAdModal] = useState(false);

  const userRank = TIER_RANKS[premiumTier];
  const requiredRank = TIER_RANKS[requiredPlan];
  const isLocked = userRank < requiredRank;

  const handleInteraction = (e: React.MouseEvent) => {
    // If locked, prevent action and prompt upgrade
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      toast.info(`The ${featureName} tool requires a ${requiredPlan.toUpperCase()} subscription.`);
      setLocation("/pricing");
      return;
    }

    // Check usage limits
    if (isLimitReached()) {
      e.preventDefault();
      e.stopPropagation();
      const dailyMax = getDailyLimit();
      toast.error(
        `Daily limit of ${dailyMax} operations reached on your ${premiumTier.toUpperCase()} plan. Upgrade to a higher plan to continue.`
      );
      setLocation("/pricing");
      return;
    }

    // Check ad gating for free users
    if (shouldShowAdGate()) {
      e.preventDefault();
      e.stopPropagation();
      toast.info("Watch 2 sponsor ads to unlock this feature operation.");
      setShowAdModal(true);
      return;
    }
  };

  if (isLocked && fallbackMode === "hide") {
    return null;
  }

  return (
    <div className="relative group">
      {/* Click interceptor overlay if feature is restricted/locked */}
      {(isLocked || shouldShowAdGate() || isLimitReached()) && (
        <div 
          onClick={handleInteraction}
          className="absolute inset-0 z-30 cursor-pointer rounded-2xl"
          title={`Click to unlock ${featureName}`}
        />
      )}

      {/* Main feature content */}
      <div 
        className={`transition-all duration-300 ${
          isLocked 
            ? "blur-[2.5px] pointer-events-none opacity-50 select-none" 
            : shouldShowAdGate() 
              ? "opacity-80" 
              : ""
        }`}
      >
        {children}
      </div>

      {/* Lock HUD overlay (visible only if locked or gated) */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/25 backdrop-blur-[0.5px] rounded-2xl z-20 pointer-events-none animate-fade-in">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            Requires {requiredPlan.toUpperCase()}
          </span>
        </div>
      )}

      {/* Ad gate indicator HUD */}
      {!isLocked && shouldShowAdGate() && (
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-500 z-10 pointer-events-none">
          <AlertTriangle className="h-2.5 w-2.5" />
          Ad required
        </div>
      )}

      {/* Limit reached HUD */}
      {!isLocked && isLimitReached() && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/5 backdrop-blur-[0.5px] rounded-2xl z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-destructive">
            Limit Reached
          </span>
        </div>
      )}

      {/* AdGate Modal for user viewing ads */}
      <AdGateModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} />
    </div>
  );
}
