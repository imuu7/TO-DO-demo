# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository currently contains only [dev_prompt.md](dev_prompt.md) — no application code exists yet. That file is the full specification (in Traditional Chinese) for a take-home interview project: a "Calendar To-do Editor" (月曆 To-do 編輯器) with a canvas-based image editor. Treat `dev_prompt.md` as the authoritative spec; if it conflicts with anything below, the spec wins.

Once implementation begins, this section and the commands below should be updated to reflect the real project layout (expected: `frontend/` for the Vite React app, `backend/` for the FastAPI app).

## Tech stack (fixed — do not change per spec)

- **Frontend**: React (Vite), plain CSS (no CSS framework), Canvas API for image editing
- **Backend**: Python FastAPI
- **Database**: SQLite via SQLAlchemy
- **Image storage**: local files under `backend/uploads/`, or an external URL recorded in the DB instead of an upload
- Frontend and backend are separate processes/servers (no monorepo tooling like Turborepo assumed)

## Expected commands (once scaffolded)

No package.json / requirements.txt exist yet. When scaffolding:
- Backend: FastAPI app run via `uvicorn`, dependencies managed via `requirements.txt` or `pyproject.toml`
- Frontend: standard Vite React app (`npm install`, `npm run dev`, `npm run build`)
- A top-level `README.md` must document exact startup commands for both — this is a required deliverable, not optional documentation
- Optional (stretch goal, do only after core features work): `Dockerfile` + `docker-compose.yml` for combined deployment
- Optional (stretch goal): backend `pytest` unit tests for CRUD endpoints

## Data model

Single table `events`:

| field | type | notes |
|---|---|---|
| id | int | PK |
| title | str | required |
| description | str | nullable |
| date | str | `YYYY-MM-DD`, required |
| time | str | `HH:MM`, nullable |
| image_source | str | nullable; local filename or external URL |
| image_type | enum | `upload` / `url` / `none` |
| image_params | JSON string | see below |

`image_params` shape (stored as JSON, never as a pre-baked/rendered image):
```json
{
  "scale": 1.0,
  "rotation": 0,
  "offsetX": 0,
  "offsetY": 0,
  "crop": {"x": 0, "y": 0, "width": 1, "height": 1},
  "opacity": 1.0,
  "brightness": 1.0,
  "contrast": 1.0
}
```

**Key architectural decision**: image edits (scale/rotation/crop/opacity/brightness/contrast) are stored as parameters, not as a flattened/baked image. Every place that renders an event image — calendar thumbnail, modal preview, form editor preview — must apply `image_params` via Canvas at render time. This must stay consistent across all three render sites.

## API surface

- `POST /events` — create
- `GET /events?month=YYYY-MM` — list events for a given month
- `PUT /events/{id}` — update
- `DELETE /events/{id}` — delete
- `POST /upload` — upload image, returns filename
- `GET /uploads/{filename}` — static image serving
- CORS must be open to the frontend dev server origin

## Frontend structure (per spec)

- Month calendar grid: shows year/month header, weekday row, prev/next month navigation, jump-to-specific-month
- Each date cell shows that day's events (title + image thumbnail), with a "+N" overflow indicator when there are more events than fit
- Clicking a date cell opens a modal listing that day's events, with create/edit/delete/preview actions inline
- Event form fields: title (required, validated), description, date, time, image (upload XOR external URL — mutually exclusive, not both)
- Canvas-based image editor exposes: zoom slider, rotation (slider or 90° step buttons + fine adjustment), drag-to-reposition, crop/visible-area control, opacity slider, brightness + contrast sliders, live preview

## Verification requirement

After a page refresh, all events, images, and edit parameters must fully restore from the backend — this round-trip (save → reload → identical render) is the core correctness bar for the project, called out explicitly in the spec as its own phase. When implementing, provide a manual test checklist for this.

## Required documentation deliverables

- `README.md`: project overview, text-based architecture diagram, data structures, image-params design rationale, frontend/backend data flow, startup instructions, API docs, done/not-done list, design tradeoffs
- `AI_COLLABORATION.md`: log entries as work happens, with columns: Prompt、AI 回覆摘要、採用/修改、修改原因、驗證方式 (see AI 協作紀錄 below — this supersedes the original spec's "leave it blank" note)

## 溝通語言

使用繁體中文與使用者溝通，包含所有說明、回覆與程式碼註解。

## 遇到不確定時

遇到不確定的地方不要猜，直接詢問使用者，不要自行假設後繼續實作。

## AI 協作紀錄

將協作記錄寫入 `AI_COLLABORATION.md`，每筆記錄包含欄位：Prompt、AI 回覆摘要、採用/修改、修改原因、驗證方式。

## Stretch goals (only after core spec is done, in this order)

1. Drag-and-drop an event to change its date
2. Multi-image events
3. Docker deployment
4. Backend pytest unit tests for CRUD

## Output conventions from the spec (apply when generating code for this project)

- Output each file in full with its path clearly labeled; never truncate a single file
- Code comments should be in Traditional Chinese
- Explain how to verify each phase's functionality after delivering it
