import React, { useEffect, useState } from 'react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient } from '@/lib/api';
import { UploadZone } from '@/components/workspace/UploadZone';
import { PreviewCanvas } from '@/components/workspace/PreviewCanvas';
import { ToolGrid } from '@/components/workspace/ToolGrid';
import { OptionsPanel } from '@/components/workspace/OptionsPanel';
import { ProgressTracker } from '@/components/workspace/ProgressTracker';
import { DownloadHub } from '@/components/workspace/DownloadHub';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, ShieldCheck, Zap, AlertTriangle, FileText, Sparkles,
  Video, FileSpreadsheet, ArrowLeft, Cpu, Lock, Check,
  ChevronRight, Upload, Settings, Download, LayoutGrid
} from 'lucide-react';

const SUITES = [
  {
    id: 'pdf' as const,
    title: 'PDF Suite',
    subtitle: 'Documents',
    description: 'Merge, split, edit, annotate, compress, convert, protect, and OCR any PDF.',
    icon: FileText,
    toolCount: 29,
    color: 'red',
    accentFrom: 'from-red-500',
    accentTo: 'to-rose-600',
    cardBg: 'bg-gradient-to-br from-red-500/6 to-rose-600/3',
    border: 'border-red-500/15 hover:border-red-400/40',
    iconBg: 'bg-red-500/15 border-red-500/20',
    iconColor: 'text-red-400',
    badgeBg: 'bg-red-500/10 text-red-400',
    barColor: 'bg-red-400',
    tools: [
      { label: 'Merge PDFs',     sub: 'Merge & Combine' },
      { label: 'Split Pages',    sub: 'Split & Organize' },
      { label: 'Edit & Sign',    sub: 'Edit & Annotate' },
      { label: 'Protect & Lock', sub: 'Security' },
      { label: 'Convert',        sub: 'Convert' },
      { label: 'AI Summarize',   sub: 'AI Tools' },
    ],
  },
  {
    id: 'image' as const,
    title: 'Image Lab',
    subtitle: 'Images',
    description: 'Compress, enhance, resize, crop, remove backgrounds, and convert images.',
    icon: Sparkles,
    toolCount: 11,
    color: 'blue',
    accentFrom: 'from-blue-500',
    accentTo: 'to-cyan-500',
    cardBg: 'bg-gradient-to-br from-blue-500/6 to-cyan-500/3',
    border: 'border-blue-500/15 hover:border-blue-400/40',
    iconBg: 'bg-blue-500/15 border-blue-500/20',
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400',
    barColor: 'bg-blue-400',
    tools: [
      { label: 'Compress',       sub: 'Optimize' },
      { label: 'Resize & Crop',  sub: 'Resize & Transform' },
      { label: 'Remove BG',      sub: 'Edit' },
      { label: 'Format Convert', sub: 'Convert' },
    ],
  },
  {
    id: 'office' as const,
    title: 'Office Suite',
    subtitle: 'Documents & Data',
    description: 'Merge DOCX, convert between Word/PDF/PowerPoint, handle spreadsheets and markup.',
    icon: FileSpreadsheet,
    toolCount: 11,
    color: 'emerald',
    accentFrom: 'from-emerald-500',
    accentTo: 'to-teal-500',
    cardBg: 'bg-gradient-to-br from-emerald-500/6 to-teal-500/3',
    border: 'border-emerald-500/15 hover:border-emerald-400/40',
    iconBg: 'bg-emerald-500/15 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    barColor: 'bg-emerald-400',
    tools: [
      { label: 'Merge Docs',     sub: 'Merge' },
      { label: 'DOCX ↔ PDF',    sub: 'Convert Documents' },
      { label: 'Spreadsheets',   sub: 'Spreadsheets' },
      { label: 'Web & Markup',   sub: 'Web & Markup' },
    ],
  },
  {
    id: 'video' as const,
    title: 'Video Studio',
    subtitle: 'Video & Audio',
    description: 'Trim and compress video, extract audio, convert to GIF, and compress audio files.',
    icon: Video,
    toolCount: 5,
    color: 'violet',
    accentFrom: 'from-violet-500',
    accentTo: 'to-purple-600',
    cardBg: 'bg-gradient-to-br from-violet-500/6 to-purple-600/3',
    border: 'border-violet-500/15 hover:border-violet-400/40',
    iconBg: 'bg-violet-500/15 border-violet-500/20',
    iconColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/10 text-violet-400',
    barColor: 'bg-violet-400',
    tools: [
      { label: 'Trim & Cut',     sub: 'Edit Video' },
      { label: 'Compress Video', sub: 'Edit Video' },
      { label: 'Extract Audio',  sub: 'Convert & Export' },
      { label: 'Video → GIF',   sub: 'Convert & Export' },
    ],
  },
] as const;

type SuiteId = (typeof SUITES)[number]['id'];

const STEPS = [
  { n: 1, label: 'Upload',    icon: Upload },
  { n: 2, label: 'Configure', icon: Settings },
  { n: 3, label: 'Export',    icon: Download },
];

