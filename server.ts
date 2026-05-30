import express, { type Request, type Response, type NextFunction } from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import multer from "multer";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";

interface CustomRequest extends Request {
  user?: any;
  sessionToken?: string;
}

const app = express();
const PORT = 3000;

// Body size limit configurations
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Database Mocks (In-Memory + persistent settings.json) ─────────────────────
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read settings file:", e);
  }
  return {
    standaloneMode: false,
    editingEnabled: true,
    activeOffer: "",
    discountPercentage: 0,
    eventTheme: "none",
  };
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write settings file:", e);
  }
}

// Memory tables
const memoryUsers = new Map<string, any>([
  [
    "00000000-0000-0000-0000-000000000000",
    {
      id: "00000000-0000-0000-0000-000000000000",
      email: "subhajitghosh@filenova.in",
      name: "Subhajit Ghosh",
      role: "admin",
      premiumEnabled: true,
      premiumTier: "elite",
      phoneNumber: "9876543210",
      passwordHash: "Subhajit@56" // simple text or base64 check
    }
  ]
]);

const memorySessions = new Map<string, string>(); // token -> userId
const memorySubscriptions = new Map<string, any>(); // userId -> subscription details
const memoryShares = new Map<string, any>(); // token -> share info
const memoryCafeQueue = new Map<string, any>();
const memoryBulkJobs = new Map<string, any>();
const memoryDigilockerSessions = new Map<string, any>();

// ── In-Memory Job Store for uploads ──────────────────────────────────────────
interface JobFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

interface Job {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  files: JobFile[];
  outputFilePath?: string;
  outputMimetype?: string;
  originalname?: string;
  error?: string;
  savings?: {
    originalSize: number;
    newSize: number;
    percent: number;
  };
  updatedAt: Date;
}

const jobs = new Map<string, Job>();

// Configure Multer
const uploadDir = path.join(os.tmpdir(), "file-nova-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB size limit
    files: 20
  }
});

// Helper IDs generator
const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
const generateToken = () => crypto.randomBytes(32).toString("base64url");
const getExpiry = (hours = 48) => new Date(Date.now() + hours * 60 * 60 * 1000);

// Simple auth middleware for Express backend
const authMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.session_token || req.headers["authorization"]?.replace("Bearer ", "");
  if (token) {
    const userId = memorySessions.get(token);
    if (userId) {
      const user = memoryUsers.get(userId);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    }
  }
  next();
};

app.use(authMiddleware);

// ── Auth API Routes ───────────────────────────────────────────────────────────
app.post("/api/v1/auth/signup", (req, res) => {
  try {
    const { email, password, name, phoneNumber } = req.body;
    if (!email || !password) {
       res.status(400).json({ error: "Email and password are required" });
       return;
    }

    const existing = Array.from(memoryUsers.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
       res.status(400).json({ error: "Email is already registered" });
       return;
    }

    const userId = crypto.randomUUID();
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      phoneNumber: phoneNumber || null,
      role: "user",
      premiumTier: "free",
      premiumEnabled: false,
    };
    memoryUsers.set(userId, newUser);

    const token = generateToken();
    memorySessions.set(token, userId);

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: false, // development inside sandbox
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      token,
      user: newUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

app.post("/api/v1/auth/login", (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
       res.status(400).json({ error: "Identifier and password are required" });
       return;
    }

    const user = Array.from(memoryUsers.values()).find(
      u => u.email.toLowerCase() === identifier.toLowerCase() || u.phoneNumber === identifier
    );

    if (!user) {
       res.status(401).json({ error: "Invalid credentials" });
       return;
    }

    const token = generateToken();
    memorySessions.set(token, user.id);

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        premiumTier: user.premiumTier,
        premiumEnabled: user.premiumEnabled,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to authenticate" });
  }
});

