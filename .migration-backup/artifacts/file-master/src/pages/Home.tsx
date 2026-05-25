import React, { useEffect, useState } from 'react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient } from '@/lib/api';
import { UploadZone } from '@/components/workspace/UploadZone';
import { PreviewCanvas } from '@/components/workspace/PreviewCanvas';
import { ToolGrid } from '@/components/workspace/ToolGrid';
import { OptionsPanel } from '@/components/workspace/OptionsPanel';
import { ProgressTracker } from '@/components/workspace/ProgressTracker';
import { DownloadHub } from '@/components/workspace/DownloadHub';
import { motion } from 'framer-motion';
import {
  Sun, Moon, ShieldCheck, Zap, AlertTriangle, FileText, Sparkles,
  Video, FileSpreadsheet, ArrowLeft, FolderOpen, Cpu, Lock
} from 'lucide-react';

const SUITES = [
  {
    id: 'pdf' as const,
    title: 'PDF Suite',
    subtitle: 'Merge & Compress',
    description: 'Merge multiple PDFs, compress, split pages, or convert to DOCX, PPTX, and images.',
    icon: FileText,
    toolCount: 7,
    accentFrom: 'from-red-500',
    accentTo: 'to-rose-500',
    cardBg: 'bg-gradient-to-br from-red-500/8 to-rose-500/4',
    borderClass: 'border-red-500/15 hover:border-red-500/40',
    glowClass: 'hover:shadow-glow-red',
    iconBg: 'bg-gradient-to-br from-red-500/20 to-rose-500/10',
    iconColor: 'text-red-400',
    tools: ['Merge', 'Compress', 'Split', 'PDF→DOCX', 'PDF→PPTX', 'PDF→Images', 'Images→PDF'],
  },
  {
    id: 'image' as const,
    title: 'Image Lab',
    subtitle: 'Enhance & Convert',
    description: 'Compress, enhance, resize, convert formats, make ICO favicons, or convert SVG to PNG.',
    icon: Sparkles,
    toolCount: 7,
    accentFrom: 'from-blue-500',
    accentTo: 'to-cyan-500',
    cardBg: 'bg-gradient-to-br from-blue-500/8 to-cyan-500/4',
    borderClass: 'border-blue-500/15 hover:border-blue-500/40',
    glowClass: 'hover:shadow-glow-blue',
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-400',
    tools: ['Compress', 'Enhance', 'Resize', 'Format Convert', 'To ICO', 'SVG→PNG', 'Images→PDF'],
  },
  {
    id: 'office' as const,
    title: 'Office Suite',
    subtitle: 'Convert & Clean',
    description: 'Convert DOCX, PPTX, XLSX — with full bi-directional PDF support and document cleanup.',
    icon: FileSpreadsheet,
    toolCount: 10,
    accentFrom: 'from-emerald-500',
    accentTo: 'to-teal-500',
    cardBg: 'bg-gradient-to-br from-emerald-500/8 to-teal-500/4',
    borderClass: 'border-emerald-500/15 hover:border-emerald-500/40',
    glowClass: 'hover:shadow-glow-green',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-400',
    tools: ['DOCX↔PDF', 'PPTX↔PDF', 'XLSX→CSV', 'CSV→XLSX', 'MD↔HTML', 'Compress', 'Clean'],
  },
  {
    id: 'video' as const,
    title: 'Video Studio',
    subtitle: 'Trim & Compress',
    description: 'Trim video clips, compress MP4, extract audio, convert to GIF, or compress audio files.',
    icon: Video,
    toolCount: 5,
    accentFrom: 'from-violet-500',
    accentTo: 'to-purple-500',
    cardBg: 'bg-gradient-to-br from-violet-500/8 to-purple-500/4',
    borderClass: 'border-violet-500/15 hover:border-violet-500/40',
    glowClass: 'hover:shadow-glow-purple',
    iconBg: 'bg-gradient-to-br from-violet-500/20 to-purple-500/10',
    iconColor: 'text-violet-400',
    tools: ['Trim & Cut', 'Compress', 'Extract Audio', 'Video→GIF', 'Compress Audio'],
  },
];

