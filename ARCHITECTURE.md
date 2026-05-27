# 🏗️ FileMaster AI Premium - Complete Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILEMASTER AI PREMIUM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────┬──────────────────────────────────┐  │
│  │      FRONTEND (React)             │      BACKEND (Express.js)        │  │
│  │  artifacts/file-master/           │  artifacts/api-server/           │  │
│  ├──────────────────────────────────┼──────────────────────────────────┤  │
│  │                                  │                                  │  │
│  │  🎨 Components:                  │  📡 API Routes:                  │  │
│  │  ├── WhatsAppShare.tsx          │  ├── /premium/shares            │  │
│  │  ├── VoiceAssistant.tsx         │  ├── /premium/qr/*              │  │
│  │  ├── DocumentScanner.tsx        │  ├── /premium/ocr/*             │  │
│  │  ├── FormAutofill.tsx           │  ├── /premium/voice/*           │  │
│  │  ├── ExamToolkit.tsx            │  ├── /premium/aadhaar/*         │  │
│  │  ├── QRScanner.tsx              │  ├── /premium/exams/*           │  │
│  │  └── [More Components]          │  └── /premium/[others]          │  │
│  │                                  │                                  │  │
│  │  🪝 Custom Hooks:               │  🛡️ Middleware:                 │  │
│  │  ├── usePremiumFeatures()       │  ├── rateLimit                  │  │
│  │  ├── useShare()                 │  ├── timeout                    │  │
│  │  ├── useQRCode()                │  ├── uploadValidator            │  │
│  │  └── useVoiceAssistant()        │  └── requestTimeout             │  │
│  │                                  │                                  │  │
│  │  🎯 State Management:           │  🔧 Services:                    │  │
│  │  ├── Zustand store              │  ├── lib/db/encryption.ts       │  │
│  │  ├── React Query                │  ├── lib/db/sharing.ts          │  │
│  │  └── Local state                │  └── [Custom services]          │  │
│  │                                  │                                  │  │
│  └──────────────────────────────────┴──────────────────────────────────┘  │
│                                   ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              DATABASE LAYER (PostgreSQL)                              │  │
│  │              lib/db/src/schema/premium.ts                             │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  🗄️ Core Tables:                                                    │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ premium_documents          │ Form Autofill & OCR Cache        │ │  │
│  │  │ ├─ id (UUID)               │ ├─ id (UUID)                     │ │  │
│  │  │ ├─ user_id (FK)            │ ├─ user_id (FK)                 │ │  │
│  │  │ ├─ name                    │ ├─ document_hash                 │ │  │
│  │  │ ├─ document_type           │ ├─ extracted_fields (JSON)       │ │  │
│  │  │ ├─ encrypted_path          │ ├─ confidence_scores (JSON)      │ │  │
│  │  │ ├─ encryption_key          │ └─ validated (BOOL)              │ │  │
│  │  │ ├─ ocr_extracted_text      │                                  │ │  │
│  │  │ ├─ file_hash               │ Share Links Table                │ │  │
│  │  │ ├─ size_bytes              │ ├─ id (UUID)                     │ │  │
│  │  │ ├─ is_sensitive            │ ├─ document_id (FK)              │ │  │
│  │  │ └─ expires_at              │ ├─ token (unique)                │ │  │
│  │  │                            │ ├─ share_type                    │ │  │
│  │  │ Scan History Table         │ ├─ expires_at                    │ │  │
│  │  │ ├─ id (UUID)               │ ├─ download_count                │ │  │
│  │  │ ├─ user_id (FK)            │ ├─ max_downloads                 │ │  │
│  │  │ ├─ document_id (FK)        │ ├─ password_hash                 │ │  │
│  │  │ ├─ scan_type               │ └─ message_template              │ │  │
│  │  │ ├─ result_pages            │                                  │ │  │
│  │  │ ├─ quality_score           │ QR Codes Table                   │ │  │
│  │  │ └─ processing_time_ms      │ ├─ id (UUID)                     │ │  │
│  │  │                            │ ├─ document_id (FK)              │ │  │
│  │  │ Bulk Jobs Table            │ ├─ share_link_id (FK)            │ │  │
│  │  │ ├─ id (UUID)               │ ├─ qr_data                       │ │  │
│  │  │ ├─ user_id (FK)            │ ├─ qr_image (bytea)              │ │  │
│  │  │ ├─ job_type                │ ├─ scan_count                    │ │  │
│  │  │ ├─ status                  │ └─ expires_at                    │ │  │
│  │  │ ├─ total_items             │                                  │ │  │
│  │  │ ├─ processed_items         │ Other Tables:                    │ │  │
│  │  │ ├─ progress_percent        │ ├─ cafe_customers                │ │  │
│  │  │ └─ result_zip_id           │ ├─ voice_commands                │ │  │
│  │  │                            │ ├─ activity_logs                 │ │  │
│  │  │ Cafe Customers Table       │ ├─ digilocker_sessions           │ │  │
│  │  │ ├─ id (UUID)               │ └─ exam_templates                │ │  │
│  │  │ ├─ operator_id (FK)        │                                  │ │  │
│  │  │ ├─ name                    │                                  │ │  │
│  │  │ ├─ phone                   │                                  │ │  │
│  │  │ ├─ saved_workflows (JSON)  │                                  │ │  │
│  │  │ └─ total_jobs              │                                  │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  🔐 Encryption & Security:                                          │  │
│  │  ├─ AES-256-GCM for documents                                       │  │
│  │  ├─ PBKDF2 (100k iterations) for passwords                         │  │
│  │  ├─ SHA-256 for file integrity                                     │  │
│  │  ├─ Secure token generation (192-bit)                              │  │
│  │  └─ Auto-delete after 7 days                                       │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                   EXTERNAL SERVICES (Optional)                       │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  📸 OCR Engines:           🗣️ Voice Services:   🔌 APIs:           │  │
│  │  ├─ Tesseract.js (local)   ├─ Web Speech API   ├─ DigiLocker       │  │
│  │  └─ Google Vision (cloud)  ├─ Google TTS       ├─ WhatsApp         │  │
│  │                            └─ Browser API      └─ AWS S3           │  │
│  │  📄 Document Processing:                                            │  │
│  │  ├─ OpenCV.js (scanning)   🖼️ Image Processing:                    │  │
│  │  ├─ pdf-lib (PDF ops)      ├─ Sharp (Node)                         │  │
│  │  └─ FPDF (PHP backend)     └─ Canvas API (Browser)                 │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. WhatsApp Share Flow

```
User uploads document
    │
    ▼
✅ Document stored (encrypted)
    │
    ▼
User clicks "Share on WhatsApp"
    │
    ▼
🔐 Secure share link generated
    │
    └─ Token created (192-bit random)
    │
    └─ Link stored in DB with expiry (48h)
    │
    ▼
📱 WhatsApp message prefilled
    │
    └─ "https://app.com/share/[token]"
    │
    ▼
User sends via WhatsApp
    │
    ▼
Recipient opens link
    │
    ├─ Token verified ✅
    ├─ Expiry checked ✅
    └─ IP logged
    │
    ▼
📥 Download started
    │
    ├─ Download count incremented
    ├─ Download time recorded
    └─ IP tracked
    │
    ▼
✅ File delivered

```

### 2. Form Autofill Flow

```
User uploads Aadhaar/PAN
    │
    ▼
🔐 Document encrypted & stored
    │
    ▼
📸 OCR extraction starts
    │
    ├─ Tesseract.js processes image
    ├─ Text extracted
    └─ Confidence scores calculated
    │
    ▼
🧠 Field detection (Regex + ML)
    │
    ├─ Name extracted: "John Doe" (95% confidence)
    ├─ DOB extracted: "01-01-1990" (87% confidence)
    ├─ Address extracted: "123 St" (72% confidence)
    └─ Gender: "Male" (90% confidence)
    │
    ▼
💾 Results cached in DB
    │
    ├─ form_autofill_cache table
    ├─ Confidence scores stored
    └─ Validation errors noted
    │
    ▼
👁️ User sees preview
    │
    ├─ Can edit each field
    ├─ See confidence scores
    └─ Accept/reject suggestions
    │
    ▼
📝 Auto-fill government form
    │
    ├─ Field mapping applied
    ├─ Data validated
    └─ PDF generated
    │
    ▼
✅ Form ready to submit

```

### 3. Cyber Cafe Mode Flow

```
Operator logs in
    │
    ▼
👥 Customer queue dashboard
    │
    ├─ Queue: 5 waiting
    ├─ Processing: 2 jobs
    └─ Completed: 12 today
    │
    ▼
Customer "Rajesh" arrives
    │
    ├─ Check saved profile (found!)
    ├─ Previous jobs loaded
    └─ Workflows available
    │
    ▼
⏱️ Start timer: Job #1
    │
    ├─ Upload document
    ├─ Select process (compress)
    └─ Timer counting
    │
    ▼
✅ Processing complete
    │
    ├─ Download file
    ├─ Print invoice
    └─ Save to customer profile
    │
    ▼
📊 Analytics updated
    │
    ├─ Time: 5 minutes
    ├─ Cost: ₹50
    └─ Saved to history
    │
    ▼
Next customer
```

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Clicks "Share on WhatsApp"                           │
│          │                                                  │
│          ▼                                                  │
│  WhatsAppShare Component Opens Dialog                      │
│          │                                                  │
│          ├─ Shows document name                            │
│          ├─ Displays features                              │
│          └─ Button: "Generate WhatsApp Link"               │
│          │                                                  │
│          ▼                                                  │
│  useShare Hook - createWhatsAppShare()                     │
│          │                                                  │
│          ├─ API POST /api/v1/premium/shares/whatsapp       │
│          │                                                  │
│          ▼                                                  │
│  Backend Premium Route Handler                             │
│          │                                                  │
│          ├─ Generate secure token                          │
│          ├─ Create share URL                               │
│          ├─ Generate message template                      │
│          └─ Return WhatsApp URL                            │
│          │                                                  │
│          ▼                                                  │
│  Hook stores result in state                               │
│          │                                                  │
│          ├─ Display share link                             │
│          ├─ Show message preview                           │
│          ├─ Show WhatsApp button                           │
│          └─ Show copy-to-clipboard                         │
│          │                                                  │
│          ▼                                                  │
│  User clicks "Open WhatsApp"                               │
│          │                                                  │
│          └─ openWhatsApp(whatsappUrl)                      │
│             │                                               │
│             ▼                                               │
│             window.open(whatsappUrl)                       │
│             │                                               │
│             ▼                                               │
│             WhatsApp app opens with prefilled message      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────┐
│              SECURITY LAYERS                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. NETWORK LAYER                                   │
│     ├─ HTTPS/TLS 1.3                                │
│     ├─ HSTS headers                                 │
│     └─ CORS validation                              │
│                                                      │
│  2. REQUEST LAYER                                   │
│     ├─ Rate limiting (60 req/min per IP)            │
│     ├─ Request size limits (1MB JSON)               │
│     ├─ Timeout enforcement (30s)                    │
│     └─ Input validation (Zod)                       │
│                                                      │
│  3. AUTHENTICATION LAYER                            │
│     ├─ User ID verification                         │
│     ├─ Session management                           │
│     └─ Permission checks                            │
│                                                      │
│  4. ENCRYPTION LAYER                                │
│     ├─ AES-256-GCM for documents                    │
│     ├─ Per-user key derivation                      │
│     ├─ Secure random token generation               │
│     └─ PBKDF2 password hashing (100k iter)          │
│                                                      │
│  5. DATA LAYER                                      │
│     ├─ Never store raw Aadhaar                      │
│     ├─ Always mask sensitive data                   │
│     ├─ File integrity hashing (SHA-256)             │
│     └─ Download IP logging                          │
│                                                      │
│  6. AUDIT LAYER                                     │
│     ├─ Activity logging (all actions)               │
│     ├─ IP tracking                                  │
│     ├─ Download tracking                            │
│     └─ Error logging                                │
│                                                      │
│  7. APPLICATION LAYER                               │
│     ├─ Timing-safe comparisons                      │
│     ├─ Error message sanitization                   │
│     ├─ CORS header validation                       │
│     └─ Privacy mode (no logging)                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Internet                                                  │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────┐                                       │
│  │  Load Balancer  │  (AWS ELB / Nginx)                   │
│  │  (HTTPS)        │                                       │
│  └────────┬────────┘                                       │
│           │                                                │
│      ┌────┴─────────────────────────────────┐             │
│      │                                      │             │
│      ▼                                      ▼             │
│  ┌──────────────┐    ┌──────────────┐  ┌──────────────┐ │
│  │   API Pod 1  │    │   API Pod 2  │  │   API Pod 3  │ │
│  │ (Kubernetes) │    │ (Kubernetes) │  │ (Kubernetes) │ │
│  └──────┬───────┘    └──────┬───────┘  └──────┬───────┘ │
│         │                   │                  │         │
│         └───────────────────┼──────────────────┘         │
│                             │                            │
│                             ▼                            │
│                  ┌──────────────────────┐               │
│                  │  PostgreSQL Cluster  │               │
│                  │  (Primary + Standbys)│               │
│                  │  (Encrypted at rest) │               │
│                  └──────────────────────┘               │
│                             │                            │
│         ┌───────────────────┼───────────────────┐       │
│         │                   │                   │       │
│         ▼                   ▼                   ▼       │
│      ┌─────┐            ┌─────┐            ┌─────┐    │
│      │ S3  │            │ Cache│            │ CDN │    │
│      │(Docs)           │(Redis)            │(Static) │
│      └─────┘            └─────┘            └─────┘    │
│                                                        │
│  Monitoring                                            │
│  ├─ Prometheus metrics                                │
│  ├─ ELK logging                                       │
│  ├─ Sentry errors                                    │
│  └─ CloudWatch alarms                                │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ **Scalability**: Horizontal scaling via Kubernetes
- ✅ **Reliability**: Database replication & failover
- ✅ **Security**: Multi-layer encryption & audit logging
- ✅ **Performance**: Caching, CDN, optimized queries
- ✅ **Monitoring**: Complete observability