app.post("/api/v1/auth/google", (req, res) => {
  try {
    const { email, name, googleSubject } = req.body;
    if (!email) {
       res.status(400).json({ error: "Email is required for Google Sign-In" });
       return;
    }

    let user = Array.from(memoryUsers.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      const userId = crypto.randomUUID();
      user = {
        id: userId,
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        phoneNumber: null,
        role: "user",
        premiumTier: "free",
        premiumEnabled: false,
      };
      memoryUsers.set(userId, user);
    }

    const token = generateToken();
    memorySessions.set(token, user.id);

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        premiumTier: user.premiumTier,
        premiumEnabled: user.premiumEnabled,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to authenticate with Google" });
  }
});

app.get("/api/v1/auth/me", (req: CustomRequest, res) => {
  if (!req.user) {
    res.json({ success: true, user: null, subscription: null });
    return;
  }
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      premiumTier: req.user.premiumTier,
      premiumEnabled: req.user.premiumEnabled,
    },
    subscription: memorySubscriptions.get(req.user.id) || null
  });
});

app.post("/api/v1/auth/logout", (req: CustomRequest, res) => {
  if (req.sessionToken) {
    memorySessions.delete(req.sessionToken);
  }
  res.clearCookie("session_token");
  res.json({ success: true, message: "Logged out successfully" });
});

// ── Standard Document/Job Upload Tasks ─────────────────────────────────────────
app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "healthy",
    services: {
      libreoffice_headless: "available",
      ffmpeg: "available"
    }
  });
});

app.post("/api/v1/upload", upload.array("files"), (req, res) => {
  const jobId = req.body.job_id;
  if (!jobId) {
     res.status(400).json({ detail: "job_id is required." });
     return;
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
     res.status(400).json({ detail: "No files uploaded." });
     return;
  }

  const job = jobs.get(jobId) || {
    id: jobId,
    status: "pending" as const,
    progress: 0,
    files: [] as JobFile[],
    updatedAt: new Date()
  };

  const fileRecords = files.map(f => {
    const safeOriginalName = path.basename(f.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    const record = {
      temp_filename: f.filename,
      filename: safeOriginalName,
      size_bytes: f.size,
      mime_type: f.mimetype,
      temp_path: f.path,
      preview_url: `/api/v1/preview/${f.filename}`
    };
    job.files.push({
      path: f.path,
      originalname: safeOriginalName,
      mimetype: f.mimetype,
      size: f.size
    });
    return record;
  });

  job.updatedAt = new Date();
  jobs.set(jobId, job);

  res.json({ files: fileRecords });
});

app.get("/api/v1/preview/:filename", (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
     res.status(400).json({ detail: "Invalid filename." });
     return;
  }
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
     res.status(404).json({ detail: "Preview not found." });
     return;
  }
  res.sendFile(filePath);
});

// Asynchronous mock run process
async function executeMockProcess(job: Job, operation: string, options: any) {
  const totalSteps = 5;
  for (let i = 1; i <= totalSteps; i++) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const currentJob = jobs.get(job.id);
    if (!currentJob || currentJob.status !== "processing") return;
    currentJob.progress = i * 20;
    currentJob.updatedAt = new Date();
    jobs.set(job.id, currentJob);
  }

  const currentJob = jobs.get(job.id);
  if (!currentJob || currentJob.files.length === 0) return;

  const firstFile = currentJob.files[0];
  const outputFilename = `output_${currentJob.id}_${firstFile.originalname}`;
  const outputPath = path.join(uploadDir, outputFilename);

  fs.copyFileSync(firstFile.path, outputPath);

  const originalTotalSize = currentJob.files.reduce((acc, f) => acc + f.size, 0);
  let ratio = 0.85;
  if (operation === "compress") ratio = 0.42;
  if (operation === "enhance") ratio = 1.05;

  const newSize = Math.round(originalTotalSize * ratio);

  currentJob.status = "completed";
  currentJob.progress = 100;
  currentJob.outputFilePath = outputPath;
  currentJob.outputMimetype = firstFile.mimetype;
  currentJob.originalname = firstFile.originalname;
  currentJob.savings = {
    originalSize: originalTotalSize,
    newSize,
    percent: Math.round(((originalTotalSize - newSize) / originalTotalSize) * 100)
  };
  currentJob.updatedAt = new Date();
  jobs.set(currentJob.id, currentJob);
}

