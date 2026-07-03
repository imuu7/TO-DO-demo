# 角色
你是資深全端工程師。請依以下規格，在本次對話中完整實作「月曆 To-do 編輯器」面試專案。這是 3 天內可完成的面試實作題，重點是可用性、合理架構、可維護性，不追求商業完整度。

# 技術選型（已決定，不要更改）
- 前端：React (Vite) + 原生 CSS，圖片編輯用 Canvas
- 後端：Python FastAPI
- 資料庫：SQLite（SQLAlchemy）
- 圖片儲存：本機上傳存 `backend/uploads/`，或直接記錄外部 URL
- 啟動：前後端分離，提供 `README.md` 啟動指令；加分項做 Dockerfile + docker-compose

# 開發順序（依此分階段輸出，每階段給完整可執行程式碼）

## 階段 1：後端 API + 資料模型
資料表 `events`：
- id (int, pk)
- title (str, 必填)
- description (str, 可空)
- date (str, YYYY-MM-DD, 必填)
- time (str, HH:MM, 可空)
- image_source (str, 可空；本機檔名或外部 URL)
- image_type (enum: upload / url / none)
- image_params (JSON 字串)

`image_params` 結構：
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

API：
- `POST /events`：建立事件
- `GET /events?month=YYYY-MM`：查詢當月事件
- `PUT /events/{id}`：更新
- `DELETE /events/{id}`：刪除
- `POST /upload`：圖片上傳，回傳檔名
- `GET /uploads/{filename}`：靜態圖片服務
- CORS 開放給前端 dev server

## 階段 2：前端月曆
- 月曆 grid：顯示年月、星期列、可切換上/下月、可跳指定年月
- 日期格顯示當日事件（標題 + 圖片縮圖），事件多時顯示 "+N"
- 點日期格 → 開啟當日事件列表 modal
- modal 內可：新增事件、編輯、刪除、預覽圖片

## 階段 3：事件表單 + 圖片編輯器
事件表單欄位：標題（必填驗證）、描述、日期、時間、圖片（上傳或 URL 二選一）
圖片編輯器（Canvas 實作）：
- 縮放（slider）
- 旋轉（slider 或 90° 按鈕 + 微調）
- 拖曳調整位置
- 裁切/顯示區域控制
- 透明度（slider）
- 亮度 + 對比（slider）
- 即時預覽，儲存時只存參數（非烘焙後圖片），前端渲染時依參數還原
- 縮圖與預覽都必須套用編輯參數

## 階段 4：儲存還原驗證
- 重新整理頁面後，所有事件、圖片、編輯參數需完整還原
- 提供一段手動測試清單（checklist）

## 階段 5：文件
1. `README.md`：專案說明、架構圖（文字版）、資料結構、圖片參數設計、前後端資料流程、啟動方式、API 說明、已完成/未完成、設計取捨
2. `AI_COLLABORATION.md`：留空模板，包含欄位：Prompt、AI 回覆摘要、採用/修改、修改原因、驗證方式（我會自己填入本次對話紀錄）

# 加分項（時間允許才做，依序）
1. 事件拖曳換日期
2. 多圖片事件
3. Docker 部署
4. 後端 pytest 單元測試（CRUD）

# 輸出要求
- 每個檔案完整輸出，標明路徑
- 程式碼加必要註解（繁體中文）
- 每階段結束時說明如何驗證該階段功能
- 若程式碼過長，分多則訊息，但單一檔案不可截斷
