import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  Download,
  ImageIcon,
  Layers,
  MousePointer2,
  Menu,
  Pencil,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Search,
  Sparkles,
  Share2,
  Shield,
  Zap,
  X,
} from "lucide-react";
import { QuickShareButton } from "@/components/WhatsAppShare";
import { useImageEditor } from "@/hooks/useImageEditor";
import { useTranslation } from "@/lib/i18n";

interface EditingWindowProps {
  file: File | null;
  fileType: "image" | "pdf" | "document";
  onClose: () => void;
  onDone: (result: Blob) => void;
}

const passportPresets = [
  { label: "India Passport 3.5x3.5cm", width: 413, height: 413 },
  { label: "India Passport 5x5cm", width: 600, height: 600 },
  { label: "India Passport 3.5x4.5cm", width: 413, height: 531 },
  { label: "India Visa 600x600px", width: 600, height: 600 },
  { label: "WBJEE", width: 400, height: 240 },
  { label: "JEE Main", width: 512, height: 512 },
  { label: "NEET", width: 512, height: 512 },
  { label: "CUET", width: 520, height: 520 },
];

const pdfConvertOptions = [
  { value: "pdf_to_jpg", label: "PDF → JPG" },
  { value: "jpg_to_pdf", label: "JPG → PDF" },
  { value: "pdf_to_word", label: "PDF → Word" },
  { value: "word_to_pdf", label: "Word → PDF" },
];

const qrSizes = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const filterOptions = [
  { value: "none", label: "None" },
  { value: "grayscale", label: "Grayscale" },
  { value: "sepia", label: "Sepia" },
  { value: "high-contrast", label: "High Contrast" },
];

