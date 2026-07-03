# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Core spec is implemented, plus stretch goal 1 (drag-and-drop to change event date) and stretch goal 3 (Docker deployment). See [README.md](README.md) for up-to-date phase status, full API docs, the architecture diagram, and manual test checklists — treat it as the living source of truth for "what's done." [dev_prompt.md](dev_prompt.md) remains the authoritative original spec (Traditional Chinese) if anything is ambiguous.

## Tech stack (fixed — do not change per spec)

- **Frontend**: React 19 (Vite), plain CSS (no CSS framework), Canvas API for image editing
- **Backend**: Python FastAPI + SQLAlchemy, SQLite (`backend/events.db`)
- **Image storage**: local files under `backend/uploads/`, or an external URL recorded in the DB instead of an upload
- Frontend and backend are separate processes/servers (no monorepo tooling)

## Commands

Backend (from `backend/`):
```bash
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```
Serves on `http://127.0.0.1:8000`. Deps in `backend/requirements.txt`, installed into `backend/.venv`. No test suite exists yet (pytest CRUD tests are an unstarted stretch goal).

Frontend (from `frontend/`):
```bash
npm install
npm run dev      # Vite dev server, http://localhost:5173
npm run build
npm run lint      # oxlint
npm run preview
```

Both servers must run simultaneously; backend CORS is locked to `localhost:5173` / `127.0.0.1:5173`.

Docker (production deployment, works from any OS with Docker Desktop / Docker Engine — Windows, macOS, or Linux), run from repo root:
```bash
docker compose up --build -d
```
Serves the frontend (nginx, static build + reverse proxy) on `http://localhost:8090`; backend is not exposed on the host, only reachable inside the compose network as `http://backend:8000`. `docker compose down -v` wipes the SQLite DB and uploaded images (named volumes) — plain `down` keeps them. See [README.md](README.md#docker-部署生產模式) for details.

## Architecture

Two independent processes, no monorepo tooling — frontend talks to backend purely over HTTP (JSON + multipart). Full diagram in [README.md](README.md#架構圖).

**Backend** (`backend/app/`): `main.py` (routes, CORS, static `/uploads` mount) → `crud.py` (DB access) → `models.py` (SQLAlchemy `Event` ORM), with request/response validation in `schemas.py` (Pydantic). Single `events` table; `image_params` is stored as a JSON *string* column and converted to/from a dict at the schema boundary (`parse_image_params` validator in `schemas.py` on read, `_to_orm_kwargs` in `crud.py` on write). `PUT /events/{id}` is a full overwrite, not a partial patch — the frontend always sends the complete event shape.

**Frontend** (`frontend/src/`): `App.jsx` owns month/event state and fetches via `api.js`. `Calendar.jsx` → `DayCell.jsx` render the grid, using `utils/dateUtils.js` to build the calendar cell matrix and resolve today's date. `DayModal.jsx` → `EventForm.jsx` → `ImageEditor.jsx` → `CropBoxEditor.jsx` handle the per-day event list and the image editor. `CanvasThumbnail.jsx` renders thumbnails.

**Key architectural decision (do not violate)**: image edits (scale/rotation/offset/crop/opacity/brightness/contrast) are never baked into a saved image — they're stored as `image_params` and re-rendered live at every render site via the single shared function `drawImageWithParams` in `frontend/src/utils/imageRender.js`. All three render sites (calendar thumbnail, modal/lightbox preview, form editor live preview) go through this one function so a given parameter set looks visually identical everywhere. If a fourth render site is ever added, it must use `drawImageWithParams` too — never write a parallel canvas-drawing implementation.

Unit conventions inside `image_params` (documented at the top of `imageRender.js` and mirrored in `schemas.py`/README): `crop.*` is a ratio (0–1) of the *original image*; `offsetX/offsetY` is a ratio of the *canvas* size (not pixels), so the same params look proportionally identical on a small thumbnail and a large preview; `scale` is relative to the cropped image "contain-fit centered" in the canvas; `rotation` is degrees, clockwise positive; `brightness`/`contrast` map to CSS filter multipliers (1 = unchanged).

Known non-blocking edge case (see README "設計取捨"): `rotation` values outside ±180° (only reachable via direct API writes, not through the UI) display correctly in the numeric label but the range slider's handle position visually clamps — data integrity is unaffected.

## Data model

Single table `events` — id, title (required), description (nullable), date (`YYYY-MM-DD`, required), time (`HH:MM`, nullable), image_source (nullable), image_type (`upload`/`url`/`none`), image_params (JSON string). Full field docs and the `image_params` JSON shape are in [README.md](README.md#資料結構).

## API surface

- `POST /events` / `GET /events?month=YYYY-MM` / `PUT /events/{id}` / `DELETE /events/{id}`
- `POST /upload` (multipart, image/* only) → `{filename}`; `GET /uploads/{filename}` static serving
- Errors are `{"detail": "..."}` with 400 (validation/non-image) or 404 (not found)

## Verification requirement

After a page refresh, all events, images, and edit parameters must fully restore from the backend — this round-trip (save → reload → identical render) is the core correctness bar for this project. When adding features that touch persistence or rendering, re-verify this and extend the manual checklists in README rather than replacing them.

There is no automated frontend/backend test suite (see stretch goal 4). Every phase so far has been verified by actually driving a real browser with Playwright (installed ad hoc into a scratch directory, not a repo dependency) against the running dev servers or Docker containers — clicking through the UI, taking screenshots, and cross-checking against direct API calls — rather than relying on type-checking or code review alone. Follow this same pattern for new work, and record what was actually exercised (not just "looks correct") in the AI_COLLABORATION.md entry.

## Remaining stretch goals (in required order)

1. ~~Drag-and-drop an event to change its date~~ (done)
2. Multi-image events
3. ~~Docker deployment (Dockerfile + docker-compose.yml)~~ (done)
4. Backend pytest unit tests for CRUD

## 溝通語言

使用繁體中文與使用者溝通，包含所有說明、回覆與程式碼註解。

## 遇到不確定時

遇到不確定的地方不要猜，直接詢問使用者，不要自行假設後繼續實作。

## AI 協作紀錄

將協作記錄寫入 `AI_COLLABORATION.md`，每筆記錄包含欄位：Prompt、AI 回覆摘要、採用/修改、修改原因、驗證方式。

## GIT 規範

使用 Conventional Commits，每個 commit 只對「做了什麼」簡短說明而非描述「怎麼做」，內容用繁體中文。

## Output conventions from the spec (apply when generating code for this project)

- Output each file in full with its path clearly labeled; never truncate a single file
- Code comments should be in Traditional Chinese
- Explain how to verify each phase's functionality after delivering it