export default function Home() {
  const {
    files, selectedOperation, isProcessing, downloadUrl, isMockMode, toggleMockMode,
    backendHealthy, backendCapabilities, setBackendStatus, selectedSection, setSelectedSection, clearStore
  } = useFileStore();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const fetchHealth = async () => {
      const res = await apiClient.checkHealth();
      setBackendStatus(res.healthy, res.capabilities);
      if (!res.healthy) useFileStore.setState({ isMockMode: true });
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [setBackendStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sec = params.get('section');
    if (sec && ['pdf', 'image', 'video', 'office'].includes(sec)) {
      setSelectedSection(sec as SuiteId);
    } else {
      const last = localStorage.getItem('file-master-last-workspace');
      if (last && ['pdf', 'image', 'video', 'office'].includes(last)) setSelectedSection(last as SuiteId);
    }
  }, [setSelectedSection]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const step = downloadUrl ? 3 : (files.length > 0 && selectedOperation) ? 2 : 1;
  const activeSuite = SUITES.find(s => s.id === selectedSection);

  return (
    <div className="flex flex-col min-h-screen bg-background bg-mesh transition-colors duration-300">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => clearStore()}
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
          >
            <div className="h-8 w-8 rounded-xl overflow-hidden border border-border shadow-sm group-hover:scale-105 transition-transform duration-200">
              <img src="/icon.png" alt="File Master" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="block text-sm font-extrabold tracking-tight text-foreground">File Master</span>
              <span className="block text-[9px] text-muted-foreground font-medium uppercase tracking-widest">All-in-one platform</span>
            </div>
          </button>

          {/* Workspace tab pills — shown once inside a workspace */}
          {(selectedSection || files.length > 0) && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {SUITES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { clearStore(); setSelectedSection(s.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150
                    ${selectedSection === s.id
                      ? `${s.iconBg} border ${s.iconColor}`
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                    }`}
                >
                  <s.icon className="h-3 w-3 shrink-0" />
                  <span className="hidden md:inline">{s.title}</span>
                  <span className="md:hidden">{s.subtitle}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-card/60 border border-border rounded-xl px-3 py-1.5 text-xs">
              <span className="text-muted-foreground font-medium">Standalone</span>
              <button
                onClick={toggleMockMode}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isMockMode ? 'bg-primary' : 'bg-secondary'}`}
                role="switch" aria-checked={isMockMode}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isMockMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <button
              onClick={toggleTheme}
              className="h-8 w-8 flex items-center justify-center rounded-xl bg-card/60 hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── System banners ─────────────────────────────────────────────── */}
      {!isMockMode && !backendHealthy && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 text-center text-xs font-semibold text-amber-500 flex items-center justify-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          FastAPI backend offline — running in Standalone Simulator mode.
        </div>
      )}
      {!isMockMode && backendHealthy && (!backendCapabilities.ffmpeg || !backendCapabilities.libreoffice) && (
        <div className="bg-violet-500/10 border-b border-violet-500/20 py-2 px-4 text-center text-xs text-violet-400 flex items-center justify-center gap-2 font-medium">
          <Cpu className="h-3.5 w-3.5 shrink-0" />
          {!backendCapabilities.libreoffice && 'LibreOffice unavailable. '}
          {!backendCapabilities.ffmpeg && 'FFmpeg unavailable.'}
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ─── DASHBOARD ────────────────────────────────────────────────── */}
          {files.length === 0 && selectedSection === null && (
            <motion.div key="dashboard"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-10"
            >
              {/* Hero */}
              <div className="text-center space-y-4 max-w-2xl mx-auto pt-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border bg-card/80 border-border text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  56+ tools · Client-side processing · Zero storage
                </div>
                <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
                  <span className="gradient-text">Process Any File,</span>
                  <br />
                  <span className="text-foreground">Instantly & Securely</span>
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  PDF, Image, Office, and Video tools — all in one place. Most operations run entirely in your browser.
                </p>
                <div className="flex items-center justify-center gap-5 flex-wrap text-xs text-muted-foreground pt-1">
                  {[
                    { icon: Lock,        label: 'Zero server storage' },
                    { icon: Zap,         label: 'Instant processing' },
                    { icon: ShieldCheck, label: 'GDPR compliant' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Universal upload */}
              <div className="max-w-2xl mx-auto space-y-2.5">
                <p className="text-center text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Drop any file to start</p>
                <UploadZone allowedCategory={null} />
              </div>

              {/* Workspace cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Choose a workspace</h2>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SUITES.map((suite, idx) => (
                    <motion.button
                      key={suite.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedSection(suite.id)}
                      className={`group relative text-left rounded-2xl border p-5 transition-all duration-250 overflow-hidden ${suite.cardBg} ${suite.border} hover:shadow-premium focus:outline-none focus:ring-2 focus:ring-primary/40`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`h-12 w-12 rounded-xl ${suite.iconBg} border flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                          <suite.icon className={`h-6 w-6 ${suite.iconColor}`} />
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-black ${suite.iconColor}`}>{suite.toolCount}</span>
                          <span className="block text-[10px] text-muted-foreground font-semibold -mt-0.5">tools</span>
                        </div>
                      </div>

                      {/* Title & description */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-black text-foreground">{suite.title}</h3>
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${suite.badgeBg}`}>{suite.subtitle}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{suite.description}</p>
                      </div>

                      {/* Tool list */}
                      <div className="space-y-1.5 mb-4">
                        {suite.tools.map((t) => (
                          <div key={t.label} className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${suite.barColor} shrink-0 opacity-70`} />
                            <span className="text-[11px] text-muted-foreground font-medium">{t.label}</span>
                            <span className="text-[10px] text-muted-foreground/50">· {t.sub}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA row */}
                      <div className={`flex items-center justify-between text-xs font-semibold border-t border-border/40 pt-3 ${suite.iconColor}`}>
                        <span className="text-muted-foreground font-medium text-[11px]">Open workspace</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── WORKSPACE (no files yet) ─────────────────────────────────── */}
          {files.length === 0 && selectedSection !== null && activeSuite && (
            <motion.div key={`ws-${selectedSection}`}
              initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              {/* Workspace header */}
              <div className={`rounded-2xl border p-5 ${activeSuite.cardBg} ${activeSuite.border}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl ${activeSuite.iconBg} border flex items-center justify-center shrink-0`}>
                      <activeSuite.icon className={`h-6 w-6 ${activeSuite.iconColor}`} />
                    </div>
                    <div>
                      <button
                        onClick={() => setSelectedSection(null)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider transition-colors mb-0.5"
                      >
                        <ArrowLeft className="h-2.5 w-2.5" /> Dashboard
                      </button>
                      <h2 className="text-xl font-black text-foreground">{activeSuite.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{activeSuite.description}</p>
                    </div>
                  </div>
                  <div className={`text-right shrink-0`}>
                    <span className={`text-3xl font-black ${activeSuite.iconColor}`}>{activeSuite.toolCount}</span>
                    <span className="block text-[10px] text-muted-foreground font-semibold">tools available</span>
                  </div>
                </div>
              </div>

              {/* Upload zone */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Upload a file to get started</p>
                <UploadZone allowedCategory={selectedSection} />
              </div>

              {/* Tool grid with section header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-lg ${activeSuite.iconBg} border flex items-center justify-center`}>
                    <activeSuite.icon className={`h-3 w-3 ${activeSuite.iconColor}`} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">All Tools</h3>
                  <span className="text-xs text-muted-foreground bg-muted/60 border border-border px-2 py-0.5 rounded-full font-medium">{activeSuite.toolCount} available</span>
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground italic hidden sm:block">Click any tool to upload & run instantly</span>
                </div>
                <ToolGrid />
              </div>
            </motion.div>
          )}

          {/* ─── WIZARD (files loaded) ─────────────────────────────────────── */}
          {files.length > 0 && (
            <motion.div key="wizard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-7"
            >
              {/* Step indicator */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-0">
                  {STEPS.map(({ n, label, icon: StepIcon }, i) => {
                    const active = step === n;
                    const done = step > n;
                    return (
                      <React.Fragment key={n}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`h-9 w-9 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                            done  ? 'border-primary bg-primary text-primary-foreground shadow-glow' :
                            active ? 'border-primary bg-primary/10 text-primary' :
                            'border-border bg-card text-muted-foreground'
                          }`}>
                            {done ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${active || done ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 rounded-full transition-all duration-500 ${step > n ? 'bg-primary' : 'bg-border'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Step 1: pick a tool */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <button onClick={() => clearStore()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider transition-colors">
                      <ArrowLeft className="h-3 w-3" /> Reset
                    </button>
                    <span className="text-xs font-bold bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
                      {files.length} {files.length === 1 ? 'file' : 'files'} ready
                    </span>
                  </div>
                  <PreviewCanvas />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-foreground">Select an Operation</h3>
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[10px] text-muted-foreground italic">Suggested tools are highlighted</span>
                    </div>
                    <ToolGrid />
                  </div>
                </motion.div>
              )}

              {/* Step 2: configure */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {isProcessing ? (
                    <ProgressTracker />
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-border pb-4">
                        <button
                          onClick={() => useFileStore.setState({ selectedOperation: null })}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3" /> Change Operation
                        </button>
                        <span className="text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">
                          Ready to process
                        </span>
                      </div>
                      <PreviewCanvas />
                      <OptionsPanel />
                    </>
                  )}
                </motion.div>
              )}

              {/* Step 3: download */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                  <DownloadHub />
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/20 py-5 mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>GDPR-Compliant · Zero persistent storage · Files auto-expire in 30 min</span>
          </div>
          <div className="flex items-center gap-4">
            <span>WCAG 2.1 AA</span>
            <span>·</span>
            <span>v2.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