export const EditingWindow: React.FC<EditingWindowProps> = ({ file, fileType, onClose, onDone }) => {
  const { tText } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    ready,
    loadFile,
    applyBrightness,
    applyContrast,
    applyRotation,
    applyFlip,
    applyFilter,
    resetAll,
    exportAs,
  } = useImageEditor(canvasRef);

  const [activeSection, setActiveSection] = useState<string>("crop");
  const [zoomLevel, setZoomLevel] = useState(1);

  const [cropPreset, setCropPreset] = useState<string>("Free");
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [sizeUnit, setSizeUnit] = useState<"px" | "cm" | "mm">("px");
  const [sizeSearch, setSizeSearch] = useState("");

  const [removeBackground, setRemoveBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundPreset, setBackgroundPreset] = useState<string>("White");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);

  const [aadhaarAutoDetect, setAadhaarAutoDetect] = useState(false);
  const [aadhaarMaskFormat, setAadhaarMaskFormat] = useState("XXXX-XXXX-1234");
  const [aadhaarResult, setAadhaarResult] = useState<string>("");

  const [ocrLanguage, setOcrLanguage] = useState("English");
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  const [autofillFields, setAutofillFields] = useState<Record<string, string>>({
    Name: "",
    DOB: "",
    Address: "",
    Aadhaar: "",
  });
  const [autofillLoading, setAutofillLoading] = useState(false);

  const [pdfQuality, setPdfQuality] = useState("Medium");
  const [pdfConvertType, setPdfConvertType] = useState("pdf_to_jpg");
  const [pdfMergeFiles, setPdfMergeFiles] = useState<File[]>([]);
  const [pdfSplitRange, setPdfSplitRange] = useState("1-1");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkOpacity, setWatermarkOpacity] = useState(40);
  const [watermarkPosition, setWatermarkPosition] = useState("center");

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [filterPreset, setFilterPreset] = useState("none");

  const [qrPayload, setQrPayload] = useState("");
  const [qrSize, setQrSize] = useState("medium");
  const [qrResult, setQrResult] = useState("");
  const [qrScanText, setQrScanText] = useState("");

  const [exportFormat, setExportFormat] = useState<"jpg" | "png" | "pdf" | "webp">("png");
  const [exportQuality, setExportQuality] = useState(85);
  const [shareLink, setShareLink] = useState<string>("");
  const [qrShareLink, setQrShareLink] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadFile(file);
  }, [file, loadFile]);

  useEffect(() => {
    applyBrightness(brightness);
  }, [brightness, applyBrightness]);

  useEffect(() => {
    applyContrast(contrast);
  }, [contrast, applyContrast]);

  useEffect(() => {
    applyFilter(filterPreset as any);
  }, [filterPreset, applyFilter]);

  const activeSectionLabel = useMemo(() => {
    switch (activeSection) {
      case "crop":
        return "Crop & Resize";
      case "background":
        return "Background";
      case "aadhaar":
        return "Aadhaar Masking";
      case "ocr":
        return "OCR & Text Extract";
      case "autofill":
        return "Form Autofill";
      case "pdf":
        return "PDF Tools";
      case "image":
        return "Image Adjustments";
      case "qr":
        return "QR Code";
      case "export":
        return "Export & Share";
      default:
        return "Crop & Resize";
    }
  }, [activeSection]);

  const toggleSection = (section: string) => {
    setActiveSection((current) => (current === section ? "" : section));
  };

  const handleApplyCrop = () => {
    setCropPreset("Custom");
    setStatusMessage(`Applied ${width}${sizeUnit} × ${height}${sizeUnit}`);
  };

  const handleBackgroundUpload = async (file: File | null) => {
    if (!file) return;
    setBackgroundImage(file);
    setStatusMessage(`Uploaded background image: ${file.name}`);
  };

  const callApi = async (path: string, body: BodyInit) => {
    const response = await fetch(path, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    return response.json();
  };

  const handleAutoDetectAadhaar = async () => {
    if (!file) return;
    setBusy(true);
    setStatusMessage("Detecting Aadhaar fields...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await callApi("/api/v1/premium/aadhaar/detect", formData);
      setAadhaarResult(result?.masked || "Detected and masked preview ready.");
      setStatusMessage("Aadhaar fields detected.");
    } catch (error: any) {
      setStatusMessage(error.message || "Aadhaar detection failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleApplyMasking = async () => {
    if (!file) return;
    setBusy(true);
    setStatusMessage("Applying Aadhaar masking...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("maskFormat", aadhaarMaskFormat);
      const result = await callApi("/api/v1/premium/aadhaar/mask", formData);
      setAadhaarResult(result?.masked || "Masked preview ready.");
      setStatusMessage("Mask applied successfully.");
    } catch (error: any) {
      setStatusMessage(error.message || "Masking failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleExtractText = async () => {
    if (!file) return;
    setBusy(true);
    setStatusMessage("Extracting text...");
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", ocrLanguage.toLowerCase());
      const result = await callApi("/api/v1/premium/ocr/extract", formData);
      setOcrText(result?.text || "No text extracted.");
      setStatusMessage("Text extracted successfully.");
    } catch (error: any) {
      setStatusMessage(error.message || "OCR extraction failed.");
    } finally {
      setBusy(false);
      setOcrLoading(false);
    }
  };

  const handleDetectFields = async () => {
    if (!file) return;
    setBusy(true);
    setStatusMessage("Detecting form fields...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await callApi("/api/v1/premium/autofill/detect-fields", formData);
      const fields = result?.fields || {};
      setAutofillFields((prev) => ({
        Name: fields.Name || prev.Name,
        DOB: fields.DOB || prev.DOB,
        Address: fields.Address || prev.Address,
        Aadhaar: fields.Aadhaar || prev.Aadhaar,
      }));
      setStatusMessage("Form fields detected.");
    } catch (error: any) {
      setStatusMessage(error.message || "Field detection failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateQr = async () => {
    if (!qrPayload.trim()) {
      setStatusMessage("Enter text or URL to generate QR code.");
      return;
    }
    setBusy(true);
    setStatusMessage("Generating QR code...");
    try {
      const payload = { data: qrPayload, size: qrSize };
      const result = await callApi("/api/v1/premium/qr/generate", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      setQrResult(result?.qrUrl || "QR generated.");
      setStatusMessage("QR code ready.");
    } catch (error: any) {
      setStatusMessage(error.message || "QR generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleScanQr = async (scanFile: File | null) => {
    if (!scanFile) return;
    setBusy(true);
    setStatusMessage("Scanning QR code...");
    try {
      const formData = new FormData();
      formData.append("file", scanFile);
      const result = await callApi("/api/v1/premium/qr/scan", formData);
      setQrScanText(result?.decoded || "No QR result.");
      setStatusMessage("QR scan completed.");
    } catch (error: any) {
      setStatusMessage(error.message || "QR scan failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!file) return;
    setBusy(true);
    setStatusMessage("Creating WhatsApp share link...");
    try {
      const result = await callApi("/api/v1/premium/shares/whatsapp", new Blob([JSON.stringify({ documentName: file.name })], { type: "application/json" }));
      setShareLink(result?.shareUrl || "Link generated.");
      setStatusMessage("WhatsApp share link ready.");
    } catch (error: any) {
      setStatusMessage(error.message || "Share link creation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateShareQr = () => {
    if (!shareLink) {
      setStatusMessage("Create a share link first.");
      return;
    }
    setQrShareLink(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareLink)}&size=220x220`);
    setStatusMessage("Share QR generated.");
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(ocrText || "");
    setStatusMessage("Copied extracted text to clipboard.");
  };

  const handleDownloadText = () => {
    const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "extracted-text.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    const selected = event.target.files?.[0] ?? null;
    setter(selected);
  };

  const handleDone = async () => {
    if (fileType !== "image" || !ready) {
      if (file) {
        onDone(file);
        return;
      }
    }
    const resultBlob = await exportAs(exportFormat);
    onDone(resultBlob);
  };

  const activeHeading = (label: string, icon: React.ReactNode, sectionKey: string) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 px-4 py-3 text-left transition ${activeSection === sectionKey ? "bg-slate-850" : "bg-slate-950/80 hover:bg-slate-900"}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-800 text-slate-100">{icon}</span>
        <div>
          <p className="text-sm font-semibold">{tText(label)}</p>
          <p className="text-xs text-slate-400">{sectionKey === activeSection ? tText("Open") : tText("Closed")}</p>
        </div>
      </div>
      <motion.span animate={{ rotate: activeSection === sectionKey ? 180 : 0 }} className="text-slate-400">
        <ChevronDown className="h-5 w-5" />
      </motion.span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-slate-950/90 text-white backdrop-blur-xl overflow-y-auto lg:overflow-hidden font-sans">
      <aside className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-1000/60 backdrop-blur-lg overflow-y-auto pb-6 lg:pb-10 flex flex-col">
        <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 px-4 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{tText("Editing Window")}</p>
              <h2 className="text-lg font-black text-white">FileNova AI</h2>
            </div>
            <button onClick={onClose} title={tText("Close")} aria-label={tText("Close")} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-3xl border border-slate-805 bg-slate-900/60 p-3 text-sm text-slate-400">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">{tText("Active tool")}</span>
              <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">{tText(activeSectionLabel)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{tText("Use the sidebar to preview edits live, then save with Done.")}</p>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {activeHeading("📐 Crop & Resize", <Scissors className="h-5 w-5" />, "crop")}
          <AnimatePresence initial={false}>
            {activeSection === "crop" ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    { ["Free", "1:1", "4:3", "16:9", "A4", "Passport (3.5x4.5cm)", "Passport (5x5cm)" ].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setCropPreset(preset)}
                        className={`rounded-2xl border px-3 py-2 text-[12px] font-semibold transition ${cropPreset === preset ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                      >
                        {preset}
                      </button>
                    )) }
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Custom size</label>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        title="Width"
                        aria-label="Width"
                        className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="Width"
                      />
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        title="Height"
                        aria-label="Height"
                        className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                        placeholder="Height"
                      />
                      <select
                        value={sizeUnit}
                        onChange={(e) => setSizeUnit(e.target.value as "px" | "cm" | "mm")}
                        title="Select size unit"
                        aria-label="Select size unit"
                        className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="px">px</option>
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Search preset</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="search"
                        value={sizeSearch}
                        onChange={(e) => setSizeSearch(e.target.value)}
                        title="Search sizes"
                        aria-label="Search sizes"
                        placeholder="Search sizes"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Country passport sizes</label>
                    <div className="grid gap-2">
                      {passportPresets
                        .filter((preset) => preset.label.toLowerCase().includes(sizeSearch.toLowerCase()))
                        .map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setWidth(preset.width);
                              setHeight(preset.height);
                              setCropPreset(preset.label);
                            }}
                            className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-left text-sm transition hover:border-slate-700"
                          >
                            <div className="font-semibold text-white">{preset.label}</div>
                            <div className="text-xs text-slate-400">{preset.width} × {preset.height}px</div>
                          </button>
                        ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                  >
                    Apply Crop
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("🎨 Background", <ImageIcon className="h-5 w-5" />, "background")}
          <AnimatePresence initial={false}>
            {activeSection === "background" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={removeBackground}
                      onChange={(e) => setRemoveBackground(e.target.checked)}
                      title="Remove Background"
                      aria-label="Remove Background"
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500"
                    />
                    <span className="text-sm text-slate-200">Remove Background</span>
                  </label>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Background color</label>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      title="Background color"
                      aria-label="Background color"
                      className="h-11 w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    { ["White", "Light Gray", "Blue (visa)", "Transparent", "Custom" ].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setBackgroundPreset(preset);
                          if (preset === "White") setBackgroundColor("#ffffff");
                          if (preset === "Light Gray") setBackgroundColor("#e5e7eb");
                          if (preset === "Blue (visa)") setBackgroundColor("#dbeafe");
                          if (preset === "Transparent") setBackgroundColor("#00000000");
                        }}
                        className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${backgroundPreset === preset ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                      >
                        {preset}
                      </button>
                    )) }
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Background image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleBackgroundUpload(event.target.files?.[0] ?? null)}
                      title="Upload background image"
                      aria-label="Upload background image"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("✂️ Aadhaar Masking", <Shield className="h-5 w-5" />, "aadhaar")}
          <AnimatePresence initial={false}>
            {activeSection === "aadhaar" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${aadhaarAutoDetect ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                      onClick={() => setAadhaarAutoDetect((value) => !value)}
                    >
                      {aadhaarAutoDetect ? "Auto-detect On" : "Auto-detect Off"}
                    </button>
                    <span className="text-xs text-slate-400">Mask format</span>
                  </div>
                  <input
                    type="text"
                    value={aadhaarMaskFormat}
                    onChange={(e) => setAadhaarMaskFormat(e.target.value)}
                    title="Aadhaar mask format"
                    aria-label="Aadhaar mask format"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-100">Masked preview</p>
                    <p className="mt-2 text-xs text-slate-400">{aadhaarResult || "No preview yet."}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyMasking}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                  >
                    Apply Masking
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("🔍 OCR & Text Extract", <MousePointer2 className="h-5 w-5" />, "ocr")}
          <AnimatePresence initial={false}>
            {activeSection === "ocr" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <button
                    type="button"
                    onClick={handleExtractText}
                    disabled={ocrLoading}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {ocrLoading ? "Extracting…" : "Extract Text"}
                  </button>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Language</label>
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      title="Select OCR language"
                      aria-label="Select OCR language"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Bengali</option>
                    </select>
                  </div>
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    rows={6}
                    title="Extracted text"
                    aria-label="Extracted text"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="Extracted text appears here..."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold transition hover:border-slate-700"
                    >
                      <Copy className="inline h-4 w-4" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadText}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                    >
                      <Download className="inline h-4 w-4" /> Download .txt
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("📋 Form Autofill", <Layers className="h-5 w-5" />, "autofill")}
          <AnimatePresence initial={false}>
            {activeSection === "autofill" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <button
                    type="button"
                    onClick={handleDetectFields}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                  >
                    Detect Fields
                  </button>
                  <div className="space-y-3">
                    {Object.entries(autofillFields).map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                          <span>{label}</span>
                          <span>{value ? "Editable" : "Empty"}</span>
                        </div>
                        <input
                          value={value}
                          onChange={(e) => setAutofillFields((prev) => ({ ...prev, [label]: e.target.value }))}
                          title={label}
                          aria-label={label}
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusMessage("Form filled from detected fields.")}
                    className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                  >
                    Fill Form
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("📄 PDF Tools", <Menu className="h-5 w-5" />, "pdf")}
          <AnimatePresence initial={false}>
            {activeSection === "pdf" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Compress PDF</p>
                    <div className="grid grid-cols-3 gap-2">
                      { ["Low", "Medium", "High" ].map((level) => (
                        <button
                          key={level}
                          onClick={() => setPdfQuality(level)}
                          className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${pdfQuality === level ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                        >
                          {level}
                        </button>
                      )) }
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Convert</p>
                    <select
                      value={pdfConvertType}
                      onChange={(e) => setPdfConvertType(e.target.value)}
                      title="Select PDF conversion format"
                      aria-label="Select PDF conversion format"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      {pdfConvertOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                      <span>Merge PDFs</span>
                      <span>{pdfMergeFiles.length} files</span>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={(event) => setPdfMergeFiles(Array.from(event.target.files || []))}
                      title="Select PDFs to merge"
                      aria-label="Select PDFs to merge"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    />
                    <div className="space-y-2">
                      {pdfMergeFiles.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                          <span className="truncate">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setPdfMergeFiles((prev) => prev.filter((_, i) => i !== index))}
                            className="text-slate-400 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Split range</label>
                    <input
                      type="text"
                      value={pdfSplitRange}
                      onChange={(e) => setPdfSplitRange(e.target.value)}
                      placeholder="1-3,5"
                      title="Split range"
                      aria-label="Split range"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Add Watermark</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="Watermark text"
                      title="Watermark text"
                      aria-label="Watermark text"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        title="Watermark opacity"
                        aria-label="Watermark opacity"
                        className="h-2 w-full accent-emerald-400"
                      />
                      <span className="text-right text-xs text-slate-400">{watermarkOpacity}%</span>
                    </div>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value)}
                      title="Watermark position"
                      aria-label="Watermark position"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("🖼️ Image Adjustments", <Pencil className="h-5 w-5" />, "image")}
          <AnimatePresence initial={false}>
            {activeSection === "image" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Brightness</label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      title="Brightness"
                      aria-label="Brightness"
                      className="h-2 w-full accent-emerald-400"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Contrast</label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      title="Contrast"
                      aria-label="Contrast"
                      className="h-2 w-full accent-emerald-400"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Saturation</label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      title="Saturation"
                      aria-label="Saturation"
                      className="h-2 w-full accent-emerald-400"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSharpness((active) => !active)}
                      className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${sharpness ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                    >
                      Sharpness
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotation((value) => (value - 90 + 360) % 360);
                        applyRotation(-90);
                      }}
                      className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold hover:border-slate-700"
                    >
                      90° L
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotation((value) => (value + 90) % 360);
                        applyRotation(90);
                      }}
                      className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold hover:border-slate-700"
                    >
                      90° R
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotation((value) => (value + 180) % 360);
                        applyRotation(180);
                      }}
                      className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold hover:border-slate-700"
                    >
                      180°
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFlipHorizontal((active) => !active);
                        applyFlip(true, false);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${flipHorizontal ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                    >
                      Flip H
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlipVertical((active) => !active);
                        applyFlip(false, true);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${flipVertical ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                    >
                      Flip V
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Filter presets</label>
                    <select
                      value={filterPreset}
                      onChange={(e) => setFilterPreset(e.target.value)}
                      title="Filter preset"
                      aria-label="Filter preset"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      {filterOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("📱 QR Code", <Sparkles className="h-5 w-5" />, "qr")}
          <AnimatePresence initial={false}>
            {activeSection === "qr" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Text or URL</label>
                    <input
                      type="text"
                      value={qrPayload}
                      onChange={(e) => setQrPayload(e.target.value)}
                      title="QR code text or URL"
                      aria-label="QR code text or URL"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                      placeholder="Enter text, link or share URL"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {qrSizes.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setQrSize(option.value)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${qrSize === option.value ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateQr}
                      className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                    >
                      Generate QR
                    </button>
                    <label className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Scan QR</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleScanQr(event.target.files?.[0] ?? null)}
                        title="Upload QR code image to scan"
                        aria-label="Upload QR code image to scan"
                        className="mt-2 block w-full text-xs text-slate-200"
                      />
                    </label>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-100">Decoded result</p>
                    <p className="mt-2 text-xs text-slate-400">{qrScanText || "Upload a QR image to scan."}</p>
                  </div>
                  {qrResult && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                      <p className="font-semibold text-slate-100">Generated QR</p>
                      <p className="mt-2 text-xs text-slate-400 break-all">{qrResult}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeHeading("📤 Export & Share", <Share2 className="h-5 w-5" />, "export")}
          <AnimatePresence initial={false}>
            {activeSection === "export" ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Export format</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value as "jpg" | "png" | "pdf" | "webp")}
                        title="Export format"
                        aria-label="Export format"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                        <option value="pdf">PDF</option>
                        <option value="webp">WebP</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Quality</label>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={exportQuality}
                        onChange={(e) => setExportQuality(Number(e.target.value))}
                        title="Export quality"
                        aria-label="Export quality"
                        className="h-2 w-full accent-emerald-400"
                      />
                      <div className="text-right text-xs text-slate-400">{exportQuality}%</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                  >
                    Save Result
                  </button>
                  <QuickShareButton documentId={file?.name || "file-preview"} documentName={file?.name || "file"} />
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-700"
                  >
                    Copy share link
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateShareQr}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-700"
                  >
                    QR share link
                  </button>
                  {shareLink && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-300">
                      <span className="font-semibold text-slate-100">Share link</span>
                      <p className="mt-2 break-all">{shareLink}</p>
                    </div>
                  )}
                  {qrShareLink && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-300">
                      <span className="font-semibold text-slate-100">Share QR</span>
                      <img src={qrShareLink} alt="Share QR" className="mt-3 w-full rounded-2xl border border-slate-800 bg-white" />
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-slate-950/40 text-slate-100 min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{tText("Editing")}</p>
            <h1 className="text-lg font-black text-white truncate max-w-[200px] sm:max-w-xs">{file?.name || "Untitled file"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setZoomLevel((level) => Math.max(0.5, level - 0.1))}
              title={tText("Zoom out")}
              aria-label={tText("Zoom out")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 hover:bg-slate-800 hover:text-white transition text-slate-300 cursor-pointer text-sm font-bold"
            >
              -
            </button>
            <span className="text-xs font-bold text-slate-300 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((level) => Math.min(2, level + 0.1))}
              title={tText("Zoom in")}
              aria-label={tText("Zoom in")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 hover:bg-slate-800 hover:text-white transition text-slate-300 cursor-pointer text-sm font-bold"
            >
              +
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-750 bg-slate-850 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {tText("Reset")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-transparent bg-slate-100 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> {tText("Close")}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto lg:overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-350">
              <Circle className="h-2.5 w-2.5 text-emerald-500 fill-emerald-500/30 animate-pulse" />
              {tText("Live preview")}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-[0.14em] text-slate-400">{tText(activeSectionLabel)}</div>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-1 items-center justify-center overflow-auto rounded-3xl bg-slate-950 p-4 sm:p-6 shadow-inner border border-slate-900">
            {fileType === "image" ? (
              <div className="relative max-w-full overflow-hidden rounded-3xl bg-slate-900 shadow-inner" style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}>
                <canvas ref={canvasRef} className="block h-auto w-full max-w-[960px] rounded-3xl bg-slate-950" />
                {!ready && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/90 text-slate-200 backdrop-blur-sm">
                    <div className="text-center">
                      <p className="font-black text-sm">{tText("Preparing preview…")}</p>
                      <p className="text-xs text-slate-500 mt-1">{tText("The canvas will render once the image loads.")}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex max-w-3xl flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-6 sm:p-10 text-center shadow-sm">
                <Layers className="mb-4 h-12 w-12 text-slate-600" />
                <p className="text-md font-bold text-slate-200">{tText("Preview unavailable")}</p>
                <p className="mt-2 text-xs text-slate-500 leading-5">
                  {tText("This editor currently renders live previews for images. PDF/document rendering is shown as a placeholder.")}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-400 shadow-sm">
            <span>{statusMessage ? tText(statusMessage) : tText("Use the sidebar tools to edit your project.")}</span>
            <span className="font-bold text-slate-500">{file?.type || "None"}</span>
          </div>
        </div>
      </main>
    </div>
  );
};
