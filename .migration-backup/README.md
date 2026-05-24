# File Master - Secure Multi-Tool File Processing Platform

File Master is a production-ready, secure, and extensible web application designed to Merge, Compress, Enhance, Edit, and Convert files. It features direct magic-byte content validation, background processing queues using Redis and Celery, and a modern light/dark-themed React frontend built with Next.js 14, Zustand, and Framer Motion.

---

## 📦 Directory Tree

```text
File Master/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_processors.py
│   └── app/
│       ├── __init__.py
│       ├── main.py                # FastAPI endpoints & CORS/Rate limits
│       ├── config.py              # Environment variables & temp directories
│       ├── celery_app.py          # Celery configuration
│       ├── tasks.py               # Asynchronous Celery tasks
│       ├── schemas.py             # Pydantic validation schemas
│       ├── processors/
│       │   ├── __init__.py
│       │   ├── base.py            # BaseProcessor interface
│       │   ├── pdf.py             # PDF merging & compression
│       │   ├── image.py           # Image quality compression, enhancement, conversion
│       │   ├── docx_pdf.py        # Office conversion & styling cleanup
│       │   └── video.py           # Video trimming and bitrate compression
│       └── utils/
│           ├── __init__.py
│           ├── mime.py            # Zero-dependency magic byte MIME detector
│           ├── preview.py         # Image thumbnail generator fallback
│           └── storage.py         # Temporary file tracker & TTL/Grace period manager
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── tests/
    │   └── e2e.spec.ts            # Playwright E2E testing
    └── src/
        ├── app/
        │   ├── layout.tsx         # Next.js root layout with Inter/Outfit typography
        │   ├── globals.css        # Stylesheet, themes, & glassmorphism variables
        │   └── page.tsx           # Home Workspace dashboard & wizard steps
        ├── components/
        │   └── workspace/
        │       ├── UploadZone.tsx # Drag & Drop input with client-side checks
        │       ├── ToolGrid.tsx   # Searchable, categorized operation buttons
        │       ├── OptionsPanel.tsx# Dynamic operation controls & sliders
        │       ├── PreviewCanvas.tsx# Uploaded files list & reordering helper
        │       ├── ProgressTracker.tsx# Animated progress bars & process logs
        │       └── DownloadHub.tsx# Download trigger & expiration countdown clocks
        ├── store/
        │   └── useFileStore.ts    # Zustand file-queue & processing store
        └── lib/
            └── api.ts             # API Client & standalone mock simulator
```

---

## 🔧 Setup & Installation

### Option 1: Quick Start with Docker Compose (Recommended)
This profile spins up Next.js, FastAPI, Redis, and a Celery worker equipped with LibreOffice and FFmpeg.

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.
2. In the project root, duplicate the environment file:
   ```bash
   copy .env.example .env
   ```
3. Boot the environment stack:
   ```bash
   docker-compose up --build
   ```
4. Access the web interface at [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000](http://localhost:8000).

---

### Option 2: Local Development (Separate Terminals)

#### Backend Setup
1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/Scripts/activate  # On Linux: source venv/bin/activate
   ```
2. Install Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. *(Optional)* Start Redis on your machine (default port 6379), and run the Celery worker in another terminal:
   ```bash
   celery -A app.celery_app.celery_app worker --loglevel=info --beat
   ```

#### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your web browser.

> [!TIP]
> If you run the frontend alone, enable **Standalone Mode** in the header. This uses the internal simulated mock service so you can iterate on design aesthetics and workflows without starting Redis/FFmpeg.

---

## 🧩 Extensibility Guide: Adding Formats

Adding a new file processor (e.g. CAD drawing exporter or 3D STL analyzer) is straightforward. We use a plugin architecture via a standardized `BaseProcessor` interface.

### Step 1: Create the Processor Class
Create a new file in `backend/app/processors/cad.py`:

```python
import os
from app.processors.base import BaseProcessor
from app.config import settings

class CADProcessor(BaseProcessor):
    def validate_options(self, options: dict) -> None:
        operation = options.get("operation")
        if operation not in ["export_pdf", "render_png"]:
            raise ValueError("Unsupported CAD operation.")

    def process(self, file_paths: list[str], options: dict, progress_callback=None) -> str:
        self.validate_options(options)
        
        # 1. Update progress
        if progress_callback:
            progress_callback(30.0)
            
        input_file = file_paths[0]
        output_path = settings.output_dir / f"cad_render_{os.path.basename(input_file)}.png"
        
        # 2. Invoke CAD processing library (e.g. ezdxf)
        # ezdxf_render_to_file(input_file, output_path)
        
        if progress_callback:
            progress_callback(100.0)
            
        return str(output_path)
```

### Step 2: Register in MIME Map & Routing Resolver
1. In `backend/app/utils/mime.py`, add the MIME signatures:
   ```python
   MIME_MAP = {
       # ...
       "dxf": "image/vnd.dxf",
       "dwg": "image/vnd.dwg",
   }
   ```
2. In `backend/app/tasks.py`, register the class inside `get_processor_for_file`:
   ```python
   elif mime in ["image/vnd.dxf", "image/vnd.dwg"] or ext in [".dxf", ".dwg"]:
       from app.processors.cad import CADProcessor
       return CADProcessor()
   ```

### Step 3: Add to Frontend Options & ToolGrid
1. Register the tool in `frontend/src/components/workspace/ToolGrid.tsx` inside `TOOLS` array.
2. Handle user input control options in `frontend/src/components/workspace/OptionsPanel.tsx` inside `renderOptions()`.

---

## 🚀 Deployment Guide

### Backend: Render or Railway
FastAPI requires persistent Redis to manage tasks.
1. Create a **Redis database** on Railway/Render and copy the connection URI string.
2. Deploy the backend using the Dockerfile under `backend/`.
3. Configure these environment variables:
   - `REDIS_URL`: Link to your Redis instance.
   - `ALLOWED_ORIGINS`: Set to your Vercel deployment URL (e.g., `https://my-filemaster-frontend.vercel.app`).
   - `DEBUG`: `False`.
4. Spin up a separate worker process executing:
   `celery -A app.celery_app.celery_app worker --loglevel=info`

### Frontend: Vercel
Deploy the `frontend/` directory to Vercel:
1. Import the repository, select `frontend` as root directory.
2. In Environment Variables, add:
   - `NEXT_PUBLIC_BACKEND_URL`: URL of your deployed backend service (e.g. `https://filemaster-backend.up.railway.app`).
3. Deploy! Next.js automatic app routing compiles static routes instantly.

---

## 🧪 Testing

### Backend Unit Tests
We use `pytest` for validating file processing and validation:
```bash
cd backend
pytest -v
```

### Frontend E2E UI Tests
We use Playwright to simulate user journeys, dropzones, and step transitions:
1. Ensure Next.js is running at `http://localhost:3000`.
2. Run Playwright:
   ```bash
   cd frontend
   npx playwright test
   ```
