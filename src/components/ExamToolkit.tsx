/**
 * Exam Form Toolkit Component
 * Template selector for Indian exams with photo/signature validators
 */

import React, { useState, useEffect, useRef } from "react";
import {
  School,
  Camera,
  PenLine,
  FileText,
  CheckCircle2,
  XCircle,
  Loader,
  Download,
  Upload,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface ExamTemplate {
  id: string;
  examName: string;
  state?: string;
  photo: string;
  signature: string;
  pdfMaxSizeKb: number;
}

interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string;
}

const FALLBACK_TEMPLATES: ExamTemplate[] = [
  { id: "wbjee", examName: "WBJEE", state: "West Bengal", photo: "3.5 × 4.5 cm", signature: "3.5 × 1.5 cm", pdfMaxSizeKb: 200 },
  { id: "jee", examName: "JEE Main", photo: "10–200 KB", signature: "4–30 KB", pdfMaxSizeKb: 200 },
  { id: "neet", examName: "NEET", photo: "10–200 KB", signature: "4–30 KB", pdfMaxSizeKb: 100 },
  { id: "cuet", examName: "CUET", photo: "10–200 KB", signature: "4–30 KB", pdfMaxSizeKb: 200 },
  { id: "ssc", examName: "SSC CGL", photo: "20–50 KB", signature: "10–20 KB", pdfMaxSizeKb: 300 },
  { id: "upsc", examName: "UPSC CSE", photo: "20–300 KB", signature: "10–40 KB", pdfMaxSizeKb: 300 },
];

const PHOTO_LIMITS: Record<string, { minKb: number; maxKb: number }> = {
  wbjee: { minKb: 10, maxKb: 200 },
  jee: { minKb: 10, maxKb: 200 },
  neet: { minKb: 10, maxKb: 200 },
  cuet: { minKb: 10, maxKb: 200 },
  ssc: { minKb: 20, maxKb: 50 },
  upsc: { minKb: 20, maxKb: 300 },
  scholarship: { minKb: 5, maxKb: 100 },
};

const SIGNATURE_LIMITS: Record<string, { minKb: number; maxKb: number }> = {
  wbjee: { minKb: 2, maxKb: 50 },
  jee: { minKb: 4, maxKb: 30 },
  neet: { minKb: 4, maxKb: 30 },
  cuet: { minKb: 4, maxKb: 30 },
  ssc: { minKb: 10, maxKb: 20 },
  upsc: { minKb: 10, maxKb: 40 },
  scholarship: { minKb: 2, maxKb: 30 },
};

const EXAM_ICONS: Record<string, string> = {
  wbjee: "🎓",
  jee: "🏗️",
  neet: "🏥",
  cuet: "📚",
  ssc: "🏛️",
  upsc: "⚖️",
  scholarship: "🎖️",
};

