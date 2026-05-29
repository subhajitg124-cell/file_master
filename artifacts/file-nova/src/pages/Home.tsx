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
import { TestingNotice } from "@/components/TestingNotice";
import { VisualGuideModal } from "@/components/workspace/VisualGuideModal";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

const languageLabels: Record<AppLanguage, string> = {
  en: "English",
  bn: "বাংলা",
  hi: "हिन्दी",
};

const showcaseSlides = [
  {
    image: "document_processing_mockup.png",
    alt: "FileNova Document Workspace mockup",
    stickers: [
      { type: "pdf", text: ".pdf", className: "-top-3 -left-3 bg-red-500/90 hover:bg-red-500" },
      { type: "check", text: "Ready to Upload", className: "-bottom-3 -right-2 bg-emerald-500/95 hover:bg-emerald-500", delay: "1s" },
      { type: "zap", text: "Auto Resize", className: "top-1/2 -right-4 -translate-y-1/2 bg-indigo-600/90 hover:bg-indigo-600", delay: "2s" },
      { type: "secure", text: "100% Client-Side", className: "-bottom-2 -left-2 bg-slate-900/90 hover:bg-slate-900", delay: "1.5s" }
    ]
  },
  {
    image: "photo_resize_mockup.png",
    alt: "Passport Size Photo & Signature Workspace",
    stickers: [
      { type: "photo", text: "Passport Photo", className: "-top-3 -left-3 bg-emerald-600/90 hover:bg-emerald-600" },
      { type: "crop", text: "Signature Crop", className: "-bottom-3 -right-2 bg-amber-500/90 hover:bg-amber-500", delay: "0.8s" },
      { type: "size", text: "200x230 px Target", className: "top-1/3 -right-4 bg-sky-600/90 hover:bg-sky-600", delay: "1.8s" }
    ]
  },
  {
    image: "aadhaar_mask_mockup.png",
    alt: "Aadhaar Card Masking & Secure Processing",
    stickers: [
      { type: "shield", text: "Aadhaar Masking", className: "-top-3 -left-3 bg-indigo-600/90 hover:bg-indigo-600" },
      { type: "lock", text: "Secure Privacy", className: "-bottom-3 -right-2 bg-violet-600/90 hover:bg-violet-600", delay: "1.2s" },
      { type: "key", text: "AES-256 Encrypted", className: "top-1/2 -right-4 -translate-y-1/2 bg-emerald-600/90 hover:bg-emerald-600", delay: "2.2s" }
    ]
  }
];

