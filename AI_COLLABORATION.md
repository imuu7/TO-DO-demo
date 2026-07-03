# AI 協作紀錄

依開發階段記錄與 AI（Claude Code）的協作過程。

| Prompt | AI 回覆摘要 | 採用/修改 | 修改原因 | 驗證方式 |
|---|---|---|---|---|
| 執行階段 1 | 依 `dev_prompt.md` 階段 1 規格，建立 `backend/` FastAPI 專案：`app/database.py`（SQLAlchemy engine/session）、`app/models.py`（`Event` ORM，含 `ImageType` enum）、`app/schemas.py`（Pydantic `EventCreate`/`EventUpdate`/`EventOut`/`ImageParams`，含 date/time 格式驗證與 image_type/image_source 一致性檢查）、`app/crud.py`（CRUD 函式）、`app/main.py`（6 支 API：`POST/GET /events`、`PUT/DELETE /events/{id}`、`POST /upload`、靜態掛載 `/uploads`，並設定 CORS 開放 `localhost:5173`）。 | 採用 | 完全對應 CLAUDE.md 的資料模型與 API 規格；額外加上 image_type 為 none 時清空 image_source 的一致性驗證，避免髒資料 | 建立 Python 3.11 虛擬環境並安裝 `requirements.txt`，啟動 `uvicorn` 後以 Python `urllib` 腳本與 `curl` 逐一測試：建立事件（含中文標題、image_params 巢狀物件）、依月份查詢、更新、刪除、刪除後查詢確認排除、上傳圖片（含拒絕非圖片檔案）、靜態圖片服務（200/404）。所有情境回應狀態碼與內容皆符合預期，測試後已清除暫存的 `events.db` 與上傳檔案 |
