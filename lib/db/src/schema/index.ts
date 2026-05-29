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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "operator", "admin", "super_admin"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "processing", "completed", "failed", "expired"]);
export const eventCategoryEnum = pgEnum("event_category", ["scheme", "student", "identity", "job", "admission"]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 160 }),
  role: userRoleEnum("role").notNull().default("user"),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  googleSubject: varchar("google_subject", { length: 255 }),
  // Premium features
  premiumEnabled: boolean("premium_enabled").notNull().default(false),
  premiumTier: varchar("premium_tier", { length: 50 }).default("free"), // free, basic, pro, enterprise
  voiceLanguage: varchar("voice_language", { length: 10 }).default("en"), // en, hi, bn
  privacyMode: boolean("privacy_mode").notNull().default(false), // No logging mode
  cafeOperatorId: uuid("cafe_operator_id"), // Link to cafe if operator
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventRulesTable = pgTable("event_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  category: eventCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  bannerUrl: text("banner_url"),
  namingPattern: varchar("naming_pattern", { length: 240 }).notNull(),
  zipStructure: jsonb("zip_structure").$type<string[]>().notNull(),
  mergeOrder: jsonb("merge_order").$type<string[]>().notNull().default([]),
  isPublished: boolean("is_published").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentRulesTable = pgTable("document_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventRuleId: uuid("event_rule_id").notNull().references(() => eventRulesTable.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 120 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  required: boolean("required").notNull().default(true),
  acceptedFormats: jsonb("accepted_formats").$type<string[]>().notNull(),
  minSizeKb: integer("min_size_kb"),
  maxSizeKb: integer("max_size_kb").notNull(),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  dpi: integer("dpi"),
  pdfRequirements: jsonb("pdf_requirements").$type<Record<string, unknown>>().notNull().default({}),
  outputName: varchar("output_name", { length: 220 }).notNull(),
  compressionTargetKb: integer("compression_target_kb"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const processingJobsTable = pgTable("processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  eventRuleId: uuid("event_rule_id").references(() => eventRulesTable.id),
  status: jobStatusEnum("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  uploadHealthScore: integer("upload_health_score"),
  originalBytes: integer("original_bytes").notNull().default(0),
  outputBytes: integer("output_bytes"),
  storagePrefix: text("storage_prefix").notNull(),
  outputZipKey: text("output_zip_key"),
  errorCode: varchar("error_code", { length: 80 }),
  errorMessage: text("error_message"),
  recommendations: jsonb("recommendations").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => processingJobsTable.id, { onDelete: "cascade" }),
  documentRuleId: uuid("document_rule_id").references(() => documentRulesTable.id),
  originalName: text("original_name").notNull(),
  normalizedName: text("normalized_name"),
  mimeType: varchar("mime_type", { length: 160 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  checksum: varchar("checksum", { length: 128 }).notNull(),
  objectKey: text("object_key").notNull(),
  validationReport: jsonb("validation_report").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  eventName: varchar("event_name", { length: 120 }).notNull(),
  toolSlug: varchar("tool_slug", { length: 120 }),
  eventRuleId: uuid("event_rule_id").references(() => eventRulesTable.id),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventRulesRelations = relations(eventRulesTable, ({ many, one }) => ({
  documents: many(documentRulesTable),
  creator: one(usersTable, { fields: [eventRulesTable.createdBy], references: [usersTable.id] }),
}));

export const processingJobsRelations = relations(processingJobsTable, ({ many, one }) => ({
  files: many(uploadedFilesTable),
  user: one(usersTable, { fields: [processingJobsTable.userId], references: [usersTable.id] }),
  eventRule: one(eventRulesTable, { fields: [processingJobsTable.eventRuleId], references: [eventRulesTable.id] }),
}));

export const sessionsTable = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventRuleSchema = createInsertSchema(eventRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentRuleSchema = createInsertSchema(documentRulesTable).omit({ id: true });
export const insertProcessingJobSchema = createInsertSchema(processingJobsTable).omit({ id: true, createdAt: true, completedAt: true });

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type EventRule = typeof eventRulesTable.$inferSelect;
export type InsertEventRule = z.infer<typeof insertEventRuleSchema>;
export type DocumentRule = typeof documentRulesTable.$inferSelect;
export type ProcessingJob = typeof processingJobsTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;

// Premium features exports
export * from "./premium";
export {
  premiumDocumentsTable,
  shareLinksTable,
  scanHistoryTable,
  formAutofillCacheTable,
  bulkJobsTable,
  qrCodesTable,
  cafeCustomersTable,
  voiceCommandsTable,
  activityLogsTable,
  digilockerSessionsTable,
  examTemplatesTable,
} from "./premium";

export * from "./subscriptions";
export { subscriptionsTable } from "./subscriptions";

