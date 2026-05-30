import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { User, LogOut, Zap, Sparkles, Clock, CreditCard, ChevronDown, Key } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubscription } from "@/hooks/useSubscription";
import { AuthModal } from "./AuthModal";
import { toast } from "sonner";

export function UserProfileDropdown() {
  const { user, subscription, fetchMe, logout } = useAuthStore();
  const { cancelSubscription, loading: subLoading } = useSubscription();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    toast.success("Successfully logged out.");
    setLocation("/");
  };

  const handleCancelSub = async () => {
    if (confirm("Are you sure you want to cancel your subscription? This will return you to the free tier.")) {
      await cancelSubscription();
      await fetchMe(); // Refresh profile state
      setDropdownOpen(false);
    }
  };

  // Get display text for the subscription details
  const getPlanDetails = () => {
    if (!subscription || subscription.plan === "free" || subscription.status !== "active") {
      return {
        name: "Free Tier",
        color: "text-muted-foreground bg-muted/40 border-border",
        isPremium: false,
        days: null
      };
    }

    let name = "Free Tier";
    let color = "text-muted-foreground bg-muted/40 border-border";
    if (subscription.plan === "basic") {
      name = "Basic Desk";
      color = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else if (subscription.plan === "pro") {
      name = "Pro Desk";
      color = "text-sky-500 bg-sky-500/10 border-sky-500/20";
    } else if (subscription.plan === "elite") {
      name = "Elite Console";
      color = "text-violet-500 bg-violet-500/10 border-violet-500/20";
    }

    return {
      name,
      color,
      isPremium: true,
      days: subscription.daysActive
    };
  };

  const plan = getPlanDetails();

  return (
    <div className="relative" ref={dropdownRef}>
      {user ? (
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/50 px-3.5 py-2 text-xs font-bold text-foreground transition duration-300 cursor-pointer shadow-sm select-none"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-3 w-3" />
          </div>
          <span className="max-w-[100px] truncate">{user.name || user.email}</span>
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          onClick={() => setAuthModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary hover:opacity-90 px-4 py-2 text-xs font-black text-primary-foreground transition duration-300 cursor-pointer shadow-glow"
        >
          <Key className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
      )}

      {/* Dropdown Menu */}
      {dropdownOpen && user && (
        <div className="absolute right-0 mt-4 w-72 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-premium p-4 z-50 animate-scale-in">
          {/* User info */}
          <div className="border-b border-border pt-1 pb-3.5 mb-3.5">
            <p className="text-xs font-black text-foreground truncate">{user.name || "FileNova User"}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user.email}</p>
            {user.phoneNumber && (
              <p className="text-[10px] text-muted-foreground mt-1.5">{user.phoneNumber}</p>
            )}
          </div>

          {/* Subscription Status details */}
          <div className="rounded-xl border border-border bg-background/50 p-3 mb-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Plan</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${plan.color}`}>
                {plan.isPremium && <Sparkles className="h-2.5 w-2.5" />}
                {plan.name}
              </span>
            </div>

            {plan.isPremium && plan.days !== null ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground/90">
                  <span className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                    <Clock className="h-3 w-3" />
                    Remaining Days
                  </span>
                  <span className="font-bold text-primary">{plan.days} Days Active</span>
                </div>
                {/* Visual active progress representation */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (plan.days / 30) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground leading-normal pt-0.5">
                You are currently running on standard Free rules. Upgrade to gain priority lanes and remove daily limit gates.
              </div>
            )}
          </div>

          {/* Action Links */}
          <div className="space-y-1 mb-3.5">
            {!plan.isPremium ? (
              <button
                onClick={() => { setLocation("/pricing"); setDropdownOpen(false); }}
                className="w-full text-center py-2.5 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-glow flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="h-3.5 w-3.5 fill-white" />
                <span>Upgrade Workspace</span>
              </button>
            ) : (
              <button
                onClick={handleCancelSub}
                disabled={subLoading}
                className="w-full text-left py-2 px-3 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition flex items-center gap-2 cursor-pointer border border-transparent hover:border-destructive/15"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Cancel Plan</span>
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-border pt-3.5">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Register/Login Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => fetchMe()} 
      />
    </div>
  );
}
