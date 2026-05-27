# FileMaster AI Architecture

## Product goal

FileMaster AI is a document automation platform for Indian government, scholarship, admission and job workflows. A user selects a scheme or service, uploads files, and receives a portal-ready ZIP after validation, compression, conversion, cleanup, naming and folder organization.

## Core modules

1. Frontend app
   - React, TypeScript, Tailwind CSS, Framer Motion and shadcn/ui primitives.
   - Mobile-first scheme workflow, quick actions, upload checklist, live preview, dark mode and i18n.
   - PWA shell with resumable upload state, recent jobs and download center.

2. API gateway
   - Next API or Express endpoints for auth, event rules, uploads, processing jobs, analytics and admin controls.
   - Zod validation on every request.
   - Rate limits by IP, user and route sensitivity.

3. Rule engine
   - Admin-created event rules define required documents, formats, dimensions, DPI, size limits, naming templates, merge order and ZIP structure.
   - Jobs compile the selected event rule into deterministic processing steps.

4. Document intelligence
   - MIME sniffing, checksum duplicate detection, corruption checks, EXIF orientation, image dimension checks and PDF metadata checks.
   - AI recommendations are stored per job and shown as actionable fixes.
   - Optional OCR and scan-quality classifiers can run in worker queues.

5. Processing workers
   - BullMQ queues backed by Redis.
   - Workers perform image resize/compression, PDF compression, PDF merge/split, OCR, background removal, scan cleanup, ZIP generation and secure deletion.
   - Failed jobs are retryable and surfaced in admin logs.

6. Storage
   - S3 or Cloudinary for encrypted object storage.
   - Temporary uploads use short TTLs.
   - Output ZIP files expire automatically unless the user saves them to cloud history.

7. Database
   - PostgreSQL with Drizzle schema in `lib/db/src/schema/index.ts`.
   - Tables cover users, event rules, document rules, processing jobs, uploaded files and analytics events.

8. Security
   - Auth roles: user, operator, admin, super_admin.
   - Admin route guard, CSRF protection for cookie auth, signed upload URLs, object-key isolation, secure deletion and virus scan hooks.
   - File validation uses extension, MIME and magic-number checks.

## Processing flow

1. User selects an event such as Scholarship ZIP Maker or Lakshmir Bhandar.
2. Frontend loads the event rule and shows required documents.
3. User uploads files through resumable upload.
4. API creates a processing job and stores raw uploads in temporary encrypted storage.
5. Worker validates each file against its document rule.
6. Worker auto-fixes safe issues: rotation, whitespace crop, format conversion, compression, image resize and filename normalization.
7. Worker reports remaining blockers and recommendations.
8. When all required documents pass, worker creates the final ZIP structure.
9. User downloads the ZIP from the download center.
10. Temporary files are deleted after TTL or immediate download cleanup.

## API surface

- `GET /api/v1/events`
- `POST /api/v1/events`
- `PATCH /api/v1/events/:id`
- `DELETE /api/v1/events/:id`
- `POST /api/v1/jobs`
- `POST /api/v1/jobs/:id/uploads`
- `POST /api/v1/jobs/:id/process`
- `GET /api/v1/jobs/:id`
- `GET /api/v1/jobs/:id/download`
- `GET /api/v1/admin/analytics`
- `GET /api/v1/admin/logs`
- `PATCH /api/v1/admin/feature-flags`

## Deployment

1. Provision PostgreSQL, Redis and S3-compatible storage.
2. Set environment variables from `.env.example`.
3. Run Drizzle migrations.
4. Deploy API and worker services separately.
5. Deploy the frontend as static Vite output or migrate to Next.js when SSR/SEO expansion starts.
6. Configure object lifecycle rules for upload expiry.
7. Enable CDN, security headers and request logging.

## Next production milestones

1. Replace mock event data with API-backed rule CRUD.
2. Add authenticated Google/email login.
3. Implement BullMQ processing workers.
4. Add resumable uploads with signed multipart upload.
5. Add ClamAV or cloud malware scanning.
6. Add SEO tool landing pages and sitemap generation.
