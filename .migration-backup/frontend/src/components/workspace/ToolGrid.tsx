import React, { useState } from 'react';
import { 
  FileArchive, 
  Sparkles, 
  FileEdit, 
  RefreshCw, 
  Search, 
  Video, 
  FileText, 
  FileSpreadsheet, 
  Presentation,
  Loader2
} from 'lucide-react';
import { useFileStore, OperationType } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';

interface ToolItem {
  id: OperationType;
  title: string;
  description: string;
  category: 'pdf' | 'image' | 'video' | 'office';
  icon: any;
  color: string;
  actionName: string; // Detail backend operation name
}

const TOOLS: ToolItem[] = [
  {
    id: 'merge',
    title: 'Merge PDFs',
    description: 'Combine multiple PDF files into one document.',
    category: 'pdf',
    icon: FileText,
    color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
    actionName: 'merge'
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce file size of your PDF while maintaining quality.',
    category: 'pdf',
    icon: FileArchive,
    color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
    actionName: 'compress'
  },
  {
    id: 'compress',
    title: 'Compress Images',
    description: 'Optimize PNG, JPEG, and WEBP file size and dimensions.',
    category: 'image',
    icon: FileArchive,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    actionName: 'compress'
  },
  {
    id: 'enhance',
    title: 'Enhance Image',
    description: 'Sharpen, denoise, and adjust brightness of images.',
    category: 'image',
    icon: Sparkles,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    actionName: 'enhance'
  },
  {
    id: 'convert',
    title: 'Image Converter',
    description: 'Convert between PNG, JPEG, and WEBP formats.',
    category: 'image',
    icon: RefreshCw,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    actionName: 'convert'
  },
  {
    id: 'convert',
    title: 'DOCX to PDF',
    description: 'Convert Microsoft Word documents into PDF.',
    category: 'office',
    icon: FileText,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    actionName: 'docx_to_pdf'
  },
  {
    id: 'convert',
    title: 'PPTX to PDF',
    description: 'Convert PowerPoint slides into standard PDFs.',
    category: 'office',
    icon: Presentation,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    actionName: 'pptx_to_pdf'
  },
  {
    id: 'convert',
    title: 'XLSX to CSV',
    description: 'Convert spreadsheets to comma-separated files.',
    category: 'office',
    icon: FileSpreadsheet,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    actionName: 'xlsx_to_csv'
  },
  {
    id: 'edit',
    title: 'Clean Word Layout',
    description: 'Standardize margins, fonts, and clean empty margins.',
    category: 'office',
    icon: FileEdit,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    actionName: 'docx_cleanup'
  },
  {
    id: 'convert',
    title: 'Markdown to HTML',
    description: 'Convert markdown text (.md) into styled HTML pages.',
    category: 'office',
    icon: RefreshCw,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    actionName: 'md_to_html'
  },
  {
    id: 'edit',
    title: 'Video Trim & Cut',
    description: 'Extract parts of video files with timeline markers.',
    category: 'video',
    icon: Video,
    color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20',
    actionName: 'trim'
  },
  {
    id: 'compress',
    title: 'Compress Video',
    description: 'Reduce MP4 video file size using H264 codec.',
    category: 'video',
    icon: FileArchive,
    color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20',
    actionName: 'compress'
  }
];

