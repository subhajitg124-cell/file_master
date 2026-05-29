/**
 * useSubscription Hook
 * Handles subscription status, Razorpay integration, and Ad-Gate/Usage limit rules.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export type PremiumTier = "free" | "basic" | "pro" | "elite";

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const TESTING_END_TIME = new Date("2026-05-31T20:58:19+05:30").getTime();
export const isTestingPeriodActive = () => Date.now() < TESTING_END_TIME;

export function useSubscription() {
  const [loading, setLoading] = useState(false);
  const [premiumTierState, setPremiumTierState] = useState<PremiumTier>("free");
  const [premiumEnabledState, setPremiumEnabledState] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [activeOffer, setActiveOffer] = useState<{ announcement: string; discountPercentage: number } | null>(null);

  const testingActive = isTestingPeriodActive();
  const premiumTier = testingActive ? "elite" : premiumTierState;
  const premiumEnabled = testingActive ? true : premiumEnabledState;

  // Local storage usage trackers
  const [adWatchCount, setAdWatchCount] = useState(0);
  const [useCount, setUseCount] = useState(0);

  const todayKey = getTodayKey();
  const adsKey = `fn_ads_${todayKey}`;
  const usesKey = `fn_uses_${todayKey}`;

  // Sync with localStorage
  const syncLocalMetrics = useCallback(() => {
    const ads = parseInt(localStorage.getItem(adsKey) || "0", 10);
    const uses = parseInt(localStorage.getItem(usesKey) || "0", 10);
    setAdWatchCount(ads);
    setUseCount(uses);
  }, [adsKey, usesKey]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/premium/subscription/status");
      if (res.ok) {
        const data = await res.json();
        setPremiumTierState(data.premiumTier || "free");
        setPremiumEnabledState(data.premiumEnabled || false);
        setExpiresAt(data.subscription?.expiresAt || null);
        if (data.activeOffer) {
          setActiveOffer(data.activeOffer);
        } else {
          setActiveOffer(null);
        }
      }
    } catch (_) {
      // Fallback silently
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    syncLocalMetrics();
    // Periodically update to detect changes
    const timer = setInterval(() => {
      syncLocalMetrics();
      fetchStatus();
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchStatus, syncLocalMetrics]);

  // Dynamic script loader for Razorpay
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Checkout execution
  const startCheckout = async (plan: "basic" | "pro" | "elite") => {
    setLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Failed to load Razorpay checkout. Check your internet connection.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/v1/premium/subscription/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "FileNova Premium",
        description: `Upgrade to ${plan.toUpperCase()}`,
        order_id: data.orderId,
        handler: async (response: any) => {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/v1/premium/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            });
            if (!verifyRes.ok) throw new Error("Payment verification failed");
            toast.success(`Welcome to FileNova ${plan.toUpperCase()}!`);
            fetchStatus();
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "Student Desk",
          email: "student@filenova.in",
        },
        theme: {
          color: "#0284c7",
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment process cancelled.");
          },
        },
      };

      // Mock auto-complete for local/testing convenience
      if (data.orderId.startsWith("order_mock_")) {
        toast.info("Mocking transaction checkout…");
        setTimeout(async () => {
          try {
            const verifyRes = await fetch("/api/v1/premium/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: data.orderId,
                razorpay_payment_id: `pay_mock_${Math.random().toString(36).slice(2)}`,
                plan,
              }),
            });
            if (!verifyRes.ok) throw new Error("Mock verification failed");
            toast.success(`Activated ${plan.toUpperCase()} plan (Simulation)`);
            fetchStatus();
          } catch (err) {
            toast.error("Simulated purchase validation failed.");
          } finally {
            setLoading(false);
          }
        }, 1200);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      toast.error(err.message || "Payment setup failed");
      setLoading(false);
    }
  };

  // Cancel Plan
  const cancelSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/premium/subscription/cancel", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Subscription downgraded to Free.");
        fetchStatus();
      } else {
        throw new Error();
      }
    } catch (_) {
      toast.error("Failed to cancel subscription.");
    } finally {
      setLoading(false);
    }
  };

  // Gating counters
  const incrementAdWatch = (count = 1) => {
    const current = parseInt(localStorage.getItem(adsKey) || "0", 10);
    localStorage.setItem(adsKey, String(current + count));
    syncLocalMetrics();
  };

  const incrementFeatureUse = () => {
    const current = parseInt(localStorage.getItem(usesKey) || "0", 10);
    localStorage.setItem(usesKey, String(current + 1));
    syncLocalMetrics();
  };

  // Max daily limit rules
  const getDailyLimit = (): number => {
    if (isTestingPeriodActive()) return Infinity;
    if (premiumTier === "basic") return 20;
    if (premiumTier === "pro") return 100;
    if (premiumTier === "elite") return Infinity;
    return Infinity; // Free users have ad watch gating instead of fixed daily limits
  };

  const isLimitReached = (): boolean => {
    if (isTestingPeriodActive()) return false;
    const max = getDailyLimit();
    return useCount >= max;
  };

  const shouldShowAdGate = (): boolean => {
    if (isTestingPeriodActive()) return false;
    if (premiumTier !== "free") return false;
    // FREE user: watch 2 ads per use.
    // Condition: watched ads must be >= (uses + 1) * 2 to run next feature
    const requiredAds = (useCount + 1) * 2;
    return adWatchCount < requiredAds;
  };

  return {
    loading,
    premiumTier,
    premiumEnabled,
    expiresAt,
    adWatchCount,
    useCount,
    activeOffer,
    incrementAdWatch,
    incrementFeatureUse,
    startCheckout,
    cancelSubscription,
    isLimitReached,
    shouldShowAdGate,
    getDailyLimit,
  };
}