export function ExamToolkit() {
  const [templates, setTemplates] = useState<ExamTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [photoValidation, setPhotoValidation] = useState<ValidationResult | null>(null);
  const [sigValidation, setSigValidation] = useState<ValidationResult | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [packageResult, setPackageResult] = useState<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const selected = templates.find((t) => t.id === selectedId);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/v1/premium/exams/templates");
        if (res.ok) {
          const data = await res.json();
          if (data.templates?.length > 0) setTemplates(data.templates);
        }
      } catch {
        // Use fallback
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  const validatePhoto = (file: File) => {
    if (!selectedId) return;
    const sizeKb = file.size / 1024;
    const limits = PHOTO_LIMITS[selectedId] || { minKb: 10, maxKb: 200 };

    if (sizeKb < limits.minKb) {
      setPhotoValidation({
        valid: false,
        message: `Photo too small: ${sizeKb.toFixed(1)} KB`,
        details: `Minimum ${limits.minKb} KB required`,
      });
    } else if (sizeKb > limits.maxKb) {
      setPhotoValidation({
        valid: false,
        message: `Photo too large: ${sizeKb.toFixed(1)} KB`,
        details: `Maximum ${limits.maxKb} KB allowed`,
      });
    } else {
      setPhotoValidation({
        valid: true,
        message: `Photo valid: ${sizeKb.toFixed(1)} KB`,
        details: `Within ${limits.minKb}–${limits.maxKb} KB range`,
      });
    }
    setPhotoFile(file);
  };

  const validateSignature = (file: File) => {
    if (!selectedId) return;
    const sizeKb = file.size / 1024;
    const limits = SIGNATURE_LIMITS[selectedId] || { minKb: 4, maxKb: 30 };

    if (sizeKb < limits.minKb) {
      setSigValidation({
        valid: false,
        message: `Signature too small: ${sizeKb.toFixed(1)} KB`,
        details: `Minimum ${limits.minKb} KB required`,
      });
    } else if (sizeKb > limits.maxKb) {
      setSigValidation({
        valid: false,
        message: `Signature too large: ${sizeKb.toFixed(1)} KB`,
        details: `Maximum ${limits.maxKb} KB allowed`,
      });
    } else {
      setSigValidation({
        valid: true,
        message: `Signature valid: ${sizeKb.toFixed(1)} KB`,
        details: `Within ${limits.minKb}–${limits.maxKb} KB range`,
      });
    }
    setSigFile(file);
  };

  const handleGeneratePackage = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/premium/exams/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedId,
          studentName: "Student",
        }),
      });
      if (!res.ok) throw new Error("Package generation failed");
      const data = await res.json();
      setPackageResult(data);
      toast.success("Exam package generated successfully");
    } catch {
      toast.error("Failed to generate exam package");
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = photoValidation?.valid && sigValidation?.valid;

  return (
    <div className="space-y-4">
      {/* Template Grid */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <School className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Exam toolkit
            </p>
            <h3 className="text-base font-black text-foreground">Select Your Exam</h3>
          </div>
        </div>

        {loadingTemplates ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelectedId(tmpl.id);
                  setPhotoValidation(null);
                  setSigValidation(null);
                  setPhotoFile(null);
                  setSigFile(null);
                  setPackageResult(null);
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedId === tmpl.id
                    ? "border-primary bg-primary/10 shadow-glow-sm"
                    : "border-border bg-background/60 hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{EXAM_ICONS[tmpl.id] || "📝"}</span>
                <p className="text-sm font-black text-foreground mt-1">{tmpl.examName}</p>
                {tmpl.state && (
                  <p className="text-[10px] text-muted-foreground">{tmpl.state}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requirements + Validators */}
      {selected && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-premium space-y-4 animate-fade-up">
          <h3 className="text-lg font-black text-foreground">
            {EXAM_ICONS[selected.id] || "📝"} {selected.examName} Requirements
          </h3>

          {/* Requirements grid */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-muted-foreground">Photo</p>
              </div>
              <p className="text-sm font-black text-foreground">{selected.photo}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <PenLine className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-muted-foreground">Signature</p>
              </div>
              <p className="text-sm font-black text-foreground">{selected.signature}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-muted-foreground">PDF Max</p>
              </div>
              <p className="text-sm font-black text-foreground">{selected.pdfMaxSizeKb} KB</p>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label htmlFor="photo-upload-input" className="text-xs font-bold text-muted-foreground mb-1.5 block">
              📷 Upload Photo
            </label>
            <div
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-3 cursor-pointer hover:border-primary/40 transition"
            >
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {photoFile ? photoFile.name : "Click to upload photo…"}
              </span>
            </div>
            <input
              id="photo-upload-input"
              ref={photoInputRef}
              type="file"
              accept="image/*"
              title="Upload Photo"
              aria-label="Upload Photo"
              onChange={(e) => e.target.files?.[0] && validatePhoto(e.target.files[0])}
              className="hidden"
            />
            {photoValidation && (
              <div
                className={`flex items-center gap-2 mt-2 rounded-lg px-3 py-2 text-xs font-bold ${
                  photoValidation.valid
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {photoValidation.valid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {photoValidation.message}
                  {photoValidation.details && (
                    <span className="font-normal ml-1">({photoValidation.details})</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Signature Upload */}
          <div>
            <label htmlFor="sig-upload-input" className="text-xs font-bold text-muted-foreground mb-1.5 block">
              ✍️ Upload Signature
            </label>
            <div
              onClick={() => sigInputRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-3 cursor-pointer hover:border-primary/40 transition"
            >
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {sigFile ? sigFile.name : "Click to upload signature…"}
              </span>
            </div>
            <input
              id="sig-upload-input"
              ref={sigInputRef}
              type="file"
              accept="image/*"
              title="Upload Signature"
              aria-label="Upload Signature"
              onChange={(e) => e.target.files?.[0] && validateSignature(e.target.files[0])}
              className="hidden"
            />
            {sigValidation && (
              <div
                className={`flex items-center gap-2 mt-2 rounded-lg px-3 py-2 text-xs font-bold ${
                  sigValidation.valid
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {sigValidation.valid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {sigValidation.message}
                  {sigValidation.details && (
                    <span className="font-normal ml-1">({sigValidation.details})</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Generate Package */}
          <button
            id="exam-generate-btn"
            onClick={handleGeneratePackage}
            disabled={!canGenerate || generating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-black py-3 text-sm transition disabled:opacity-50 shadow-glow-sm"
          >
            {generating ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Generating Package…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate Exam Package
              </>
            )}
          </button>

          {!canGenerate && (photoFile || sigFile) && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Both photo and signature must pass validation before generating
            </div>
          )}

          {/* Package Result */}
          {packageResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 animate-fade-up">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Package ready for {selected.examName}
                </p>
              </div>
              <div className="space-y-1">
                {packageResult.outputs?.map((output: string) => (
                  <div key={output} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 shrink-0" />
                    {output}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help info */}
      {!selected && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <Info className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Select an exam above to see photo, signature and document requirements. Upload your
            files to validate dimensions and size before applying.
          </p>
        </div>
      )}
    </div>
  );
}