const actionColorMeta: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  compress:  { bg: "bg-amber-505/10 text-amber-500", text: "text-amber-500", border: "border-amber-550/20", hover: "hover:border-amber-400 hover:bg-amber-500/5 hover:text-amber-400" },
  aadhaar:   { bg: "bg-indigo-500/10 text-indigo-500", text: "text-indigo-500", border: "border-indigo-500/20", hover: "hover:border-indigo-400 hover:bg-indigo-500/5 hover:text-indigo-400" },
  signature: { bg: "bg-rose-500/10 text-rose-500", text: "text-rose-500", border: "border-rose-500/20", hover: "hover:border-rose-400 hover:bg-rose-500/5 hover:text-rose-400" },
  photo:     { bg: "bg-emerald-500/10 text-emerald-500", text: "text-emerald-500", border: "border-emerald-500/20", hover: "hover:border-emerald-400 hover:bg-emerald-500/5 hover:text-emerald-400" },
  enhance:   { bg: "bg-teal-500/10 text-teal-500", text: "text-teal-500", border: "border-teal-500/20", hover: "hover:border-teal-400 hover:bg-teal-500/5 hover:text-teal-400" },
  ocr:       { bg: "bg-violet-500/10 text-violet-500", text: "text-violet-500", border: "border-violet-500/20", hover: "hover:border-violet-400 hover:bg-violet-500/5 hover:text-violet-400" },
  zip:       { bg: "bg-sky-500/10 text-sky-500", text: "text-sky-500", border: "border-sky-500/20", hover: "hover:border-sky-400 hover:bg-sky-500/5 hover:text-sky-400" },
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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("filenova-theme");
    return saved === "light" || saved === "dark" ? saved : "light";
  });
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(eventRules[0].id);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
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
    localStorage.setItem("filenova-theme", theme);
  }, [theme]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % showcaseSlides.length);
    }, 4500);
    return () => clearInterval(timer);
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
    if (action === "compress") {
      setOperation("compress");
    } else if (action === "enhance") {
      setOperation("enhance");
    } else if (action === "ocr") {
      setOperation("edit");
      updateOptions({ operation: "pdf_ocr" });
    } else if (action === "aadhaar") {
      setOperation("resize");
      updateOptions({ operation: "resize", resizeType: "dimensions", width: 856, height: 540 });
    } else if (action === "signature") {
      setOperation("resize");
      updateOptions({ operation: "resize", resizeType: "dimensions", width: 280, height: 80 });
    } else if (action === "photo") {
      setOperation("resize");
      updateOptions({ operation: "resize", resizeType: "dimensions", width: 200, height: 230 });
    } else if (action === "zip") {
      setOperation("convert");
      updateOptions({ operation: "html_to_zip" });
    }
    setTimeout(() => {
      document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const themeClass = admin.settings.eventTheme && admin.settings.eventTheme !== "none"
    ? `event-theme-${admin.settings.eventTheme}`
    : "";

  return (
    <div className={`min-h-screen bg-background text-foreground bg-mesh pb-24 ${themeClass}`}>
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
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card/60 p-1">
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

            <div className="hidden md:flex items-center gap-2">
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground mr-1"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <UserProfileDropdown />
            </div>

            <button onClick={() => setMobileMenuOpen((v) => !v)} className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 px-4 py-3">
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
              <div className="pt-1.5 border-t border-border mt-1">
                <UserProfileDropdown />
              </div>
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
          <div className="space-y-8 animate-fade-in">
            {/* Row 1: Hero Banner */}
            <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 glass shadow-premium p-8 sm:p-12 card-shine animated-lines-bg">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-secondary px-3 py-1.5 text-xs font-bold text-primary mx-auto lg:mx-0">
                    <ShieldCheck className="h-4 w-4" />
                    {t.builtFor}
                  </div>
                  <h1 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
                    <span className="gradient-text">{t.fixMode}</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-550 to-cyan-555 mt-2 leading-none">{t.logoSubtitle}</span>
                  </h1>
                  <p className="text-sm leading-7 text-muted-foreground sm:text-base max-w-2xl mx-auto lg:mx-0">
                    {t.assistantCopy} {t.aiRecommendation4}
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                    <button onClick={startFixMode} disabled={!admin.settings.editingEnabled} className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black transition duration-300 transform hover:-translate-y-1 ${admin.settings.editingEnabled ? 'bg-primary text-primary-foreground shadow-soft shadow-glow' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                      <Sparkles className="h-4 w-4" />
                      {t.startOneClick}
                    </button>
                    <button onClick={() => {
                      document.getElementById("tools-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition duration-300 transform hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary">
                      <FileArchive className="h-4 w-4 text-primary" />
                      {t.openTools}
                    </button>
                  </div>
                </div>

                {/* Right side: Mockup Showcase with floating stickers */}
                <div className="relative flex flex-col justify-center items-center lg:pl-4 w-full max-w-lg">
                  {/* Decorative mesh background behind image */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 via-purple-500/10 to-cyan-500/10 rounded-3xl blur-2xl opacity-60 animate-glow-breathe pointer-events-none" />

                  {/* Main mockup frame */}
                  <div className="relative overflow-hidden w-full aspect-[4/3] max-h-[300px] rounded-2xl border border-border/80 bg-card/85 p-2 shadow-2xl glass transition-all duration-500">
                    <div className="relative w-full h-full">
                      {showcaseSlides.map((slide, index) => (
                        <div
                          key={index}
                          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                            index === activeSlide 
                              ? "opacity-100 scale-100 z-10 pointer-events-auto" 
                              : "opacity-0 scale-95 z-0 pointer-events-none"
                          }`}
                        >
                          <img 
                            src={`${import.meta.env.BASE_URL}${slide.image}`} 
                            alt={slide.alt} 
                            className="rounded-lg shadow-inner w-full h-full object-cover border border-border/40"
                          />
                          
                          {/* Floating stickers / badges */}
                          {slide.stickers.map((sticker, idx) => (
                            <div
                              key={idx}
                              style={{ animationDelay: sticker.delay || "0s" }}
                              className={`absolute animate-float rounded-xl text-white font-black text-xs px-3 py-1.5 shadow-lg border border-white/10 flex items-center gap-1.5 cursor-default transition-all duration-300 ${sticker.className}`}
                            >
                              {sticker.type === "pdf" && <FileCheck2 className="h-3 w-3" />}
                              {sticker.type === "check" && <CheckCircle2 className="h-4 w-4 text-white fill-white/10" />}
                              {sticker.type === "zap" && <Zap className="h-3 w-3 text-amber-300" />}
                              {sticker.type === "secure" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                              {sticker.type === "photo" && <WandSparkles className="h-3 w-3" />}
                              {sticker.type === "crop" && <FileArchive className="h-3 w-3" />}
                              {sticker.type === "size" && <Gauge className="h-3 w-3 text-amber-300" />}
                              {sticker.type === "shield" && <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />}
                              {sticker.type === "lock" && <Lock className="h-3 w-3" />}
                              {sticker.type === "key" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                              <span>{sticker.text}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slider dots indicators */}
                  <div className="flex gap-2.5 mt-4 z-10">
                    {showcaseSlides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveSlide(index)}
                        className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                          index === activeSlide 
                            ? "w-8 bg-primary shadow-glow-sm" 
                            : "w-2.5 bg-muted hover:bg-muted-foreground/50"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Automation pillars section */}
            <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {automationPillars.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-border/80 bg-card/60 glass p-5 shadow-soft hover:shadow-panel hover:border-primary/30 transition-all hover:-translate-y-1 duration-300 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-base font-black mt-0.5 text-foreground leading-tight">{value}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Visual Shortcuts Grid */}
            <section id="shortcuts-grid-section" className="space-y-4">
              <div className="text-center lg:text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Easy Access Tiles</p>
                <h2 className="text-xl font-black text-foreground">Clickable visual shortcuts for portal uploads</h2>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                {quickActions.map(({ label, icon: Icon, category, action }) => {
                  const meta = actionColorMeta[action] || { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", hover: "hover:border-primary hover:bg-primary/5" };
                  return (
                    <button
                      key={label}
                      onClick={() => openQuickAction(category, action)}
                      className={`group flex flex-col justify-between items-start rounded-2xl border p-4 text-left transition duration-300 transform hover:-translate-y-1 cursor-pointer bg-card/65 glass shadow-soft hover:shadow-panel ${meta.border} ${meta.hover}`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg} ${meta.text} shadow-inner group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-black text-foreground leading-snug group-hover:text-primary transition-colors">{label}</h3>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">{category.toUpperCase()} TOOL</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Row 2: Assistant & Upload dropzone */}
            <section className="grid items-stretch gap-6 grid-cols-1 lg:grid-cols-12">
              {/* Left: Smart Government Assistant checklist */}
              <div className="rounded-2xl border border-border bg-card shadow-premium glass lg:col-span-7 xl:col-span-8 p-6 sm:p-8 card-shine">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t.assistantTitle}</p>
                    <h2 className="text-xl font-black">{selectedRule.title}</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="h-6 w-6" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedRule.documents.map((doc, index) => (
                    <div key={doc.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-primary/30">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${index < files.length ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                        {index < files.length ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{doc.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.target}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-background/60 p-4 border border-border/50">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold">
                    <span>Readiness score</span>
                    <span>{completion}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>

              {/* Right: Upload documents dropzone & AI recommendations */}
              <div id="upload-section" className="space-y-4 lg:col-span-5 xl:col-span-4">
                <div className="rounded-2xl border border-border bg-card/60 glass p-5 shadow-panel card-shine">
                  <div className="mb-3 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    <h2 className="font-black">{t.upload}</h2>
                  </div>
                  <UploadZone allowedCategory={selectedSection} />
                </div>
                <div className="rounded-2xl border border-border bg-card/60 glass p-5 shadow-panel card-shine">
                  <h2 className="mb-4 text-lg font-black">{t.aiRecommendationsTitle}</h2>
                  <div className="space-y-3">
                    {[t.aiRecommendation1, t.aiRecommendation2, t.aiRecommendation3, t.aiRecommendation4].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-soft bg-secondary/50 p-4 text-sm hover:border-primary/20 transition-colors">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Zap className="h-4 w-4" />
                        </div>
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Attractive Real Example Showcase Section */}
            <section className="rounded-3xl border border-border/80 bg-card/40 glass p-6 sm:p-8 shadow-premium relative overflow-hidden card-shine">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
              
              <div className="mx-auto max-w-3xl text-center mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-primary mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Real-Life Portal Solved Examples</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">How FileNova Solves Strict Government Portal Limits</h2>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Most government portals in India (like Scholarship, PAN, Passport, Admissions) reject files that aren't cropped, sized, or compressed to exact limits. See how FileNova processes them automatically.</p>
              </div>

              {/* Showcase interactive component */}
              <ShowcaseComparison />
            </section>

            {/* Visual Step-by-Step User Guide Section */}
            <section className="rounded-3xl border border-border/80 bg-card/40 glass p-6 sm:p-8 shadow-premium relative overflow-hidden card-shine">
              <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
              
              <div className="mx-auto max-w-3xl text-center mb-10">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-primary mb-3">
                  <Play className="h-3.5 w-3.5 text-primary fill-primary/10 animate-pulse" />
                  <span>Step-by-Step Instructions</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">{t.guideTitle}</h2>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{t.guideSubtitle}</p>
              </div>

              {/* Stepper Steps Grid */}
              <div className="grid gap-6 md:grid-cols-4 relative">
                {/* Horizontal connector line for large screens */}
                <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/30 via-indigo-400/20 to-emerald-500/30 z-0" />

                {/* Step 1 */}
                <div className="rounded-2xl border border-border bg-card/65 p-5 relative z-10 hover:border-primary/40 hover:-translate-y-1 transition duration-300 flex flex-col justify-between h-full group">
                  <div className="flex justify-between items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                      <WandSparkles className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-black text-primary/20 select-none group-hover:text-primary/35 transition-colors">01</span>
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="font-bold text-foreground text-sm leading-snug">{t.step1Title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.step1Desc}</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-2xl border border-border bg-card/65 p-5 relative z-10 hover:border-indigo-400/40 hover:-translate-y-1 transition duration-300 flex flex-col justify-between h-full group">
                  <div className="flex justify-between items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 shadow-inner">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-black text-indigo-500/20 select-none group-hover:text-indigo-500/35 transition-colors">02</span>
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="font-bold text-foreground text-sm leading-snug">{t.step2Title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.step2Desc}</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="rounded-2xl border border-border bg-card/65 p-5 relative z-10 hover:border-purple-400/40 hover:-translate-y-1 transition duration-300 flex flex-col justify-between h-full group">
                  <div className="flex justify-between items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 shadow-inner">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <span className="text-3xl font-black text-purple-500/20 select-none group-hover:text-purple-500/35 transition-colors">03</span>
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="font-bold text-foreground text-sm leading-snug">{t.step3Title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.step3Desc}</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="rounded-2xl border border-border bg-card/65 p-5 relative z-10 hover:border-emerald-400/40 hover:-translate-y-1 transition duration-300 flex flex-col justify-between h-full group">
                  <div className="flex justify-between items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                      <Download className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-black text-emerald-500/20 select-none group-hover:text-emerald-500/35 transition-colors">04</span>
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="font-bold text-foreground text-sm leading-snug">{t.step4Title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.step4Desc}</p>
                  </div>
                </div>
              </div>
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
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {eventRules.map((rule) => {
                    const Icon = rule.icon;
                    const active = selectedRule.id === rule.id;
                      return (
                      <button
                        key={rule.id}
                        onClick={() => {
                          setSelectedRuleId(rule.id);
                          setTimeout(() => {
                            document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 100);
                        }}
                        className={`group rounded-2xl border p-4 text-left transition duration-300 transform hover:-translate-y-1 ${
                          active
                            ? "border-primary bg-secondary/80 shadow-soft shadow-glow-sm"
                            : "border-border bg-card hover:border-primary/45 hover:shadow-soft"
                        }`}
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
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {quickActions.map(({ label, icon: Icon, category, action }) => (
                      <button
                        key={label}
                        onClick={() => openQuickAction(category, action)}
                        className="group flex items-center justify-between rounded-2xl border border-border bg-card/60 glass p-4 text-left transition duration-300 transform hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary card-shine"
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

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {[
                    ["PWA mobile", "Offline basics + low-network uploads", Languages],
                    ["Secure queue", "Rate limit, scan hooks, encryption", Lock],
                    ["Download center", "History, resumed uploads, batch ZIP", Download],
                  ].map(([title, copy, Icon]) => (
                    <div key={title as string} className="rounded-xl border border-border bg-card/60 glass p-4 transition duration-300 hover:border-primary/30 card-shine">
                      {React.createElement(Icon as typeof Download, { className: "h-5 w-5 text-primary" })}
                      <p className="mt-4 text-sm font-black">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="tools-section" className="rounded-2xl border border-border bg-card/60 glass p-6 shadow-premium card-shine mt-8">
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

      {/* AdSense Unit placement */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <AdSenseUnit type="multiplex" />
      </div>

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
          <div className="mt-6 border-t border-border/40 pt-4 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-4">
            <span>Testing & feedback: <a href="mailto:pixelsubhajit@gmail.com" className="underline font-bold text-foreground">pixelsubhajit@gmail.com</a></span>
          </div>
        </div>
      </section>

      {/* Visual Guide Modal */}
      <VisualGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md rounded-2xl border border-border/80 bg-card/85 backdrop-blur-lg shadow-premium px-4 py-2.5 flex items-center justify-between gap-1">
        {/* Home / Reset */}
        <button
          onClick={startFixMode}
          className="flex flex-col items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          title="Return to Home / Clear Files"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Home</span>
        </button>

        {/* Quick Shortcuts */}
        <button
          onClick={() => {
            document.getElementById("shortcuts-grid-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          title="Scroll to Quick Actions"
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Shortcuts</span>
        </button>

        {/* Visual Guide Modal */}
        <button
          onClick={() => setGuideOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          title="Open Visual Step-by-Step Guide"
        >
          <Bot className="h-4 w-4 text-indigo-400 animate-bounce" />
          <span>Visual Guide</span>
        </button>

        {/* Toggle Language shortcut */}
        <button
          onClick={() => {
            const langs: AppLanguage[] = ["en", "bn", "hi"];
            const nextLang = langs[(langs.indexOf(language) + 1) % langs.length];
            setLanguage(nextLang);
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          title="Switch Language"
        >
          <Languages className="h-4 w-4 text-emerald-400" />
          <span>{languageLabels[language]}</span>
        </button>
      </div>
    </div>
  );
}

function ShowcaseComparison() {
  const [activeTab, setActiveTab] = useState<"aadhaar" | "photo" | "signature">("aadhaar");

  const examples = {
    aadhaar: {
      title: "Aadhaar Card Front & Back",
      portal: "Lakshmir Bhandar / Scholarship Portals",
      limit: "PDF file, size under 200 KB",
      rawName: "IMG_2026_0528_SCAN.jpg",
      rawSize: "3.4 MB",
      rawDetails: "Messy border, shadow from mobile camera, wrong format (JPG)",
      rawStatus: "Rejected by Portal ❌",
      outName: "aadhaar_card_optimized.pdf",
      outSize: "148 KB",
      outDetails: "Auto-cropped, noise reduction, compiled to PDF format",
      outStatus: "100% Accepted ✅"
    },
    photo: {
      title: "Passport Size Photo",
      portal: "PAN Card / College Admission Portals",
      limit: "JPG format, exact 200 x 230 px, under 50 KB",
      rawName: "my_pic_full.png",
      rawSize: "1.8 MB",
      rawDetails: "High-resolution background, uncropped, size too large",
      rawStatus: "Rejected by Portal ❌",
      outName: "passport_photo.jpg",
      outSize: "34 KB",
      outDetails: "Face centered, scaled to 200x230px, compressed under 50KB",
      outStatus: "100% Accepted ✅"
    },
    signature: {
      title: "Applicant Signature Scan",
      portal: "Job Application / Scholar Portals",
      limit: "JPG format, exact 140 x 60 px, under 30 KB",
      rawName: "sig_raw_photo.jpg",
      rawSize: "840 KB",
      rawDetails: "Yellowish paper background, blurred, size too large",
      rawStatus: "Rejected by Portal ❌",
      outName: "signature_optimized.jpg",
      outSize: "18 KB",
      outDetails: "Contrast boosted to make white paper clean, signature lines sharp",
      outStatus: "100% Accepted ✅"
    }
  };

  const selected = examples[activeTab];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex justify-center gap-2 border-b border-border/50 pb-3">
        {(Object.keys(examples) as Array<keyof typeof examples>).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
              activeTab === key
                ? "bg-primary text-primary-foreground shadow-md shadow-glow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {key === "aadhaar" ? "Aadhaar Card" : key === "photo" ? "Passport Photo" : "Signature Scan"}
          </button>
        ))}
      </div>

      {/* Grid Comparison */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Raw Scan Card */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-2 right-2 rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-500 uppercase tracking-wider">
            {selected.rawStatus}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Raw Mobile Scan (Input)
            </h3>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{selected.rawName}</p>
            
            {/* Visual representation */}
            <div className="my-5 rounded-xl border border-red-500/20 bg-background/80 p-4 h-36 flex flex-col justify-center items-center relative opacity-85">
              {/* Overlay cross grid lines */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10 pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-red-500" />
                ))}
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-black text-red-500">{selected.rawSize}</p>
                <p className="text-[10px] text-red-400/90 font-bold uppercase tracking-wider">{selected.rawDetails}</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-red-500/10 pt-3 text-xs text-muted-foreground flex justify-between items-center">
            <span>Portal Target: {selected.limit}</span>
            <span className="font-bold text-red-500">Failed Limit</span>
          </div>
        </div>

        {/* Optimized Card */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-2 right-2 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
            {selected.outStatus}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              FileNova Clean Output
            </h3>
            <p className="mt-1 font-mono text-[11px] text-primary">{selected.outName}</p>

            {/* Visual representation */}
            <div className="my-5 rounded-xl border border-emerald-500/25 bg-background p-4 h-36 flex flex-col justify-center items-center relative shadow-sm">
              {/* Sparkle background details */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 pointer-events-none" />
              <div className="text-center space-y-1">
                <p className="text-2xl font-black text-emerald-500">{selected.outSize}</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  {selected.outDetails}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-500/10 pt-3 text-xs text-muted-foreground flex justify-between items-center">
            <span>Required Limit: {selected.limit}</span>
            <span className="font-bold text-emerald-500">Optimized Perfect</span>
          </div>
        </div>
      </div>
    </div>
  );
}
