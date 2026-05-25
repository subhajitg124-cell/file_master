import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileArchive, Sparkles, FileEdit, RefreshCw, Search, Video, FileText,
  FileSpreadsheet, Loader2, Scissors, Image, Music, Globe, FileCode,
  ArrowLeftRight, Maximize2, MonitorSmartphone, ImageIcon, RotateCw,
  Trash2, Stamp, Hash, AlignJustify, Crop, FlipHorizontal, PenTool,
  Eraser, ScanLine, ScanText, Lock, Unlock, ShieldCheck, FileSearch2,
  GitCompareArrows, BrainCircuit, Languages, PenLine, Camera, BookOpen,
  FileWarning, FileCheck2
} from 'lucide-react';
import { useFileStore, OperationType } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';

interface ToolItem {
  id: OperationType;
  title: string;
  description: string;
  category: 'pdf' | 'image' | 'video' | 'office';
  icon: any;
  gradient: string;
  actionName: string;
  badge?: string;
  badgeColor?: string;
}

const TOOLS: ToolItem[] = [
  // ── PDF ────────────────────────────────────────────────────────────────────
  { id: 'merge',    title: 'Merge PDFs',        description: 'Combine multiple PDF files into one document.',                  category: 'pdf', icon: FileText,         gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'merge' },
  { id: 'compress', title: 'Compress PDF',       description: 'Reduce file size while preserving fonts and structure.',         category: 'pdf', icon: FileArchive,      gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'compress' },
  { id: 'split',    title: 'Split PDF',          description: 'Extract individual pages or ranges into separate PDFs.',         category: 'pdf', icon: Scissors,         gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'split',            badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Edit PDF',           description: 'Add text, cover content, or replace text on any page.',          category: 'pdf', icon: ScanText,         gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_annotate',     badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Redact PDF',         description: 'Black out or color over sensitive content permanently.',         category: 'pdf', icon: Eraser,           gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_redact',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Sign PDF',           description: 'Place a handwritten-style signature on any page.',              category: 'pdf', icon: PenLine,          gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_sign',         badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Protect PDF',        description: 'Add a password to restrict opening or editing the file.',        category: 'pdf', icon: ShieldCheck,      gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_protect' },
  { id: 'edit',     title: 'Unlock PDF',         description: 'Remove password from a protected PDF document.',                category: 'pdf', icon: Unlock,           gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_unlock',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Crop Pages',         description: 'Trim the visible area of PDF pages with a custom crop box.',    category: 'pdf', icon: Crop,             gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_crop',         badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Rotate Pages',       description: 'Rotate all or specific pages by 90°, 180°, or 270°.',           category: 'pdf', icon: RotateCw,         gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_rotate',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Delete Pages',       description: 'Remove specific pages from the PDF document.',                  category: 'pdf', icon: Trash2,           gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_delete',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Reorder Pages',      description: 'Rearrange pages into any custom order.',                        category: 'pdf', icon: AlignJustify,     gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_reorder',      badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Add Watermark',      description: 'Stamp text on every page — diagonal, center, or footer.',       category: 'pdf', icon: Stamp,            gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_watermark',    badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Add Page Numbers',   description: 'Insert page numbers at header or footer positions.',            category: 'pdf', icon: Hash,             gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_page_numbers', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Insert Link',        description: 'Add clickable hyperlink annotations to any page area.',        category: 'pdf', icon: Globe,            gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_insert_link',  badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Insert Image',       description: 'Embed a PNG or JPEG image at any position in the PDF.',          category: 'pdf', icon: ImageIcon,        gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_insert_image', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Draw Shapes',        description: 'Add rectangles, ellipses, lines, and arrows on any page.',      category: 'pdf', icon: PenTool,          gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_insert_shape', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'PDF Forms',          description: 'Fill and flatten interactive form fields in a PDF.',            category: 'pdf', icon: BookOpen,         gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_forms',        badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'OCR PDF',            description: 'Extract text from scanned PDFs and image-based documents.',     category: 'pdf', icon: ScanLine,         gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_ocr' },
  { id: 'edit',     title: 'Compare PDFs',       description: 'Show differences between two PDF versions side by side.',       category: 'pdf', icon: GitCompareArrows, gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_compare' },
  { id: 'edit',     title: 'AI Summarize',       description: 'Generate a concise AI summary of any PDF document.',           category: 'pdf', icon: BrainCircuit,     gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_summarize',    badge: 'AI', badgeColor: 'violet' },
  { id: 'convert',  title: 'Translate PDF',      description: 'Translate PDF content to another language with AI.',            category: 'pdf', icon: Languages,        gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_translate',    badge: 'AI', badgeColor: 'violet' },
  { id: 'convert',  title: 'PDF → DOCX',         description: 'Convert PDF back into an editable Word document.',             category: 'pdf', icon: ArrowLeftRight,   gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_to_docx' },
  { id: 'convert',  title: 'PDF → PPTX',         description: 'Convert PDF pages into a PowerPoint presentation.',            category: 'pdf', icon: ArrowLeftRight,   gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_to_pptx' },
  { id: 'convert',  title: 'PDF → Excel',        description: 'Extract tables and data from PDF into a spreadsheet.',         category: 'pdf', icon: FileSpreadsheet,  gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_to_excel' },
  { id: 'convert',  title: 'PDF → Images',       description: 'Export every page as a PNG or JPEG image file.',               category: 'pdf', icon: ImageIcon,        gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_to_images' },
  { id: 'convert',  title: 'PDF to PDF/A',       description: 'Convert to ISO-standard archival format (PDF/A-1b).',          category: 'pdf', icon: FileCheck2,       gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'pdf_to_pdfa' },
  { id: 'convert',  title: 'Images → PDF',       description: 'Pack multiple images into a single PDF document.',             category: 'pdf', icon: Image,            gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'images_to_pdf',    badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert',  title: 'Scan to PDF',        description: 'Capture a photo with your camera and convert to PDF.',         category: 'pdf', icon: Camera,           gradient: 'from-red-500/20 to-rose-500/10 border-red-500/25',     actionName: 'scan_to_pdf',      badge: 'Client-side', badgeColor: 'emerald' },

  // ── IMAGE ──────────────────────────────────────────────────────────────────
  { id: 'compress', title: 'Compress Image',     description: 'Reduce PNG/JPEG/WEBP size with quality presets.',              category: 'image', icon: FileArchive,       gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'compress',         badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'enhance',  title: 'Enhance Image',      description: 'Adjust brightness, contrast, sharpness & denoise.',           category: 'image', icon: Sparkles,          gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'enhance' },
  { id: 'resize',   title: 'Resize Image',       description: 'Set exact pixel dimensions or scale by percentage.',           category: 'image', icon: Maximize2,         gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'resize',           badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Remove Background',  description: 'AI-powered background removal, outputs transparent PNG.',     category: 'image', icon: Eraser,            gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'remove_bg',        badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Crop Image',         description: 'Trim to exact coordinates or common aspect ratios.',           category: 'image', icon: Crop,              gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'image_crop',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Rotate & Flip',      description: 'Rotate 90°/180°/270° or flip horizontally/vertically.',        category: 'image', icon: FlipHorizontal,    gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'image_rotate',     badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'edit',     title: 'Add Watermark',      description: 'Stamp text or logo over any image — tiled or single.',         category: 'image', icon: PenTool,           gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'image_watermark',  badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert',  title: 'Convert Format',     description: 'Convert between PNG, JPEG, WEBP, GIF, BMP.',                  category: 'image', icon: RefreshCw,         gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'convert_format',   badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert',  title: 'Image → ICO',        description: 'Create a multi-size .ico favicon (16–256 px).',                category: 'image', icon: MonitorSmartphone, gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'to_ico',           badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert',  title: 'SVG → PNG',          description: 'Render vector SVG as a raster PNG at any resolution.',         category: 'image', icon: Globe,             gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'svg_to_png',       badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'convert',  title: 'Images → PDF',       description: 'Combine images into a single PDF document.',                  category: 'image', icon: FileText,          gradient: 'from-blue-500/20 to-cyan-500/10 border-blue-500/25',   actionName: 'images_to_pdf',    badge: 'Client-side', badgeColor: 'emerald' },

  // ── OFFICE ─────────────────────────────────────────────────────────────────
  { id: 'convert',  title: 'DOCX → PDF',         description: 'Convert Word documents to standard PDF layout.',              category: 'office', icon: FileText,         gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'docx_to_pdf' },
  { id: 'convert',  title: 'PDF → DOCX',         description: 'Convert PDF back into an editable Word document.',            category: 'office', icon: ArrowLeftRight,   gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'pdf_to_docx' },
  { id: 'convert',  title: 'PPTX → PDF',         description: 'Convert PowerPoint slides into standard PDFs.',               category: 'office', icon: FileText,         gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'pptx_to_pdf' },
  { id: 'convert',  title: 'PDF → PPTX',         description: 'Convert PDF pages into a PowerPoint presentation.',           category: 'office', icon: ArrowLeftRight,   gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'pdf_to_pptx' },
  { id: 'convert',  title: 'XLSX → CSV',         description: 'Export Excel spreadsheet cells to comma-separated file.',    category: 'office', icon: FileSpreadsheet,  gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'xlsx_to_csv' },
  { id: 'convert',  title: 'CSV → XLSX',         description: 'Import a CSV file into a formatted Excel workbook.',          category: 'office', icon: ArrowLeftRight,   gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'csv_to_xlsx' },
  { id: 'convert',  title: 'PDF → Excel',        description: 'Extract tables and data from PDF into a spreadsheet.',        category: 'office', icon: FileSpreadsheet,  gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'pdf_to_excel' },
  { id: 'convert',  title: 'Markdown → HTML',    description: 'Render .md files into styled HTML pages.',                   category: 'office', icon: FileCode,         gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'md_to_html' },
  { id: 'convert',  title: 'HTML → Markdown',    description: 'Convert HTML files back into clean Markdown.',               category: 'office', icon: ArrowLeftRight,   gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'html_to_md' },
  { id: 'convert',  title: 'HTML → ZIP',         description: 'Bundle HTML, CSS, JS and assets into a portable ZIP file.',  category: 'office', icon: FileArchive,      gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'html_to_zip', badge: 'Client-side', badgeColor: 'emerald' },
  { id: 'compress', title: 'Compress Document',  description: 'Strip unused data from DOCX/PPTX/XLSX.',                    category: 'office', icon: FileArchive,      gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'compress' },
  { id: 'edit',     title: 'Clean Word Layout',  description: 'Normalize margins, remove empty paragraphs, fix fonts.',    category: 'office', icon: FileEdit,         gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25', actionName: 'docx_cleanup' },

  // ── VIDEO ──────────────────────────────────────────────────────────────────
  { id: 'edit',     title: 'Trim & Cut Video',   description: 'Extract a clip with start/end time markers.',                category: 'video', icon: Scissors,    gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/25',  actionName: 'trim' },
  { id: 'compress', title: 'Compress Video',     description: 'Re-encode MP4 to smaller size with H264 CRF control.',      category: 'video', icon: FileArchive, gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/25',  actionName: 'compress' },
  { id: 'convert',  title: 'Extract Audio',      description: 'Strip audio track from a video file as MP3.',               category: 'video', icon: Music,       gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/25',  actionName: 'video_to_audio' },
  { id: 'convert',  title: 'Video → GIF',        description: 'Convert a short video clip into an animated GIF.',          category: 'video', icon: RefreshCw,   gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/25',  actionName: 'video_to_gif' },
  { id: 'compress', title: 'Compress Audio',     description: 'Reduce audio file size by adjusting bitrate and format.',   category: 'video', icon: Music,       gradient: 'from-violet-500/20 to-purple-500/10 border-violet-500/25',  actionName: 'compress_audio' },
];

const BADGE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  violet:  'bg-violet-500/10 text-violet-400 border-violet-500/25',
  primary: 'bg-primary/10 text-primary border-primary/25',
};

export const ToolGrid: React.FC = () => {
  const { files, setOperation, updateOptions, isMockMode, jobId, setJobId, setError, addFiles, selectedSection } = useFileStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const activeCategory = selectedSection || 'all';
  const firstFileType = files[0]?.type || '';

  const getToolSuggestion = (tool: ToolItem) => {
    if (files.length === 0) return false;
    if (firstFileType === 'application/pdf' && tool.category === 'pdf') return true;
    if (firstFileType === 'image/svg+xml' && tool.actionName === 'svg_to_png') return true;
    if (firstFileType.startsWith('image/') && (tool.category === 'image' || (tool.category === 'pdf' && tool.actionName === 'images_to_pdf'))) return true;
    if (firstFileType.startsWith('video/') && tool.category === 'video') return true;
    if (firstFileType.startsWith('audio/') && tool.actionName === 'compress_audio') return true;
    if ((firstFileType.includes('officedocument') || firstFileType.includes('word') || firstFileType.includes('sheet') || firstFileType.includes('presentation') || firstFileType === 'text/csv' || firstFileType === 'text/markdown' || firstFileType === 'text/html') && tool.category === 'office') return true;
    return false;
  };

  const handleSelectTool = (tool: ToolItem) => {
    if (files.length > 0) {
      setOperation(tool.id);
      updateOptions({ operation: tool.actionName });
    } else {
      triggerDirectUpload(tool);
    }
  };

  const getAcceptForTool = (tool: ToolItem): string => {
    const imageTypes = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp';
    if (tool.actionName === 'scan_to_pdf') return 'image/*,.pdf';
    if (tool.category === 'image') {
      if (tool.actionName === 'svg_to_png') return 'image/svg+xml,.svg';
      return imageTypes;
    }
    if (tool.category === 'pdf') {
      if (tool.actionName === 'images_to_pdf') return imageTypes;
      if (tool.actionName === 'pdf_compare') return 'application/pdf';
      return 'application/pdf';
    }
    if (tool.category === 'video') {
      if (tool.actionName === 'compress_audio') return 'audio/*';
      return 'video/mp4,video/webm,video/*';
    }
    if (tool.actionName === 'docx_to_pdf' || tool.actionName === 'docx_cleanup') return '.docx';
    if (tool.actionName === 'pptx_to_pdf') return '.pptx';
    if (tool.actionName === 'xlsx_to_csv' || tool.actionName === 'pdf_to_excel') return '.xlsx,application/pdf';
    if (tool.actionName === 'csv_to_xlsx') return '.csv,text/csv';
    if (tool.actionName === 'md_to_html') return '.md,text/markdown';
    if (tool.actionName === 'html_to_md') return '.html,text/html';
    if (tool.actionName === 'html_to_zip') return '.html,.htm,.css,.js,.mjs,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,text/html';
    return '.docx,.pptx,.xlsx,.csv,.md,.html,application/pdf';
  };

  const triggerDirectUpload = (tool: ToolItem) => {
    if (tool.actionName === 'scan_to_pdf') {
      setOperation(tool.id);
      updateOptions({ operation: tool.actionName });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getAcceptForTool(tool);
    if (tool.actionName === 'merge' || tool.actionName === 'images_to_pdf' || tool.actionName === 'pdf_compare' || tool.actionName === 'html_to_zip') input.multiple = true;
    input.onchange = async (e: Event) => {
      const filesList = (e.target as HTMLInputElement).files;
      if (filesList && filesList.length > 0) {
        setIsUploading(true); setError(null);
        const filesArr = Array.from(filesList);
        const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
        setJobId(activeJobId);
        try {
          useFileStore.getState().addRawFiles(filesArr);
          const uploaded = isMockMode
            ? await apiMock.uploadFiles(filesArr, activeJobId)
            : await apiClient.uploadFiles(filesArr, activeJobId);
          addFiles(uploaded);
          setOperation(tool.id);
          updateOptions({ operation: tool.actionName });
        } catch (err: any) { setError(err.message || 'Upload failed.'); }
        finally { setIsUploading(false); }
      }
    };
    input.click();
  };

  const filteredTools = TOOLS.filter(tool => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || tool.title.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q) || tool.actionName.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const shouldLimit = filteredTools.length > 8 && !searchQuery;
  const displayed = shouldLimit && !showAll ? filteredTools.slice(0, 8) : filteredTools;

  const iconColorMap: Record<string, string> = {
    pdf: 'text-red-400', image: 'text-blue-400', office: 'text-emerald-400', video: 'text-violet-400',
  };

  return (
    <div className="w-full space-y-5">
      {isUploading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/70 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-premium flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <p className="font-bold text-foreground text-sm">Importing files…</p>
        </motion.div>
      )}

      {files.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <input type="text" placeholder="Search tools…" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {displayed.map((tool, idx) => {
            const isSuggested = getToolSuggestion(tool);
            const ToolIcon = tool.icon;
            const iconColor = iconColorMap[tool.category];
            return (
              <motion.button key={`${tool.actionName}-${idx}`} layout
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.25) }}
                onClick={() => handleSelectTool(tool)}
                className={`group relative text-left rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 overflow-hidden bg-card hover:shadow-premium ${
                  isSuggested ? 'border-primary/40 shadow-glow' : 'border-border hover:border-border/60'
                }`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${tool.gradient}`} />
                <div className="relative p-4 space-y-3">
                  <div className="flex items-start justify-between gap-1 min-h-[20px]">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${tool.gradient} border shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                      <ToolIcon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isSuggested && <span className="text-[9px] bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Suggested</span>}
                      {tool.badge && !isSuggested && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${BADGE_COLORS[tool.badgeColor || 'emerald']}`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-sm text-foreground leading-tight">{tool.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tool.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredTools.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-2">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No tools match "<span className="text-foreground">{searchQuery}</span>"</p>
          <button onClick={() => setSearchQuery('')} className="text-xs text-primary hover:underline">Clear search</button>
        </motion.div>
      )}

      {shouldLimit && (
        <div className="text-center pt-1">
          <button onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-4 py-1.5 rounded-full border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10">
            {showAll ? 'Show less' : `Show all ${filteredTools.length} tools`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolGrid;