export const ToolGrid: React.FC = () => {
  const { 
    files, 
    selectedOperation, 
    setOperation, 
    updateOptions,
    isMockMode,
    jobId,
    setJobId,
    setError,
    addFiles,
    selectedSection
  } = useFileStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const activeCategory = selectedSection || 'all';

  const firstFileType = files[0]?.type || '';

  // Smart default suggestions
  const getToolSuggestion = (tool: ToolItem) => {
    if (files.length === 0) return false;
    
    if (firstFileType === 'application/pdf' && tool.category === 'pdf') return true;
    if (firstFileType.startsWith('image/') && tool.category === 'image') return true;
    if (firstFileType.startsWith('video/') && tool.category === 'video') return true;
    if ((firstFileType.includes('word') || firstFileType.includes('officedocument') || firstFileType.endsWith('docx') || firstFileType.includes('sheet') || firstFileType.includes('presentation')) && tool.category === 'office') return true;
    
    return false;
  };

  const handleSelectTool = (tool: ToolItem) => {
    if (files.length > 0) {
      setOperation(tool.id);
      updateOptions({ operation: tool.actionName });
    } else {
      // Direct Tool Upload flow
      triggerDirectUpload(tool);
    }
  };

  const triggerDirectUpload = (tool: ToolItem) => {
    const input = document.createElement('input');
    input.type = 'file';
    
    // Set format restrictions
    if (tool.category === 'pdf') {
      input.accept = 'application/pdf';
    } else if (tool.category === 'image') {
      input.accept = 'image/png, image/jpeg, image/webp';
    } else if (tool.category === 'video') {
      input.accept = 'video/mp4';
    } else if (tool.category === 'office') {
      if (tool.actionName.includes('docx')) {
        input.accept = '.docx';
      } else if (tool.actionName.includes('pptx')) {
        input.accept = '.pptx';
      } else if (tool.actionName.includes('xlsx')) {
        input.accept = '.xlsx';
      } else if (tool.actionName.includes('md')) {
        input.accept = '.md';
      } else {
        input.accept = '.docx,.pptx,.xlsx,.md';
      }
    }

    input.onchange = async (e: Event) => {
      const filesList = (e.target as HTMLInputElement).files;
      if (filesList && filesList.length > 0) {
        setIsUploading(true);
        setError(null);
        
        const file = filesList[0];
        const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
        setJobId(activeJobId);

        try {
          useFileStore.getState().addRawFiles([file]);
          let uploadedRecords = [];
          if (isMockMode) {
            uploadedRecords = await apiMock.uploadFiles([file], activeJobId);
          } else {
            uploadedRecords = await apiClient.uploadFiles([file], activeJobId);
          }
          addFiles(uploadedRecords);
          // Set operation after upload success to transition to configuration step
          setOperation(tool.id);
          updateOptions({ operation: tool.actionName });
        } catch (err: any) {
          console.error(err);
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
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Progressive Disclosure: show top 4 tools, expand for more if category is 'all' or has > 4 tools
  const shouldLimit = filteredTools.length > 4;
  const displayedTools = shouldLimit && !showAll ? filteredTools.slice(0, 4) : filteredTools;

  return (
    <div className="w-full space-y-6">
      {isUploading && (
        <div className="fixed inset-0 bg-background/55 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-extrabold text-foreground">Directly importing files for tool...</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search tools (e.g. merge, docx, compress)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Search tools"
            />
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedTools.map((tool, idx) => {
          const isSuggested = getToolSuggestion(tool);
          
          return (
            <button
              key={idx}
              onClick={() => handleSelectTool(tool)}
              className={`relative text-left p-5 bg-card border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                isSuggested ? 'border-primary/50 shadow-premium' : 'border-border'
              } hover:-translate-y-0.5 hover:shadow-premium`}
              role="button"
              tabIndex={0}
              aria-label={`${tool.title}: ${tool.description}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectTool(tool);
                }
              }}
            >
              {isSuggested && (
                <span className="absolute top-3 right-3 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                  Suggested
                </span>
              )}
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg border ${tool.color}`}>
                  <tool.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1 pr-2">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug">{tool.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{tool.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progressive Disclosure Toggle */}
      {shouldLimit && (
        <div className="text-center pt-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary font-bold hover:underline uppercase tracking-wider"
          >
            {showAll ? '▲ Show fewer tools' : `▼ Show all ${filteredTools.length} tools`}
          </button>
        </div>
      )}

      {filteredTools.length === 0 && (
        <div className="text-center py-10 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground text-sm">No operations match your search query.</p>
        </div>
      )}
    </div>
  );
};
export default ToolGrid;
