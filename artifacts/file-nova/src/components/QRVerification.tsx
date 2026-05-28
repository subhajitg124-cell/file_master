/**
 * QR Verification Component
 * Generate QR codes for download links and scan QR codes
 */

import React, { useState, useRef, useEffect } from "react";
import {
  QrCode,
  Download,
  Upload,
  ExternalLink,
  Loader,
  Clock,
  CheckCircle2,
  Camera,
  Image,
} from "lucide-react";
import { toast } from "sonner";
import { useQRCode } from "@/hooks/usePremiumFeatures";

type Tab = "generate" | "scan";

function useExpiryCountdown(expiresAtIso?: string) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number; expired: boolean } | null>(null);

  useEffect(() => {
    if (!expiresAtIso) return;
    const tick = () => {
      const diff = new Date(expiresAtIso).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, expired: true });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      setTimeLeft({
        h: Math.floor(totalSec / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtIso]);

  return timeLeft;
}

const SIZE_OPTIONS = [
  { label: "Small", value: 200 },
  { label: "Medium", value: 400 },
  { label: "Large", value: 600 },
];

export function QRVerification() {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-background/60 p-1">
        {(["generate", "scan"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t === "generate" ? <QrCode className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {t === "generate" ? "Generate QR" : "Scan QR"}
          </button>
        ))}
      </div>

      {tab === "generate" ? <GenerateTab /> : <ScanTab />}
    </div>
  );
}

function GenerateTab() {
  const { loading, qrCode, generateQR } = useQRCode();
  const [inputData, setInputData] = useState("");
  const [size, setSize] = useState(300);

  const handleGenerate = async () => {
    if (!inputData.trim()) {
      toast.error("Enter a URL or text to encode");
      return;
    }
    await generateQR(inputData, size);
  };

  const handleDownload = () => {
    if (!qrCode?.qrImage) return;
    const a = document.createElement("a");
    a.href = qrCode.qrImage;
    a.download = `filenova-qr-${Date.now()}.png`;
    a.target = "_blank";
    a.click();
    toast.success("QR code download started");
  };

  const expiry = useExpiryCountdown(qrCode?.expiresAt);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-premium space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
          <QrCode className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            QR Generator
          </p>
          <h3 className="text-base font-black text-foreground">Generate QR Code</h3>
        </div>
      </div>

      {/* URL Input */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
          URL or Text
        </label>
        <input
          id="qr-input"
          type="text"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="https://filenova.in/share/..."
          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Size selector */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Size</label>
        <div className="flex gap-2">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSize(opt.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                size === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {opt.label}
              <span className="block text-[10px] font-normal mt-0.5">{opt.value}px</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        id="qr-generate-btn"
        onClick={handleGenerate}
        disabled={loading || !inputData.trim()}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-black py-3 text-sm transition disabled:opacity-50 shadow-glow-sm"
      >
        {loading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <QrCode className="h-4 w-4" />
            Generate QR Code
          </>
        )}
      </button>

      {/* QR Result */}
      {qrCode && (
        <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-bold text-foreground">QR Code Ready</p>
            </div>
            {expiry && !expiry.expired && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
                <Clock className="h-3 w-3" />
                {expiry.h}h {expiry.m}m
              </span>
            )}
          </div>

          {/* QR Image */}
          <div className="flex justify-center">
            <div className="rounded-xl border border-border bg-white p-3">
              <img
                src={qrCode.qrImage}
                alt="Generated QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>

          {/* Encoded data */}
          <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
            <p className="text-[10px] font-bold text-muted-foreground mb-1">Encoded data</p>
            <code className="text-[11px] text-primary break-all">{qrCode.data}</code>
          </div>

          {/* Download */}
          <button
            id="qr-download-btn"
            onClick={handleDownload}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 hover:bg-muted text-foreground font-bold py-2.5 text-sm transition"
          >
            <Download className="h-4 w-4" />
            Download QR as PNG
          </button>
        </div>
      )}
    </div>
  );
}

function ScanTab() {
  const { loading, scanQR } = useQRCode();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const result = await scanQR(base64);
      if (result) setScannedData(result);
    };
    reader.readAsDataURL(file);
  };

  const isUrl = scannedData?.match(/^https?:\/\//);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-premium space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
          <Camera className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            QR Scanner
          </p>
          <h3 className="text-base font-black text-foreground">Scan QR Code</h3>
        </div>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-background/40 p-8 cursor-pointer transition group"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition">
          <Image className="h-6 w-6 text-muted-foreground group-hover:text-primary transition" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">Upload image with QR code</p>
          <p className="text-xs text-muted-foreground mt-1">Click or drag & drop • PNG, JPG, WEBP</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-primary font-bold">
            <Loader className="h-3.5 w-3.5 animate-spin" />
            Scanning…
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Scan Result */}
      {scannedData && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 animate-fade-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              QR Code Decoded
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-bold text-muted-foreground mb-1">Decoded content</p>
            <code className="text-sm text-foreground break-all">{scannedData}</code>
          </div>

          {isUrl && (
            <a
              href={scannedData}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-black py-2.5 text-sm transition hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Open Link
            </a>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(scannedData);
              toast.success("Copied to clipboard");
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 hover:bg-muted text-foreground font-bold py-2.5 text-sm transition"
          >
            Copy Text
          </button>
        </div>
      )}
    </div>
  );
}
