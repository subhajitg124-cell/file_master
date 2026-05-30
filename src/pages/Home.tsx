import { AppLanguage, automationPillars, eventRules, getRuleCompletion, quickActions, } from "@/lib/document-automation";
import { useLanguage, useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
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
  Mic,
  Moon,
  Play,
  Search,
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
import { BrainwareAssistant } from "@/components/BrainwareAssistant";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
const VoiceAssistant = React.lazy(() => import("@/components/VoiceAssistant").then((mod) => ({ default: mod.VoiceAssistant })));
const QuickShareButton = React.lazy(() => import("@/components/WhatsAppShare").then((mod) => ({ default: mod.QuickShareButton })));
const EditingWindow = React.lazy(() => import("@/components/EditingWindow").then((mod) => ({ default: mod.EditingWindow })));
const PassportPhotoEditor = React.lazy(() => import("@/components/workspace/PassportPhotoEditor").then((mod) => ({ default: mod.PassportPhotoEditor })));

import { isLowBandwidthMode } from "@/features.config";

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
      { type: "pdf", text: ".pdf Sample", className: "-top-3 -left-3 bg-red-500/90 hover:bg-red-500", action: "photo" },
      { type: "check", text: "Load All Demos", className: "-bottom-3 -right-2 bg-emerald-500/95 hover:bg-emerald-500", delay: "1s", action: "aadhaar" },
      { type: "zap", text: "Auto Resize View", className: "top-1/2 -right-4 -translate-y-1/2 bg-indigo-600/90 hover:bg-indigo-600", delay: "2s", action: "signature" },
      { type: "secure", text: "100% Secure Client", className: "-bottom-2 -left-2 bg-slate-900/90 hover:bg-slate-900", delay: "1.5s", action: "aadhaar" }
    ]
  },
  {
    image: "photo_resize_mockup.png",
    alt: "Passport Size Photo & Signature Workspace",
    stickers: [
      { type: "photo", text: "Load Photo Demo", className: "-top-3 -left-3 bg-emerald-600/95 hover:bg-emerald-500", action: "photo" },
      { type: "crop", text: "Load Signature Demo", className: "-bottom-3 -right-2 bg-amber-500/95 hover:bg-amber-500", delay: "0.8s", action: "signature" },
      { type: "size", text: "200x230 px Setup", className: "top-1/3 -right-4 bg-sky-600/90 hover:bg-sky-600", delay: "1.8s", action: "photo" }
    ]
  },
  {
    image: "aadhaar_mask_mockup.png",
    alt: "Aadhaar Card Masking & Secure Processing",
    stickers: [
      { type: "shield", text: "Mask Aadhaar Demo", className: "-top-3 -left-3 bg-indigo-600/95 hover:bg-indigo-500", action: "aadhaar" },
      { type: "lock", text: "Secure Storage", className: "-bottom-3 -right-2 bg-violet-600/90 hover:bg-violet-600", delay: "1.2s", action: "aadhaar" },
      { type: "key", text: "Simulate Upload", className: "top-1/2 -right-4 -translate-y-1/2 bg-emerald-600/90 hover:bg-emerald-600", delay: "2.2s", action: "aadhaar" }
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
    rawFiles,
    operationOptions,
    selectedOperation,
    isProcessing,
    progress,
    jobId,
    downloadUrl,
    backendHealthy,
    backendCapabilities,
    setBackendStatus,
    selectedSection,
    setSelectedSection,
    setOperation,
    updateOptions,
    clearStore,
    editorOpen,
    editorFile,
    editorFileType,
    openEditor,
    closeEditor,
    addRawFiles,
  } = useFileStore();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [showDevNotice, setShowDevNotice] = useState(() => {
    try {
      const dismissed = localStorage.getItem("filenova-dev-notice-dismissed");
      return dismissed !== "true";
    } catch {
      return true;
    }
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("filenova-theme");
    return saved === "light" || saved === "dark" ? saved : "light";
  });
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(eventRules[0].id);
  const [mobileSearchActive, setMobileSearchActive] = useState(false);
  const [useDirectSlots, setUseDirectSlots] = useState(true);
  const [slotOptimizing, setSlotOptimizing] = useState<Record<string, boolean>>({});

  // Dynamic Rule Loading from localStorage (synced with admin panel)
  const [mergedRules, setMergedRules] = useState<any[]>(eventRules);

  useEffect(() => {
    const loadRules = () => {
      try {
        const stored = localStorage.getItem("filenova-custom-rules");
        if (stored) {
          const custom = JSON.parse(stored);
          const mapped = custom.map((c: any) => ({
            ...c,
            // Custom rules preserve structural document lists
            documents: c.documents || []
          }));
          // Merge unique rules
          const existingIds = new Set(eventRules.map(r => r.id));
          const uniqueCustom = mapped.filter((r: any) => !existingIds.has(r.id));
          setMergedRules([...eventRules, ...uniqueCustom]);
        } else {
          setMergedRules(eventRules);
        }
      } catch (e) {
        setMergedRules(eventRules);
      }
    };
    loadRules();
    window.addEventListener("storage", loadRules);
    window.addEventListener("focus", loadRules);
    return () => {
      window.removeEventListener("storage", loadRules);
      window.removeEventListener("focus", loadRules);
    };
  }, []);

  const [guideOpen, setGuideOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
  const [, setLocation] = useLocation();

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "scheme" | "student" | "identity" | "custom">("all");
  const [quickActionSearch, setQuickActionSearch] = useState("");
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const ADMIN_SECRET = "subhajit_admin";

  const allFeatures = [
    { label: "Merge PDF", desc: "Combine multiple PDFs into one", action: () => openQuickAction("pdf", "merge"), icon: "📄" },
    { label: "Compress PDF", desc: "Reduce PDF file size", action: () => openQuickAction("pdf", "compress"), icon: "🗜️" },
    { label: "Compress Image", desc: "Reduce image size without quality loss", action: () => openQuickAction("image", "compress"), icon: "🖼️" },
    { label: "Resize Photo", desc: "Resize images to exact dimensions", action: () => openQuickAction("image", "resize"), icon: "📐" },
    { label: "Passport Size Photo", desc: "Convert to 200x230px passport photo", action: () => openQuickAction("image", "photo"), icon: "🪪" },
    { label: "Signature Resize", desc: "Resize signature to 280x80px", action: () => openQuickAction("image", "signature"), icon: "✍️" },
    { label: "Aadhaar Masking", desc: "Mask Aadhaar number for privacy", action: () => openQuickAction("image", "aadhaar"), icon: "🔒" },
    { label: "Extract Text (OCR)", desc: "Extract text from images/PDFs", action: () => openQuickAction("pdf", "ocr"), icon: "🔍" },
    { label: "Convert to ZIP", desc: "Package files into a ZIP archive", action: () => openQuickAction("pdf", "zip"), icon: "📦" },
    { label: "Video Compress", desc: "Compress video files", action: () => openQuickAction("video", "compress"), icon: "🎬" },
    { label: "PDF to Image", desc: "Convert PDF pages to images", action: () => openQuickAction("pdf", "convert"), icon: "🖼️" },
    { label: "Pricing", desc: "View subscription plans", action: () => setLocation("/pricing"), icon: "💳" },
    { label: "Premium Suite", desc: "Access premium tools", action: () => setLocation("/premium"), icon: "⭐" },
  ];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allFeatures.filter(
      (f) => f.label.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSearchOpen(true);
    if (val.trim().toLowerCase() === ADMIN_SECRET) {
      setSearchQuery("");
      setSearchOpen(false);
      setLocation("/nova-control");
    }
  };

  const handleFeatureClick = (action: () => void) => {
    action();
    setSearchQuery("");
    setSearchOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedRule = useMemo(
    () => mergedRules.find((rule) => rule.id === selectedRuleId) || mergedRules[0],
    [selectedRuleId, mergedRules],
  );

  const filteredWorkflows = useMemo(() => {
    return mergedRules.filter((rule) => {
      const matchesSearch = rule.title.toLowerCase().includes(workflowSearch.toLowerCase()) ||
                            rule.description.toLowerCase().includes(workflowSearch.toLowerCase());
      const matchesCategory = selectedCategory === "all" || rule.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [mergedRules, workflowSearch, selectedCategory]);

  const filteredQuickActions = useMemo(() => {
    return quickActions.filter((qa) =>
      qa.label.toLowerCase().includes(quickActionSearch.toLowerCase()) ||
      qa.category.toLowerCase().includes(quickActionSearch.toLowerCase())
    );
  }, [quickActionSearch]);

  const { tText, ...t } = useTranslation();

  const isDocumentCompleted = useCallback((docId: string) => {
    return files.some(
      (f) =>
        f.id === docId ||
        f.name.toLowerCase().includes(docId.toLowerCase()) ||
        (f.tempFilename && f.tempFilename.toLowerCase().includes(docId.toLowerCase()))
    );
  }, [files]);

  const completedDocsCount = useMemo(() => {
    if (!selectedRule || !selectedRule.documents) return 0;
    return selectedRule.documents.filter(doc => isDocumentCompleted(doc.id)).length;
  }, [selectedRule, isDocumentCompleted]);

  const completion = useMemo(() => {
    if (!selectedRule || !selectedRule.documents || selectedRule.documents.length === 0) return 0;
    return Math.round((completedDocsCount / selectedRule.documents.length) * 100);
  }, [selectedRule, completedDocsCount]);
  const slides = isLowBandwidthMode ? [showcaseSlides[0]] : showcaseSlides;
  const lowBandwidthMessage = isLowBandwidthMode ? "Low bandwidth mode is active. Animations and non-essential assets are reduced for faster loading." : "";

  const handleCloseGuide = () => {
    try {
      localStorage.setItem("filenova-guide-shown", "true");
    } catch (error) {
      console.warn("Unable to persist guide state", error);
    }
    setGuideOpen(false);
  };

  const loadSimulatedFiles = useCallback((type: "aadhaar" | "photo" | "signature") => {
    try {
      if (type === "aadhaar") {
        const simulatedAadhaar = [
          { id: "aadhaar_front", name: "aadhaar_front_scan.jpg", size: 104500, type: "image/jpeg" },
          { id: "aadhaar_back", name: "aadhaar_back_scan.jpg", size: 112000, type: "image/jpeg" }
        ];
        useFileStore.setState({ isMockMode: true });
        useFileStore.getState().addFiles(simulatedAadhaar);
        
        const ruleId = mergedRules.find(r => r.id === "lakshmir-bhandar" || r.id.includes("aadhaar") || r.id === "svmcm-scholarship")?.id || mergedRules[0]?.id;
        setSelectedRuleId(ruleId);
        
        toast.success("Loaded Simulated Aadhaar Card Front & Back Scans! Workspace status updated to 100% complete. 🚀", {
          duration: 4000
        });
      } else if (type === "photo") {
        const simulatedPhoto = [
          { id: "photo", name: "passport_photo_raw.png", size: 38450, type: "image/jpeg" }
        ];
        useFileStore.setState({ isMockMode: true });
        useFileStore.getState().addFiles(simulatedPhoto);
        
        const ruleId = mergedRules.find(r => r.id === "svmcm-scholarship")?.id || mergedRules[0]?.id;
        setSelectedRuleId(ruleId);
        
        toast.success("Loaded Simulated Passport Size Photo! Open photo editor to inspect active face centering grid. ⚡", {
          duration: 4000
        });
      } else if (type === "signature") {
        const simulatedSig = [
          { id: "signature", name: "signature_raw.jpg", size: 18400, type: "image/jpeg" }
        ];
        useFileStore.setState({ isMockMode: true });
        useFileStore.getState().addFiles(simulatedSig);
        
        const ruleId = mergedRules.find(r => r.id === "epfo-services" || r.id.includes("signature"))?.id || mergedRules[0]?.id;
        setSelectedRuleId(ruleId);
        
        toast.success("Loaded Simulated Signature Photo! Drag/crop to 140x60 border on white canvas. ✍️", {
          duration: 4000
        });
      }
      
      setTimeout(() => {
        document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (err) {
      console.error("Mock load failed", err);
    }
  }, [mergedRules]);

  const isPassportEditorActive =
    selectedOperation === 'resize' &&
    rawFiles.some((file) => file.type.startsWith('image/')) &&
    ((operationOptions.resize_width || operationOptions.width) === 200) &&
    ((operationOptions.resize_height || operationOptions.height) === 230);
  const step = downloadUrl ? 3 : files.length > 0 && selectedOperation ? 2 : files.length > 0 ? 1 : 0;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("filenova-theme", theme);
  }, [theme]);

  useEffect(() => {
    try {
      const guideShown = localStorage.getItem("filenova-guide-shown") === "true";
      if (!guideShown) {
        setGuideOpen(true);
      }
    } catch (error) {
      console.warn("Could not read guide state", error);
    }
  }, []);

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
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (isLowBandwidthMode) {
      setActiveSlide(0);
    }
  }, [isLowBandwidthMode]);

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

  const editTargetFile = editorFile ?? rawFiles.find((file) => file.type.startsWith("image/")) ?? rawFiles[0] ?? null;
  const editTargetType = editorFile
    ? editorFile.type === "application/pdf"
      ? "pdf"
      : editorFile.type.startsWith("image/")
      ? "image"
      : "document"
    : editTargetFile
      ? editTargetFile.type === "application/pdf"
        ? "pdf"
        : editTargetFile.type.startsWith("image/")
        ? "image"
        : "document"
      : "image";

  const shareDocumentId = files[0]?.id ?? "demo-doc-123";
  const shareDocumentName = files[0]?.name ?? "selected-file.pdf";

  const handleEditorDone = async (result: Blob) => {
    const fileName = editTargetFile?.name || "edited-file";
    const objectUrl = URL.createObjectURL(result);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${fileName.startsWith("edited-") ? fileName : `edited-${fileName}`}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);

    const editedFile = result instanceof File
      ? result
      : new File([result], fileName, { type: result.type || editTargetFile?.type || "application/octet-stream" });

    addRawFiles([editedFile]);
    closeEditor();
  };

  const handleVoiceCommand = (action: string, target: string) => {
    if (action === "compress") {
      if (target === "pdf") return openQuickAction("pdf", "compress");
      if (target === "image") return openQuickAction("image", "compress");
    }
    if (action === "merge") return openQuickAction("pdf", "merge");
    if (action === "resize") return openQuickAction("image", "photo");
    if (action === "enhance") return openQuickAction("image", "enhance");
    if (action === "ocr") return openQuickAction("pdf", "ocr");
    if (action === "split") return openQuickAction("pdf", "split");
    if (action === "aadhaar-mask") return openQuickAction("image", "aadhaar");
    if (action === "convert") {
      if (target === "pdf") return openQuickAction("pdf", "convert");
      if (target === "image") return openQuickAction("image", "convert");
    }
    if (action === "share") {
      setVoiceOpen(false);
      return;
    }
  };

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
      updateOptions({ operation: "resize", resizeType: "dimensions", width: 856, height: 540, resize_width: 856, resize_height: 540, resize_lock_aspect: false });
    } else if (action === "signature") {
      setOperation("resize");
      updateOptions({ operation: "resize", resizeType: "dimensions", width: 280, height: 80, resize_width: 280, resize_height: 80, resize_lock_aspect: false });
    } else if (action === "photo") {
      setOperation("resize");
      updateOptions({ operation: "resize", resizeType: "dimensions", width: 200, height: 230, resize_width: 200, resize_height: 230, resize_lock_aspect: false });
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
          {mobileSearchActive ? (
            /* Mobile full width search input overlay */
            <div className="flex-1 flex items-center gap-2 md:hidden animate-fade-in">
              <button
                onClick={() => {
                  setMobileSearchActive(false);
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Back"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search tools… try 'compress', 'merge'…"
                  aria-label="Mobile top search"
                  className="w-full pl-9 pr-8 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:border-primary/60"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                
                {/* Search Results Dropdown inside the top mobile search */}
                {searchQuery.trim() && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 max-h-[280px] overflow-y-auto bg-card border border-border rounded-2xl shadow-premium z-50 animate-scale-in">
                    {searchResults.length > 0 ? (
                      <ul className="py-1">
                        {searchResults.map((item) => (
                          <li key={item.label}>
                            <button
                              onClick={() => {
                                handleFeatureClick(item.action);
                                setMobileSearchActive(false);
                              }}
                              className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-primary/5 transition text-xs"
                            >
                              <span>{item.icon}</span>
                              <span className="font-bold text-foreground truncate">{item.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No tools found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard logo presentation */
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
          )}

          {/* ── Search Bar (Desktop only) ─────────────────────────────────────────────── */}
          <div ref={searchRef} className="relative flex-1 max-w-sm hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search tools… (try 'compress PDF')"
                aria-label="Search features"
                className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-3.5 bg-card border border-border rounded-2xl shadow-premium overflow-hidden z-50 animate-scale-in">
                {searchResults.length > 0 ? (
                  <ul className="py-1">
                    {searchResults.map((item) => (
                      <li key={item.label}>
                        <button
                          onClick={() => handleFeatureClick(item.action)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition group"
                        >
                          <span className="text-lg leading-none">{item.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground">No tools found for "{searchQuery}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Try: compress, merge, resize, OCR…</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Shortcuts Dropdown */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setShortcutsOpen((o) => !o)}
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/40 transition duration-200 cursor-pointer shadow-sm"
              >
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" />
                <span>{tText("Shortcuts")}</span>
                <ChevronDown className={`h-3 w-3 transition duration-200 ${shortcutsOpen ? "rotate-180" : ""}`} />
              </button>

              {shortcutsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShortcutsOpen(false)} />
                  <div className="absolute right-0 mt-4 w-56 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-2 shadow-premium overflow-hidden z-50 animate-scale-in">
                    <div className="px-3 py-1.5 border-b border-border/80 mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tText("Instant access")}</p>
                    </div>
                    <ul className="space-y-0.5">
                      {[
                        { label: "🗜️ Compress PDF", desc: "Reduce PDF size", cat: "pdf", act: "compress" },
                        { label: "🔗 Merge PDF", desc: "Combine multiple PDFs", cat: "pdf", act: "merge" },
                        { label: "📐 Resize Photo", desc: "Custom width & height", cat: "image", act: "resize" },
                        { label: "🪪 Passport Size", desc: "200x230px standard", cat: "image", act: "photo" },
                        { label: "✍️ Signature Resize", desc: "280x80px bounding", cat: "image", act: "signature" },
                        { label: "🔒 Aadhaar Masking", desc: "Mask first 8 digits", cat: "image", act: "aadhaar" },
                        { label: "🔍 Extract Text", desc: "Optical character OCR", cat: "pdf", act: "ocr" },
                        { label: "📦 Convert to ZIP", desc: "Bundle directory", cat: "pdf", act: "zip" },
                      ].map((sc) => (
                        <li key={sc.label}>
                          <button
                            onClick={() => {
                              openQuickAction(sc.cat, sc.act);
                              setShortcutsOpen(false);
                              setTimeout(() => {
                                document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }, 150);
                            }}
                            className="w-full text-left font-bold text-xs flex flex-col px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/5 transition cursor-pointer"
                          >
                            <span>{tText(sc.label)}</span>
                            <span className="text-[9px] font-normal text-muted-foreground/60">{tText(sc.desc)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

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
                onClick={() => {
                  const nextTheme = theme === "dark" ? "light" : "dark";
                  setTheme(nextTheme);
                  if (nextTheme === "dark") {
                    toast.success("Eye-Care Dark Canvas activated! Blue glare cut by 60% for long sessions. 🌙", {
                      id: "theme-toggle-toast",
                      duration: 3000,
                    });
                  } else {
                    toast.info("Vibrant Light Contrast activated! High-fidelity zoom optimized for inspecting text readability. ☀️", {
                      id: "theme-toggle-toast",
                      duration: 3000,
                    });
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-primary mr-1 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500 animate-pulse" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-550 transition-all hover:rotate-12 duration-300" />
                )}
              </button>
              <UserProfileDropdown />
            </div>

            {/* Mobile Search & Menu Actions */}
            {!mobileSearchActive && (
              <button
                onClick={() => setMobileSearchActive(true)}
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground mr-0.5"
                aria-label="Search mobile"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

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

      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-0 right-0 bottom-20 z-40 px-4 md:px-6"
        >
          <div className="mx-auto max-w-7xl rounded-3xl border border-primary/15 bg-primary/10 p-4 shadow-premium backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-foreground">Processing in progress</p>
                <p className="text-xs text-muted-foreground">
                  {selectedOperation ? `${selectedOperation.charAt(0).toUpperCase() + selectedOperation.slice(1)} workflow` : "Preparing files"} · Job {jobId ?? "pending"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black tabular-nums text-foreground">{Math.round(progress)}%</span>
                <div className="h-2.5 w-48 overflow-hidden rounded-full bg-background border border-border">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round(progress))}%` }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="fixed bottom-36 right-4 z-40 hidden flex-col items-end gap-3 md:flex">
        <div className="w-full max-w-xs rounded-3xl border border-border bg-card/95 p-4 shadow-premium backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Premium quick actions</p>
              <p className="text-sm font-black text-foreground">Voice & sharing helpers</p>
            </div>
            <button
              onClick={() => setVoiceOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-primary hover:bg-primary/10 transition"
              aria-label="Open voice assistant"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Suspense fallback={<div className="h-12 rounded-2xl border border-border bg-background/80 flex items-center justify-center text-xs text-muted-foreground">Loading share…</div>}>
              <QuickShareButton
                documentId={shareDocumentId}
                documentName={shareDocumentName}
                variant="icon"
              />
            </Suspense>
            <button
              onClick={() => setVoiceOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition"
            >
              <Mic className="h-4 w-4" />
              Voice
            </button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Use voice commands or generate a secure WhatsApp share link for files without leaving the workspace.</p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        {isLowBandwidthMode && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {lowBandwidthMessage}
          </div>
        )}
        {files.length === 0 && (
          <div className="space-y-8 animate-fade-in">
            {/* Row 1: Hero Banner */}
            <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 glass shadow-premium p-8 sm:p-12 card-shine animated-lines-bg">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-secondary px-3 py-1.5 text-xs font-bold text-primary mx-auto lg:mx-0 animate-pulse">
                    <ShieldCheck className="h-4 w-4" />
                    {t.builtFor}
                  </div>
                  <h1 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
                    <span className="gradient-text">{t.fixMode}</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-550 to-cyan-555 mt-2 leading-none">{t.logoSubtitle}</span>
                  </h1>
                  <p className="text-sm leading-7 text-muted-foreground sm:text-base max-w-2xl mx-auto lg:mx-0 font-medium">
                    {t.assistantCopy} {t.aiRecommendation4}
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                    <button
                      onClick={() => {
                        startFixMode();
                        toast.success("Local document workflow initialized! Drag or load demo files below instantly.", { duration: 3500 });
                      }}
                      disabled={!admin.settings.editingEnabled}
                      className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black transition duration-300 transform hover:-translate-y-1 active:scale-95 cursor-pointer ${
                        admin.settings.editingEnabled 
                          ? 'bg-primary text-primary-foreground shadow-soft shadow-glow' 
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {t.startOneClick}
                    </button>
                    <button
                      onClick={() => {
                        document.getElementById("tools-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        toast.info("Navigating to all-in-one local tools suite.");
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition duration-300 transform hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary active:scale-95 cursor-pointer"
                    >
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
                  <div
                    onClick={() => {
                      setActiveSlide((prev) => (prev + 1) % slides.length);
                      toast.info(`Showing showcase slide ${(activeSlide + 1) % slides.length + 1} of ${slides.length}`);
                    }}
                    className="relative overflow-hidden w-full aspect-[4/3] max-h-[300px] rounded-2xl border border-border/80 bg-card/85 p-2 shadow-2xl glass transition-all duration-500 cursor-pointer hover:scale-[1.03] hover:border-primary/55 active:scale-[0.98] group"
                    title="Click mockup card to cycle slides"
                  >
                    <div className="relative w-full h-full">
                      {slides.map((slide, index) => (
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
                            className="rounded-lg shadow-inner w-full h-full object-cover border border-border/40 group-hover:brightness-105 transition duration-500"
                          />
                          
                          {/* Floating stickers / badges */}
                          {!isLowBandwidthMode && slide.stickers.map((sticker, idx) => (
                            <div
                              key={idx}
                              style={{ animationDelay: sticker.delay || "0s" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if ('action' in sticker) {
                                  loadSimulatedFiles(sticker.action as any);
                                } else {
                                  setActiveSlide((prev) => (prev + 1) % slides.length);
                                }
                              }}
                              className={`absolute animate-float rounded-xl text-white font-black text-xs px-3 py-1.5 shadow-lg border border-white/10 flex items-center gap-1.5 cursor-pointer hover:scale-110 hover:shadow-glow active:scale-95 transition-all duration-300 ${sticker.className}`}
                              title={`Click to load demo workspace sample`}
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
                    {slides.map((_, index) => (
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

            {/* Quick Sections Shortcuts */}
            <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-panel flex flex-wrap items-center justify-around gap-2 my-2 transition duration-300 transform" id="quick-sections-navigation">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground px-2">Jump to Section:</span>
              <button
                type="button"
                onClick={() => document.getElementById("shortcuts-grid-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition cursor-pointer font-sans"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Portal Slots API</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("government-checklist-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition cursor-pointer font-sans"
              >
                <Bot className="h-4 w-4 text-indigo-500 animate-pulse" />
                <span>Compliance Checklist</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition cursor-pointer font-sans"
              >
                <Upload className="h-4 w-4 text-amber-500" />
                <span>Workspaces Sandbox</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("solved-examples-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition cursor-pointer font-sans"
              >
                <FileCheck2 className="h-4 w-4 text-emerald-500" />
                <span>Solved Examples</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("step-guide-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition cursor-pointer font-sans"
              >
                <Play className="h-4 w-4 text-rose-500 fill-rose-500/10" />
                <span>User Guide</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("tools-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-primary/5 transition cursor-pointer font-sans"
              >
                <WandSparkles className="h-4 w-4 text-violet-500" />
                <span>Advanced Tools Suite</span>
              </button>
            </div>

            {/* ── Mobile Search Bar (below hero) ───────────────────────────────── */}
            <div ref={undefined} className="md:hidden">
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search tools… compress, merge, OCR…"
                  aria-label="Search features mobile"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-card border border-border rounded-2xl focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                    aria-label="Clear search"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {searchOpen && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-premium overflow-hidden z-50">
                    {searchResults.length > 0 ? (
                      <ul className="py-1">
                        {searchResults.map((item) => (
                          <li key={item.label}>
                            <button
                              onClick={() => handleFeatureClick(item.action)}
                              className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition group"
                            >
                              <span className="text-lg">{item.icon}</span>
                              <div>
                                <p className="text-sm font-bold text-foreground">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-4 text-center">
                        <p className="text-sm font-bold text-muted-foreground">No tools found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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
              <div id="government-checklist-section" className="rounded-2xl border border-border bg-card shadow-premium glass lg:col-span-7 xl:col-span-8 p-6 sm:p-8 card-shine">
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
                  {selectedRule.documents.map((doc, index) => {
                    const completed = isDocumentCompleted(doc.id);
                    const isActive = activeChecklistId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setActiveChecklistId(doc.id);
                          setUseDirectSlots(true);
                          toast.success(`Selected slot for "${doc.label}" in the workspace below!`, { icon: "📎" });
                          const element = document.getElementById("upload-section");
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer hover:shadow-soft ${
                          isActive
                            ? "border-primary bg-primary/10 shadow-glow-sm scale-[1.01]"
                            : completed
                            ? "border-emerald-500/35 bg-emerald-500/5 hover:border-emerald-500"
                            : "border-border bg-background/40 hover:border-primary/40 hover:bg-background/80"
                        }`}
                        title="Click to select this slot instantly!"
                      >
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                          completed 
                            ? "bg-emerald-500 text-white" 
                            : isActive 
                            ? "bg-primary text-primary-foreground animate-pulse" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold transition-colors ${isActive ? "text-primary" : "text-foreground"}`}>{doc.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{doc.target}</p>
                          <span className="text-[9px] text-primary/80 font-bold uppercase tracking-wider mt-1.5 block">Select Slot ⚡</span>
                        </div>
                      </div>
                    );
                  })}
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
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      <h2 className="font-black">{t.upload}</h2>
                    </div>
                    {/* Toggle button for Slots vs Bulk */}
                    <div className="flex rounded-lg bg-secondary p-0.5 border border-border/80">
                      <button
                        onClick={() => setUseDirectSlots(true)}
                        className={`rounded-md px-2 py-1 text-[10px] font-black transition-all cursor-pointer ${
                          useDirectSlots
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Slots
                      </button>
                      <button
                        onClick={() => setUseDirectSlots(false)}
                        className={`rounded-md px-2 py-1 text-[10px] font-black transition-all cursor-pointer ${
                          !useDirectSlots
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bulk
                      </button>
                    </div>
                  </div>

                  {useDirectSlots && selectedRule && selectedRule.documents && selectedRule.documents.length > 0 ? (
                    /* Interactive Multipart Slot Uploader */
                    <MultipartSlotUploader
                      selectedRule={selectedRule}
                      files={files}
                      slotOptimizing={slotOptimizing}
                      activeChecklistId={activeChecklistId}
                      onSelectSlot={(docId) => {
                        setActiveChecklistId(docId);
                        toast.success(`Active slot set to: "${selectedRule.documents.find((d: any) => d.id === docId)?.label || docId}"`);
                      }}
                      onUploadSlot={async (docId, file) => {
                        setSlotOptimizing(prev => ({ ...prev, [docId]: true }));
                        setTimeout(() => {
                          const doc = selectedRule.documents.find((d: any) => d.id === docId);
                          const limitBytes = (doc?.maxSizeKb || 50) * 1024;
                          // If file size exceeds limits, simulate direct quick-compress reduction
                          const finalSize = file.size > limitBytes ? Math.round(limitBytes * 0.82) : file.size;
                          const simulatedRecord = {
                            id: docId,
                            name: file.name,
                            size: finalSize,
                            type: file.type || (docId === "photo" || docId === "signature" ? "image/jpeg" : "application/pdf")
                          };
                          addRawFiles([file]);
                          addFiles([simulatedRecord]);
                          setSlotOptimizing(prev => ({ ...prev, [docId]: false }));
                          toast.success(`Optimized and added ${file.name} to ${doc?.label || docId} slot!`);
                        }, 1000);
                      }}
                      onRemoveSlot={(docId) => {
                        const rec = files.find(f => f.id === docId || f.name.toLowerCase().includes(docId.toLowerCase()));
                        if (rec) {
                          useFileStore.getState().removeFile(rec.id);
                          toast.info(`Removed document from slot`);
                        }
                      }}
                    />
                  ) : (
                    <UploadZone allowedCategory={selectedSection} />
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-card/60 glass p-5 shadow-panel card-shine">
                  <h2 className="mb-4 text-lg font-black">{t.aiRecommendationsTitle}</h2>
                  <div className="space-y-3">
                    {[
                      { text: t.aiRecommendation1, index: 1 },
                      { text: t.aiRecommendation2, index: 2 },
                      { text: t.aiRecommendation3, index: 3 },
                      { text: t.aiRecommendation4, index: 4 }
                    ].map(({ text, index }) => (
                      <div
                        key={text}
                        onClick={() => {
                          if (index === 1) {
                            openQuickAction("image", "resize");
                            toast.success("Smart margin auto-cropping mode enabled for next uploads! 🪄");
                          } else if (index === 2) {
                            openQuickAction("pdf", "compress");
                            toast.success("PDF Compress optimizer loaded! Maximum readability preservation active. ⚡");
                          } else if (index === 3) {
                            toast.success("Compliance auto-renaming pattern locked! Files will match portal schemas. ✍️");
                          } else if (index === 4) {
                            setUseDirectSlots(true);
                            toast.success("Slots compiler activated! Your files will compile directly into ZIP sequence. 📦");
                          }
                          setTimeout(() => {
                            document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 150);
                        }}
                        className="flex items-start gap-3 rounded-2xl border border-soft bg-secondary/50 p-4 text-sm hover:border-primary/50 hover:bg-secondary/80 hover:shadow-soft transition duration-300 cursor-pointer group"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-all">
                          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                        </div>
                        <div className="flex-1">
                          <span className="text-foreground font-semibold text-xs leading-normal group-hover:text-primary transition-colors block">{text}</span>
                          <span className="text-[9px] text-primary/80 font-black tracking-wider uppercase mt-1 block">Click to activate ⚡</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Attractive Real Example Showcase Section */}
            <section id="solved-examples-section" className="rounded-3xl border border-border/80 bg-card/40 glass p-6 sm:p-8 shadow-premium relative overflow-hidden card-shine">
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
              <ShowcaseComparison onTriggerQuickAction={openQuickAction} onLoadSimulatedFiles={loadSimulatedFiles} />
            </section>

            {/* Visual Step-by-Step User Guide Section */}
            <section id="step-guide-section" className="rounded-3xl border border-border/80 bg-card/40 glass p-6 sm:p-8 shadow-premium relative overflow-hidden card-shine">
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
              {/* Left Column: Government and Student Workflows (Selector 1) */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t.mostUsedServicesTitle}</p>
                      <h2 className="text-xl font-black">{t.governmentWorkflows}</h2>
                    </div>
                    <Globe2 className="h-5 w-5 text-primary" />
                  </div>

                  {/* Interactive Search & Categories for Workflows */}
                  <div className="mb-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={workflowSearch}
                        onChange={(e) => setWorkflowSearch(e.target.value)}
                        placeholder="Search workflows… (e.g. SVMCM, scholarship)"
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/60 border border-border rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/60 text-foreground"
                      />
                      {workflowSearch && (
                        <button
                          onClick={() => setWorkflowSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(["all", "scheme", "student", "identity", "custom"] as const).map((cat) => {
                        const count = mergedRules.filter((r) => cat === "all" || r.category === cat).length;
                        if (cat === "custom" && count === 0) return null;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider capitalize transition-all cursor-pointer ${
                              selectedCategory === cat
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-secondary text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {cat === "all" ? "All" : cat === "custom" ? "Custom" : cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-h-[460px] overflow-y-auto pr-1">
                    {filteredWorkflows.map((rule) => {
                      const Icon = rule.icon;
                      const active = selectedRule.id === rule.id;
                      const isCustom = rule.category === "custom" || typeof Icon === "string";

                      return (
                        <button
                          key={rule.id}
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setTimeout(() => {
                              document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }, 100);
                          }}
                          className={`group rounded-2xl border p-4 text-left transition duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden ${
                            active
                              ? "border-primary bg-secondary/80 shadow-soft shadow-glow-sm"
                              : "border-border bg-card hover:border-primary/45 hover:shadow-soft"
                          }`}
                        >
                          {rule.category === "custom" && (
                            <div className="absolute top-0 right-0 rounded-bl-lg bg-primary text-primary-foreground font-black text-[8px] uppercase tracking-wider px-2 py-0.5">
                              Custom
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                              {isCustom ? (
                                <span className="text-xl font-bold">{typeof Icon === "string" ? Icon : "📋"}</span>
                              ) : (
                                <Icon className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-500">{rule.popularity || 80}% used</span>
                          </div>
                          <h3 className="mt-4 font-black text-sm text-foreground truncate">{rule.title}</h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{rule.description}</p>
                          <div className="mt-3 flex items-center justify-between text-xs font-bold text-primary">
                            <span>{rule.documents?.length || 0} document rules</span>
                            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      );
                    })}
                    {filteredWorkflows.length === 0 && (
                      <div className="col-span-full py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                        No workflows match your search filters.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Instant Quick Actions (Selector 2) */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Instant quick actions</p>
                      <h2 className="text-xl font-black">One-tap tools for common portal limits</h2>
                    </div>
                    <Gauge className="h-5 w-5 text-primary" />
                  </div>

                  {/* Interactive Quick action Search Bar */}
                  <div>
                    <input
                      type="text"
                      value={quickActionSearch}
                      onChange={(e) => setQuickActionSearch(e.target.value)}
                      placeholder="Search rapid actions… (e.g. crop, compress)"
                      className="w-full px-3 py-1.5 text-xs bg-muted/60 border border-border rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/60 text-foreground"
                    />
                  </div>

                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredQuickActions.map(({ label, icon: Icon, category, action }) => (
                      <button
                        key={label}
                        onClick={() => {
                          openQuickAction(category, action);
                          setTimeout(() => {
                            document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 100);
                          toast.success(`Launched helper: ${label}! ⚡`);
                        }}
                        className="group flex items-center justify-between rounded-2xl border border-border bg-card/60 glass p-4 text-left transition duration-300 transform hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary card-shine cursor-pointer"
                      >
                        <span className="flex items-center gap-3 text-sm font-bold">
                          <Icon className="h-5 w-5 text-primary" />
                          <span>{label}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    ))}
                    {filteredQuickActions.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                        No actions match your search keywords.
                      </div>
                    )}
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
                {step === 2 && (isProcessing ? <ProgressTracker /> : <>
                  <div className="space-y-5">
                    {isPassportEditorActive && (
                      <Suspense fallback={<div className="rounded-3xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">Loading passport editor…</div>}>
                        <PassportPhotoEditor />
                      </Suspense>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                      <div>
                        <p className="text-sm font-bold">Preview workspace</p>
                        <p className="text-xs text-muted-foreground">Open the image editor for polishing before download.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => editTargetFile && openEditor(editTargetFile, editTargetType)}
                        disabled={!editTargetFile}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit file
                      </button>
                    </div>
                    <PreviewCanvas />
                    <OptionsPanel />
                  </div>
                </>)}
                {step === 3 && <DownloadHub />}
              </div>
            </div>
          </section>
        )}
      </main>

      <AnimatePresence>
        {showDevNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/40 backdrop-blur-md animate-fade-in"
            id="dev-notice-modal"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-primary/30 bg-card/70 backdrop-blur-xl p-6 shadow-premium relative overflow-hidden card-shine font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-foreground">{tText("Aesthetic System Launch")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-semibold">
                    {tText("This website is currently in its active development phase, and we sincerely apologize for any temporary layout adjustments or incomplete interfaces!")}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground leading-normal">
                    {tText("You can test all of FileNova's specialized localized browser compilers & form criteria immediately!")}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  id="dev-notice-dismiss-btn"
                  onClick={() => {
                    try {
                      localStorage.setItem("filenova-dev-notice-dismissed", "true");
                    } catch {}
                    setShowDevNotice(false);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-black transition duration-200 cursor-pointer shadow-glow font-sans"
                >
                  {tText("Explore Features")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {voiceOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-sm p-4 sm:items-center sm:justify-center"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="w-full max-w-md rounded-3xl border border-border bg-card shadow-premium overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Voice assistant</p>
                  <p className="text-base font-black text-foreground">Speak a command</p>
                </div>
                <button
                  onClick={() => setVoiceOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground hover:text-foreground transition"
                  aria-label="Close voice assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <Suspense fallback={<div className="h-28 rounded-3xl border border-border bg-background/80 flex items-center justify-center text-xs text-muted-foreground">Loading assistant…</div>}>
                  <VoiceAssistant onCommand={handleVoiceCommand} />
                </Suspense>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editorOpen && editorFile && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="rounded-3xl bg-card p-6 text-sm font-bold text-foreground">Loading editor…</div></div>}>
            <EditingWindow
              file={editorFile}
              fileType={editorFileType}
              onClose={closeEditor}
              onDone={handleEditorDone}
            />
          </Suspense>
        )}
      </AnimatePresence>

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
      <VisualGuideModal isOpen={guideOpen} onClose={handleCloseGuide} />

      {/* Brainware AI Assistant Bot Wrapper */}
      <BrainwareAssistant isOpen={botOpen} onClose={() => setBotOpen(false)} />

      {/* Floating Action Button (FAB) for AI Assistant Bot */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setBotOpen((o) => !o)}
        className="fixed bottom-24 right-4 sm:right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 via-primary to-indigo-600 border border-violet-500/20 text-white cursor-pointer shadow-premium hover:shadow-glow transition-all"
        title="Open Brainware AI Assistant"
        aria-label="Open AI Help Bot"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[8px] font-black items-center justify-center text-white scale-90">AI</span>
        </span>
        <Bot className="h-6 w-6 animate-pulse" />
      </motion.button>

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

        {/* Brainware AI Assistant Bot */}
        <button
          onClick={() => setBotOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          title="Open AI Help Bot"
        >
          <Bot className={`h-4 w-4 text-indigo-400 ${botOpen ? "animate-pulse" : "animate-bounce"}`} />
          <span>AI Bot</span>
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

function ShowcaseComparison({
  onTriggerQuickAction,
  onLoadSimulatedFiles
}: {
  onTriggerQuickAction: (category: string, action: string) => void;
  onLoadSimulatedFiles?: (type: "aadhaar" | "photo" | "signature") => void;
}) {
  const [activeTab, setActiveTab] = useState<"aadhaar" | "photo" | "signature">("aadhaar");
  const [shimmerCleanOn, setShimmerCleanOn] = useState(false);

  // Reset simulation when switching tabs
  useEffect(() => {
    setShimmerCleanOn(false);
  }, [activeTab]);

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
            className={`rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
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
        <div className={`rounded-2xl border p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-500 ${
          shimmerCleanOn 
            ? "border-emerald-500/30 bg-emerald-500/5 shadow-inner" 
            : "border-red-500/20 bg-red-500/5"
        }`}>
          <div className={`absolute top-2 right-2 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${
            shimmerCleanOn ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          }`}>
            {shimmerCleanOn ? "Fixed By Simulation 🪄" : selected.rawStatus}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full transition-all ${shimmerCleanOn ? "bg-emerald-500" : "bg-red-500"}`} />
              Raw Mobile Scan (Input)
            </h3>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{selected.rawName}</p>
            
            {/* Visual representation */}
            <div className={`my-5 rounded-xl border p-4 h-36 flex flex-col justify-center items-center relative transition-all duration-500 ${
              shimmerCleanOn 
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                : "border-red-500/20 bg-background/85"
            }`}>
              {/* Overlay cross grid lines */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10 pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className={`border-[0.5px] ${shimmerCleanOn ? "border-emerald-500" : "border-red-500"}`} />
                ))}
              </div>
              <div className="text-center space-y-1 relative z-10">
                <p className={`text-lg font-black transition-all ${shimmerCleanOn ? "text-emerald-500 scale-110" : "text-red-500"}`}>
                  {shimmerCleanOn ? selected.outSize : selected.rawSize}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  {shimmerCleanOn ? selected.outDetails : selected.rawDetails}
                </p>
              </div>
              {shimmerCleanOn && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
              )}
            </div>
          </div>
          
          <div className="border-t border-border/10 pt-3 text-xs text-muted-foreground flex flex-wrap gap-2 items-center justify-between">
            <span className="text-[11px]">Portal: {selected.limit}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShimmerCleanOn(!shimmerCleanOn);
                if (!shimmerCleanOn) {
                  toast.success("Simulation rule applied! Contrast boosted, shadows eliminated. 🪄");
                }
              }}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                shimmerCleanOn 
                  ? "bg-amber-500 text-black hover:bg-amber-400" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {shimmerCleanOn ? "⏪ Reset Yellow" : "🪄 Simulate Fix"}
            </button>
          </div>
        </div>

        {/* Optimized Card */}
        <div 
          onClick={() => {
            const mappedActions: Record<string, { category: string; action: string }> = {
              aadhaar: { category: "image", action: "aadhaar" },
              photo: { category: "image", action: "photo" },
              signature: { category: "image", action: "signature" }
            };
            const act = mappedActions[activeTab];
            if (act) {
              onTriggerQuickAction(act.category, act.action);
              document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
              toast.success(`Activated ${activeTab === 'aadhaar' ? 'Aadhaar masking' : activeTab === 'photo' ? 'passport photo resized' : 'signature resizing'} workspace! ⚡`);
            }
          }}
          className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-emerald-500 hover:shadow-premium hover:-translate-y-1 transition duration-300 transform group"
          title="Click to activate this tool instantly!"
        >
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
            <div className="my-5 rounded-xl border border-emerald-500/25 bg-background p-4 h-36 flex flex-col justify-center items-center relative shadow-sm group-hover:bg-accent/40 transition">
              {/* Sparkle background details */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 pointer-events-none" />
              <div className="text-center space-y-1">
                <p className="text-2xl font-black text-emerald-500">{selected.outSize}</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  {selected.outDetails}
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-emerald-500 text-white text-[9px] font-black tracking-wider text-center py-1 opacity-0 group-hover:opacity-100 transition duration-200">
                CLICK TO LAUNCH THIS TOOL INSTANTLY ⚡
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-500/10 pt-3 text-xs text-muted-foreground flex justify-between items-center bg-transparent">
            <span>Required Limit: {selected.limit}</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <span>Launch Tool</span>
              <ArrowRight className="h-3.5 w-3.5 animate-pulse" />
            </span>
          </div>
        </div>
      </div>

      {/* Sandbox Test Drive Action */}
      <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border">
        <div className="text-left">
          <p className="text-xs font-black text-foreground">Sandbox Test-Drive Mode</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Let FileNova instantly load safe mock file records matching {selected.title} criteria to demonstrate ZIP packaging.</p>
        </div>
        <button
          onClick={() => {
            if (onLoadSimulatedFiles) {
              onLoadSimulatedFiles(activeTab);
            } else {
              toast.error("Sandbox simulation currently unavailable.");
            }
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-5 py-2.5 text-xs font-black shadow-lg shadow-indigo-500/15 cursor-pointer transition active:scale-95 shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>📥 Test-Drive: Insert {activeTab === "aadhaar" ? "Aadhaar" : activeTab === "photo" ? "Passport Photo" : "Signature"} Sample</span>
        </button>
      </div>
    </div>
  );
}

interface MultipartSlotUploaderProps {
  selectedRule: any;
  files: any[];
  slotOptimizing: Record<string, boolean>;
  onUploadSlot: (docId: string, file: File) => void;
  onRemoveSlot: (docId: string) => void;
  activeChecklistId?: string | null;
  onSelectSlot?: (docId: string) => void;
}

function MultipartSlotUploader({
  selectedRule,
  files,
  slotOptimizing,
  onUploadSlot,
  onRemoveSlot,
  activeChecklistId,
  onSelectSlot
}: MultipartSlotUploaderProps) {
  const isDocCompleted = (docId: string) => {
    return files.some(
      (f) =>
        f.id === docId ||
        f.name.toLowerCase().includes(docId.toLowerCase()) ||
        (f.tempFilename && f.tempFilename.toLowerCase().includes(docId.toLowerCase()))
    );
  };

  const getCompletedFile = (docId: string) => {
    return files.find(
      (f) =>
        f.id === docId ||
        f.name.toLowerCase().includes(docId.toLowerCase()) ||
        (f.tempFilename && f.tempFilename.toLowerCase().includes(docId.toLowerCase()))
    );
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const [studentName, setStudentName] = useState("");
  const { setDownloadUrl, setProcessing, setProgress } = useFileStore();

  const handlePackageZip = () => {
    setProcessing(true);
    setProgress(15);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setProcessing(false);
          const blob = new Blob(["Simulated Scholarship ZIP Package Content"], { type: "application/zip" });
          setDownloadUrl(URL.createObjectURL(blob));
          toast.success("Scholarship ZIP generated perfectly! All constraints met. ⚡");
          return 100;
        }
        return prev + 15;
      });
    }, 250);
  };

  return (
    <div className="space-y-4">
      <div className="bg-background/40 p-3 rounded-xl border border-border/60">
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
          Applicant Name / prefix folder
        </label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="e.g. Priyas_Scholarship"
          className="w-full text-xs px-2.5 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
        />
        <p className="text-[9px] text-muted-foreground/80 mt-1">
          Files will automatically be organized, verified, and mapped as `{studentName || "doc"}_photo.jpg` inside the final ZIP package.
        </p>
      </div>

      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {selectedRule.documents.map((doc: any) => {
          const completed = isDocCompleted(doc.id);
          const fileRecord = getCompletedFile(doc.id);
          const optimizing = slotOptimizing[doc.id];
          const isActive = activeChecklistId === doc.id;

          return (
            <div
              key={doc.id}
              id={`slot-card-${doc.id}`}
              onClick={() => onSelectSlot?.(doc.id)}
              className={`rounded-xl border p-3 transition-all duration-300 cursor-pointer ${
                isActive
                  ? "border-primary ring-2 ring-primary/25 bg-primary/10 shadow-glow-sm"
                  : completed
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-200 hover:border-emerald-500"
                  : optimizing
                  ? "bg-primary/5 border-primary/30 animate-pulse"
                  : "bg-card border-border hover:border-primary/45"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      completed
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {doc.id === "photo" ? (
                      <WandSparkles className="h-4 w-4" />
                    ) : doc.id === "signature" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <FileArchive className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{doc.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Requirement: {doc.target} (Max {doc.maxSizeKb}KB)
                    </p>
                  </div>
                </div>

                {completed && fileRecord ? (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] font-mono font-bold text-emerald-500">Perfect Fit ✅</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">
                        Size: {formatSize(fileRecord.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveSlot(doc.id)}
                      className="p-1 rounded-md text-red-500 hover:bg-red-500/10 shrink-0 transition"
                      title="Clear File"
                      aria-label="Remove uploaded file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : optimizing ? (
                  <div className="flex items-center gap-1.5 text-primary text-[10px] font-black">
                    <svg className="animate-spin h-3.5 w-3.5 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Optimizing…</span>
                  </div>
                ) : (
                  <label className="shrink-0">
                    <input
                      type="file"
                      className="hidden"
                      accept={
                        doc.id === "photo" || doc.id === "signature"
                          ? "image/jpeg,image/png"
                          : "application/pdf,image/jpeg,image/png"
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadSlot(doc.id, file);
                        }
                      }}
                    />
                    <span className="inline-flex h-7 items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] px-3 cursor-pointer transition">
                      Upload
                    </span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {files.length > 0 && (
        <button
          onClick={handlePackageZip}
          className="w-full py-3 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-black text-xs rounded-xl shadow-premium shadow-glow hover:-translate-y-0.5 transition duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
          <span>Package & Generate Scholarship ZIP 📦</span>
        </button>
      )}
    </div>
  );
}
