/**
 * PricingPage Component
 * Displays available subscription tiers (Free, Basic, Pro, Elite) and manages checkout.
 */

import React from "react";
import { Link } from "wouter";
import { ChevronLeft, Sparkles, CheckCircle2, ShieldCheck, Zap, Loader } from "lucide-react";
import { useSubscription, type PremiumTier, isTestingPeriodActive } from "@/hooks/useSubscription";
import { TestingNotice } from "@/components/TestingNotice";
import { useAdmin } from "@/lib/admin";
import { toast } from "sonner";

interface PlanCardProps {
  id: PremiumTier;
  title: string;
  price: React.ReactNode;
  period: string;
  limit: string;
  description: string;
  features: string[];
  accent: string;
  isPopular?: boolean;
  ctaText: string;
  onSelect: () => void;
  currentTier: PremiumTier;
  loading: boolean;
}

function PlanCard({
  id,
  title,
  price,
  period,
  limit,
  description,
  features,
  accent,
  isPopular,
  ctaText,
  onSelect,
  currentTier,
  loading,
}: PlanCardProps) {
  const isCurrent = currentTier === id;

  return (
    <div
      className={`rounded-3xl border p-6 flex flex-col relative transition-all duration-300 ${
        isPopular
          ? "border-primary bg-primary/5 shadow-premium scale-105 z-10 hover:scale-[1.07]"
          : "border-border bg-card/60 hover:-translate-y-1 hover:border-primary/30 shadow-sm"
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-glow">
          <Sparkles className="h-3 w-3 text-amber-300" />
          Most Popular
        </span>
      )}

      {/* Plan Header */}
      <div className="mb-5">
        <h3 className="text-xl font-black text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed min-h-8">
          {description}
        </p>
        <div className="mt-4 flex items-baseline gap-1">
          {price}
          {period && <span className="text-xs font-semibold text-muted-foreground">/{period}</span>}
        </div>
        <div className="mt-2 text-xs font-bold text-primary">{limit}</div>
      </div>

      {/* Feature list */}
      <ul className="space-y-3 mb-8 flex-1 border-t border-border pt-5">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-xs text-foreground/90 font-medium">
            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${accent}`} />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={isCurrent || loading}
        className={`w-full py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
          isCurrent
            ? "bg-muted border border-border text-muted-foreground cursor-default"
            : isPopular
              ? "bg-primary text-primary-foreground hover:opacity-90 shadow-glow cursor-pointer"
              : "border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
        }`}
      >
        {loading && !isCurrent ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Connecting…
          </>
        ) : isCurrent ? (
          "Current Plan"
        ) : (
          ctaText
        )}
      </button>
    </div>
  );
}

