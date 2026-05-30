import React from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  DatabaseZap,
  Eye,
  FileCog,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Zap,
} from "lucide-react";
import { eventRules } from "@/lib/document-automation";
import { useAdmin } from "@/lib/admin";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const admin = useAdmin();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!admin.isAuthenticated) {
      setLocation("/nova-login");
    }
  }, [admin.isAuthenticated, setLocation]);

  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions" | "users">("overview");
  const [subStats, setSubStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [backendHealth, setBackendHealth] = useState<any>(null);

  // New Scheme Creator State & customRules loader
  const [customRules, setCustomRules] = useState<any[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [schemeId, setSchemeId] = useState("");
  const [schemeTitle, setSchemeTitle] = useState("");
  const [schemePattern, setSchemePattern] = useState("{name}_documents.zip");
  const [slotKey, setSlotKey] = useState("");
  const [slotLabel, setSlotLabel] = useState("");
  const [slotTarget, setSlotTarget] = useState("");
  const [slotMaxKb, setSlotMaxKb] = useState(100);
  const [currentSlots, setCurrentSlots] = useState<{ id: string; label: string; target: string; maxSizeKb: number }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("filenova-custom-rules");
      if (stored) {
        setCustomRules(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not read custom rules", e);
    }
  }, []);

  const handleAddSlot = () => {
    if (!slotKey || !slotLabel) {
      toast.error("Please fill Key and Label for the slot");
      return;
    }
    setCurrentSlots([...currentSlots, { id: slotKey, label: slotLabel, target: slotTarget || "JPEG / PDF format", maxSizeKb: Number(slotMaxKb) || 100 }]);
    setSlotKey("");
    setSlotLabel("");
    setSlotTarget("");
    setSlotMaxKb(150);
    toast.success("Added slot constraint");
  };

  const handleRemoveSlot = (index: number) => {
    setCurrentSlots(currentSlots.filter((_, i) => i !== index));
    toast.info("Removed slot constraint");
  };

  const handleSaveScheme = () => {
    if (!schemeId || !schemeTitle) {
      toast.error("Scheme ID and Title are required");
      return;
    }
    if (currentSlots.length === 0) {
      toast.error("Please add at least one document slot requirement");
      return;
    }
    const newRule = {
      id: schemeId,
      title: schemeTitle,
      namingPattern: schemePattern,
      icon: "📋",
      category: "custom",
      documents: currentSlots
    };

    const nextCustom = [...customRules, newRule];
    setCustomRules(nextCustom);
    localStorage.setItem("filenova-custom-rules", JSON.stringify(nextCustom));
    
    // reset form
    setSchemeId("");
    setSchemeTitle("");
    setSchemePattern("{name}_documents.zip");
    setCurrentSlots([]);
    setShowCreator(false);
    toast.success("Custom scheme created and saved beautifully! 🚀");
  };

  const handleDeleteScheme = (id: string) => {
    const nextCustom = customRules.filter(r => r.id !== id);
    setCustomRules(nextCustom);
    localStorage.setItem("filenova-custom-rules", JSON.stringify(nextCustom));
    toast.info("Custom scheme deleted successfully");
  };

  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  const fetchStats = async () => {
    if (!admin.isAuthenticated || !admin.creds) return;
    setLoadingStats(true);
    try {
      const headers: Record<string, string> = {
        "x-admin-username": admin.creds.username,
        "x-admin-hash": admin.creds.passwordHash,
      };
      const res = await fetch("/api/v1/premium/subscription/admin/stats", { headers });
      const data = await res.json();
      if (data.success) setSubStats(data.stats);
      else toast.error("Failed to load stats");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/v1/health");
      const data = await res.json();
      setBackendHealth(data);
    } catch {
      setBackendHealth(null);
    }
  };

  useEffect(() => {
    if (!admin.isAuthenticated) return;
    fetchStats();
    fetchHealth();
  }, [admin.isAuthenticated]);

  if (!admin.isAuthenticated) return null;

  const planBadge = (plan: string) => {
    if (plan === "elite") return "bg-violet-500/10 text-violet-500";
    if (plan === "pro") return "bg-sky-500/10 text-sky-500";
    return "bg-emerald-500/10 text-emerald-500";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border">
              <img src={logoUrl} alt="FileNova logo" className="h-10 w-auto" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">FileNova AI Console</p>
              <h1 className="text-xl font-black">Super Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchStats(); fetchHealth(); }}
              disabled={loadingStats}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/" className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
              View app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-3 rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20 lg:h-fit">
          {/* Auth info */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-sm font-black truncate">Signed in as</p>
            <p className="text-xs text-primary font-bold truncate">{admin.creds?.username}</p>
            <button
              onClick={() => { admin.logout(); setLocation("/nova-login"); }}
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted/60 transition cursor-pointer"
            >
              Sign out
            </button>
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Settings</p>

            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold">Standalone mode</span>
                <input
                  type="checkbox"
                  checked={admin.settings.standaloneMode}
                  onChange={(e) => admin.setSettings({ standaloneMode: e.target.checked })}
                  className="accent-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold">Editing enabled</span>
                <input
                  type="checkbox"
                  checked={admin.settings.editingEnabled}
                  onChange={(e) => admin.setSettings({ editingEnabled: e.target.checked })}
                  className="accent-primary"
                />
              </label>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Offers & Events</p>
              <div>
                <label htmlFor="active-offer-input" className="block text-[11px] font-bold text-muted-foreground mb-1">Announced Offer</label>
                <input
                  id="active-offer-input"
                  value={admin.settings.activeOffer || ""}
                  onChange={(e) => admin.setSettings({ activeOffer: e.target.value })}
                  placeholder="e.g. Flat 50% Off Launch Deal!"
                  className="w-full rounded-md border border-border bg-background p-2 text-xs"
                />
              </div>
              <div>
                <label htmlFor="discount-input" className="block text-[11px] font-bold text-muted-foreground mb-1">Discount %</label>
                <input
                  id="discount-input"
                  type="number" min="0" max="100"
                  value={admin.settings.discountPercentage || 0}
                  onChange={(e) => admin.setSettings({ discountPercentage: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-background p-2 text-xs"
                />
              </div>
              <div>
                <label htmlFor="event-theme-select" className="block text-[11px] font-bold text-muted-foreground mb-1">Event Theme</label>
                <select
                  id="event-theme-select"
                  value={admin.settings.eventTheme || "none"}
                  onChange={(e) => admin.setSettings({ eventTheme: e.target.value as any })}
                  className="w-full rounded-md border border-border bg-background p-2 text-xs"
                >
                  <option value="none">Standard (Default)</option>
                  <option value="warm">Warm/Festival</option>
                  <option value="cool">Cool/Tech</option>
                  <option value="tricolor">Indian Tri-color</option>
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Change Credentials</p>
              <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="New username" aria-label="New username" className="w-full rounded-md border border-border bg-background p-2 text-xs" />
              <input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New password" type="password" aria-label="New password" className="w-full rounded-md border border-border bg-background p-2 text-xs" />
              <button
                onClick={() => { if (newUser && newPass) { admin.setCredentials(newUser, newPass); toast.success("Credentials updated"); setNewUser(""); setNewPass(""); } }}
                className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground cursor-pointer"
              >
                Update Credentials
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="space-y-5">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-border pb-1">
            {(["overview", "subscriptions", "users"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-bold border-b-2 capitalize transition-all ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "overview" ? "System Overview" : tab === "subscriptions" ? "Subscription Billing" : "Registered Users"}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <>
              {/* Real stat cards */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Registered Users",
                    value: loadingStats ? "…" : subStats?.totalUsers ?? "—",
                    icon: Users,
                    color: "text-sky-500",
                    bg: "bg-sky-500/10",
                  },
                  {
                    label: "Active Subscribers",
                    value: loadingStats ? "…" : subStats?.totalSubscribers ?? "—",
                    icon: Zap,
                    color: "text-amber-500",
                    bg: "bg-amber-500/10",
                  },
                  {
                    label: "MTD Revenue",
                    value: loadingStats ? "…" : subStats != null ? `₹${subStats.totalMtdRevenueInRupees}` : "—",
                    icon: CreditCard,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    label: "Backend Status",
                    value: backendHealth ? "Online" : "Offline",
                    icon: Activity,
                    color: backendHealth ? "text-emerald-500" : "text-destructive",
                    bg: backendHealth ? "bg-emerald-500/10" : "bg-destructive/10",
                  },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:-translate-y-1 transition-transform">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg} mb-3`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Backend capabilities */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-black mb-4">System Health</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "MIME Validation", status: true },
                    { label: "Rate Limiting", status: true },
                    { label: "Admin Guard", status: true },
                    { label: "Secure File Deletion", status: true },
                    { label: "LibreOffice (Office Conversion)", status: backendHealth?.services?.libreoffice_headless === "available" },
                    { label: "FFmpeg (Video Processing)", status: backendHealth?.services?.ffmpeg === "available" },
                  ].map(({ label, status }) => (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                      <span className="font-semibold">{label}</span>
                      {status
                        ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                        : <span className="flex items-center gap-1 text-xs font-bold text-amber-500"><AlertTriangle className="h-3.5 w-3.5" /> Unavailable</span>
                      }
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Rules (dynamic config data & interactive builder) */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black">Document Event Rules & Dynamic Schemes</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure strict multipart document uploading rules & templates dynamically</p>
                  </div>
                  <button
                    onClick={() => setShowCreator(!showCreator)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/95 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{showCreator ? "Cancel" : "Build Dynamic Rule"}</span>
                  </button>
                </div>

                {/* Collapsible Creator Form */}
                {showCreator && (
                  <div className="rounded-xl border border-border bg-muted/35 p-4 space-y-4 animate-scale-in">
                    <h3 className="text-xs font-black uppercase tracking-wider text-primary">New Scheme Blueprint Builder</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Unique Scheme ID</label>
                        <input
                          value={schemeId}
                          onChange={(e) => setSchemeId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                          placeholder="e.g. aikyashree-scholar"
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Scheme Title</label>
                        <input
                          value={schemeTitle}
                          onChange={(e) => setSchemeTitle(e.target.value)}
                          placeholder="e.g. Aikyashree Scholarship"
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Naming ZIP Pattern</label>
                        <input
                          value={schemePattern}
                          onChange={(e) => setSchemePattern(e.target.value)}
                          placeholder="e.g. {name}_aikyashree.zip"
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground"
                        />
                      </div>
                    </div>

                    {/* Document constraint listing */}
                    <div className="border-t border-border/80 pt-3 space-y-3">
                      <h4 className="text-[11px] font-black text-foreground">Document Slot Requirements ({currentSlots.length} defined)</h4>
                      
                      {currentSlots.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-1">
                          {currentSlots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-semibold">
                              <span>📁 {slot.label} (<span className="text-[10px] text-primary">{slot.id}</span> · Max {slot.maxSizeKb}KB)</span>
                              <button
                                onClick={() => handleRemoveSlot(index)}
                                className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Slot Constraint Subsection */}
                      <div className="grid gap-3 sm:grid-cols-4 items-end bg-card p-3 rounded-lg border border-border">
                        <div>
                          <label className="block text-[9px] font-bold text-muted-foreground mb-1">Slot Key</label>
                          <input
                            value={slotKey}
                            onChange={(e) => setSlotKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                            placeholder="e.g. income_cert"
                            className="w-full rounded-md border border-border bg-background p-1.5 text-xs font-mono text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-muted-foreground mb-1">Slot Label</label>
                          <input
                            value={slotLabel}
                            onChange={(e) => setSlotLabel(e.target.value)}
                            placeholder="e.g. Family Income Certificate"
                            className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-muted-foreground mb-1">Resolution / Format Requirement</label>
                          <input
                            value={slotTarget}
                            onChange={(e) => setSlotTarget(e.target.value)}
                            placeholder="e.g. PDF under 500 KB"
                            className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-muted-foreground mb-1">Max KB Limit</label>
                          <input
                            type="number"
                            value={slotMaxKb}
                            onChange={(e) => setSlotMaxKb(Number(e.target.value))}
                            placeholder="500"
                            className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground"
                          />
                        </div>
                        <div className="sm:col-span-4 flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddSlot}
                            className="rounded bg-secondary hover:bg-secondary/80 px-3 py-1.5 font-bold text-[10px] text-foreground border border-border cursor-pointer transition"
                          >
                            + Add Document Slot Rule
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                      <button
                        onClick={() => setShowCreator(false)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveScheme}
                        className="rounded-lg bg-primary px-4 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/95 shadow-premium shadow-glow-sm cursor-pointer"
                      >
                        Publish & Initialize Scheme 🚀
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="bg-muted/60 text-xs uppercase text-muted-foreground text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-3">Event/Scheme Name</th>
                        <th className="px-3 py-3">Doc Slots</th>
                        <th className="px-3 py-3">Naming ZIP Pattern</th>
                        <th className="px-3 py-3">Source</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Predefined static event rules */}
                      {eventRules.map((rule) => (
                        <tr key={rule.id} className="border-t border-border hover:bg-muted/20 transition">
                          <td className="px-3 py-3">
                            <span className="font-bold text-foreground">{rule.title}</span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">
                            <div className="flex gap-1.5 flex-wrap">
                              {rule.documents.map((d: any) => (
                                <span key={d.id} className="inline-flex rounded-md bg-secondary/80 px-1.5 py-0.5 text-[9px] font-black text-muted-foreground" title={d.target}>
                                  {d.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{rule.namingPattern}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-black text-indigo-500">
                              System Preset
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Custom Dynamic Rules created by dynamic builder in local storage */}
                      {customRules.map((rule) => (
                        <tr key={rule.id} className="border-t border-border hover:bg-muted/20 transition bg-primary/2">
                          <td className="px-3 py-3">
                            <span className="font-bold text-primary">{rule.title}</span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">
                            <div className="flex gap-1.5 flex-wrap">
                              {rule.documents.map((d: any) => (
                                <span key={d.id} className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary" title={d.target}>
                                  {d.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-sans text-xs font-bold text-foreground">{rule.namingPattern}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-500">
                              Custom Rule
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              onClick={() => handleDeleteScheme(rule.id)}
                              className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 rounded hover:bg-red-500/10 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── SUBSCRIPTIONS TAB ── */}
          {activeTab === "subscriptions" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
                {[
                  { label: "Total Active", value: subStats?.totalSubscribers ?? 0, color: "text-primary" },
                  { label: "Basic Plan (₹19)", value: subStats?.activeBasic ?? 0, color: "text-emerald-500" },
                  { label: "Pro Plan (₹39)", value: subStats?.activePro ?? 0, color: "text-sky-500" },
                  { label: "Elite Plan (₹59)", value: subStats?.activeElite ?? 0, color: "text-violet-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className={`mt-2 text-3xl font-black ${color}`}>
                      {loadingStats ? "…" : value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Revenue */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Revenue (Active Subscriptions)</p>
                <p className="mt-2 text-4xl font-black text-emerald-500">
                  {loadingStats ? "…" : `₹${subStats?.totalMtdRevenueInRupees ?? 0}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Based on current active subscriptions only</p>
              </div>

              {/* Recent signups table */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-up">
                <h2 className="font-black mb-4">Recent Subscriptions</h2>
                {subStats?.recentSignups?.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-3">Name</th>
                          <th className="px-3 py-3">Email</th>
                          <th className="px-3 py-3">Plan</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subStats.recentSignups.map((sub: any, idx: number) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-3 py-3 font-bold">{sub.name}</td>
                            <td className="px-3 py-3 text-muted-foreground text-xs">{sub.email}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${planBadge(sub.plan)}`}>
                                {sub.plan}
                              </span>
                            </td>
                            <td className={`px-3 py-3 font-semibold text-xs ${sub.status === "active" ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {sub.status}
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {new Date(sub.date).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="font-bold">No subscriptions yet</p>
                    <p className="text-xs mt-1">Active subscriber data will appear here once users subscribe.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {activeTab === "users" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-black mb-2">Registered Users</h2>
              <p className="text-xs text-muted-foreground mb-4">Total registered: <span className="font-bold text-foreground">{loadingStats ? "…" : subStats?.totalUsers ?? "—"}</span></p>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="font-bold">User list available via API</p>
                <p className="text-xs mt-1">Connect to the database directly or use the /api/v1/auth/me endpoint per user session.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
