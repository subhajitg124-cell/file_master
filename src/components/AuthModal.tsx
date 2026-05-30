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
            <div className="space-y-4 py-1 animate-fade-in text-foreground">
              <div className="text-center font-sans">
                {/* Google Logo representation */}
                <div className="flex justify-center mb-1">
                  <svg className="h-6 w-auto" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <h3 className="text-base font-bold text-foreground">Choose an account</h3>
                <p className="text-[11px] text-muted-foreground">to continue to <span className="font-extrabold text-primary">FileNova AI</span></p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="relative flex items-center justify-center">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <span className="absolute text-[9px] font-black tracking-wider text-primary">G</span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground animate-pulse">Connecting to Google services…</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Account List */}
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-background/50">
                    {/* User 1 */}
                    <button
                      onClick={async () => {
                        const email = "priya.sharma99@gmail.com";
                        const name = "Priya Sharma";
                        const success = await loginWithGoogle(email, name, "google_sub_priya99");
                        if (success) {
                          toast.success(`Logged in as Priya Sharma`);
                          setShowGoogleSim(false);
                          handleClose();
                          if (onSuccess) onSuccess();
                        }
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-muted text-left transition"
                    >
                      <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-650 dark:text-pink-300 font-bold text-xs flex items-center justify-center border border-pink-200">
                        PS
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-none">Priya Sharma</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">priya.sharma99@gmail.com</p>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-md">Candidate</span>
                    </button>

                    {/* User 2 */}
                    <button
                      onClick={async () => {
                        const email = "rahul.csc.cafe@gmail.com";
                        const name = "Rahul Das (CSC Portal)";
                        const success = await loginWithGoogle(email, name, "google_sub_rahul_csc");
                        if (success) {
                          toast.success(`Logged in as Rahul Das`);
                          setShowGoogleSim(false);
                          handleClose();
                          if (onSuccess) onSuccess();
                        }
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-muted text-left transition"
                    >
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-650 dark:text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-200">
                        RD
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-none">Rahul Das</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">rahul.csc.cafe@gmail.com</p>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 border border-indigo-505/20 px-1.5 py-0.5 rounded-md">CSC Operator</span>
                    </button>

                    {/* Developer/User */}
                    <button
                      onClick={async () => {
                        const email = "subhajitgho123@gmail.com";
                        const name = "Subhajit Ghosh";
                        const success = await loginWithGoogle(email, name, "google_sub_subhajitgho123");
                        if (success) {
                          toast.success(`Logged in as Subhajit Ghosh`);
                          setShowGoogleSim(false);
                          handleClose();
                          if (onSuccess) onSuccess();
                        }
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-muted text-left transition"
                    >
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200">
                        SG
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-none">Subhajit Ghosh</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">subhajitgho123@gmail.com</p>
                      </div>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-550/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">Developer</span>
                    </button>
                  </div>

                  {/* Manual Sim block */}
                  <div className="pt-2 border-t border-border mt-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Or Use Another Account</p>
                    <div className="space-y-2">
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Your Name"
                          value={googleName}
                          onChange={(e) => setGoogleName(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="email"
                          placeholder="Google Email"
                          value={googleEmail}
                          onChange={(e) => setGoogleEmail(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleGoogleSimulate}
                        className="w-full py-2 text-xs font-black bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition mt-1 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Authorize Google Account
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowGoogleSim(false)}
                      className="w-full py-2.5 text-xs font-bold rounded-xl border border-border hover:bg-muted transition text-center"
                    >
                      Back to Classic Sign In
                    </button>
                  </div>
                </div>
              )}
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
                className="w-full py-3 bg-[#ffffff] text-[#1f1f1f] hover:bg-[#f3f4f6] font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-[#d1d5db] transition duration-200 cursor-pointer shadow-sm hover:shadow-md"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
