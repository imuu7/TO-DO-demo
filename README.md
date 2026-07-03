# 月曆 To-do 編輯器

面試take-home專案：一個附帶 Canvas 圖片編輯器的月曆事件管理工具。完整規格見 [dev_prompt.md](dev_prompt.md)（權威來源），開發規範見 [CLAUDE.md](CLAUDE.md)。

> 本檔案隨開發階段持續補完，目前完成到**階段 5（加分項 1：拖曳事件變更日期）**。標示「(TODO)」的段落將在後續階段補上。

## 目錄

- [專案總覽](#專案總覽)
- [技術棧](#技術棧)
- [架構圖](#架構圖)
- [資料結構](#資料結構)
- [image_params 設計理念](#image_params-設計理念)
- [前後端資料流](#前後端資料流)
- [啟動說明](#啟動說明)
- [API 文件](#api-文件)
- [完成 / 未完成清單](#完成--未完成清單)
- [設計取捨](#設計取捨)
- [手動測試清單（階段 4：儲存還原驗證）](#手動測試清單階段-4儲存還原驗證)
- [手動測試清單（階段 5：拖曳事件變更日期）](#手動測試清單階段-5拖曳事件變更日期)

## 專案總覽

以月曆檢視管理每日事件（title/description/date/time），每筆事件可附加一張圖片（本機上傳或外部網址擇一），並透過 Canvas 圖片編輯器調整縮放、旋轉、位移、裁切、透明度、亮度、對比。所有圖片編輯參數以「參數」形式儲存於後端，從不儲存烘焙後的圖片，畫面渲染時才即時套用。

## 技術棧

- 前端：React（Vite）＋原生 CSS（無 CSS 框架）＋ Canvas API
- 後端：Python FastAPI
- 資料庫：SQLite（SQLAlchemy）
- 圖片儲存：本機上傳存於 `backend/uploads/`，或直接記錄外部圖片網址

## 架構圖

```
┌────────────────────────┐        HTTP (JSON / multipart)       ┌───────────────────────────┐
│  frontend（Vite React） │ ────────────────────────────────────▶│  backend（FastAPI）        │
│  http://localhost:5173  │◀──────────────────────────────────── │  http://127.0.0.1:8000     │
│                          │                                       │                             │
│  App.jsx                │                                       │  main.py（路由/CORS/靜態）  │
│   ├─ Calendar.jsx        │  GET  /events?month=YYYY-MM           │  crud.py（DB 存取）         │
│   │   └─ DayCell.jsx     │  POST /events                        │  schemas.py（Pydantic 驗證）│
│   ├─ DayModal.jsx        │  PUT  /events/{id}                   │  models.py（SQLAlchemy ORM）│
│   │   └─ EventForm.jsx   │  DELETE /events/{id}                 │                             │
│   │       └─ ImageEditor │  POST /upload                        │  SQLite: events.db         │
│   │           └─ CropBox │  GET  /uploads/{filename}             │  檔案: backend/uploads/     │
│  utils/imageRender.js    │ ◀──── 靜態圖片 ─────────────────────  │                             │
│  （唯一 Canvas 渲染函式，│                                       │                             │
│   縮圖/預覽/編輯器共用） │                                       │                             │
└────────────────────────┘                                       └───────────────────────────┘
```

## 資料結構

單一資料表 `events`：

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | int | PK |
| title | str | 必填 |
| description | str | 可空 |
| date | str | `YYYY-MM-DD`，必填 |
| time | str | `HH:MM`，可空 |
| image_source | str | 可空；本機檔名或外部 URL |
| image_type | enum | `upload` / `url` / `none` |
| image_params | JSON 字串 | 見下方 |

`image_params`：

```json
{
  "scale": 1.0,
  "rotation": 0,
  "offsetX": 0,
  "offsetY": 0,
  "crop": { "x": 0, "y": 0, "width": 1, "height": 1 },
  "opacity": 1.0,
  "brightness": 1.0,
  "contrast": 1.0
}
```

## image_params 設計理念

圖片編輯的核心決策是**只存參數、不存烘焙後的圖片**：資料庫與 API 傳輸的都是「怎麼畫」的說明書，實際畫面永遠由前端 Canvas 在渲染當下依這份說明書重畫一次。這樣做的理由：

- 原圖保持不失真，使用者可以隨時回頭調整任何一個參數，不會因為疊加多次編輯而累積畫質損失
- 縮圖、modal 預覽、表單編輯器預覽三處尺寸不同，但共用同一份參數與同一支渲染函式（`frontend/src/utils/imageRender.js` 的 `drawImageWithParams`），確保「同一組數字在任何地方看起來比例一致」

各欄位的單位定義（見 `imageRender.js` 檔首註解）：

- `crop.x/y/width/height`：相對**原圖**尺寸的比例（0~1），與後端 schema 對齊
- `offsetX/offsetY`：相對**畫布**尺寸的比例（非像素），確保同一組參數在小縮圖與大預覽上偏移的視覺比例一致
- `scale`：以裁切後圖片「置中鋪滿畫布（contain）」為基準的縮放倍率
- `rotation`：角度（度），順時針為正
- `opacity`：0~1
- `brightness/contrast`：對應 CSS filter 倍率（1 = 不變）

## 前後端資料流

1. `App.jsx` 依目前年月呼叫 `GET /events?month=YYYY-MM`，取得整月事件（含 `image_params`，後端已從 JSON 字串還原成物件）
2. `Calendar` / `DayCell` 依日期分組顯示事件標題與縮圖（`CanvasThumbnail` → `loadImage` + `drawImageWithParams`）
3. 點日期格開 `DayModal`，列出當日事件，可新增/編輯/刪除/預覽（lightbox 用同一份渲染函式放大顯示）
4. `EventForm` 新增或編輯事件：圖片上傳先呼叫 `POST /upload` 取得檔名，`ImageEditor` 即時調整 `image_params` 並用同一份渲染函式即時預覽；送出時呼叫 `POST /events` 或 `PUT /events/{id}`，整包 `image_params` 一起存
5. 存檔成功後重新呼叫 `GET /events` 刷新畫面，確保前端狀態永遠以後端資料為準（無本機快取覆蓋風險）

## 啟動說明

### 後端

```bash
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

首次使用需先建立虛擬環境並安裝 `requirements.txt`（見 `backend/requirements.txt`）。啟動後預設監聽 `http://127.0.0.1:8000`，CORS 開放 `http://localhost:5173`。

### 前端

```bash
cd frontend
npm install
npm run dev
```

預設開在 `http://localhost:5173`。

## API 文件

| Method | Path | 說明 |
|---|---|---|
| POST | `/events` | 建立事件，body 為 `EventCreate`（title 必填，date/time 格式驗證，image_type 為 none 時 image_source 會被清空，為 upload/url 時 image_source 必填） |
| GET | `/events?month=YYYY-MM` | 查詢指定月份所有事件 |
| PUT | `/events/{id}` | 整筆覆寫更新，body 為 `EventUpdate`（欄位規則同上） |
| DELETE | `/events/{id}` | 刪除事件 |
| POST | `/upload` | multipart 上傳圖片檔（僅接受 `image/*`），回傳 `{ "filename": "xxx.png" }` |
| GET | `/uploads/{filename}` | 靜態圖片服務 |

錯誤回應皆為 `{ "detail": "訊息" }`，狀態碼包含 400（格式錯誤/非圖片檔）、404（事件不存在）。

## 完成 / 未完成清單

**已完成（核心規格）**

- [x] 後端 FastAPI 專案、資料模型、CRUD API、圖片上傳/靜態服務、CORS
- [x] 前端月曆檢視（年月切換、跳轉指定月、日期格事件、+N 溢出）
- [x] 當日事件 modal（新增/編輯/刪除/預覽）
- [x] 事件表單（title 必填驗證、description/date/time、圖片上傳或外部網址擇一）
- [x] Canvas 圖片編輯器（縮放/旋轉/拖曳裁切框/位移拖曳/透明度/亮度/對比，三處渲染共用同一函式）
- [x] 階段 4：儲存還原完整性驗證（見下方清單與執行紀錄）
- [x] 階段 5（加分項 1）：拖曳事件變更日期

**未完成（stretch goals，尚未開始）**

- [ ] 多圖片事件
- [ ] Docker 部署（Dockerfile + docker-compose.yml）
- [ ] 後端 pytest 單元測試

## 設計取捨

- **裁切互動採拖曳式裁切框**，而非數值 slider：使用者於階段 3 開工前明確選擇此方案，角落縮放採「對角錨點固定」演算法避免 React 重繪造成的 closure 過期問題
- **圖片載入不設定 `crossOrigin`**：本專案只做 `drawImage` 畫面渲染、不讀取像素資料（`getImageData`/`toDataURL`），刻意不設定可避免外部圖片網址因未回應 CORS 標頭而整張載入失敗
- **`offsetX`/`offsetY` 定義為相對畫布比例而非像素**：確保同一組參數在縮圖與大預覽等不同尺寸畫布上，偏移的視覺比例一致
- **`PUT /events/{id}` 採整筆覆寫**而非局部 patch：前端表單本來就會帶出完整欄位，整筆覆寫可避免部分更新時忘記帶欄位導致資料不一致
- **事件拖曳採手刻滑鼠事件（mousedown/mousemove/mouseup）**而非原生 HTML5 Drag and Drop API：與階段 3 裁切框/位移拖曳的實作風格一致，且視覺回饋（來源半透明、目標格高亮/不可放置樣式）完全可控；透過位移門檻（4px）區分「拖曳」與「單純點擊開啟當日 modal」兩種操作
- **拖曳僅支援月曆格子（DayCell）之間**，不支援從當日 modal 內拖出、也不支援跨月放置：範圍與規格外的細節（如 modal 內拖曳、跨月自動換頁）留待未來需要時再擴充，避免一次做過多未經驗證的互動

## 手動測試清單（階段 4：儲存還原驗證）

目標：驗證「重新整理頁面後，所有事件、圖片、編輯參數需完整還原」這個核心正確性標準，涵蓋多事件、多圖片來源、各項 image_params 邊界值、多次編輯、刪除、以及三處渲染（月曆縮圖／modal 預覽／表單編輯器預覽）的一致性。

執行前準備：先啟動 backend（port 8000）與 frontend（port 5173），瀏覽器開 `http://localhost:5173`。

### A. 多事件 × 多圖片來源混合還原

- [x] 在同一天建立 3 筆事件：①無圖片 ②上傳本機圖片 ③外部圖片網址
- [x] 重新整理頁面（F5），開啟該日 modal
  - [x] 3 筆事件標題、描述、時間皆正確顯示
  - [x] 無圖片事件不顯示縮圖區塊（顯示空佔位，不是 canvas）
  - [x] 上傳圖片事件縮圖正確載入（走 `/uploads/{filename}`）
  - [x] 外部網址事件縮圖正確載入（直接使用原網址）

### B. 各 image_params 欄位非預設值還原（含邊界值）

對同一張測試圖片，分別設定以下參數組合並儲存，然後**重新整理頁面**、重新打開編輯表單，確認欄位數值與畫面皆與儲存前一致：

- [x] `scale`：設為明顯放大（如 2.0）與縮小（如 0.5）
- [x] `rotation`：設為負值（如 -45）與超過 180 的值（如 270），確認還原後角度與旋轉方向一致 —— **發現一個邊界案例，見下方「執行紀錄」**
- [x] `offsetX` / `offsetY`：拖曳到明顯偏移一角
- [x] `crop`：設為非常小的裁切區域（如 width/height 僅 0.1），確認還原後裁切框位置與大小正確
- [x] `opacity`：設為 0（完全透明）與 0.5，確認還原後透明度一致（0 時圖片應完全不可見但不報錯）
- [x] `brightness` / `contrast`：分別設為明顯偏離 1.0 的高值與低值（如 0.3 與 2.0）

### C. 新增 → 多次編輯 → 刷新 → 再編輯，確認不互相覆蓋

- [x] 新增一筆事件（含圖片），記錄初始 image_params
- [x] 編輯一次：只調整 `rotation`，儲存
- [x] 不刷新頁面，馬上再編輯一次：只調整 `brightness`，儲存
- [x] 刷新頁面，重新打開編輯表單，確認 `rotation` 與 `brightness` 的修改**都**保留，且未被彼此覆蓋，其餘欄位維持前次的值
- [x] 直接呼叫 `GET /events?month=YYYY-MM` API，核對回傳的 `image_params` JSON 與畫面顯示一致

### D. 刪除後刷新，確認不殘留

- [x] 刪除一筆事件
- [x] 刷新頁面，確認該事件不再出現在月曆與 modal 中
- [x] 呼叫 `GET /events?month=YYYY-MM`，確認回傳列表中沒有該筆事件

### E. 三處渲染一致性（同一組刷新後資料）

針對同一筆事件（帶有非預設 image_params），在**同一次刷新之後**依序檢查：

- [x] 月曆縮圖（DayCell）呈現效果
- [x] Modal 內列表縮圖與點擊後的預覽 lightbox 呈現效果
- [x] 開啟編輯表單，ImageEditor 即時預覽呈現效果

三處應呈現**完全相同**的裁切範圍、旋轉角度、位移位置、透明度、亮度對比效果（僅解析度/畫布大小不同）。

### 執行紀錄

以下由 AI 實際啟動 backend（8000）與 frontend（5173），透過 Playwright 自動化瀏覽器操作驗證，非型別檢查或程式碼推論。共設計 21 項檢查點，涵蓋 A~E 全部情境，**全數通過**。詳細方法：

- 以一張四象限（紅/藍/綠/黃）＋中心黑點的測試圖驗證裁切/旋轉/位移，方便用顏色分佈肉眼與程式判斷正確性
- Test A：同一天建立無圖片／上傳圖片／外部網址（`https://www.w3.org/Icons/w3c_home.png`）三筆事件，刷新後於 modal 內逐一確認
- Test B：建立 9 筆分別測試單一欄位邊界值的事件，刷新後開啟編輯表單，讀取滑桿/文字顯示數值，並對裁切、位移、透明度、亮度對比額外用「截圖後於 Node 端解析像素」的方式佐證實際渲染效果（畫面預覽圖片跨來源，`getImageData` 依設計會拋出 SecurityError，故改用瀏覽器截圖比對，不影響驗證有效性）
- Test C：同一事件連續編輯兩次（先改 rotation、不刷新再改 brightness），刷新後確認兩次修改都保留且互不覆蓋，並直接呼叫 API 核對 DB 內容
- Test D：刪除事件後確認 modal 與月曆皆不殘留，API 查詢也確認不存在
- Test E：對同一筆 `rotation: 90` 的事件，比對月曆縮圖／modal 列表縮圖／lightbox 預覽／表單編輯器即時預覽四處的四角顏色分佈，結果完全一致：`["yellow","red","blue","green"]`
- 全程監控瀏覽器 console，錯誤數為 0
- 驗證完成後已清除所有測試事件（API 確認 DB 已無殘留）與測試上傳圖檔

**測試中發現的邊界案例（非本次修復範圍，先記錄）**：當 `rotation` 還原值超出 ImageEditor 滑桿可視範圍（-180° ~ 180°，例如資料中存的是 270°）時，滑桿本身的 DOM 顯示會被瀏覽器 native 行為鉗制在 180°，但滑桿上方的文字標籤（依 `Math.round(params.rotation)` 顯示）與實際存進 `image_params` 的數值都正確顯示/保留 270、不會遺失或寫錯。也就是說**數值本身不會出錯，只有滑桿手把的視覺位置在超出範圍時會顯示錯位**。這個情境在目前的 UI 操作流程下不會自然發生（使用者透過滑桿或 90° 按鈕調整時，程式都會把角度正規化到 -180°~180° 之間），只有当資料是由 API 直接寫入超出範圍的值時才會出現。是否需要處理（例如同步限制 API 端驗證範圍，或讓滑桿改用可以顯示超出範圍角度的呈現方式）留待使用者確認後再決定。

## 手動測試清單（階段 5：拖曳事件變更日期）

目標：驗證在月曆格子（DayCell）之間用滑鼠拖曳事件卡片，能正確變更該事件的日期並持久化；跨月等不支援的放置目標應被拒絕、且不影響原有點擊開啟當日 modal 的操作。

- [x] 同月內把事件從來源日期格拖曳到另一個日期格，放開後畫面立即反映新日期
- [x] 拖曳過程中，來源事件卡片顯示半透明、滑鼠懸停的合法目標格顯示高亮樣式
- [x] 放開滑鼠後直接呼叫 `PUT /events/{id}` 儲存（不彈確認對話框），後端資料庫日期同步變更
- [x] 重新整理頁面後，事件仍顯示在拖曳後的新日期（持久化）
- [x] 把事件拖到「非本月」的日期格（月曆補齊的上/下月格子）時，顯示不可放置樣式，放開後日期**不會**被變更（不支援跨月拖曳）
- [x] 拖曳結束後，緊接著的單純點擊（不拖曳、只是點一下事件卡片）仍能正常開啟當日事件 modal，不會被拖曳邏輯誤判

### 執行紀錄

以 Playwright 實際啟動 backend（8000）與 frontend（5173）、驅動真實瀏覽器滑鼠事件（`mouse.move` / `mouse.down` / `mouse.up` 分段移動，非直接呼叫元件內部函式）驗證，共 10 項檢查，**全數通過**，console 錯誤數為 0：

- 建立一筆測試事件（2026-07-10），用滑鼠拖曳到 2026-07-15，確認拖曳中樣式回饋、放開後前端畫面與後端資料庫日期都正確更新
- 重新整理頁面後確認事件仍在新日期（驗證持久化）
- 將同一事件拖到月曆上補齊的非本月格子，確認顯示不可放置樣式，且放開後資料庫日期未被變更（放置被正確拒絕）
- 拖曳測試結束後，對事件卡片做單純點擊，確認仍會開啟當日 modal（未被拖曳邏輯誤判為拖曳）
- 驗證完成後已清除測試事件（API 確認 DB 已無殘留），並關閉 dev server

詳細協作紀錄見 [AI_COLLABORATION.md](AI_COLLABORATION.md)。