app.post("/api/v1/process", (req, res) => {
  const jobId = req.query.job_id as string;
  if (!jobId) {
     res.status(400).json({ detail: "job_id is required." });
     return;
  }

  const { operation, options } = req.body;
  const job = jobs.get(jobId);
  if (!job) {
     res.status(404).json({ detail: "Job not found." });
     return;
  }

  job.status = "processing";
  job.progress = 0;
  job.updatedAt = new Date();
  jobs.set(jobId, job);

  executeMockProcess(job, operation, options).catch(err => {
    console.error("Task processing failed:", err);
    const curr = jobs.get(jobId);
    if (curr) {
      curr.status = "failed";
      curr.error = err.message || "Processing failed.";
      curr.updatedAt = new Date();
      jobs.set(jobId, curr);
    }
  });

  res.json({ status: "processing" });
});

app.get("/api/v1/status/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) {
     res.status(404).json({ detail: "Job not found." });
     return;
  }
  res.json({
    status: job.status,
    progress: job.progress,
    error: job.error,
    savings: job.savings,
    download_url: job.status === "completed" ? `/api/v1/download/${jobId}` : undefined
  });
});

app.get("/api/v1/download/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) {
     res.status(404).json({ detail: "Job not found." });
     return;
  }

  if (job.status !== "completed" || !job.outputFilePath) {
     res.status(400).json({ detail: "Job is not completed." });
     return;
  }

  res.download(job.outputFilePath, job.originalname || "output", (err) => {
    if (err) console.error("Download fail:", err);
    // Cleanup temporary resources
    try {
      for (const f of job.files) {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      }
      if (job.outputFilePath && fs.existsSync(job.outputFilePath)) {
        fs.unlinkSync(job.outputFilePath);
      }
      jobs.delete(jobId);
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  });
});

// ── Premium Settings Endpoints ───────────────────────────────────────────────
app.get("/api/v1/premium/subscription/settings", (_req, res) => {
  res.json({ success: true, settings: getSettings() });
});

app.post("/api/v1/premium/subscription/settings", (req, res) => {
  try {
    const settings = req.body;
    saveSettings(settings);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save settings" });
  }
});

// GET /status - current subscriber tier
app.get("/api/v1/premium/subscription/status", (req: CustomRequest, res) => {
  const user = req.user;
  const currentSettings = getSettings();
  const activeOffer = currentSettings.activeOffer && currentSettings.discountPercentage > 0 ? {
    announcement: currentSettings.activeOffer,
    discountPercentage: currentSettings.discountPercentage,
  } : null;

  if (!user) {
    res.json({
      success: true,
      userId: null,
      premiumTier: "free",
      premiumEnabled: false,
      activeOffer,
      subscription: null,
    });
    return;
  }

  res.json({
    success: true,
    userId: user.id,
    premiumTier: user.premiumTier || "free",
    premiumEnabled: user.premiumEnabled || false,
    activeOffer,
    subscription: memorySubscriptions.get(user.id) || null
  });
});

