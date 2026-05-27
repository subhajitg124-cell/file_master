# File Master

All-in-one secure file manipulation platform for PDFs, images, office documents, and video.

## Run & Operate

- `pnpm --filter @workspace/file-master run dev` — run the frontend dev server (port 21533)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, Framer Motion, Zustand
- File processing: pdf-lib (client-side PDF merge/compress), react-dropzone, comlink (Web Workers)
- Backend (optional): FastAPI at `VITE_BACKEND_URL` — app works standalone without it

## Where things live

- `artifacts/file-master/` — React + Vite frontend (previewPath `/`)
- `artifacts/file-master/src/store/useFileStore.ts` — Zustand store (all app state)
- `artifacts/file-master/src/lib/api.ts` — API client + mock fallback
- `artifacts/file-master/src/lib/file-detection.ts` — magic-byte file type detection
- `artifacts/file-master/src/lib/processing/pdf/` — client-side PDF Web Worker
- `artifacts/file-master/src/components/workspace/` — all workspace UI components
- `artifacts/file-master/src/pages/Home.tsx` — main page / routing logic
- `.migration-backup/` — original Next.js source (reference only)

## Architecture decisions

- Standalone mock mode activates automatically when FastAPI backend is unreachable — no user action required
- PDF merge/compress runs entirely client-side via Web Workers (pdf-lib + comlink) to avoid backend dependency
- Magic-byte file header inspection determines file type before upload, driving smart workspace routing
- `NEXT_PUBLIC_BACKEND_URL` → `VITE_BACKEND_URL` env var migration; all `next/image` → `<img>` tags
- Dark mode applied via `.dark` class on `<html>` element; toggled in-app without next-themes

## Product

- **PDF Suite**: Merge multiple PDFs or compress to smaller size
- **Image Lab**: Compress, enhance (brightness/contrast/sharpness/denoise), and convert format
- **Office Suite**: Convert DOCX/PPTX to PDF, XLSX to CSV, Markdown to HTML, clean Word layouts
- **Video Studio**: Trim MP4 clips with timeline markers, compress with H264 CRF tuning

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Vite dev server must bind to `0.0.0.0` and respect `PORT` env var (already configured in `vite.config.ts`)
- `comlink` Web Workers require Vite's built-in worker support — no extra config needed for Vite v7
- Backend health check runs on mount and every 30s; if unhealthy, `isMockMode` is set to `true` automatically

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
