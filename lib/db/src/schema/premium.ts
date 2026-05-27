import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  bytea,
} from "drizzle-orm/pg-core";
import { usersTable } from "./index";

// Enums for premium features
export const documentTypeEnum = pgEnum("document_type", [
  "aadhaar",
  "pan",
  "passport",
  "voter_id",
  "license",
  "birth_certificate",
  "admission_form",
  "marksheet",
  "other",
]);

export const shareStatusEnum = pgEnum("share_status", [
  "active",
  "expired",
  "revoked",
  "deleted",
]);

export const scanTypeEnum = pgEnum("scan_type", [
  "single_page",
  "multi_page",
  "camera",
  "upload",
]);

export const bulkJobStatusEnum = pgEnum("bulk_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "partial",
]);

export const operatorModeEnum = pgEnum("operator_mode", [
  "standard",
  "batch",
  "queue",
  "express",
]);

// ========== Core Premium Documents Table ==========
/**
 * Stores encrypted documents with versioning and audit trail
 * Supports all document types with secure storage
 */
export const premiumDocumentsTable = pgTable("premium_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  documentType: documentTypeEnum("document_type"),
  fileType: varchar("file_type", { length: 50 }), // pdf, jpg, png, etc
  encryptedPath: text("encrypted_path").notNull(), // S3/storage path
  encryptionKey: text("encryption_key").notNull(), // AES-256 key (stored separately in secrets manager in prod)
  fileHash: varchar("file_hash", { length: 128 }).notNull(), // SHA-256 for integrity
  sizeBytes: integer("size_bytes").notNull(),
  isSensitive: boolean("is_sensitive").notNull().default(true),
  ocrExtractedText: text("ocr_extracted_text"), // Cached OCR results
  detectedFields: jsonb("detected_fields").$type<Record<string, unknown>>(), // Autofill cache
  confidenceScores: jsonb("confidence_scores").$type<Record<string, number>>(), // OCR confidence
  thumbnailPath: text("thumbnail_path"), // For preview
  version: integer("version").notNull().default(1),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // Auto-delete after N days
});

// ========== Secure Sharing Links Table ==========
/**
 * Temporary shareable links with expiry, download tracking
 * Used for WhatsApp sharing, QR codes, direct downloads
 */
export const shareLinksTable = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => premiumDocumentsTable.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  token: varchar("token", { length: 128 }).notNull().unique(), // Secure random token
  shareType: varchar("share_type", { length: 50 }).notNull().default("link"), // link, whatsapp, qr, email
  status: shareStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  maxDownloads: integer("max_downloads"), // Limit downloads
  passwordHash: varchar("password_hash", { length: 255 }), // Optional password protection
  messageTemplate: text("message_template"), // WhatsApp message template
  downloadedByIps: jsonb("downloaded_by_ips").$type<string[]>().default([]), // Track IPs for security
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }), // Last download
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Document Scanning History ==========
/**
 * Track scans, quality scores, and processing metrics
 */
export const scanHistoryTable = pgTable("scan_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  documentId: uuid("document_id").references(() => premiumDocumentsTable.id, {
    onDelete: "set null",
  }),
  scanType: scanTypeEnum("scan_type").notNull(),
  resultPages: integer("result_pages").notNull().default(1),
  qualityScore: integer("quality_score"), // 1-100 quality assessment
  brightness: integer("brightness"), // -100 to +100 (for optimization tracking)
  contrast: integer("contrast"),
  processingTimeMs: integer("processing_time_ms"),
  edgesDetected: integer("edges_detected"), // Document edge detection score
  perspectiveAngle: integer("perspective_angle"), // Angle before correction
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Additional scan data
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Form Autofill Cache ==========
/**
 * Cache OCR-extracted fields for quick reference and reuse
 */
export const formAutofillCacheTable = pgTable("form_autofill_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  documentId: uuid("document_id").references(() => premiumDocumentsTable.id, {
    onDelete: "cascade",
  }),
  documentHash: varchar("document_hash", { length: 128 }).notNull(),
  documentType: documentTypeEnum("document_type"),
  extractedFields: jsonb("extracted_fields").$type<Record<string, string>>()
    .notNull(), // { name, dob, address, gender, id_number, etc }
  confidenceScores: jsonb("confidence_scores").$type<Record<string, number>>()
    .notNull(), // Confidence per field
  validationErrors: jsonb("validation_errors").$type<string[]>(), // Fields that failed validation
  suggestions: jsonb("suggestions").$type<Array<{ field: string; suggestion: string }>>(), // AI suggestions
  isVerified: boolean("is_verified").notNull().default(false), // User manually verified
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Bulk Processing Jobs ==========
/**
 * Track large batch operations (student lists, bulk compression, etc)
 */
