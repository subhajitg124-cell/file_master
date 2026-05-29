import React, { useState } from "react";
import { X, Sparkles, Mail, Phone, Lock, User, Chrome, ArrowRight, Loader } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthTab = "login" | "signup";

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, signup, loginWithGoogle, loading, error, clearError } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  
  // Login form states
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form states
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Google sign in states
  const [showGoogleSim, setShowGoogleSim] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("john.doe@gmail.com");
  const [googleName, setGoogleName] = useState("John Doe");

  if (!isOpen) return null;

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      toast.error("Please enter both credentials.");
      return;
    }
    const success = await login(loginIdentifier, loginPassword);
    if (success) {
      toast.success("Successfully logged in!");
      handleClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error(useAuthStore.getState().error || "Failed to log in.");
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast.error("Email and Password are required.");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    const success = await signup(
      signupEmail,
      signupPhone || null,
      signupPassword,
      signupName || null
    );
    if (success) {
      toast.success("Account created successfully!");
      // Automatically log them in after signup
      const loggedIn = await login(signupEmail, signupPassword);
      if (loggedIn) {
        handleClose();
        if (onSuccess) onSuccess();
      }
    } else {
      toast.error(useAuthStore.getState().error || "Failed to sign up.");
    }
  };

  const handleGoogleSimulate = async () => {
    if (!googleEmail) {
      toast.error("Email is required for Google login.");
      return;
    }
    const sub = `google_sub_${googleEmail.replace(/[^a-zA-Z0-9]/g, "")}`;
    const success = await loginWithGoogle(googleEmail, googleName || "Google User", sub);
    if (success) {
      toast.success(`Logged in as ${googleName} (Google)`);
      setShowGoogleSim(false);
      handleClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error(useAuthStore.getState().error || "Google login failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="bg-card border border-border rounded-3xl shadow-premium max-w-md w-full overflow-hidden animate-scale-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={handleClose}
          title="Close dialog"
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center rounded-full bg-background/50 hover:bg-background border border-border transition z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary via-indigo-650 to-indigo-550 p-6 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 mb-3">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <h2 className="text-xl font-black">Welcome to FileNova</h2>
          <p className="text-xs text-white/80 mt-1 leading-4">
            Create an account or sign in to configure your workspaces, secure your documents, and manage premium subscriptions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30 p-1 m-4 rounded-xl">
          <button
            onClick={() => { setActiveTab("login"); clearError(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab("signup"); clearError(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Create Account
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Main content depending on Google Simulation state */}
          {showGoogleSim ? (
            <div className="space-y-4 py-2 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
                <Chrome className="h-4.5 w-4.5" />
                <span>Simulate Google Sign-In</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Simulate a secure Google authentication callback. Enter any email and name to verify registration/login.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Google Email Address"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowGoogleSim(false)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-border hover:bg-muted transition"
                >
                  Back
                </button>
                <button
                  onClick={handleGoogleSimulate}
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-black bg-primary text-primary-foreground rounded-xl shadow-glow transition hover:opacity-90 inline-flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Verify Identity"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "login" ? (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Email or Phone Number"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="password"
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs font-bold text-destructive px-1">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-xl shadow-glow transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignupSubmit} className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        placeholder="Phone Number (e.g. 9876543210)"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs font-bold text-destructive px-1">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-xl shadow-glow transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    {loading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">or continue with</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => setShowGoogleSim(true)}
                className="w-full py-3 border border-border bg-background hover:bg-muted text-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Chrome className="h-4 w-4 text-red-500 fill-red-500/10" />
                <span>Google Sign-In</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
