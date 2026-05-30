/**
 * AdminLogin Component
 * Separate, secure, and styled login portal for administrators.
 */

import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Lock, User, ShieldAlert, Sparkles } from "lucide-react";
import { useAdmin } from "@/lib/admin";
import { toast } from "sonner";

export default function AdminLogin() {
  const admin = useAdmin();
  const [, setLocation] = useLocation();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /admin immediately
  React.useEffect(() => {
    if (admin.isAuthenticated) {
      setLocation("/nova-control");
    }
  }, [admin.isAuthenticated, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    // Add small delay to simulate processing and feel premium
    setTimeout(() => {
      const success = admin.login(username, password);
      setLoading(false);
      if (success) {
        toast.success("Welcome back, Administrator!");
        setLocation("/nova-control");
      } else {
        toast.error("Invalid administrator credentials. Access Denied.");
      }
    }, 800);
  };

  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 relative overflow-hidden bg-mesh">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating back home button */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 backdrop-blur-md px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all hover:scale-105">
          <ChevronLeft className="h-4 w-4" />
          Back Home
        </Link>
      </div>

      <div className="w-full max-w-md bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl p-8 shadow-premium relative z-10 transition-transform duration-300 hover:scale-[1.01]">
        {/* Lock Shield Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 animate-pulse-glow">
            <img src={logoUrl} alt="FileNova logo" className="h-10 w-auto" />
          </div>
          <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/20 mb-2">
            <ShieldAlert className="h-3 w-3" />
            Restricted Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1 text-foreground">FileNova Admin Console</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Please verify your administrator credentials to access system controls.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username-field" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <User className="h-4 w-4" />
              </span>
              <input
                id="username-field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-2xl border border-border bg-background/50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password-field" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="password-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-2xl border border-border bg-background/50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm transition-all flex items-center justify-center gap-2 hover:opacity-90 shadow-glow disabled:opacity-50 cursor-pointer mt-6"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                Sign In to Console
              </>
            )}
          </button>
        </form>

        {/* Footer info banner */}
        <div className="mt-8 border-t border-border pt-4 text-center">
          <p className="text-[10px] text-muted-foreground font-semibold">
            SECURE ACCESS SYSTEM • AES-256 SESSION LOCK
          </p>
        </div>
      </div>
    </div>
  );
}
