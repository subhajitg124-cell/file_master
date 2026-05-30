import React, { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  FileArchive, Sparkles, FileEdit, RefreshCw, Search, FileText,
  FileSpreadsheet, Loader2, Scissors, Image, Music, Globe, FileCode,
  ArrowLeftRight, Maximize2, MonitorSmartphone, ImageIcon, RotateCw,
  Trash2, Stamp, Hash, AlignJustify, Crop, FlipHorizontal, PenTool,
  Eraser, ScanLine, ScanText, Lock, Unlock, ShieldCheck,
  GitCompareArrows, BrainCircuit, Languages, PenLine, Camera, BookOpen,
  FileCheck2, GitMerge, Zap, Film, Settings2, X, Star, History
} from 'lucide-react';
import { useFileStore, OperationType } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useAdmin } from '@/lib/admin';

interface ToolItem {
  id: OperationType;
  title: string;
  description: string;
  category: 'pdf' | 'image' | 'video' | 'office';
  subcategory: string;
  icon: any;
  actionName: string;
  badge?: string;
  badgeColor?: string;
}

interface SubcategoryMeta {
  label: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  borderColor: string;
}

const SUBCATEGORY_META: Record<string, SubcategoryMeta> = {
  pdf_merge:    { label: 'Merge & Combine',   icon: GitMerge,       iconColor: 'text-red-400',     iconBg: 'bg-red-500/10',      borderColor: 'border-red-500/20' },
  pdf_split:    { label: 'Split & Organize',  icon: Scissors,       iconColor: 'text-orange-400',  iconBg: 'bg-orange-500/10',   borderColor: 'border-orange-500/20' },
  pdf_edit:     { label: 'Edit & Annotate',   icon: PenTool,        iconColor: 'text-amber-400',   iconBg: 'bg-amber-500/10',    borderColor: 'border-amber-500/20' },
  pdf_security: { label: 'Security',          icon: ShieldCheck,    iconColor: 'text-rose-400',    iconBg: 'bg-rose-500/10',     borderColor: 'border-rose-500/20' },
  pdf_convert:  { label: 'Convert',           icon: ArrowLeftRight, iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10',     borderColor: 'border-blue-500/20' },
  pdf_ai:       { label: 'AI Tools',          icon: BrainCircuit,   iconColor: 'text-violet-400',  iconBg: 'bg-violet-500/10',   borderColor: 'border-violet-500/20' },
  pdf_optimize: { label: 'Compress & Fix',    icon: Zap,            iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10',  borderColor: 'border-emerald-500/20' },
  img_optimize: { label: 'Optimize',          icon: Zap,            iconColor: 'text-cyan-400',    iconBg: 'bg-cyan-500/10',     borderColor: 'border-cyan-500/20' },
  img_transform:{ label: 'Resize & Transform',icon: Maximize2,      iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10',     borderColor: 'border-blue-500/20' },
  img_edit:     { label: 'Edit',              icon: Sparkles,       iconColor: 'text-indigo-400',  iconBg: 'bg-indigo-500/10',   borderColor: 'border-indigo-500/20' },
  img_convert:  { label: 'Convert',           icon: ArrowLeftRight, iconColor: 'text-sky-400',     iconBg: 'bg-sky-500/10',      borderColor: 'border-sky-500/20' },
  off_merge:    { label: 'Merge',             icon: GitMerge,       iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10',  borderColor: 'border-emerald-500/20' },
  off_convert:  { label: 'Convert Documents', icon: FileText,       iconColor: 'text-teal-400',    iconBg: 'bg-teal-500/10',     borderColor: 'border-teal-500/20' },
  off_sheets:   { label: 'Spreadsheets',      icon: FileSpreadsheet,iconColor: 'text-green-400',   iconBg: 'bg-green-500/10',    borderColor: 'border-green-500/20' },
  off_web:      { label: 'Web & Markup',      icon: Globe,          iconColor: 'text-lime-400',    iconBg: 'bg-lime-500/10',     borderColor: 'border-lime-500/20' },
  off_optimize: { label: 'Optimize & Clean',  icon: Settings2,      iconColor: 'text-emerald-300', iconBg: 'bg-emerald-400/10',  borderColor: 'border-emerald-400/20' },
  vid_edit:     { label: 'Edit Video',        icon: Film,           iconColor: 'text-violet-400',  iconBg: 'bg-violet-500/10',   borderColor: 'border-violet-500/20' },
  vid_convert:  { label: 'Convert & Export',  icon: RefreshCw,      iconColor: 'text-purple-400',  iconBg: 'bg-purple-500/10',   borderColor: 'border-purple-500/20' },
};

const CATEGORY_ORDER: Record<string, string[]> = {
  pdf:    ['pdf_merge','pdf_split','pdf_edit','pdf_security','pdf_convert','pdf_ai','pdf_optimize'],
  image:  ['img_optimize','img_transform','img_edit','img_convert'],
  office: ['off_merge','off_convert','off_sheets','off_web','off_optimize'],
  video:  ['vid_edit','vid_convert'],
};

const CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'PDF' },
  { key: 'image', label: 'Images' },
  { key: 'office', label: 'Office' },
  { key: 'video', label: 'Video' },
];

const TOOLS: ToolItem[] = [
  // ── PDF / Merge & Combine ───────────────────────────────────────────────────
  { id: 'merge',   title: 'Merge PDFs',       description: 'Combine multiple PDF files into one document.',         category: 'pdf', subcategory: 'pdf_merge',    icon: FileText,      actionName: 'merge' },
  { id: 'convert', title: 'Images → PDF',     description: 'Pack multiple images into a single PDF document.',     category: 'pdf', subcategory: 'pdf_merge',    icon: Image,         actionName: 'images_to_pdf', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert', title: 'Scan to PDF',      description: 'Capture a photo with your camera and convert to PDF.', category: 'pdf', subcategory: 'pdf_merge',    icon: Camera,        actionName: 'scan_to_pdf',   badge: 'Client-side', badgeColor: 'emerald' },

  // ── PDF / Split & Organize ──────────────────────────────────────────────────
  { id: 'split',   title: 'Split PDF',        description: 'Extract individual pages or ranges into separate PDFs.',   category: 'pdf', subcategory: 'pdf_split', icon: Scissors,    actionName: 'split',          badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Reorder Pages',    description: 'Rearrange pages into any custom order.',                   category: 'pdf', subcategory: 'pdf_split', icon: AlignJustify,actionName: 'pdf_reorder',    badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Rotate Pages',     description: 'Rotate all or specific pages by 90°, 180°, or 270°.',     category: 'pdf', subcategory: 'pdf_split', icon: RotateCw,    actionName: 'pdf_rotate',     badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Delete Pages',     description: 'Remove specific pages from the PDF document.',             category: 'pdf', subcategory: 'pdf_split', icon: Trash2,      actionName: 'pdf_delete',     badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Crop Pages',       description: 'Trim the visible area of pages with a custom crop box.',   category: 'pdf', subcategory: 'pdf_split', icon: Crop,        actionName: 'pdf_crop',       badge: 'Client-side', badgeColor: 'emerald' },

  // ── PDF / Edit & Annotate ───────────────────────────────────────────────────
  { id: 'edit',    title: 'Edit PDF',         description: 'Add text, cover content, or replace text on any page.',  category: 'pdf', subcategory: 'pdf_edit', icon: ScanText,   actionName: 'pdf_annotate',     badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Sign PDF',         description: 'Place a handwritten-style signature on any page.',       category: 'pdf', subcategory: 'pdf_edit', icon: PenLine,    actionName: 'pdf_sign',         badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Add Watermark',    description: 'Stamp text on every page — diagonal, center, or footer.', category: 'pdf', subcategory: 'pdf_edit', icon: Stamp,     actionName: 'pdf_watermark',    badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Page Numbers',     description: 'Insert page numbers at header or footer positions.',     category: 'pdf', subcategory: 'pdf_edit', icon: Hash,       actionName: 'pdf_page_numbers', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Insert Link',      description: 'Add clickable hyperlink annotations to any page.',       category: 'pdf', subcategory: 'pdf_edit', icon: Globe,      actionName: 'pdf_insert_link',  badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Insert Image',     description: 'Embed a PNG or JPEG image at any position.',             category: 'pdf', subcategory: 'pdf_edit', icon: ImageIcon,  actionName: 'pdf_insert_image', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Draw Shapes',      description: 'Add rectangles, ellipses, lines, and arrows.',           category: 'pdf', subcategory: 'pdf_edit', icon: PenTool,    actionName: 'pdf_insert_shape', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'PDF Forms',        description: 'Fill and flatten interactive form fields.',               category: 'pdf', subcategory: 'pdf_edit', icon: BookOpen,   actionName: 'pdf_forms',        badge: 'Client-side', badgeColor: 'emerald' },

  // ── PDF / Security ──────────────────────────────────────────────────────────
  { id: 'edit',    title: 'Protect PDF',      description: 'Add a password to restrict opening or editing.',  category: 'pdf', subcategory: 'pdf_security', icon: Lock,       actionName: 'pdf_protect' },
  { id: 'edit',    title: 'Unlock PDF',       description: 'Remove password from a protected PDF document.',  category: 'pdf', subcategory: 'pdf_security', icon: Unlock,     actionName: 'pdf_unlock',  badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Redact PDF',       description: 'Black out sensitive content permanently.',         category: 'pdf', subcategory: 'pdf_security', icon: Eraser,     actionName: 'pdf_redact',  badge: 'Client-side', badgeColor: 'emerald' },

  // ── PDF / Convert ───────────────────────────────────────────────────────────
  { id: 'convert', title: 'PDF → DOCX',       description: 'Convert PDF back into an editable Word document.',       category: 'pdf', subcategory: 'pdf_convert', icon: ArrowLeftRight, actionName: 'pdf_to_docx' },
  { id: 'convert', title: 'PDF → PPTX',       description: 'Convert PDF pages into a PowerPoint presentation.',      category: 'pdf', subcategory: 'pdf_convert', icon: ArrowLeftRight, actionName: 'pdf_to_pptx' },
  { id: 'convert', title: 'PDF → Excel',      description: 'Extract tables and data from PDF into a spreadsheet.',   category: 'pdf', subcategory: 'pdf_convert', icon: FileSpreadsheet,actionName: 'pdf_to_excel' },
  { id: 'convert', title: 'PDF → Images',     description: 'Export every page as a PNG or JPEG image file.',         category: 'pdf', subcategory: 'pdf_convert', icon: ImageIcon,      actionName: 'pdf_to_images' },
  { id: 'convert', title: 'PDF to PDF/A',     description: 'Convert to ISO-standard archival format (PDF/A-1b).',    category: 'pdf', subcategory: 'pdf_convert', icon: FileCheck2,     actionName: 'pdf_to_pdfa' },

  // ── PDF / AI ────────────────────────────────────────────────────────────────
  { id: 'edit',    title: 'OCR PDF',          description: 'Extract text from scanned or image-based PDFs.',         category: 'pdf', subcategory: 'pdf_ai', icon: ScanLine,       actionName: 'pdf_ocr' },
  { id: 'edit',    title: 'Compare PDFs',     description: 'Highlight differences between two PDF versions.',        category: 'pdf', subcategory: 'pdf_ai', icon: GitCompareArrows,actionName: 'pdf_compare' },
  { id: 'edit',    title: 'AI Summarize',     description: 'Generate a concise AI summary of any PDF.',              category: 'pdf', subcategory: 'pdf_ai', icon: BrainCircuit,   actionName: 'pdf_summarize', badge: 'AI', badgeColor: 'violet' },
  { id: 'convert', title: 'Translate PDF',    description: 'Translate PDF content to another language with AI.',     category: 'pdf', subcategory: 'pdf_ai', icon: Languages,      actionName: 'pdf_translate', badge: 'AI', badgeColor: 'violet' },

  // ── PDF / Optimize ──────────────────────────────────────────────────────────
  { id: 'compress',title: 'Compress PDF',     description: 'Reduce file size while preserving fonts and structure.', category: 'pdf', subcategory: 'pdf_optimize', icon: FileArchive, actionName: 'compress' },

  // ── IMAGE / Optimize ────────────────────────────────────────────────────────
  { id: 'compress',title: 'Compress Image',   description: 'Reduce PNG/JPEG/WEBP size with quality presets.',         category: 'image', subcategory: 'img_optimize', icon: FileArchive, actionName: 'compress',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'enhance', title: 'Enhance Image',    description: 'Adjust brightness, contrast, sharpness & denoise.',       category: 'image', subcategory: 'img_optimize', icon: Sparkles,    actionName: 'enhance' },

  // ── IMAGE / Transform ───────────────────────────────────────────────────────
  { id: 'resize',  title: 'Resize Image',     description: 'Set exact pixel dimensions or scale by percentage.',    category: 'image', subcategory: 'img_transform', icon: Maximize2,    actionName: 'resize',        badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Crop Image',       description: 'Trim to exact coordinates or common aspect ratios.',   category: 'image', subcategory: 'img_transform', icon: Crop,         actionName: 'image_crop',    badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Rotate & Flip',    description: 'Rotate 90°/180°/270° or flip horizontally/vertically.',category: 'image', subcategory: 'img_transform', icon: FlipHorizontal,actionName: 'image_rotate',  badge: 'Client-side', badgeColor: 'emerald' },

  // ── IMAGE / Edit ─────────────────────────────────────────────────────────────
  { id: 'edit',    title: 'Remove Background',description: 'AI-powered background removal, outputs transparent PNG.',category: 'image', subcategory: 'img_edit', icon: Eraser,    actionName: 'remove_bg',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',    title: 'Add Watermark',    description: 'Stamp text or logo over any image — tiled or single.', category: 'image', subcategory: 'img_edit', icon: PenTool,   actionName: 'image_watermark', badge: 'Client-side', badgeColor: 'emerald' },

  // ── IMAGE / Convert ──────────────────────────────────────────────────────────
  { id: 'convert', title: 'Convert Format',   description: 'Convert between PNG, JPEG, WEBP, GIF, BMP.',            category: 'image', subcategory: 'img_convert', icon: RefreshCw,       actionName: 'convert_format', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert', title: 'Image → ICO',      description: 'Create a multi-size .ico favicon (16–256 px).',         category: 'image', subcategory: 'img_convert', icon: MonitorSmartphone,actionName: 'to_ico',         badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert', title: 'SVG → PNG',        description: 'Render vector SVG as a raster PNG at any resolution.', category: 'image', subcategory: 'img_convert', icon: Globe,           actionName: 'svg_to_png',     badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert', title: 'Images → PDF',     description: 'Combine images into a single PDF document.',           category: 'image', subcategory: 'img_convert', icon: FileText,        actionName: 'images_to_pdf',  badge: 'Client-side', badgeColor: 'emerald' },

  // ── OFFICE / Merge ───────────────────────────────────────────────────────────
  { id: 'merge',   title: 'Merge Documents',  description: 'Combine multiple DOCX or PDF files into one document.', category: 'office', subcategory: 'off_merge', icon: GitMerge, actionName: 'merge_docs', badge: 'New', badgeColor: 'violet' },

  // ── OFFICE / Convert Docs ────────────────────────────────────────────────────
  { id: 'convert', title: 'DOCX → PDF',       description: 'Convert Word documents to standard PDF layout.',           category: 'office', subcategory: 'off_convert', icon: FileText,       actionName: 'docx_to_pdf' },
  { id: 'convert', title: 'PDF → DOCX',       description: 'Convert PDF back into an editable Word document.',         category: 'office', subcategory: 'off_convert', icon: ArrowLeftRight, actionName: 'pdf_to_docx' },
  { id: 'convert', title: 'PPTX → PDF',       description: 'Convert PowerPoint slides into standard PDFs.',            category: 'office', subcategory: 'off_convert', icon: FileText,       actionName: 'pptx_to_pdf' },
  { id: 'convert', title: 'PDF → PPTX',       description: 'Convert PDF pages into a PowerPoint presentation.',        category: 'office', subcategory: 'off_convert', icon: ArrowLeftRight, actionName: 'pdf_to_pptx' },

  // ── OFFICE / Spreadsheets ────────────────────────────────────────────────────
  { id: 'convert', title: 'XLSX → CSV',       description: 'Export Excel spreadsheet cells to CSV format.',            category: 'office', subcategory: 'off_sheets', icon: FileSpreadsheet, actionName: 'xlsx_to_csv' },
  { id: 'convert', title: 'CSV → XLSX',       description: 'Import a CSV file into a formatted Excel workbook.',       category: 'office', subcategory: 'off_sheets', icon: ArrowLeftRight,  actionName: 'csv_to_xlsx' },
  { id: 'convert', title: 'PDF → Excel',      description: 'Extract tables and data from PDF into a spreadsheet.',     category: 'office', subcategory: 'off_sheets', icon: FileSpreadsheet, actionName: 'pdf_to_excel' },

  // ── OFFICE / Web & Markup ────────────────────────────────────────────────────
  { id: 'convert', title: 'Markdown → HTML',  description: 'Render .md files into styled HTML pages.',                 category: 'office', subcategory: 'off_web', icon: FileCode,     actionName: 'md_to_html' },
  { id: 'convert', title: 'HTML → Markdown',  description: 'Convert HTML files back into clean Markdown.',             category: 'office', subcategory: 'off_web', icon: ArrowLeftRight,actionName: 'html_to_md' },
  { id: 'convert', title: 'HTML → ZIP',       description: 'Bundle HTML, CSS, JS and assets into a portable ZIP.',    category: 'office', subcategory: 'off_web', icon: FileArchive,  actionName: 'html_to_zip', badge: 'Client-side', badgeColor: 'emerald' },

  // ── OFFICE / Optimize ────────────────────────────────────────────────────────
  { id: 'compress',title: 'Compress Document',description: 'Strip unused data from DOCX, PPTX, XLSX files.',          category: 'office', subcategory: 'off_optimize', icon: FileArchive, actionName: 'compress' },
  { id: 'edit',    title: 'Clean Word Layout',description: 'Normalize margins, remove blank paragraphs, fix fonts.',   category: 'office', subcategory: 'off_optimize', icon: FileEdit,    actionName: 'docx_cleanup' },

  // ── VIDEO / Edit ─────────────────────────────────────────────────────────────
  { id: 'edit',    title: 'Trim & Cut',        description: 'Extract a clip by setting start and end time markers.',   category: 'video', subcategory: 'vid_edit', icon: Scissors,    actionName: 'trim' },
  { id: 'compress',title: 'Compress Video',    description: 'Re-encode MP4 to smaller size with H264 CRF control.',   category: 'video', subcategory: 'vid_edit', icon: FileArchive, actionName: 'compress' },

  // ── VIDEO / Convert ──────────────────────────────────────────────────────────
  { id: 'convert', title: 'Extract Audio',     description: 'Strip audio track from a video file as MP3.',             category: 'video', subcategory: 'vid_convert', icon: Music,      actionName: 'video_to_audio' },
  { id: 'convert', title: 'Video → GIF',       description: 'Convert a short video clip into an animated GIF.',        category: 'video', subcategory: 'vid_convert', icon: RefreshCw,  actionName: 'video_to_gif' },
  { id: 'compress',title: 'Compress Audio',    description: 'Reduce audio file size by adjusting bitrate and format.', category: 'video', subcategory: 'vid_convert', icon: Music,      actionName: 'compress_audio' },
];

const BADGE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  violet:  'bg-violet-500/10 text-violet-400 border-violet-500/25',
  primary: 'bg-primary/10 text-primary border-primary/25',
};

const TOOL_ICON_COLOR: Record<string, string> = {
  pdf: 'text-red-400', image: 'text-blue-400', office: 'text-emerald-400', video: 'text-violet-400',
};
const TOOL_ICON_BG: Record<string, string> = {
  pdf: 'bg-red-500/10 border-red-500/20', image: 'bg-blue-500/10 border-blue-500/20',
  office: 'bg-emerald-500/10 border-emerald-500/20', video: 'bg-violet-500/10 border-violet-500/20',
};

const FAVORITES_KEY = 'filenova-favorite-tools';
const RECENTS_KEY = 'filenova-recent-tools';
const SPECIAL_FILTERS = ['favorites', 'recent'];

const getToolKey = (tool: ToolItem) => `${tool.category}:${tool.actionName}:${tool.title}`;

const readStoredList = (key: string) => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

export const ToolGrid: React.FC = () => {
  const { files, setOperation, updateOptions, isMockMode, jobId, setJobId, setError, selectedSection, setSelectedSection, openEditor } = useFileStore();
  const t = useTranslation();
  const admin = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState<'all' | string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [favoriteTools, setFavoriteTools] = useState<string[]>(() => readStoredList(FAVORITES_KEY));
  const [recentTools, setRecentTools] = useState<string[]>(() => readStoredList(RECENTS_KEY));

  const activeCategory = selectedSection || 'all';
  const firstFileType = files[0]?.type || '';
  const favoriteSet = new Set(favoriteTools);
  const recentSet = new Set(recentTools);

  const handleCategoryChange = (category: 'all' | 'pdf' | 'image' | 'office' | 'video') => {
    setSelectedSection(category === 'all' ? null : category);
    setActiveSubcategory('all');
  };

  const isSuggested = (tool: ToolItem) => {
    if (files.length === 0) return false;
    if (firstFileType === 'application/pdf' && tool.category === 'pdf') return true;
    if (firstFileType === 'image/svg+xml' && tool.actionName === 'svg_to_png') return true;
    if (firstFileType.startsWith('image/') && (tool.category === 'image' || tool.actionName === 'images_to_pdf')) return true;
    if (firstFileType.startsWith('video/') && tool.category === 'video') return true;
    if (firstFileType.startsWith('audio/') && tool.actionName === 'compress_audio') return true;
    if ((firstFileType.includes('officedocument') || firstFileType.includes('word') || firstFileType.includes('sheet') || firstFileType.includes('presentation') || firstFileType === 'text/csv' || firstFileType === 'text/markdown' || firstFileType === 'text/html') && tool.category === 'office') return true;
    return false;
  };

  const handleSelectTool = (tool: ToolItem) => {
    rememberTool(tool);
    if (files.length > 0) {
      setOperation(tool.id);
      updateOptions({ operation: tool.actionName });
    } else {
      if (!admin.settings.editingEnabled) { setError(t.editingDisabled); return; }
      triggerDirectUpload(tool);
    }
  };

  const rememberTool = (tool: ToolItem) => {
    const key = getToolKey(tool);
    setRecentTools((prev) => {
      const next = [key, ...prev.filter((item) => item !== key)].slice(0, 8);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = (tool: ToolItem) => {
    const key = getToolKey(tool);
    setFavoriteTools((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [key, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getAcceptForTool = (tool: ToolItem): string => {
    const imageTypes = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp';
    if (tool.actionName === 'scan_to_pdf') return 'image/*,.pdf';
    if (tool.category === 'image') return tool.actionName === 'svg_to_png' ? 'image/svg+xml,.svg' : imageTypes;
    if (tool.category === 'pdf') return tool.actionName === 'images_to_pdf' ? imageTypes : 'application/pdf';
    if (tool.category === 'video') return tool.actionName === 'compress_audio' ? 'audio/*' : 'video/mp4,video/webm,video/*';
    if (tool.actionName === 'merge_docs') return '.docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';
    if (tool.actionName === 'docx_to_pdf' || tool.actionName === 'docx_cleanup') return '.docx';
    if (tool.actionName === 'pptx_to_pdf') return '.pptx';
    if (tool.actionName === 'xlsx_to_csv') return '.xlsx';
    if (tool.actionName === 'csv_to_xlsx') return '.csv,text/csv';
    if (tool.actionName === 'md_to_html') return '.md,text/markdown';
    if (tool.actionName === 'html_to_md') return '.html,text/html';
    if (tool.actionName === 'html_to_zip') return '.html,.htm,.css,.js,.mjs,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,text/html';
    return '.docx,.pptx,.xlsx,.csv,.md,.html,application/pdf';
  };

  const triggerDirectUpload = (tool: ToolItem) => {
    if (!admin.settings.editingEnabled) { setError(t.editingDisabled); return; }
    if (tool.actionName === 'scan_to_pdf') {
      setOperation(tool.id); updateOptions({ operation: tool.actionName }); return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getAcceptForTool(tool);
    if (['merge', 'merge_docs', 'images_to_pdf', 'pdf_compare', 'html_to_zip'].includes(tool.actionName)) input.multiple = true;
    input.onchange = async (e: Event) => {
      const filesList = (e.target as HTMLInputElement).files;
      if (!filesList || filesList.length === 0) return;
      setError(null);
      const filesArr = Array.from(filesList);
      const file = filesArr[0];
      const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document';
      openEditor(file, fileType);
      setOperation(tool.id);
      updateOptions({ operation: tool.actionName });
    };
    input.click();
  };

  const q = searchQuery.toLowerCase();
  const allFiltered = TOOLS.filter(t => {
    const matchesCat = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.actionName.toLowerCase().includes(q);
    const key = getToolKey(t);
    const matchesSubcategory =
      activeSubcategory === 'all' ||
      (activeSubcategory === 'favorites' && favoriteSet.has(key)) ||
      (activeSubcategory === 'recent' && recentSet.has(key)) ||
      t.subcategory === activeSubcategory;
    return matchesCat && matchesSearch && matchesSubcategory;
  });

  const subcategoryOrder = activeCategory === 'all'
    ? Array.from(new Set(Object.values(CATEGORY_ORDER).flat()))
    : CATEGORY_ORDER[activeCategory] || [];

  const grouped = subcategoryOrder.reduce<Record<string, ToolItem[]>>((acc, sub) => {
    const tools = allFiltered.filter(t => t.subcategory === sub);
    if (tools.length > 0) acc[sub] = tools;
    return acc;
  }, {});

  const isSearching = q.length > 0;
  const isSpecialFilter = SPECIAL_FILTERS.includes(activeSubcategory);
  const orderedFiltered = activeSubcategory === 'recent'
    ? [...allFiltered].sort((a, b) => recentTools.indexOf(getToolKey(a)) - recentTools.indexOf(getToolKey(b)))
    : allFiltered;

  return (
    <div className="w-full space-y-2">
      {isUploading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-premium flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <p className="font-bold text-foreground text-sm">{t.importingFiles}</p>
        </motion.div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
        <input
          type="text"
          placeholder={t.searchToolsPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            title={t.clearSearch || "Clear search"}
            aria-label={t.clearSearch || "Clear search"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {CATEGORY_TABS.map((category) => (
          <button
            key={category.key}
            onClick={() => handleCategoryChange(category.key as any)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeCategory === category.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'}`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={() => setActiveSubcategory('all')}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeSubcategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'}`}
        >
          {t.allTools}
        </button>
        <button
          onClick={() => setActiveSubcategory('favorites')}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeSubcategory === 'favorites' ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-card text-muted-foreground border-border hover:border-amber-400 hover:text-foreground'}`}
        >
          <Star className={`h-3.5 w-3.5 ${favoriteTools.length > 0 ? 'fill-current' : ''}`} />
          {t.favorites}
          {favoriteTools.length > 0 && <span className="rounded-full bg-background/70 px-1.5 text-[10px]">{favoriteTools.length}</span>}
        </button>
        <button
          onClick={() => setActiveSubcategory('recent')}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeSubcategory === 'recent' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'}`}
        >
          <History className="h-3.5 w-3.5" />
          {t.recent}
          {recentTools.length > 0 && <span className="rounded-full bg-background/70 px-1.5 text-[10px]">{recentTools.length}</span>}
        </button>
        {subcategoryOrder.map((sub) => {
          const meta = SUBCATEGORY_META[sub];
          if (!meta) return null;
          return (
            <button
              key={sub}
              onClick={() => setActiveSubcategory(sub)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeSubcategory === sub ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'}`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* No results */}
      {allFiltered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          {activeSubcategory === 'favorites' ? <Star className="h-8 w-8 mx-auto text-muted-foreground/20" /> : <Search className="h-8 w-8 mx-auto text-muted-foreground/20" />}
          <p className="text-sm text-muted-foreground">
            {activeSubcategory === 'favorites'
              ? t.noToolsFavorites
              : activeSubcategory === 'recent'
                ? t.noToolsRecent
                : <>{t.noToolsMatch.replace('{q}', searchQuery ? searchQuery : '')}</>
            }
          </p>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-xs text-primary hover:underline">{t.clearSearch}</button>}
        </div>
      )}

      {/* Grouped sections */}
      <AnimatePresence mode="popLayout">
        {isSearching || isSpecialFilter ? (
          // Flat list when searching
          <motion.div key={`${activeSubcategory}-flat`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {orderedFiltered.map((tool, i) => (
              <ToolCard
                key={`${tool.actionName}-${i}`}
                tool={tool}
                suggested={isSuggested(tool)}
                favorite={favoriteSet.has(getToolKey(tool))}
                onFavorite={() => toggleFavorite(tool)}
                onClick={() => handleSelectTool(tool)}
                showSubcategory
              />
            ))}
          </motion.div>
        ) : (
          // Grouped sections when not searching
          <motion.div key="grouped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-6">
            {Object.entries(grouped).map(([sub, tools]) => {
              const meta = SUBCATEGORY_META[sub];
              if (!meta) return null;
              const SubIcon = meta.icon;
              return (
                <motion.div key={sub} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  className="space-y-3">
                  {/* Section header */}
                  <div className="flex items-center gap-2.5">
                    <div className={`h-7 w-7 rounded-lg ${meta.iconBg} border ${meta.borderColor} flex items-center justify-center shrink-0`}>
                      <SubIcon className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{meta.label}</span>
                    <span className="text-xs text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-full border border-border">
                      {tools.length}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  {/* Tool cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tools.map((tool, i) => (
                      <ToolCard
                        key={`${tool.actionName}-${i}`}
                        tool={tool}
                        suggested={isSuggested(tool)}
                        favorite={favoriteSet.has(getToolKey(tool))}
                        onFavorite={() => toggleFavorite(tool)}
                        onClick={() => handleSelectTool(tool)}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ToolCardProps {
  tool: ToolItem;
  suggested: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onClick: () => void;
  showSubcategory?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, suggested, favorite, onFavorite, onClick, showSubcategory }) => {
  const ToolIcon = tool.icon;
  const iconColor = TOOL_ICON_COLOR[tool.category];
  const iconBg = TOOL_ICON_BG[tool.category];
  const subcatMeta = SUBCATEGORY_META[tool.subcategory];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={`group relative w-full text-left rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 overflow-hidden animated-lines-bg
        ${suggested
          ? 'bg-primary/5 border-primary/35 shadow-glow hover:bg-primary/8'
          : 'bg-card border-border hover:border-primary/30 hover:bg-muted/40'
        }
      `}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Icon */}
        <div className={`h-9 w-9 rounded-lg ${iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150`}>
          <ToolIcon className={`h-4 w-4 ${iconColor}`} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">{tool.title}</h3>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onFavorite();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onFavorite();
                  }
                }}
                className={`h-7 w-7 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  favorite
                    ? 'bg-amber-400/15 border-amber-400/30 text-amber-400'
                    : 'bg-background/70 border-border text-muted-foreground hover:text-amber-400 hover:border-amber-400/40'
                }`}
                aria-label={favorite ? `Remove ${tool.title} from favorites` : `Add ${tool.title} to favorites`}
              >
                <Star className={`h-3.5 w-3.5 ${favorite ? 'fill-current' : ''}`} />
              </span>
              {suggested && (
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap">Suggested</span>
              )}
              {tool.badge && !suggested && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide border whitespace-nowrap ${
                  (BADGE_COLORS as any)[tool.badgeColor || 'emerald']
                }`}>
                  {tool.badge}
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
          {showSubcategory && subcatMeta && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 ${subcatMeta.iconColor}`}>
              {tool.category.toUpperCase()} · {subcatMeta.label}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ToolGrid;