export const bulkJobsTable = pgTable("bulk_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  jobType: varchar("job_type", { length: 50 }).notNull(), // student_processing, bulk_compress, exam_kit, etc
  status: bulkJobStatusEnum("status").notNull().default("pending"),
  totalItems: integer("total_items").notNull(),
  processedItems: integer("processed_items").notNull().default(0),
  failedItems: integer("failed_items").notNull().default(0),
  resultZipId: uuid("result_zip_id"), // Link to final output
  progressPercent: integer("progress_percent").notNull().default(0),
  errorLog: jsonb("error_log").$type<Array<{ item: string; error: string }>>()
    .default([]),
  successLog: jsonb("success_log").$type<string[]>().default([]),
  csvData: jsonb("csv_data").$type<unknown>(), // Uploaded CSV/Excel data
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Job-specific config
  estimatedCompletionMs: integer("estimated_completion_ms"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // Auto-delete results after N days
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== QR Codes ==========
/**
 * Generate and track QR codes for files
 */
export const qrCodesTable = pgTable("qr_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => premiumDocumentsTable.id, {
    onDelete: "cascade",
  }),
  shareLinkId: uuid("share_link_id").references(() => shareLinksTable.id, {
    onDelete: "cascade",
  }),
  qrData: text("qr_data").notNull(), // URL or data encoded in QR
  qrImage: bytea("qr_image"), // PNG image binary
  qrSize: integer("qr_size").notNull().default(300), // 300x300px default
  scanCount: integer("scan_count").notNull().default(0),
  lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
  scannedByIps: jsonb("scanned_by_ips").$type<string[]>().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Cyber Cafe Customer Profiles ==========
/**
 * Store customer info for quick repeat workflows
 */
export const cafeCustomersTable = pgTable("cafe_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  idType: varchar("id_type", { length: 50 }), // aadhaar, voter_id, etc
  idNumber: varchar("id_number", { length: 50 }), // Partially masked
  savedWorkflows: jsonb("saved_workflows").$type<
    Array<{ name: string; config: Record<string, unknown> }>
  >().default([]),
  notes: text("notes"),
  totalJobs: integer("total_jobs").notNull().default(0),
  totalSpent: integer("total_spent"), // In paise for Indian context
  lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Voice Commands Log ==========
/**
 * Track voice interactions for accessibility features
 */
export const voiceCommandsTable = pgTable("voice_commands", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  language: varchar("language", { length: 10 }).notNull(), // en, hi, bn
  command: text("command").notNull(), // User's voice command (transcribed)
  action: varchar("action", { length: 100 }), // Action triggered (upload, compress, etc)
  confidence: integer("confidence"), // Speech recognition confidence 0-100
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Activity Audit Logs ==========
/**
 * Comprehensive audit trail for security and compliance
 */
export const activityLogsTable = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 100 }).notNull(), // download_share, create_qr, scan_document, etc
  resourceType: varchar("resource_type", { length: 50 }), // document, share_link, bulk_job
  resourceId: varchar("resource_id", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("success"), // success, failure
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 and IPv6
  userAgent: text("user_agent"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== DigiLocker Sessions ==========
/**
 * Track DigiLocker integration sessions
 */
export const digilockerSessionsTable = pgTable("digilocker_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  aadhaarHash: varchar("aadhaar_hash", { length: 255 }), // Hashed Aadhaar
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  accessToken: varchar("access_token", { length: 500 }), // Mock OAuth token
  refreshToken: varchar("refresh_token", { length: 500 }),
  permissionStatus: varchar("permission_status", { length: 50 }).notNull().default("pending"), // pending, granted, denied
  importedDocuments: jsonb("imported_documents").$type<string[]>().default([]), // IDs of imported docs
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Exam Form Templates ==========
/**
 * Preset templates for various exams (WBJEE, JEE, NEET, CUET, etc)
 */
export const examTemplatesTable = pgTable("exam_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  examName: varchar("exam_name", { length: 100 }).notNull(), // WBJEE, JEE Main, NEET, CUET, etc
  category: varchar("category", { length: 50 }).notNull().default("entrance"), // entrance, scholarship, admission
  state: varchar("state", { length: 50 }), // IN, for WBJEE-specific template
  photoRequirements: jsonb("photo_requirements").$type<{
    width: number;
    height: number;
    unit: string;
    dpi: number;
  }>().notNull(),
  signatureRequirements: jsonb("signature_requirements").$type<{
    width: number;
    height: number;
    unit: string;
  }>().notNull(),
  pdfMaxSizeKb: integer("pdf_max_size_kb").notNull(),
  supportedFormats: jsonb("supported_formats").$type<string[]>().notNull(), // ['jpg', 'pdf', etc]
  instructions: text("instructions"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ========== Relations ==========
export const premiumDocumentsRelations = relations(
  premiumDocumentsTable,
  ({ many, one }) => ({
    user: one(usersTable, {
      fields: [premiumDocumentsTable.userId],
      references: [usersTable.id],
    }),
    shareLinks: many(shareLinksTable),
    scanHistory: many(scanHistoryTable),
    autofillCache: many(formAutofillCacheTable),
    qrCodes: many(qrCodesTable),
  })
);

export const shareLinksRelations = relations(shareLinksTable, ({ one }) => ({
  document: one(premiumDocumentsTable, {
    fields: [shareLinksTable.documentId],
    references: [premiumDocumentsTable.id],
  }),
  user: one(usersTable, {
    fields: [shareLinksTable.userId],
    references: [usersTable.id],
  }),
  qrCode: one(qrCodesTable),
}));

export const bulkJobsRelations = relations(bulkJobsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [bulkJobsTable.userId],
    references: [usersTable.id],
  }),
}));

export const cafeCustomersRelations = relations(
  cafeCustomersTable,
  ({ one }) => ({
    operator: one(usersTable, {
      fields: [cafeCustomersTable.operatorId],
      references: [usersTable.id],
    }),
  })
);
