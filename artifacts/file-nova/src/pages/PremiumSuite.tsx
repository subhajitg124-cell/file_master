import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bot,
  Camera,
  CheckCircle2,
  ChevronLeft,
  FileArchive,
  FileCheck2,
  Fingerprint,
  IdCard,
  Languages,
  Lock,
  MessageCircle,
  QrCode,
  ScanLine,
  School,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WandSparkles,
} from "lucide-react";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { AadhaarMasking } from "@/components/AadhaarMasking";
import { QRVerification } from "@/components/QRVerification";
import { ExamToolkit } from "@/components/ExamToolkit";
import { QuickShareButton } from "@/components/WhatsAppShare";
import { FeatureGate } from "@/components/FeatureGate";
import { useFileStore } from "@/store/useFileStore";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

type FeatureKey =
  | "whatsapp"
  | "digilocker"
  | "autofill"
  | "voice"
  | "scanner"
  | "qr"
  | "aadhaar"
  | "exam"
  | "cafe"
  | "bulk"
  | "assistant"
  | "security";

const features: Array<{
  key: FeatureKey;
  title: string;
  subtitle: string;
  icon: typeof MessageCircle;
  accent: string;
}> = [
  { key: "whatsapp", title: "WhatsApp Share", subtitle: "Expiring secure links for PDFs, ZIPs and packages", icon: MessageCircle, accent: "text-emerald-500" },
  { key: "digilocker", title: "DigiLocker", subtitle: "Consent-first import flow with mock connector fallback", icon: Fingerprint, accent: "text-sky-500" },
  { key: "autofill", title: "AI Form Autofill", subtitle: "OCR extraction, confidence and editable JSON", icon: WandSparkles, accent: "text-violet-500" },
  { key: "voice", title: "Voice Assistant", subtitle: "Bengali, Hindi and English guidance", icon: Languages, accent: "text-fuchsia-500" },
  { key: "scanner", title: "Document Scanner", subtitle: "Camera capture, edge detection and scan enhancement", icon: Camera, accent: "text-cyan-500" },
  { key: "qr", title: "QR Verification", subtitle: "Scan, generate and expire secure QR links", icon: QrCode, accent: "text-indigo-500" },
  { key: "aadhaar", title: "Aadhaar Masking", subtitle: "Detect and mask first 8 digits before export", icon: IdCard, accent: "text-rose-500" },
  { key: "exam", title: "Exam Toolkit", subtitle: "WBJEE, JEE, NEET, CUET and scholarship presets", icon: School, accent: "text-amber-500" },
  { key: "cafe", title: "Cyber Cafe Mode", subtitle: "Customer queue, repeat profiles and print-ready workflow", icon: Users, accent: "text-lime-500" },
  { key: "bulk", title: "Bulk Students", subtitle: "CSV batches, ZIPs, reports and retry logs", icon: FileArchive, accent: "text-orange-500" },
  { key: "assistant", title: "AI Smart Assistant", subtitle: "Troubleshooting and portal requirement hints", icon: Bot, accent: "text-blue-500" },
  { key: "security", title: "Security Center", subtitle: "Encryption, cleanup, audit and anti-malware hooks", icon: ShieldCheck, accent: "text-teal-500" },
];

