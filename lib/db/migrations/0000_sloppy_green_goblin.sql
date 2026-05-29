CREATE TYPE "public"."event_category" AS ENUM('scheme', 'student', 'identity', 'job', 'admission');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'operator', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."bulk_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('aadhaar', 'pan', 'passport', 'voter_id', 'license', 'birth_certificate', 'admission_form', 'marksheet', 'other');--> statement-breakpoint
CREATE TYPE "public"."operator_mode" AS ENUM('standard', 'batch', 'queue', 'express');--> statement-breakpoint
CREATE TYPE "public"."scan_type" AS ENUM('single_page', 'multi_page', 'camera', 'upload');--> statement-breakpoint
CREATE TYPE "public"."share_status" AS ENUM('active', 'expired', 'revoked', 'deleted');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" varchar(100),
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"error_code" varchar(50),
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_name" varchar(120) NOT NULL,
	"tool_slug" varchar(120),
	"event_rule_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" "bulk_job_status" DEFAULT 'pending' NOT NULL,
	"total_items" integer NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"result_zip_id" uuid,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"error_log" jsonb DEFAULT '[]'::jsonb,
	"success_log" jsonb DEFAULT '[]'::jsonb,
	"csv_data" jsonb,
	"metadata" jsonb,
	"estimated_completion_ms" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cafe_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(20),
	"email" varchar(320),
	"id_type" varchar(50),
	"id_number" varchar(50),
	"saved_workflows" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"total_jobs" integer DEFAULT 0 NOT NULL,
	"total_spent" integer,
	"last_visited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digilocker_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"aadhaar_hash" varchar(255),
	"session_token" varchar(255) NOT NULL,
	"access_token" varchar(500),
	"refresh_token" varchar(500),
	"permission_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"imported_documents" jsonb DEFAULT '[]'::jsonb,
	"last_sync_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digilocker_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "document_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_rule_id" uuid NOT NULL,
	"key" varchar(120) NOT NULL,
	"label" varchar(180) NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"accepted_formats" jsonb NOT NULL,
	"min_size_kb" integer,
	"max_size_kb" integer NOT NULL,
	"width_px" integer,
	"height_px" integer,
	"dpi" integer,
	"pdf_requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_name" varchar(220) NOT NULL,
	"compression_target_kb" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(180) NOT NULL,
	"category" "event_category" NOT NULL,
	"description" text NOT NULL,
	"banner_url" text,
	"naming_pattern" varchar(240) NOT NULL,
	"zip_structure" jsonb NOT NULL,
	"merge_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_rules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exam_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_name" varchar(100) NOT NULL,
	"category" varchar(50) DEFAULT 'entrance' NOT NULL,
	"state" varchar(50),
	"photo_requirements" jsonb NOT NULL,
	"signature_requirements" jsonb NOT NULL,
	"pdf_max_size_kb" integer NOT NULL,
	"supported_formats" jsonb NOT NULL,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_autofill_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"document_hash" varchar(128) NOT NULL,
	"document_type" "document_type",
	"extracted_fields" jsonb NOT NULL,
	"confidence_scores" jsonb NOT NULL,
	"validation_errors" jsonb,
	"suggestions" jsonb,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"document_type" "document_type",
	"file_type" varchar(50),
	"encrypted_path" text NOT NULL,
	"encryption_key" text NOT NULL,
	"file_hash" varchar(128) NOT NULL,
	"size_bytes" integer NOT NULL,
	"is_sensitive" boolean DEFAULT true NOT NULL,
	"ocr_extracted_text" text,
	"detected_fields" jsonb,
	"confidence_scores" jsonb,
	"thumbnail_path" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_rule_id" uuid,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"upload_health_score" integer,
	"original_bytes" integer DEFAULT 0 NOT NULL,
	"output_bytes" integer,
	"storage_prefix" text NOT NULL,
	"output_zip_key" text,
	"error_code" varchar(80),
	"error_message" text,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"share_link_id" uuid,
	"qr_data" text NOT NULL,
	"qr_image" "bytea",
	"qr_size" integer DEFAULT 300 NOT NULL,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"scanned_by_ips" jsonb DEFAULT '[]'::jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"scan_type" "scan_type" NOT NULL,
	"result_pages" integer DEFAULT 1 NOT NULL,
	"quality_score" integer,
	"brightness" integer,
	"contrast" integer,
	"processing_time_ms" integer,
	"edges_detected" integer,
	"perspective_angle" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"user_id" uuid NOT NULL,
	"token" varchar(128) NOT NULL,
	"share_type" varchar(50) DEFAULT 'link' NOT NULL,
	"status" "share_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"max_downloads" integer,
	"password_hash" varchar(255),
	"message_template" text,
	"downloaded_by_ips" jsonb DEFAULT '[]'::jsonb,
	"downloaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"razorpay_order_id" varchar(255),
	"razorpay_payment_id" varchar(255),
	"razorpay_subscription_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"document_rule_id" uuid,
	"original_name" text NOT NULL,
	"normalized_name" text,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width_px" integer,
	"height_px" integer,
	"checksum" varchar(128) NOT NULL,
	"object_key" text NOT NULL,
	"validation_report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone_number" varchar(20),
	"password_hash" text,
	"name" varchar(160),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"language" varchar(8) DEFAULT 'en' NOT NULL,
	"google_subject" varchar(255),
	"premium_enabled" boolean DEFAULT false NOT NULL,
	"premium_tier" varchar(50) DEFAULT 'free',
	"voice_language" varchar(10) DEFAULT 'en',
	"privacy_mode" boolean DEFAULT false NOT NULL,
	"cafe_operator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "voice_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"language" varchar(10) NOT NULL,
	"command" text NOT NULL,
	"action" varchar(100),
	"confidence" integer,
	"success" boolean NOT NULL,
	"error_message" text,
	"processing_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_event_rule_id_event_rules_id_fk" FOREIGN KEY ("event_rule_id") REFERENCES "public"."event_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_customers" ADD CONSTRAINT "cafe_customers_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digilocker_sessions" ADD CONSTRAINT "digilocker_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_rules" ADD CONSTRAINT "document_rules_event_rule_id_event_rules_id_fk" FOREIGN KEY ("event_rule_id") REFERENCES "public"."event_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rules" ADD CONSTRAINT "event_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_autofill_cache" ADD CONSTRAINT "form_autofill_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_autofill_cache" ADD CONSTRAINT "form_autofill_cache_document_id_premium_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."premium_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_documents" ADD CONSTRAINT "premium_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_event_rule_id_event_rules_id_fk" FOREIGN KEY ("event_rule_id") REFERENCES "public"."event_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_document_id_premium_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."premium_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_document_id_premium_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."premium_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_document_id_premium_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."premium_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_job_id_processing_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."processing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_document_rule_id_document_rules_id_fk" FOREIGN KEY ("document_rule_id") REFERENCES "public"."document_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;