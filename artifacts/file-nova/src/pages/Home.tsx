import { AppLanguage, automationPillars, eventRules, getRuleCompletion, quickActions, } from "@/lib/document-automation";
import { useLanguage, useTranslation } from "@/lib/i18n";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Download,
  FileArchive,
  FileCheck2,
  FolderTree,
  Gauge,
  Globe2,
  Languages,
  LayoutDashboard,
  Lock,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  WandSparkles,
  WifiOff,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useAdmin } from "@/lib/admin";
import { apiClient } from "@/lib/api";
import { DownloadHub } from "@/components/workspace/DownloadHub";
import { OptionsPanel } from "@/components/workspace/OptionsPanel";
import { PreviewCanvas } from "@/components/workspace/PreviewCanvas";
import { ProgressTracker } from "@/components/workspace/ProgressTracker";
import { ToolGrid } from "@/components/workspace/ToolGrid";
import { UploadZone } from "@/components/workspace/UploadZone";
// (document-automation already imported at top)

const languageLabels: Record<AppLanguage, string> = {
  en: "English",
  bn: "বাংলা",
  hi: "हिन्दी",
};

export default function Home() {
  const {
    files,
    selectedOperation,
    isProcessing,
    downloadUrl,
    backendHealthy,
    backendCapabilities,
    setBackendStatus,
    selectedSection,
    setSelectedSection,
    setOperation,
    updateOptions,
    clearStore,
  } = useFileStore();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(eventRules[0].id);
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  const selectedRule = useMemo(
    () => eventRules.find((rule) => rule.id === selectedRuleId) || eventRules[0],
    [selectedRuleId],
  );
  const t = useTranslation();
  const completion = getRuleCompletion(selectedRule, files.length);
  const step = downloadUrl ? 3 : files.length > 0 && selectedOperation ? 2 : files.length > 0 ? 1 : 0;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // SEO: Set page title dynamically for Google
  useEffect(() => {
    document.title = "FileNova – PDF Merge, Compress, Convert & Document Tools | filenova.in";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "FileNova provides free online tools to merge PDF, compress PDF, convert images to PDF, resize images, extract text (OCR), and automate Indian government document workflows."
      );
    }
  }, []);

  // language persistence handled by LanguageProvider

  useEffect(() => {
    const fetchHealth = async () => {
      const res = await apiClient.checkHealth();
      setBackendStatus(res.healthy, res.capabilities);
      if (!res.healthy) useFileStore.setState({ isMockMode: true });
    };
    fetchHealth();
    const interval = window.setInterval(fetchHealth, 30000);
    return () => window.clearInterval(interval);
  }, [setBackendStatus]);

  const admin = useAdmin();
  useEffect(() => {
    if (admin.settings.standaloneMode) {
      useFileStore.setState({ isMockMode: true });
    }
  }, [admin.settings.standaloneMode]);

  const startFixMode = () => {
    clearStore();
    setSelectedSection(null);
  };

  const openQuickAction = (category: string, action: string) => {
    clearStore();
    setSelectedSection(category as "pdf" | "image" | "office" | "video");
    if (action === "compress") setOperation("compress");
    if (action === "enhance") setOperation("enhance");
    if (action === "ocr") {
      setOperation("edit");
      updateOptions({ operation: "pdf_ocr" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={startFixMode} className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border">
                <img src={logoUrl} alt="FileNova logo" className="h-8 w-auto" />
              </div>
              <div className="hidden sm:block">
                <p className="text-base font-black leading-none">{t.logoTitle}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t.logoSubtitle}</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card/60 p-1">
              {(["en", "bn", "hi"] as AppLanguage[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${language === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {languageLabels[code]}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
                <LayoutDashboard className="h-4 w-4" />
                {t.admin}
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Pricing</span>
              </Link>
              <Link href="/premium" className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="font-black">Premium</span>
              </Link>
              <button
                onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            <button onClick={() => setMobileMenuOpen((v) => !v)} className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-card/95 px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {(["en", "bn", "hi"] as AppLanguage[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code);
                      setMobileMenuOpen(false);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${language === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    {languageLabels[code]}
                  </button>
                ))}
              </div>
              <Link href="/premium" className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="font-black">Premium</span>
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Pricing</span>
              </Link>
              <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
                <LayoutDashboard className="h-4 w-4" />
                {t.admin}
              </Link>
            </div>
          </div>
        )}
      </header>

      {!backendHealthy && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs font-bold text-amber-500">
          <WifiOff className="mr-2 inline h-4 w-4" />
          Standalone mode is active. Local browser tools still work; server queue features are offline.
        </div>
      )}
      {backendHealthy && (!backendCapabilities.ffmpeg || !backendCapabilities.libreoffice) && (
        <div className="border-b border-sky-500/20 bg-sky-500/10 px-4 py-2 text-center text-xs font-bold text-sky-500">
          Some video and office conversions may run in fallback mode until FFmpeg/LibreOffice are enabled.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        {files.length === 0 && (
          <div className="space-y-8">
            <section className="grid items-stretch gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-premium"
              >
                <div className="grid min-h-[520px] gap-0 lg:grid-cols-[1fr_360px]">
                  <div className="flex flex-col justify-between p-5 sm:p-8 text-center lg:text-left">
                    <div className="space-y-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-secondary px-3 py-1.5 text-xs font-bold text-primary mx-auto lg:mx-0">
                        <ShieldCheck className="h-4 w-4" />
                        {t.builtFor}
                      </div>
                      <div className="space-y-4">
                        <h1 className="max-w-3xl mx-auto lg:mx-0 text-4xl font-black leading-tight sm:text-5xl md:text-6xl lg:text-6xl">
                          {t.fixMode}
                          <span className="block text-primary">{t.logoSubtitle}</span>
                        </h1>
                        <p className="max-w-2xl mx-auto lg:mx-0 text-sm leading-7 text-muted-foreground sm:text-base">
                          {t.assistantCopy} {""}{t.aiRecommendation4}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {automationPillars.map(({ label, value }) => (
                            <div key={label} className="rounded-2xl border border-soft bg-secondary p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
                              <p className="mt-3 text-lg font-black text-foreground">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={startFixMode} disabled={!admin.settings.editingEnabled} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${admin.settings.editingEnabled ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                          <Sparkles className="h-4 w-4" />
                          {t.startOneClick}
                        </button>
                        <button onClick={() => setSelectedSection("pdf")} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary/30 hover:bg-secondary">
                          <FileArchive className="h-4 w-4 text-primary" />
                          {t.openTools}
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      {automationPillars.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-xl border border-border bg-background/70 p-3 animate-fade-up transition-transform hover:-translate-y-1">
                          <Icon className="h-4 w-4 text-primary" />
                          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="text-sm font-black">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border bg-muted/30 p-4 lg:border-l lg:border-t-0">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t.assistantTitle}</p>
                          <h2 className="text-lg font-black">{selectedRule.title}</h2>
                        </div>
                        <Bot className="h-7 w-7 text-primary" />
                      </div>
                      <div className="space-y-3">
                        {selectedRule.documents.slice(0, 5).map((doc, index) => (
                          <div key={doc.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3">
                            <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${index < files.length ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                              {index < files.length ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold">{doc.label}</p>
                              <p className="text-xs text-muted-foreground">{doc.target}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl bg-background p-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold">
                          <span>Readiness score</span>
                          <span>{completion}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-panel">
                  <div className="mb-3 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    <h2 className="font-black">{t.upload}</h2>
                  </div>
                  <UploadZone allowedCategory={selectedSection} />
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-panel">
                  <h2 className="mb-4 text-lg font-black">{t.aiRecommendationsTitle}</h2>
                  <div className="space-y-3">
                    {[t.aiRecommendation1, t.aiRecommendation2, t.aiRecommendation3, t.aiRecommendation4].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-soft bg-secondary p-4 text-sm">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Zap className="h-4 w-4" />
                        </div>
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t.mostUsedServicesTitle}</p>
                    <h2 className="text-xl font-black">{t.governmentWorkflows}</h2>
                  </div>
                  <Globe2 className="h-5 w-5 text-primary" />
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {eventRules.map((rule) => {
                    const Icon = rule.icon;
                    const active = selectedRule.id === rule.id;
                      return (
                      <button
                        key={rule.id}
                        onClick={() => setSelectedRuleId(rule.id)}
                        className={`group rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-secondary shadow-soft" : "border-border bg-card hover:border-primary/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-500">{rule.popularity}% used</span>
                        </div>
                        <h3 className="mt-4 font-black">{rule.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{rule.description}</p>
                        <div className="mt-3 flex items-center justify-between text-xs font-bold text-primary">
                          <span>{rule.documents.length} document rules</span>
                          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Instant quick actions</p>
                      <h2 className="text-xl font-black">One-tap tools for common portal limits</h2>
                    </div>
                    <Gauge className="h-5 w-5 text-primary" />
                  </div>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {quickActions.map(({ label, icon: Icon, category, action }) => (
                      <button
                        key={label}
                        onClick={() => openQuickAction(category, action)}
                          className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/30 hover:bg-secondary"
                      >
                        <span className="flex items-center gap-3 text-sm font-bold">
                          <Icon className="h-5 w-5 text-primary" />
                          {label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["PWA mobile", "Offline basics + low-network uploads", Languages],
                    ["Secure queue", "Rate limit, scan hooks, encryption", Lock],
                    ["Download center", "History, resumed uploads, batch ZIP", Download],
                  ].map(([title, copy, Icon]) => (
                    <div key={title as string} className="rounded-xl border border-border bg-card p-4">
                      {React.createElement(Icon as typeof Download, { className: "h-5 w-5 text-primary" })}
                      <p className="mt-4 text-sm font-black">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Advanced file tools</p>
                  <h2 className="text-xl font-black">Compress, convert, OCR, resize and clean scans</h2>
                </div>
                <button onClick={() => setSelectedSection(null)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold">
                  <Play className="h-4 w-4" />
                  Show all
                </button>
              </div>
              <ToolGrid />
            </section>
          </div>
        )}

        {files.length > 0 && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <button onClick={clearStore} className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    Reset workflow
                  </button>
                  <h1 className="text-2xl font-black">Submission workspace</h1>
                  <p className="text-sm text-muted-foreground">Files are checked against {selectedRule.title} rules, then compressed, renamed and packed.</p>
                </div>
                <div className="min-w-[220px] rounded-xl bg-background p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold">
                    <span>Completion</span>
                    <span>{completion}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <aside className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  <h2 className="font-black">Required checklist</h2>
                </div>
                {selectedRule.documents.map((doc, index) => (
                  <div key={doc.id} className="rounded-xl border border-border bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{doc.label}</p>
                      {index < files.length ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{doc.target}</p>
                    <p className="mt-2 font-mono text-[11px] text-primary">{doc.outputName}</p>
                  </div>
                ))}
              </aside>

              <div className="space-y-5">
                <div className="flex items-center justify-center overflow-x-auto rounded-2xl border border-border bg-card p-3">
                  {[
                    ["Upload", Upload],
                    ["Configure", WandSparkles],
                    ["Download", FileCheck2],
                  ].map(([label, Icon], index) => (
                    <React.Fragment key={label as string}>
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${step >= index + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {React.createElement(Icon as typeof Upload, { className: "h-4 w-4" })}
                        {label as string}
                      </div>
                      {index < 2 && <div className="mx-2 h-px w-10 bg-border" />}
                    </React.Fragment>
                  ))}
                </div>

                {step === 1 && (
                  <div className="space-y-5">
                    <PreviewCanvas />
                    <ToolGrid />
                  </div>
                )}
                {step === 2 && (isProcessing ? <ProgressTracker /> : <><PreviewCanvas /><OptionsPanel /></>)}
                {step === 3 && <DownloadHub />}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ✅ SEO: Keyword section — visible to search engines, styled subtly for users */}
      <section aria-label="FileNova Tool Directory" className="border-t border-border bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-6 text-center text-lg font-black">All File & Document Tools</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 text-center">
            {[
              { name: "PDF Merge", desc: "Combine multiple PDFs into one file" },
              { name: "Compress PDF", desc: "Reduce PDF file size for email & portals" },
              { name: "Image to PDF", desc: "Convert JPG, PNG images to PDF instantly" },
              { name: "PDF to Image", desc: "Extract pages from PDF as images" },
              { name: "OCR PDF", desc: "Extract text from scanned documents" },
              { name: "Resize Image", desc: "Change image dimensions & resolution" },
              { name: "Compress Image", desc: "Reduce image size without quality loss" },
              { name: "Image Converter", desc: "Convert between JPG, PNG, WEBP formats" },
              { name: "Document Converter", desc: "Convert Word, Excel to PDF" },
              { name: "PDF Split", desc: "Split a PDF into separate pages" },
              { name: "Watermark PDF", desc: "Add text or image watermarks to PDF" },
              { name: "Unlock PDF", desc: "Remove password protection from PDF" },
            ].map(({ name, desc }) => (
              <div key={name} className="rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition">
                <p className="text-sm font-bold text-foreground">{name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-4">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            FileNova — Free online PDF tools, image converters, and document automation for everyone.
            Merge PDF &bull; Compress PDF &bull; Image to PDF &bull; OCR &bull; Document Converter &bull; Government Form Automation
          </p>
        </div>
      </section>
    </div>
  );
}