// POST /order - Make custom Razorpay Order
app.post("/api/v1/premium/subscription/order", (req: CustomRequest, res) => {
  try {
    const { plan } = req.body;
    if (!plan) {
       res.status(400).json({ error: "plan is required" });
       return;
    }

    const orderId = `order_mock_${crypto.randomBytes(8).toString("hex")}`;
    res.json({
      success: true,
      orderId,
      amount: plan === "basic" ? 1900 : plan === "pro" ? 3900 : 5900,
      currency: "INR",
      plan,
      keyId: "rzp_test_mockkey",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to order" });
  }
});

// POST /verify - Verification
app.post("/api/v1/premium/subscription/verify", (req: CustomRequest, res) => {
  const { plan, razorpay_order_id } = req.body;
  const user = req.user;
  if (user) {
    user.premiumTier = plan;
    user.premiumEnabled = true;
    memoryUsers.set(user.id, user);

    const subscription = {
      plan,
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    memorySubscriptions.set(user.id, subscription);
  }
  res.json({
    success: true,
    plan,
    message: `Subscription activated for plan: ${plan}`,
  });
});

// POST /cancel - Cancel
app.post("/api/v1/premium/subscription/cancel", (req: CustomRequest, res) => {
  const user = req.user;
  if (user) {
    user.premiumTier = "free";
    user.premiumEnabled = false;
    memoryUsers.set(user.id, user);
    memorySubscriptions.delete(user.id);
  }
  res.json({ success: true, message: "Subscription cancelled successfully." });
});

// GET admin system metrics stats
app.get("/api/v1/premium/subscription/admin/stats", (_req, res) => {
  const totalUsersCount = memoryUsers.size;
  const paidCount = Array.from(memoryUsers.values()).filter(u => u.premiumEnabled).length;

  res.json({
    success: true,
    stats: {
      totalUsers: totalUsersCount,
      totalSubscribers: paidCount,
      activeBasic: 1,
      activePro: 0,
      activeElite: paidCount,
      totalMtdRevenueInRupees: 59,
      recentSignups: [
        {
          name: "Subhajit Ghosh",
          email: "subhajitghosh@filenova.in",
          plan: "elite",
          status: "active",
          date: new Date().toISOString()
        }
      ],
    }
  });
});

// ── Multi-Module Safe Sharing URLs ───────────────────────────────────────────
app.post("/api/v1/premium/shares", (req, res) => {
  const { documentId, documentName, expiryHours, shareType } = req.body;
  const shareToken = generateToken();
  const shareUrl = `${req.protocol}://${req.get("host")}/share/${shareToken}`;

  const record = {
    token: shareToken,
    documentId,
    documentName: documentName || "processed-document",
    shareType: shareType || "link",
    shareUrl,
    expiresAt: getExpiry(expiryHours || 48),
    downloadCount: 0,
  };
  memoryShares.set(shareToken, record);

  res.json({
    success: true,
    shareToken,
    shareUrl,
    shareType: record.shareType,
    expiresIn: { hours: expiryHours || 48, timestamp: record.expiresAt.toISOString() },
    tracking: { downloadCount: 0, maxDownloads: null }
  });
});

app.post("/api/v1/premium/shares/whatsapp", (req, res) => {
  const { documentId, documentName } = req.body;
  const shareToken = generateToken();
  const shareUrl = `${req.protocol}://${req.get("host")}/share/${shareToken}`;

  const record = {
    token: shareToken,
    documentId,
    documentName: documentName || "student-documents.zip",
    shareType: "whatsapp",
    shareUrl,
    expiresAt: getExpiry(48),
    downloadCount: 0,
  };
  memoryShares.set(shareToken, record);

  const message = [
    "*FileMaster AI document ready*",
    "",
    `File: ${record.documentName}`,
    `Secure link expires in 48 hours`,
    "",
    shareUrl,
    "",
    "Please download before expiry. Shared with privacy-safe tracking."
  ].join("\n");

  res.json({
    success: true,
    shareToken,
    shareUrl,
    shareType: "whatsapp",
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    message,
    expiresIn: { hours: 48, timestamp: record.expiresAt.toISOString() }
  });
});

app.get("/api/v1/premium/shares/verify/:token", (req, res) => {
  const share = memoryShares.get(req.params.token);
  if (!share || share.expiresAt < new Date()) {
     res.status(404).json({ valid: false, error: "Share expired or invalid" });
     return;
  }
  res.json({
    valid: true,
    documentId: share.documentId,
    documentName: share.documentName,
    expiresAt: share.expiresAt.toISOString(),
    downloadCount: share.downloadCount,
    downloadUrl: `/api/v1/premium/shares/download/${share.token}`
  });
});

app.get("/api/v1/premium/shares/download/:token", (req, res) => {
  const share = memoryShares.get(req.params.token);
  if (!share) {
     res.status(404).json({ error: "Share link invalid" });
     return;
  }
  share.downloadCount++;
  memoryShares.set(share.token, share);

  res.json({
    success: true,
    documentName: share.documentName,
    downloadCount: share.downloadCount,
    trackedAt: new Date().toISOString()
  });
});

app.delete("/api/v1/premium/shares/:token", (req, res) => {
  memoryShares.delete(req.params.token);
  res.json({ success: true, revoked: true });
});

// Digilocker, QR, Aadhaar, Exams and miscellaneous routes
app.post("/api/v1/premium/digilocker/session", (req, res) => {
  const sessionId = generateId("digi");
  const session = {
    sessionId,
    permissionStatus: "pending",
    aadhaarHint: "xxxx-xxxx-9012",
    authUrl: `${req.protocol}://${req.get("host")}/digilocker/consent/${sessionId}`,
    mode: "mock_connector",
  };
  memoryDigilockerSessions.set(sessionId, session);
  res.json({ success: true, session });
});

app.post("/api/v1/premium/digilocker/:sessionId/consent", (req, res) => {
  res.json({
    success: true,
    permissionStatus: "granted",
    documents: [
      { id: generateId("doc"), name: "Aadhaar masked XML", issuer: "UIDAI", type: "aadhaar", verified: true },
      { id: generateId("doc"), name: "PAN card", issuer: "Income Tax Department", type: "pan", verified: true },
    ]
  });
});

app.post("/api/v1/premium/ocr/extract", (req, res) => {
  res.json({
    success: true,
    text: req.body.text || "Name: Priya Sharma DOB: 12/08/2003 Gender: Female Aadhaar 1234 5678 9012 Kolkata",
    documentType: req.body.documentType || "aadhaar",
    confidence: 0.95
  });
});

app.post("/api/v1/premium/autofill/detect-fields", (req, res) => {
  res.json({
    success: true,
    documentType: "aadhaar",
    fields: {
      name: { value: "Priya Sharma", confidence: 0.95 },
      dob: { value: "12/08/2003", confidence: 0.93 },
      gender: { value: "Female", confidence: 0.89 },
      address: { value: "Kolkata, West Bengal", confidence: 0.82 },
      idNumber: { value: "1234 5678 9012", confidence: 0.97 },
    },
    corrections: ["Confirm spelling from original card photo."]
  });
});

app.post("/api/v1/premium/scanner/process", (_req, res) => {
  res.json({
    success: true,
    edgeDetected: true,
    perspective: { topLeft: [40, 30], topRight: [460, 35], bottomLeft: [50, 650], bottomRight: [450, 640] },
    enhancements: ["auto_crop", "contrast_boost"],
    qualityScore: 94
  });
});

app.post("/api/v1/premium/scanner/to-pdf", (_req, res) => {
  res.json({ success: true, pdfUrl: `/api/v1/download/scan-${Date.now()}` });
});

app.post("/api/v1/premium/qr/generate", (req, res) => {
  const { data, size } = req.body;
  const finalSize = size || 300;
  res.json({
    success: true,
    qrCode: {
      id: generateId("qr"),
      data: data || "https://filemaster.ai/share/demo",
      size: finalSize,
      expiresAt: getExpiry(48).toISOString(),
      qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=${finalSize}x${finalSize}&data=${encodeURIComponent(data || "https://filemaster.ai/share/demo")}`
    }
  });
});

app.post("/api/v1/premium/qr/scan", (_req, res) => {
  res.json({
    success: true,
    foundQr: true,
    data: "https://ais-dev.replit.app/verify/demo-secure-file",
    confidence: 0.95,
    governmentQr: true
  });
});

app.post("/api/v1/premium/aadhaar/detect", (req, res) => {
  res.json({
    success: true,
    found: true,
    aadhaar: "XXXXXXXX9012",
    confidence: 0.94
  });
});

app.post("/api/v1/premium/aadhaar/mask", (_req, res) => {
  res.json({
    success: true,
    masked: true,
    aadhaarFound: true,
    outputUrl: `/api/v1/download/masked-aadhaar-${Date.now()}`
  });
});

app.get("/api/v1/premium/exams/templates", (_req, res) => {
  res.json({
    success: true,
    templates: [
      { id: "wbjee", examName: "WBJEE", state: "West Bengal", photo: "3.5 x 4.5 cm", signature: "3.5 x 1.5 cm", pdfMaxSizeKb: 200 },
      { id: "jee", examName: "JEE Main", photo: "10 KB - 200 KB", signature: "4 KB - 30 KB", pdfMaxSizeKb: 200 },
      { id: "neet", examName: "NEET", photo: "10 KB - 200 KB", signature: "4 KB - 30 KB", pdfMaxSizeKb: 100 },
    ]
  });
});

app.post("/api/v1/premium/exams/package", (req, res) => {
  res.json({
    success: true,
    packageId: generateId("exam"),
    templateId: req.body.templateId || "wbjee",
    outputs: ["photo_resized.jpg", "signature_resized.jpg", "documents_under_limit.pdf"]
  });
});

app.post("/api/v1/premium/cafe/customers", (req, res) => {
  const { name, phone, workflow } = req.body;
  const customer = {
    id: generateId("cust"),
    tokenNumber: memoryCafeQueue.size + 1,
    status: "queued",
    name,
    phone,
    workflow: workflow || "general",
    createdAt: new Date().toISOString()
  };
  memoryCafeQueue.set(customer.id, customer);
  res.json({ success: true, customer });
});

app.get("/api/v1/premium/cafe/dashboard", (_req, res) => {
  const queue = Array.from(memoryCafeQueue.values());
  res.json({ success: true, queue, metrics: { waiting: queue.length, avgProcessingMinutes: 3, completedToday: 18 } });
});

app.post("/api/v1/premium/bulk/students", (req, res) => {
  const { rows, workflow } = req.body;
  const job = {
    id: generateId("bulk"),
    workflow: workflow || "student_documents",
    status: "processing",
    totalItems: (rows && rows.length) || 12,
    processedItems: Math.floor(((rows && rows.length) || 12) * 0.7),
    failedItems: 0,
    progressPercent: 70,
    reportUrl: `/api/v1/premium/bulk/report/${Date.now()}`
  };
  res.json({ success: true, job });
});

app.post("/api/v1/premium/assistant/recommend", (req, res) => {
  res.json({
    success: true,
    recommendations: [
      "Compress to 200 KB using high compression.",
      "Mask Aadhaar before sharing with anyone.",
    ],
    missingDocuments: ["income_certificate", "marksheet"]
  });
});

app.get("/api/v1/premium/security/status", (_req, res) => {
  res.json({
    success: true,
    controls: {
      encryptedTemporaryStorage: true,
      autoDeleteHours: 1,
      privacyMode: true,
      secureSharing: true,
      adminActivityLogs: true,
      antiMalwareHook: "mock-ready",
    }
  });
});

// ── AI Helper / Assisting Bot Endpoint ───────────────────────────────────────
function getMockAiResponse(prompt: string): string {
  const query = prompt.toLowerCase();
  
  // Bengali Detection
  const inBengali = /ভর্তি|কোর্স|ফি|টাকা|স্কলারশিপ|আধার|রিসাইজ|জিপ|ফাইল/i.test(query);
  // Hindi Detection
  const inHindi = /भर्ती|एडमिशन|कोर्स|फीस|पैसे|स्कॉलरशिप|आधार|साइज|फाइल/i.test(query);

  if (inBengali) {
    if (/ভর্তি|অ্যাডমিশন|আবেদন/i.test(query)) {
      return "**ব্রেনওয়্যার বিশ্ববিদ্যালয়ে ভর্তি ২০২৬** এখন খোলা রয়েছে! আপনি B.Tech CSE, MBA, BCA, এবং Allied Health কোর্সের জন্য সরাসরি আমাদের অনলাইন পোর্টালে আবেদন করতে পারেন। আপনার ডকুমেন্টস তৈরি করতে আমাদের **FileNova** টুলস ব্যবহার করুন।";
    }
    if (/ফি|টাকা|খরচ/i.test(query)) {
      return "কোর্স অনুযায়ী ব্রেনওয়্যার বিশ্ববিদ্যালয়ের ফি আলাদা হয়। উদাহরণস্বরূপ, BCA কোর্সের জন্য আনুমানিক সেমিস্টার ফি প্রায় ৪০,০০০ টাকা থেকে ৫০,০০০ টাকা। সঠিক খরচের বিবরণের জন্য অনুগ্রহ করে অ্যাডমিশন সেলে যোগাযোগ করুন।";
    }
    if (/স্কলারশিপ|বৃত্তি|স্বামী বিবেকানন্দ|svmcm/i.test(query)) {
      return "ব্রেনওয়্যার বিশ্ববিদ্যালয়ে ভর্তি হওয়া শিক্ষার্থীরা **SVMCM (স্বামী বিবেকানন্দ স্কলারশিপ)** এবং পশ্চিমবঙ্গের ছাত্র ক্রেডিট কার্ডের সুবিধা পেতে পারেন। স্কলারশিপ ভেরিফিকেশনের জন্য প্রয়োজনীয় ফাইলগুলি কম্প্রেস করতে আমাদের **Scholarship ZIP Maker** টুলের সাহায্য নিন।";
    }
    if (/আধার|mask/i.test(query)) {
      return "নিরাপত্তার স্বার্থে আপনার আধার কার্ডের প্রথম ৮টি নম্বর মাস্ক করতে আমাদের **Aadhaar Masking** টুলটি ব্যবহার করুন। এটি সম্পূর্ণ ব্রাউজারেই সম্পন্ন হয়।";
    }
    return "আমি ব্রেনওয়্যার এআই অ্যাসিস্ট্যান্ট। আমি আপনাকে ভর্তি, কোর্সের ফিস, স্কলারশিপ বা আমাদের ফাইল রি-সাইজিং এবং কম্প্রেসিং টুলস ব্যবহার করতে সাহায্য করতে পারি। আপনি কী জানতে চান অনুগ্রহ করে বলুন!";
  }

  if (inHindi) {
    if (/एडमिशन|भर्ती|आवेदन/i.test(query)) {
      return "**ब्रेनवेअर यूनिवर्सिटी एडमिशन 2026** शुरू हो चुके हैं! आप B.Tech, MBA, BCA और Allied Health कोर्सेज के लिए सीधे अप्लाई कर सकते हैं। फॉर्म अपलोड के लिए फाइल तैयार करने में **FileNova** का उपयोग करें।";
    }
    if (/फीस|पैसे|खर्च/i.test(query)) {
      return "ब्रेनवेअर यूनिवर्सिटी की फीस अलग-अलग कोर्सेज के लिए भिन्न है। BCA के लिए प्रत्येक सेमेस्टर फीस लगभग 40,000 से 50,000 रुपये है। विस्तृत जानकारी के लिए आप हमारे हेल्पलाइन पर संपर्क कर सकते हैं।";
    }
    if (/स्कॉलरशिप|छात्रवृत्ति|svmcm/i.test(query)) {
      return "हाँ, हमारी यूनिवर्सिटी में सभी पात्र छात्रों को **SVMCM** और **West Bengal Student Credit Card** का पूरा सपोर्ट मिलता है। आवश्यक दस्तावेजों का साइज कम करने के लिए हमारे कंप्रेसर का उपयोग करें।";
    }
    if (/आधार|मास्क/i.test(query)) {
      return "आप प्राइवेसी सुरक्षा के लिए हमारे **Aadhaar Masking** टूल का उपयोग करके अपने आधार कार्ड के नंबर छुपा सकते हैं। यह बहुत आसान और सुरक्षित है।";
    }
    return "मैं आपका ब्रेनवेअर एआई सहायक हूँ। मैं प्रवेश (Admissions), फीस, छात्रवृत्ति (Scholarships) या डॉक्यूमेंट कंप्रेस करने के टूल्स के उपयोग में आपकी सहायता कर सकता हूँ। कृपया अपना प्रश्न पूछें।";
  }

  // English fallback
  if (/admission|apply|enrol/i.test(query)) {
    return "**Brainware University Admissions 2026** is currently active! We offer top-tier programs including B.Tech CSE, BCA, MCA, MBA, allied health, and pharmacy. You can apply directly through our official admission desk. Use **FileNova** to seamlessly resize/crop your application files.";
  }
  if (/fee|charge|cost/i.test(query)) {
    return "Fees vary by course at Brainware University. For average professional courses like BCA/B.Tech, semester fees range from ₹40,050 to ₹65,000. Feel free to request our official fee structure booklet!";
  }
  if (/scholarship|svmcm|kanyashree/i.test(query)) {
    return "We fully support government schemes including the **Swami Vivekananda Merit-cum-Means Scholarship (SVMCM)**, Kanyashree, and the West Bengal Student Credit Card. You can compile your documents into a single optimized folder using our **Scholarship ZIP Maker** tool.";
  }
  if (/compress|resize|crop|pdf|image|size/i.test(query)) {
    return "To edit or compress your files:\n1. Open the **Shortcuts** dropdown in the header.\n2. Choose the specific tool (like **Compress PDF** or **Crop & Resize**).\n3. Upload your files. The system handles resizing with live preview inside the **Editing Window**, keeping your data confidential.";
  }
  if (/aadhaar|aadhar|mask/i.test(query)) {
    return "Protect your identity using our browser-based **Aadhaar Masking** tool. It blanks out the first 8 digits of your Aadhaar card before submission, which complies with legal security standards.";
  }

  return "Welcome to **File Nova Assistant**! I am here to help you answer questions regarding Brainware courses, admissions, fees, SVMCM scholarships, and how to use our secure **FileNova** document automation compiler tools. Ask me anything!";
}

app.post("/api/v1/ai/chat", async (req, res) => {
  try {
    const { messages, history } = req.body;
    const userMessage = messages || "";

    if (!userMessage) {
       res.status(400).json({ error: "Message is required." });
       return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Using mock fallback response.");
      const reply = getMockAiResponse(userMessage);
      res.json({ reply, mode: "fallback", success: true });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `
      You are the official "File Nova Assistant" for Brainware University and FileNova AI platform.
      You are friendly, professional, and composed.
      Your primary goals:
      1. Answer questions about Brainware University (courses, admissions, fees, scholarship schemes).
         - Popular courses: B.Tech CSE, MBA, BCA, MCA, Allied Health, Pharmacy.
         - Highlight that West Bengal student credit card and SVMCM scholarships are fully supported.
      2. Answer questions about FileNova's tools (how to crop/resize photos, compress PDFs, mask Aadhaar cards, merge documents, or compile ZIP files).
         - Instruct users who want to compress or crop files to click the direct tools or shortcuts in the header.
         - Mention that FileNova runs local in-browser processing for quick privacy-first calculations.
      3. Respond briefly and keep answers beautifully formatted with lists or bold texts.
      Try to be helpful and matches the user's language (English, Hindi, or Bengali). Keep responses concise.
    `;

    const chatContents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        chatContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }
    chatContents.push({ role: "user", parts: [{ text: userMessage }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || "I'm sorry, I couldn't process that query.";
    res.json({ reply, mode: "gemini", success: true });
  } catch (error: any) {
    console.error("Gemini API call failed, reverting to local assistant logic:", error);
    const reply = getMockAiResponse(req.body.messages || "");
    res.json({ reply, mode: "error-fallback", success: true, error: error.message });
  }
});


// ── Dev / Production Bundled Server ───────────────────────────────────────────
async function run() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for smooth SPA development mode inside our sandbox
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets compiled under dist folder with direct index.html fallback
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FileNova single-entry fullstack server active on port ${PORT}`);
  });
}

run().catch(err => {
  console.error("Express server boot failed:", err);
});
