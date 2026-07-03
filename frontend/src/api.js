// 封裝與後端 FastAPI 的所有 HTTP 溝通。
// 後端固定跑在 http://127.0.0.1:8000（見 backend/README 啟動說明）。
const BASE_URL = "http://127.0.0.1:8000";

/**
 * 統一處理 fetch 回應：非 2xx 時嘗試取出後端的 detail 訊息並拋出錯誤。
 */
async function handleResponse(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // 回應不是 JSON，維持預設訊息
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** 查詢指定月份（YYYY-MM）的所有事件。 */
export function fetchEventsByMonth(month) {
  return fetch(`${BASE_URL}/events?month=${encodeURIComponent(month)}`).then(handleResponse);
}

/** 建立新事件，payload 需符合後端 EventCreate schema。 */
export function createEvent(payload) {
  return fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handleResponse);
}

/** 更新事件（整筆覆寫），payload 需符合後端 EventUpdate schema。 */
export function updateEvent(id, payload) {
  return fetch(`${BASE_URL}/events/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handleResponse);
}

/** 刪除事件。 */
export function deleteEvent(id) {
  return fetch(`${BASE_URL}/events/${id}`, { method: "DELETE" }).then(handleResponse);
}

/** 上傳圖片檔案，回傳 { filename } 供 image_source 使用。 */
export function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  }).then(handleResponse);
}

/**
 * 依事件的 image_type 組出可實際載入的圖片網址。
 * upload -> 組合後端靜態檔路徑；url -> 直接使用外部網址；none -> null（無圖片）。
 */
export function resolveImageUrl(event) {
  if (!event || event.image_type === "none" || !event.image_source) return null;
  if (event.image_type === "upload") {
    return `${BASE_URL}/uploads/${event.image_source}`;
  }
  return event.image_source;
}