const TRUST_BADGES = [
  { icon: Lock,       label: 'Zero server storage',    desc: 'Files never leave your device for client-side ops' },
  { icon: Zap,        label: 'Instant processing',     desc: 'Most operations complete in seconds' },
  { icon: ShieldCheck,label: 'GDPR compliant',         desc: 'Auto-expiry on all temporary files' },
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
      setSelectedSection(sec as any);
    } else {
      const last = localStorage.getItem('file-master-last-workspace');
      if (last && ['pdf', 'image', 'video', 'office'].includes(last)) setSelectedSection(last as any);
    }
  }, [setSelectedSection]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const step = downloadUrl ? 3 : (files.length > 0 && selectedOperation) ? 2 : 1;

  const workspaceMeta: Record<string, { title: string; desc: string }> = {
    pdf:    { title: 'PDF Suite',               desc: 'Merge, compress, split, and convert PDF documents.' },
    image:  { title: 'Image Lab',               desc: 'Compress, enhance, resize, and convert images client-side.' },
    office: { title: 'Office & Text Suite',     desc: 'Convert documents, spreadsheets, presentations, and markup.' },
    video:  { title: 'Video Processing Studio', desc: 'Trim, compress, and convert video and audio files.' },
  };
  const ws = selectedSection ? workspaceMeta[selectedSection] : null;

  return (
    <div className="flex flex-col min-h-screen bg-background bg-mesh transition-colors duration-300">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={() => clearStore()}
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="Back to home"
          >
            <div className="h-8 w-8 rounded-xl overflow-hidden border border-border shadow-sm group-hover:scale-105 transition-transform duration-200">
              <img src="/icon.png" alt="File Master" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-foreground">File Master</span>
              <span className="block text-[9px] text-muted-foreground font-medium uppercase tracking-widest">All-in-one platform</span>
            </div>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Standalone mode toggle */}
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
              className="h-8 w-8 flex items-center justify-center rounded-xl bg-card/60 hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Banners ─────────────────────────────────────────────────────────── */}
      {!isMockMode && !backendHealthy && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          FastAPI backend is offline — running in Standalone Simulator mode.
        </div>
      )}
      {!isMockMode && backendHealthy && (!backendCapabilities.ffmpeg || !backendCapabilities.libreoffice) && (
        <div className="bg-violet-500/10 border-b border-violet-500/20 py-2 px-4 text-center text-xs text-violet-500 dark:text-violet-400 flex items-center justify-center gap-2 font-medium">
          <Cpu className="h-3.5 w-3.5 shrink-0" />
          {!backendCapabilities.libreoffice && 'LibreOffice unavailable. '}
          {!backendCapabilities.ffmpeg && 'FFmpeg unavailable.'}
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">

        {/* ── Wizard step indicator (when files loaded) ── */}
        {files.length > 0 && (
          <div className="w-full max-w-sm mx-auto flex items-center justify-between relative px-2">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2 -z-10" />
            <motion.div
              className="absolute top-1/2 left-0 h-px bg-primary -translate-y-1/2 -z-10 transition-all duration-500"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />
            {[{l:'Upload',n:1},{l:'Configure',n:2},{l:'Export',n:3}].map(({l,n}) => (
              <div key={n} className="flex flex-col items-center bg-background px-3 gap-1.5">
                <span className={`h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 ${step >= n ? 'border-primary bg-primary text-primary-foreground shadow-glow' : 'border-border bg-card text-muted-foreground'}`}>
                  {n}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${step >= n ? 'text-primary' : 'text-muted-foreground'}`}>{l}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── DASHBOARD ───────────────────────────────────────────────────── */}
        {files.length === 0 && selectedSection === null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-12"
          >
            {/* Hero */}
            <div className="text-center space-y-5 max-w-2xl mx-auto pt-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border bg-card/80 border-border text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                29+ tools · Client-side processing · Zero storage
              </motion.div>

              <h2 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-balance">
                <span className="gradient-text">Secure, Instant</span>
                <br />
                <span className="text-foreground">File Processing</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                All work happens client-side or in sandboxed environments.
                Drop any file to auto-detect its type, or pick a workspace below.
              </p>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 flex-wrap pt-1">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Universal drop zone */}
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="text-center">
                <span className="text-[10px] uppercase font-extrabold text-primary tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                  Universal Dropzone
                </span>
              </div>
              <UploadZone allowedCategory={null} />
            </div>

            {/* Workspace cards */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs uppercase font-extrabold text-muted-foreground tracking-widest">Or select a specialized workspace</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                {SUITES.map((suite) => (
                  <motion.div
                    key={suite.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedSection(suite.id)}
                    className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 overflow-hidden ${suite.cardBg} ${suite.borderClass} ${suite.glowClass}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSection(suite.id); }}
                    aria-label={`Enter ${suite.title}`}
                  >
                    {/* Animated gradient hover overlay */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${suite.accentFrom}/5 via-transparent ${suite.accentTo}/5`} />

                    <div className="relative space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-2xl ${suite.iconBg} border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                          <suite.icon className={`h-6 w-6 ${suite.iconColor}`} />
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold ${suite.iconColor} bg-current/10 rounded-full px-2 py-0.5 opacity-70`}
                            style={{ background: 'currentColor', opacity: 0.15 }}>
                          </span>
                          <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${suite.iconColor} opacity-70`}>{suite.subtitle}</span>
                          <span className={`block text-lg font-black ${suite.iconColor}`}>{suite.toolCount}</span>
                          <span className="block text-[9px] text-muted-foreground font-medium -mt-0.5">tools</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-foreground mb-1">{suite.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{suite.description}</p>
                      </div>

                      {/* Tool pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {suite.tools.slice(0, 4).map((t) => (
                          <span key={t} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${suite.iconBg} ${suite.iconColor} border border-current/10`}>
                            {t}
                          </span>
                        ))}
                        {suite.tools.length > 4 && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            +{suite.tools.length - 4} more
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center justify-between text-xs font-bold border-t border-border/50 pt-3 ${suite.iconColor}`}>
                        <span className="opacity-60 text-muted-foreground">Enter workspace</span>
                        <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── WORKSPACE TOOL SELECT (no files yet) ──────────────────────── */}
        {files.length === 0 && selectedSection !== null && ws && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 max-w-4xl mx-auto">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider transition-colors mb-2"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to Dashboard
                </button>
                <h2 className="text-2xl font-black text-foreground">{ws.title}</h2>
                <p className="text-xs text-muted-foreground">{ws.desc}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                <span>Choose an operation or drop files below</span>
              </div>
            </div>
            <UploadZone allowedCategory={selectedSection} />
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-extrabold text-primary tracking-widest">Available Tools</h3>
                <span className="text-[10px] text-muted-foreground italic">Click a tool to upload and process directly</span>
              </div>
              <ToolGrid />
            </div>
          </motion.div>
        )}

        {/* ── WIZARD STEPS (files loaded) ───────────────────────────────── */}
        {files.length > 0 && (
          <div className="space-y-6">

            {/* Step 1: uploaded, pick tool */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex items-center justify-between border-b border-border pb-4 max-w-4xl mx-auto">
                  <button onClick={() => clearStore()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider transition-colors">
                    <ArrowLeft className="h-3 w-3" /> Reset Workspace
                  </button>
                  <span className="text-xs font-bold bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
                    {files.length} {files.length === 1 ? 'file' : 'files'} ready
                  </span>
                </div>
                <PreviewCanvas />
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="text-center">
                    <p className="text-xs uppercase font-extrabold text-primary tracking-widest">Select an Operation</p>
                  </div>
                  <ToolGrid />
                </div>
              </motion.div>
            )}

            {/* Step 2: configure + process */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {isProcessing ? (
                  <ProgressTracker />
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-border pb-4 max-w-4xl mx-auto">
                      <button
                        onClick={() => useFileStore.setState({ selectedOperation: null })}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider transition-colors"
                      >
                        <ArrowLeft className="h-3 w-3" /> Change Operation
                      </button>
                      <span className="text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-wider">
                        Ready to process
                      </span>
                    </div>
                    <PreviewCanvas />
                    <OptionsPanel />
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: download */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <DownloadHub />
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/20 py-5 mt-12">
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
