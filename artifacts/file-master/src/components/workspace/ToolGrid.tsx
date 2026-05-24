import React, { useState } from 'react';
import { FileArchive, Sparkles, FileEdit, RefreshCw, Search, Video, FileText, FileSpreadsheet, Loader2, Scissors, Image, Music, Globe, FileCode, ArrowLeftRight } from 'lucide-react';
import { useFileStore, OperationType } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';

interface ToolItem {
  id: OperationType;
  title: string;
  description: string;
  category: 'pdf' | 'image' | 'video' | 'office';
  icon: any;
  color: string;
  actionName: string;
  badge?: string;
}

const TOOLS: ToolItem[] = [
  // ── PDF ──────────────────────────────────────────────────────────────────
  { id: 'merge',    title: 'Merge PDFs',        description: 'Combine multiple PDF files into one document.',                   category: 'pdf', icon: FileText,    color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'merge' },
  { id: 'compress', title: 'Compress PDF',       description: 'Reduce file size while preserving fonts and structure.',          category: 'pdf', icon: FileArchive, color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'compress' },
  { id: 'split',    title: 'Split PDF',          description: 'Extract individual pages or ranges into separate PDFs.',          category: 'pdf', icon: Scissors,    color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'split', badge: 'Client-side' },
  { id: 'convert',  title: 'PDF → DOCX',         description: 'Convert PDF back into an editable Word document.',               category: 'pdf', icon: ArrowLeftRight, color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'pdf_to_docx' },
  { id: 'convert',  title: 'PDF → PPTX',         description: 'Convert PDF pages into a PowerPoint presentation.',              category: 'pdf', icon: ArrowLeftRight, color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'pdf_to_pptx' },
  { id: 'convert',  title: 'PDF → Images',       description: 'Extract every page as a PNG image file.',                        category: 'pdf', icon: Image,       color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'pdf_to_images' },
  { id: 'convert',  title: 'Images → PDF',       description: 'Pack multiple images into a single PDF document.',               category: 'pdf', icon: Image,       color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', actionName: 'images_to_pdf', badge: 'Client-side' },

  // ── IMAGE ─────────────────────────────────────────────────────────────────
  { id: 'compress', title: 'Compress Image',     description: 'Reduce PNG/JPEG/WEBP file size and resize dimensions.',          category: 'image', icon: FileArchive,  color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20', actionName: 'compress' },
  { id: 'enhance',  title: 'Enhance Image',      description: 'Sharpen, denoise, and adjust brightness/contrast.',              category: 'image', icon: Sparkles,     color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20', actionName: 'enhance' },
  { id: 'convert',  title: 'Convert Format',     description: 'Convert between PNG, JPEG, WEBP, and GIF formats.',              category: 'image', icon: RefreshCw,    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20', actionName: 'convert' },
  { id: 'convert',  title: 'Images → PDF',       description: 'Combine images into a single PDF document.',                     category: 'image', icon: FileText,     color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20', actionName: 'images_to_pdf', badge: 'Client-side' },

  // ── OFFICE ────────────────────────────────────────────────────────────────
  { id: 'convert',  title: 'DOCX → PDF',         description: 'Convert Word documents to standard PDF layout.',                 category: 'office', icon: FileText,      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'docx_to_pdf' },
  { id: 'convert',  title: 'PDF → DOCX',         description: 'Convert PDF back into an editable Word document.',               category: 'office', icon: ArrowLeftRight, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'pdf_to_docx' },
  { id: 'convert',  title: 'PPTX → PDF',         description: 'Convert PowerPoint slides into standard PDFs.',                  category: 'office', icon: FileText,      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'pptx_to_pdf' },
  { id: 'convert',  title: 'PDF → PPTX',         description: 'Convert PDF pages into a PowerPoint presentation.',              category: 'office', icon: ArrowLeftRight, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'pdf_to_pptx' },
  { id: 'convert',  title: 'XLSX → CSV',         description: 'Export Excel spreadsheet cells to comma-separated file.',        category: 'office', icon: FileSpreadsheet, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'xlsx_to_csv' },
  { id: 'convert',  title: 'CSV → XLSX',         description: 'Import a CSV file into a formatted Excel workbook.',             category: 'office', icon: ArrowLeftRight, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'csv_to_xlsx' },
  { id: 'convert',  title: 'Markdown → HTML',    description: 'Render .md files into styled HTML pages.',                       category: 'office', icon: FileCode,      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'md_to_html' },
  { id: 'convert',  title: 'HTML → Markdown',    description: 'Convert HTML files back into clean Markdown.',                   category: 'office', icon: ArrowLeftRight, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'html_to_md' },
  { id: 'compress', title: 'Compress Document',  description: 'Strip unused data from DOCX/PPTX/XLSX to reduce file size.',    category: 'office', icon: FileArchive,   color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'compress' },
  { id: 'edit',     title: 'Clean Word Layout',  description: 'Normalize margins, remove empty paragraphs, fix font weights.', category: 'office', icon: FileEdit,      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', actionName: 'docx_cleanup' },

  // ── VIDEO ─────────────────────────────────────────────────────────────────
  { id: 'edit',     title: 'Trim & Cut Video',   description: 'Extract a clip with start/end time markers.',                    category: 'video', icon: Scissors,    color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20', actionName: 'trim' },
  { id: 'compress', title: 'Compress Video',     description: 'Re-encode MP4 to smaller size with H264 CRF control.',          category: 'video', icon: FileArchive, color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20', actionName: 'compress' },
  { id: 'convert',  title: 'Extract Audio',      description: 'Strip audio track from a video file as MP3.',                   category: 'video', icon: Music,       color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20', actionName: 'video_to_audio' },
  { id: 'convert',  title: 'Video → GIF',        description: 'Convert a short video clip into an animated GIF.',              category: 'video', icon: RefreshCw,   color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20', actionName: 'video_to_gif' },
  { id: 'compress', title: 'Compress Audio',     description: 'Reduce audio file size by adjusting bitrate and format.',       category: 'video', icon: Music,       color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20', actionName: 'compress_audio' },
];

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
    if (tool.actionName === 'images_to_pdf') return 'image/png, image/jpeg, image/webp, image/gif';
    if (tool.category === 'pdf') return 'application/pdf';
    if (tool.category === 'image') return 'image/png, image/jpeg, image/webp, image/gif';
    if (tool.category === 'video') {
      if (tool.actionName === 'compress_audio') return 'audio/*';
      return 'video/mp4, video/webm, video/*';
    }
    if (tool.actionName === 'docx_to_pdf' || tool.actionName === 'pdf_to_docx' || tool.actionName === 'docx_cleanup') return '.docx';
    if (tool.actionName === 'pptx_to_pdf' || tool.actionName === 'pdf_to_pptx') return '.pptx, application/pdf';
    if (tool.actionName === 'xlsx_to_csv') return '.xlsx';
    if (tool.actionName === 'csv_to_xlsx') return '.csv, text/csv';
    if (tool.actionName === 'md_to_html') return '.md, text/markdown';
    if (tool.actionName === 'html_to_md') return '.html, text/html';
    return '.docx, .pptx, .xlsx, .csv, .md, .html';
  };

  const triggerDirectUpload = (tool: ToolItem) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getAcceptForTool(tool);
    if (tool.actionName === 'merge' || tool.actionName === 'images_to_pdf') input.multiple = true;
    input.onchange = async (e: Event) => {
      const filesList = (e.target as HTMLInputElement).files;
      if (filesList && filesList.length > 0) {
        setIsUploading(true);
        setError(null);
        const filesArr = Array.from(filesList);
        const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
        setJobId(activeJobId);
        try {
          useFileStore.getState().addRawFiles(filesArr);
          const uploadedRecords = isMockMode
            ? await apiMock.uploadFiles(filesArr, activeJobId)
            : await apiClient.uploadFiles(filesArr, activeJobId);
          addFiles(uploadedRecords);
          setOperation(tool.id);
          updateOptions({ operation: tool.actionName });
        } catch (err: any) {
          setError(err.message || 'Direct upload failed.');
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const filteredTools = TOOLS.filter(tool => {
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.actionName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const shouldLimit = filteredTools.length > 6;
  const displayedTools = shouldLimit && !showAll ? filteredTools.slice(0, 6) : filteredTools;

  return (
    <div className="w-full space-y-5">
      {isUploading && (
        <div className="fixed inset-0 bg-background/55 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-extrabold text-foreground">Importing files...</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search tools (e.g. merge, docx, compress)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayedTools.map((tool, idx) => {
          const isSuggested = getToolSuggestion(tool);
          const ToolIcon = tool.icon;
          return (
            <button
              key={`${tool.actionName}-${idx}`}
              onClick={() => handleSelectTool(tool)}
              className={`relative text-left p-4 bg-card border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                isSuggested ? 'border-primary/50 shadow-premium' : 'border-border hover:border-border/80'
              } hover:-translate-y-0.5 hover:shadow-premium`}
            >
              {isSuggested && (
                <span className="absolute top-2.5 right-2.5 text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Suggested
                </span>
              )}
              {tool.badge && !isSuggested && (
                <span className="absolute top-2.5 right-2.5 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {tool.badge}
                </span>
              )}
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-lg border shrink-0 ${tool.color}`}>
                  <ToolIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5 pt-0.5">
                  <h3 className="font-bold text-sm text-foreground leading-tight">{tool.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tool.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No tools found for "<span className="text-foreground">{searchQuery}</span>"</p>
          <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-primary hover:underline">Clear search</button>
        </div>
      )}

      {shouldLimit && (
        <div className="text-center">
          <button onClick={() => setShowAll(!showAll)} className="text-xs font-bold text-primary hover:underline">
            {showAll ? 'Show less' : `Show all ${filteredTools.length} tools`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolGrid;