const sampleOcr = "Name: Priya Sharma DOB: 12/08/2003 Gender: Female Aadhaar 1234 5678 9012 Address: Kolkata, West Bengal";

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function PremiumSuite() {
  const [active, setActive] = useState<FeatureKey>("whatsapp");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [security, setSecurity] = useState<any>(null);

  const [, setLocation] = useLocation();
  const { setSelectedSection, setOperation } = useFileStore();

  const handleVoiceCommand = (action: string, target: string) => {
    if (action === "compress") {
      if (target === "pdf") {
        setSelectedSection("pdf");
        setOperation("compress");
        setLocation("/");
      } else if (target === "image") {
        setSelectedSection("image");
        setOperation("compress");
        setLocation("/");
      }
    } else if (action === "merge") {
      setSelectedSection("pdf");
      setOperation("merge");
      setLocation("/");
    } else if (action === "resize") {
      setSelectedSection("image");
      setOperation("resize");
      setLocation("/");
    } else if (action === "enhance") {
      setSelectedSection("image");
      setOperation("enhance");
      setLocation("/");
    } else if (action === "convert") {
      if (target === "pdf") {
        setSelectedSection("pdf");
        setOperation("convert");
        setLocation("/");
      } else if (target === "image") {
        setSelectedSection("image");
        setOperation("convert");
        setLocation("/");
      }
    } else if (action === "split") {
      setSelectedSection("pdf");
      setOperation("split");
      setLocation("/");
    } else if (action === "aadhaar-mask") {
      setActive("aadhaar");
    } else if (action === "share") {
      setActive("whatsapp");
    }
  };

  const current = useMemo(() => features.find((item) => item.key === active) || features[0], [active]);

  useEffect(() => {
    fetch("/api/v1/premium/security/status")
      .then((res) => res.json())
      .then(setSecurity)
      .catch(() => setSecurity(null));
  }, []);

  const runDemo = async () => {
    setLoading(true);
    try {
      const response = await runFeature(active);
      setResult(response);
      if (active === "whatsapp" && response.whatsappUrl) window.open(response.whatsappUrl, "_blank");
    } finally {
      setLoading(false);
    }
  };

  const runFeature = (feature: FeatureKey) => {
    switch (feature) {
      case "whatsapp":
        return postJson("/api/v1/premium/shares/whatsapp", { documentName: "student-documents.zip" });
      case "digilocker":
        return postJson("/api/v1/premium/digilocker/session", { aadhaarLast4: "9012" });
      case "autofill":
        return postJson("/api/v1/premium/autofill/detect-fields", { text: sampleOcr, documentType: "aadhaar" });
      case "scanner":
        return postJson("/api/v1/premium/scanner/process", { frameBase64: "demo-camera-frame" });
      case "qr":
        return postJson("/api/v1/premium/qr/generate", { data: "https://filemaster.ai/share/demo", size: 240 });
      case "aadhaar":
        return postJson("/api/v1/premium/aadhaar/detect", { text: sampleOcr });
      case "exam":
        return postJson("/api/v1/premium/exams/package", { templateId: "wbjee", studentName: "Priya Sharma" });
      case "cafe":
        return postJson("/api/v1/premium/cafe/customers", { name: "Rahul Das", phone: "9876543210", workflow: "scholarship_zip" });
      case "bulk":
        return postJson("/api/v1/premium/bulk/students", { rows: [{ name: "Priya" }, { name: "Rahul" }], workflow: "id_card_batch" });
      case "assistant":
        return postJson("/api/v1/premium/assistant/recommend", { context: "scholarship upload", fileSizeKb: 420, targetKb: 200 });
      case "security":
        return fetch("/api/v1/premium/security/status").then((res) => res.json());
      case "voice":
        return Promise.resolve({ success: true, message: "Use the microphone below for Bengali, Hindi or English commands." });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold">
            <ChevronLeft className="h-4 w-4" />
            FileNova
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground mr-1">
              <Lock className="h-4 w-4 text-emerald-500" />
              Privacy mode on
            </div>
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-premium">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black">Premium workflows</h1>
                <p className="text-xs text-muted-foreground">Built for Indian document desks</p>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  ⚡ 100% Ad-Free Experience
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                const selected = active === feature.key;
                return (
                  <button
                    key={feature.key}
                    onClick={() => {
                      setActive(feature.key);
                      setResult(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-primary/10" : "border-border bg-background/70 hover:border-primary/30"}`}
                  >
                    <Icon className={`h-5 w-5 ${feature.accent}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{feature.title}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{feature.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-premium">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-2">
                  {React.createElement(current.icon, { className: `h-6 w-6 ${current.accent}` })}
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Production module</p>
                </div>
                <h2 className="text-3xl font-black">{current.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.subtitle}</p>
              </div>
              <button
                onClick={runDemo}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {loading ? <ScanLine className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Run workflow
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Guided mobile flow", "Secure temporary storage", "Operator-ready output"].map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-border bg-background/70 p-3 text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-premium">
              {active === "aadhaar" ? (
                <FeatureGate requiredPlan="basic" featureName="Aadhaar Masking">
                  <AadhaarMasking />
                </FeatureGate>
              ) : active === "qr" ? (
                <FeatureGate requiredPlan="pro" featureName="QR Verification">
                  <QRVerification />
                </FeatureGate>
              ) : active === "exam" ? (
                <FeatureGate requiredPlan="pro" featureName="Exam Toolkit">
                  <ExamToolkit />
                </FeatureGate>
              ) : active === "voice" ? (
                <FeatureGate requiredPlan="basic" featureName="Voice Assistant">
                  <VoiceAssistant onCommand={handleVoiceCommand} />
                </FeatureGate>
              ) : active === "whatsapp" ? (
                <FeatureGate requiredPlan="basic" featureName="WhatsApp Share">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                        <MessageCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          Premium share
                        </p>
                        <h3 className="text-base font-black text-foreground">WhatsApp Secure Share</h3>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a file or document to share securely over WhatsApp. A tracked download link with 48-hour auto-expiry will be generated.
                    </p>
                    <div className="p-6 border border-dashed border-border bg-background/40 rounded-xl text-center space-y-4">
                      <p className="text-sm font-black text-foreground">Demo Document: student-marksheet.pdf</p>
                      <div className="flex justify-center">
                        <QuickShareButton documentId="demo-doc-123" documentName="student-marksheet.pdf" />
                      </div>
                    </div>
                  </div>
                </FeatureGate>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-primary" />
                    <h3 className="font-black">Live response</h3>
                  </div>
                  {result ? (
                    <pre className="max-h-[520px] overflow-auto rounded-xl border border-border bg-background p-4 text-xs leading-5 text-foreground">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
                      Select a module and run the workflow to preview API output, generated links, confidence scores, reports or security controls.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-black">Security posture</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {Object.entries(security?.controls || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-bold">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-black">Expected outputs</h3>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Secure share links, QR previews, masked Aadhaar exports, exam ZIP packages, scan PDFs, CSV batch reports and cyber cafe queue tokens.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-black flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Premium Features Guide
                </h3>
                <div className="mt-3 space-y-2.5 text-xs">
                  {[
                    { title: "WhatsApp Share", desc: "Generates expiring download links with 48h validity to share PDF/ZIP packages." },
                    { title: "DigiLocker Integration", desc: "Secure OAuth2 connector fallback to import verified government certificates." },
                    { title: "AI Form Autofill", desc: "Extracts fields from identity cards using OCR and builds clean autofill maps." },
                    { title: "Voice Assistant", desc: "Interact using Hindi, Bengali, or English voice commands to upload and convert." },
                    { title: "Aadhaar Masking", desc: "Automatically detects and masks the first 8 digits of Aadhaar cards for secure upload." },
                    { title: "Exam Toolkit", desc: "Optimizes photo crops, signature sizes, and PDF size targets for WBJEE/NEET portals." },
                    { title: "Cyber Cafe & Bulk", desc: "Save client profiles, manage upload queues, and process CSV lists of student forms." }
                  ].map((guide, idx) => (
                    <div key={idx} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <p className="font-black text-foreground">{guide.title}</p>
                      <p className="text-muted-foreground mt-0.5 leading-normal">{guide.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
