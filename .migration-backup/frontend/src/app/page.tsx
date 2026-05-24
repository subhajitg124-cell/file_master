'use client';

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
  Sun, 
  Moon, 
  ShieldCheck, 
  Cpu, 
  AlertTriangle,
  FileText,
  Sparkles,
  Video,
  FileSpreadsheet,
  ArrowLeft,
  Settings2,
  FolderOpen
} from 'lucide-react';

export default function Home() {
  const {
    files,
    selectedOperation,
    isProcessing,
    downloadUrl,
    isMockMode,
    toggleMockMode,
    backendHealthy,
    backendCapabilities,
    setBackendStatus,
    selectedSection,
    setSelectedSection,
    clearStore
  } = useFileStore();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Sync health check
  useEffect(() => {
    const fetchHealth = async () => {
      const res = await apiClient.checkHealth();
      setBackendStatus(res.healthy, res.capabilities);
      
      // If backend is not available, default to mock mode automatically
      if (!res.healthy) {
        useFileStore.setState({ isMockMode: true });
      }
    };
    fetchHealth();
    
    // Interval check every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [setBackendStatus]);

  // Sync search query parameter or localStorage workspace preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sectionParam = params.get('section');
      
      if (sectionParam && ['pdf', 'image', 'video', 'office'].includes(sectionParam)) {
        setSelectedSection(sectionParam as any);
      } else {
        const lastWorkspace = localStorage.getItem('file-master-last-workspace');
        if (lastWorkspace && ['pdf', 'image', 'video', 'office'].includes(lastWorkspace)) {
          setSelectedSection(lastWorkspace as any);
        }
      }
    }
  }, [setSelectedSection]);

  // Handle HTML dark class toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (nextTheme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  };

  const getWizardStep = () => {
    if (downloadUrl) return 3;
    if (files.length > 0 && selectedOperation) return 2;
    return 1;
  };

  const step = getWizardStep();

  // Suite configuration parameters
  const suites = [
    {
      id: 'pdf' as const,
      title: 'PDF Suite',
      subtitle: 'Merge & Compress',
      description: 'Combine multiple PDF files or shrink sizes while retaining font schemas and file integrity.',
      icon: FileText,
      color: 'text-red-500 border-red-500/20 hover:border-red-500/50 bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10 dark:hover:bg-red-500/20',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.03)] hover:shadow-[0_0_30px_rgba(239,68,68,0.08)]',
      tools: 'Merge PDFs • Compress PDF'
    },
    {
      id: 'image' as const,
      title: 'Image Lab',
      subtitle: 'Enhance & Convert',
      description: 'Optimize image dimensions and format constraints. Sharpen, denoise, or convert formats losslessly.',
      icon: Sparkles,
      color: 'text-blue-500 border-blue-500/20 hover:border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/20',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.03)] hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]',
      tools: 'Compress • Enhance Details • Format Converter'
    },
    {
      id: 'office' as const,
      title: 'Office Documents',
      subtitle: 'Convert & Clean',
      description: 'Convert DOCX, PPTX, or XLSX formats into standardized layouts. Render Markdown to HTML files.',
      icon: FileSpreadsheet,
      color: 'text-emerald-500 border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.03)] hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]',
      tools: 'DOCX/PPTX to PDF • XLSX to CSV • Layout Standardizer • Markdown to HTML'
    },
    {
      id: 'video' as const,
      title: 'Video Studio',
      subtitle: 'Trim & Compress',
      description: 'Cut parts of video clips with precise timeline markers or encode to optimized space-saving sizes.',
      icon: Video,
      color: 'text-violet-500 border-violet-500/20 hover:border-violet-500/50 bg-violet-500/5 dark:bg-violet-500/10 hover:bg-violet-500/10 dark:hover:bg-violet-500/20',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.03)] hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]',
      tools: 'Timeline Trimmer • MP4 Compression'
    }
  ];

  const getWorkspaceTitle = () => {
    if (selectedSection === 'pdf') return 'PDF Suite';
    if (selectedSection === 'image') return 'Image Laboratory';
    if (selectedSection === 'office') return 'Office & Text Suite';
    if (selectedSection === 'video') return 'Video Processing Studio';
    return 'Specialized Workspace';
  };

  const getWorkspaceDescription = () => {
    if (selectedSection === 'pdf') return 'Combine PDF documents or reduce page dimensions and structural file streams.';
    if (selectedSection === 'image') return 'Adjust parameters, enhance pixel detail quality, and reformat images.';
    if (selectedSection === 'office') return 'Convert document layouts to PDF, export spreadsheets, or render markdown files.';
    if (selectedSection === 'video') return 'Trim video intervals and re-encode codecs with custom configurations.';
    return 'Configure your files with secure processing tools.';
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            onClick={() => clearStore()} 
            className="flex items-center space-x-3 cursor-pointer group"
            role="button"
            tabIndex={0}
            aria-label="Back to dashboard home"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') clearStore();
            }}
          >
            <div className="h-9 w-9 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center shadow-premium group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="File Master Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-foreground">File Master</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">All-in-one manipulation platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Mock Mode Switch */}
            <div className="hidden sm:flex items-center space-x-2 bg-muted/60 border border-border px-3 py-1.5 rounded-lg text-xs">
              <span className="text-muted-foreground font-medium">Standalone Mode</span>
              <button
                onClick={toggleMockMode}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isMockMode ? 'bg-primary' : 'bg-secondary'
                }`}
                role="switch"
                aria-checked={isMockMode}
                aria-label="Toggle standalone simulation mode"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isMockMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Dark/Light mode button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-card hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-all"
              aria-label="Toggle dark/light mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Health/Dependency capabilities Alert */}
      {!isMockMode && !backendHealthy && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-2.5 px-4 text-center text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center justify-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>FastAPI backend is offline. Automatically running in Standalone Simulator mode.</span>
        </div>
      )}
      {!isMockMode && backendHealthy && (!backendCapabilities.ffmpeg || !backendCapabilities.libreoffice) && (
        <div className="bg-violet-500/15 border-b border-violet-500/20 py-2 px-4 text-center text-xs text-violet-600 dark:text-violet-400 flex items-center justify-center space-x-2 font-medium">
          <Cpu className="h-4 w-4 shrink-0" />
          <span>
            Notice: {!backendCapabilities.libreoffice && 'LibreOffice is unavailable (Office docs convert will fall back to ReportLab). '}
            {!backendCapabilities.ffmpeg && 'FFmpeg is unavailable (Video trim will run copy fallback).'}
          </span>
        </div>
      )}

      {/* Main content container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8 bg-gradient-premium">
        
        {/* Step Indicator Wizard */}
        {files.length > 0 && (
          <div className="w-full max-w-2xl mx-auto flex items-center justify-between text-center relative px-2">
            {/* Connector Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 -z-10" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-300"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />
            
            {/* Step 1 */}
            <div className="flex flex-col items-center bg-background px-4">
              <span className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                step >= 1 ? 'border-primary bg-primary text-primary-foreground shadow-premium' : 'border-border bg-card text-muted-foreground'
              }`}>
                1
              </span>
              <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>Upload</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center bg-background px-4">
              <span className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                step >= 2 ? 'border-primary bg-primary text-primary-foreground shadow-premium' : 'border-border bg-card text-muted-foreground'
              }`}>
                2
              </span>
              <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Configure</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center bg-background px-4">
              <span className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                step >= 3 ? 'border-primary bg-primary text-primary-foreground shadow-premium' : 'border-border bg-card text-muted-foreground'
              }`}>
                3
              </span>
              <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>Export</span>
            </div>
          </div>
        )}

        {/* Wizard step render */}
        <div className="space-y-6 pt-2">
          {files.length === 0 && selectedSection === null ? (
            /* Main Dashboard Grid with Framer Motion */
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              <div className="text-center space-y-3 max-w-lg mx-auto">
                <h2 className="text-3xl font-black text-foreground sm:text-4xl tracking-tight">Secure, Instant File Processing</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All work happens client-side or in sandboxed execution environments. Select a specialized workspace or drop files directly to begin.
                </p>
              </div>

              {/* Universal Dropzone Card */}
              <div className="w-full max-w-2xl mx-auto space-y-4">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-extrabold text-primary tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                    Universal Dropzone
                  </span>
                </div>
                <UploadZone allowedCategory={null} />
              </div>

              <div className="border-t border-border pt-8 max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <p className="text-xs uppercase font-extrabold text-muted-foreground tracking-widest">Or select a specialized workspace</p>
                </div>
                
                {/* Suites Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {suites.map((suite) => (
                    <div
                      key={suite.id}
                      onClick={() => setSelectedSection(suite.id)}
                      className={`group border rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between ${suite.color} ${suite.glow} hover:-translate-y-0.5`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Enter ${suite.title}. ${suite.description}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedSection(suite.id);
                      }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 bg-card border border-border rounded-xl group-hover:scale-105 transition-all">
                            <suite.icon className="h-7 w-7" />
                          </div>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                            {suite.subtitle}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-black text-foreground">{suite.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{suite.description}</p>
                        </div>
                      </div>
                      <div className="border-t border-border/60 mt-6 pt-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase truncate pr-2">
                          {suite.tools}
                        </span>
                        <span className="text-xs font-black text-primary group-hover:translate-x-1 transition-transform">
                          Enter Workspace &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : files.length === 0 && selectedSection !== null ? (
            /* Specialized Suite Workspace View */
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Suite Header with Back Nav */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 max-w-4xl mx-auto">
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase transition-all mb-2"
                    aria-label="Back to dashboard home"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Dashboard</span>
                  </button>
                  <h2 className="text-2xl font-black text-foreground flex items-center space-x-2">
                    <span>{getWorkspaceTitle()}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">{getWorkspaceDescription()}</p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                  <span>Choose operations and import files below:</span>
                </div>
              </div>

              {/* Workspace UploadZone */}
              <div className="space-y-4">
                <UploadZone allowedCategory={selectedSection} />
              </div>

              {/* Tools display before uploading */}
              <div className="max-w-4xl mx-auto border-t border-border pt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-extrabold text-primary tracking-widest">
                    Available Workspace Tools
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    Click a tool to select a file directly for that action
                  </span>
                </div>
                <ToolGrid />
              </div>
            </motion.div>
          ) : (
            /* Processing Wizard flow (files uploaded) */
            <div className="space-y-6">
              {step === 1 && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4 max-w-4xl mx-auto">
                    <button
                      onClick={() => clearStore()}
                      className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase transition-all"
                      aria-label="Clear active queue and return to dashboard"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Reset Workspace</span>
                    </button>
                    <span className="text-xs font-bold bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
                      Workspace Queue: {files.length} {files.length === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  <PreviewCanvas />

                  <div className="border-t border-border pt-8 max-w-4xl mx-auto space-y-6">
                    <div className="text-center">
                      <p className="text-xs uppercase font-extrabold text-primary tracking-widest">Select Operation to Run</p>
                    </div>
                    <ToolGrid />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {isProcessing ? (
                    <ProgressTracker />
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-border pb-4 max-w-4xl mx-auto">
                        <button
                          onClick={() => useFileStore.setState({ selectedOperation: null })}
                          className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground font-bold uppercase transition-all"
                          aria-label="Back to operation selection"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Change Operation</span>
                        </button>
                        <span className="text-xs font-bold bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
                          Ready for execution
                        </span>
                      </div>
                      
                      <PreviewCanvas />
                      <OptionsPanel />
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="animate-fade-in">
                  <DownloadHub />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>GDPR-Compliant. Zero persistent storage. Files auto-expiring in 30 minutes.</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#accessibility" className="hover:underline">WCAG 2.1 AA Conformity</a>
            <span>•</span>
            <span>Version 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
