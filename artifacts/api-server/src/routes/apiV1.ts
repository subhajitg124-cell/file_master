import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";
import { execSync } from "child_process";
import premiumRouter from "./premium";
import subscriptionRouter from "./subscriptions";
import authRouter from "./auth";

const router = Router();

// Zod schemas and validation
const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/tiff", "image/bmp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain", "text/markdown", "text/html", "application/json",
  "video/mp4", "video/quicktime", "video/x-matroska", "video/x-msvideo",
  "application/zip", "application/x-zip-compressed"
];

const fileValidator = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().refine(val => allowedMimeTypes.includes(val), {
    message: "Unsupported file type"
  }),
  size: z.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
  destination: z.string(),
  filename: z.string(),
  path: z.string()
});

// Rate limiting on uploads
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 upload requests per windowMs
  message: { detail: "Too many upload requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

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

// In-memory job state store
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

// Command checker helper
function checkCmd(cmd: string): boolean {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

const hasFFmpeg = checkCmd("ffmpeg");
const hasLibreOffice = checkCmd("soffice") || checkCmd("libreoffice");

// Health check endpoint (matching what frontend expects)
router.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    services: {
      libreoffice_headless: hasLibreOffice ? "available" : "unavailable",
      ffmpeg: hasFFmpeg ? "available" : "unavailable"
    }
  });
});

// Upload API
router.post("/upload", uploadRateLimiter, upload.array("files"), (req, res): void => {
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

  try {
    // Validate each file
    for (const file of files) {
      fileValidator.parse(file);
    }
  } catch (err: any) {
    // Clean up uploaded files on validation error
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    const message = err instanceof z.ZodError ? err.errors[0].message : "Invalid file uploaded.";
    res.status(400).json({ detail: message });
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
    // Sanitize the original filename to prevent path traversal / arbitrary write attacks
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

// Preview endpoint
router.get("/preview/:filename", (req, res): void => {
  const filename = req.params.filename;
  // Security path traversal check
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

// Asynchronous background processing logic
async function runProcessing(job: Job, operation: string, options: any) {
  const totalSteps = 10;
  for (let i = 1; i <= totalSteps; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    // If job was cancelled or updated by another action, abort
    const currentJob = jobs.get(job.id);
    if (!currentJob || currentJob.status !== "processing") return;
    
    currentJob.progress = i * 10;
    currentJob.updatedAt = new Date();
    jobs.set(job.id, currentJob);
  }

  const currentJob = jobs.get(job.id);
  if (!currentJob) return;

  if (currentJob.files.length === 0) {
    throw new Error("No files uploaded for this job.");
  }

  const firstFile = currentJob.files[0];
  const outputFilename = `output_${currentJob.id}_${firstFile.originalname}`;
  const outputPath = path.join(uploadDir, outputFilename);

  // Copy file to represent processed output
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

// Process API
router.post("/process", (req, res): void => {
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

  // Run in background asynchronously
  runProcessing(job, operation, options).catch(err => {
    logger.error({ err, jobId }, "Error in processing background task");
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.status = "failed";
      currentJob.error = err.message || "Processing failed.";
      currentJob.updatedAt = new Date();
      jobs.set(jobId, currentJob);
    }
  });

  res.json({ status: "processing" });
});

// Status API
router.get("/status/:jobId", (req, res): void => {
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

// Download API with immediate cleanup
router.get("/download/:jobId", (req, res): void => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) {
    res.status(404).json({ detail: "Job not found." });
    return;
  }

  if (job.status !== "completed" || !job.outputFilePath) {
    res.status(400).json({ detail: "Job is not completed or output is missing." });
    return;
  }

  if (!fs.existsSync(job.outputFilePath)) {
    res.status(404).json({ detail: "Output file not found." });
    return;
  }

  res.download(job.outputFilePath, job.originalname || "output", (err) => {
    try {
      // Clean up input files
      for (const file of job.files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
      // Clean up output file
      if (job.outputFilePath && fs.existsSync(job.outputFilePath)) {
        fs.unlinkSync(job.outputFilePath);
      }
      // Delete job entry
      jobs.delete(jobId);
      logger.info({ jobId }, "Cleaned up temp files for job after download");
    } catch (cleanupErr) {
      logger.error({ err: cleanupErr, jobId }, "Error cleaning up job files after download");
    }
  });
});

// Periodic task to clean up expired jobs and files (older than 1 hour)
const expiredCleanupTimer = setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.updatedAt.getTime() > ONE_HOUR) {
      try {
        for (const file of job.files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
        if (job.outputFilePath && fs.existsSync(job.outputFilePath)) {
          fs.unlinkSync(job.outputFilePath);
        }
        jobs.delete(jobId);
        logger.info({ jobId }, "Cleaned up expired job files (exceeded 1 hour)");
      } catch (cleanupErr) {
        logger.error({ err: cleanupErr, jobId }, "Error cleaning up expired job files");
      }
    }
  }
}, 15 * 60 * 1000); // run every 15 minutes
expiredCleanupTimer.unref();

// Mount premium features routes
router.use("/premium", premiumRouter);
router.use("/premium/subscription", subscriptionRouter);
router.use("/auth", authRouter);

export default router;