export default function PricingPage() {
  const { premiumTier, startCheckout, cancelSubscription, loading, activeOffer } = useSubscription();
  const admin = useAdmin();
  const isTesting = isTestingPeriodActive();

  const themeClass = admin.settings.eventTheme && admin.settings.eventTheme !== "none"
    ? `event-theme-${admin.settings.eventTheme}`
    : "";

  const plans = [
    {
      id: "free" as const,
      title: "Free",
      originalPrice: 0,
      period: "",
      limit: "Ad-supported access",
      description: "Ideal for occasional, single-document edits and quick runs.",
      features: [
        "PDF Merge & Compress",
        "Image Conversion & Resizing",
        "Watch 2 ads before each use",
        "Standard temporary storage",
      ],
      accent: "text-muted-foreground",
      ctaText: "Current Plan",
    },
    {
      id: "basic" as const,
      title: "Basic Desk",
      originalPrice: 19,
      period: "month",
      limit: "20 uses / day",
      description: "Built for individual applicants filling regular local job forms.",
      features: [
        "Absolutely ad-free experience",
        "Up to 20 operations per day",
        "Voice Assistant (EN/HI/BN)",
        "Aadhaar Masking tools",
        "Expiry share links",
      ],
      accent: "text-emerald-500",
      ctaText: "Upgrade Basic",
    },
    {
      id: "pro" as const,
      title: "Pro Desk",
      originalPrice: 39,
      period: "month",
      limit: "100 uses / day",
      description: "Our best option for high-volume document creators and coordinators.",
      isPopular: true,
      features: [
        "Absolutely ad-free experience",
        "Up to 100 operations per day",
        "All Basic features included",
        "Exam Toolkit template presets",
        "QR validation (Scan & Gen)",
        "Priority download speeds",
      ],
      accent: "text-sky-500",
      ctaText: "Go Pro Desk",
    },
    {
      id: "elite" as const,
      title: "Elite Console",
      originalPrice: 59,
      period: "month",
      limit: "Unlimited usage",
      description: "Designed for Cyber Cafe owners and student operators handling bulk applications.",
      features: [
        "Absolutely ad-free experience",
        "Infinite operations per day",
        "All Pro features included",
        "Cyber Cafe operator mode",
        "Bulk CSV student imports",
        "Dedicated processing lanes",
      ],
      accent: "text-violet-500",
      ctaText: "Acquire Elite",
    },
  ];

  const handleSelectPlan = (plan: PremiumTier) => {
    if (isTesting) {
      toast.info("All plans are currently free during the testing period! Enjoy all premium benefits.");
      return;
    }
    if (plan === "free") {
      if (premiumTier !== "free") {
        if (confirm("Are you sure you want to cancel your premium plan? This will return you to the ad-supported free tier.")) {
          cancelSubscription();
        }
      }
      return;
    }
    startCheckout(plan);
  };

  const getPlanPrice = (planId: PremiumTier, originalPrice: number) => {
    if (planId === "free") return <span className="text-3xl font-black text-foreground">₹0</span>;
    
    if (isTesting) {
      return (
        <span className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-emerald-500 animate-pulse-glow">FREE</span>
          <span className="text-sm text-muted-foreground line-through font-semibold">₹{originalPrice}</span>
        </span>
      );
    }

    if (activeOffer && activeOffer.discountPercentage > 0) {
      const discounted = Math.round(originalPrice * (1 - activeOffer.discountPercentage / 100));
      return (
        <span className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-foreground">₹{discounted}</span>
          <span className="text-sm text-muted-foreground line-through font-semibold">₹{originalPrice}</span>
        </span>
      );
    }

    return <span className="text-3xl font-black text-foreground">₹{originalPrice}</span>;
  };

  const getPlanCta = (planId: PremiumTier, defaultCta: string) => {
    if (isTesting) {
      return planId === "free" ? "Free Tier" : "Unlocked (Testing)";
    }
    return defaultCta;
  };

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col bg-mesh ${themeClass}`}>
      <TestingNotice />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold">
            <ChevronLeft className="h-4 w-4" />
            FileNova Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Encrypted Checkout
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl px-4 py-12 space-y-12">
        {/* Title area */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-black text-primary">
            <Zap className="h-3 w-3" />
            Upgrade Workspace
          </div>
          
          {activeOffer && !isTesting && (
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-center text-sm font-bold text-primary animate-pulse-glow max-w-xl mx-auto">
              🎉 {activeOffer.announcement}
            </div>
          )}

          {isTesting && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center text-sm font-bold text-emerald-600 animate-pulse-glow max-w-xl mx-auto">
              🛠️ Testing Mode: All premium subscriptions are currently unlocked for FREE!
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Flexible premium plans for every workspace
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Acquire unlimited bandwidth, premium tools, and voice assistance today.
            Start editing securely with no installation. Cancel anytime with a single click.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-4 max-w-6xl mx-auto">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              id={p.id}
              title={p.title}
              price={getPlanPrice(p.id, p.originalPrice)}
              period={p.period}
              limit={p.limit}
              description={p.description}
              features={p.features}
              accent={p.accent}
              isPopular={p.isPopular}
              ctaText={getPlanCta(p.id, p.ctaText)}
              onSelect={() => handleSelectPlan(p.id)}
              currentTier={premiumTier}
              loading={loading}
            />
          ))}
        </div>

        {/* Cancellation policy footer */}
        <div className="max-w-2xl mx-auto text-center text-xs text-muted-foreground border-t border-border pt-8 mt-6">
          <p>Payments are managed securely by Razorpay. Price contains all GST fees.</p>
          <p className="mt-1.5">
            Want to stop subscription? Downgrade to the Free plan above anytime.
            Your premium benefits remain active until the end of the current billing month.
          </p>
        </div>
      </main>
    </div>
  );
}
