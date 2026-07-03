// 共用的圖片參數 Canvas 渲染邏輯。
//
// 【重要架構決策】image_params 只是「編輯參數」，資料庫與前端都不會儲存烘焙後的圖片。
// 月曆縮圖、事件列表預覽、表單預覽三處，全部必須呼叫這個函式來渲染，
// 確保同一組參數在任何地方看起來都一致（見 CLAUDE.md「Key architectural decision」）。
//
// 單位說明（本階段圖片編輯 UI 尚未實作，此為渲染邏輯的內部設計決策，
// 待階段 3 打造編輯器時仍會沿用，若需調整會另外跟使用者確認）：
// - crop.x / crop.y / crop.width / crop.height：相對原圖尺寸的比例（0~1），與後端 schema 一致
// - offsetX / offsetY：相對「畫布尺寸」的比例（例如 0.1 代表往右/下偏移畫布寬/高的 10%），
//   如此一來同一組參數不論畫在小縮圖或大預覽上，偏移的視覺比例才會一致
// - scale：以裁切後圖片「置中鋪滿畫布」為基準的縮放倍率
// - rotation：角度（度），順時針為正
// - opacity：0~1
// - brightness / contrast：對應 CSS filter 的倍率（1 = 不變）

const DEFAULT_PARAMS = {
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  opacity: 1,
  brightness: 1,
  contrast: 1,
};

/**
 * 將已載入完成的 image（HTMLImageElement）依 params 畫到 canvas 上。
 * canvas 的 width/height 需在呼叫前先設定好（決定輸出解析度）。
 */
export function drawImageWithParams(canvas, image, params) {
  const p = { ...DEFAULT_PARAMS, ...params, crop: { ...DEFAULT_PARAMS.crop, ...params?.crop } };
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.save();

  ctx.filter = `brightness(${p.brightness}) contrast(${p.contrast})`;
  ctx.globalAlpha = p.opacity;

  // 裁切區域換算成原圖像素座標
  const sx = p.crop.x * image.naturalWidth;
  const sy = p.crop.y * image.naturalHeight;
  const sw = Math.max(p.crop.width * image.naturalWidth, 1);
  const sh = Math.max(p.crop.height * image.naturalHeight, 1);

  // 裁切後的圖片以「置中鋪滿畫布（contain）」為基準尺寸，再套用 scale 放大縮小
  const cropAspect = sw / sh;
  const canvasAspect = cw / ch;
  let baseW;
  let baseH;
  if (cropAspect > canvasAspect) {
    baseW = cw;
    baseH = cw / cropAspect;
  } else {
    baseH = ch;
    baseW = ch * cropAspect;
  }
  const dw = baseW * p.scale;
  const dh = baseH * p.scale;

  ctx.translate(cw / 2 + p.offsetX * cw, ch / 2 + p.offsetY * ch);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);

  ctx.restore();
}

// 快取已載入的 Image，避免同一張圖在多個縮圖重複發出請求。
const imageCache = new Map();

/** 載入圖片並回傳 Promise<HTMLImageElement>，失敗時 reject。 */
export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    // 注意：不設定 crossOrigin，因為外部 URL 圖片不一定有回應 CORS 標頭；
    // 本專案只做畫面渲染（drawImage），不需要讀取像素資料（getImageData/toDataURL），
    // 所以不需要 CORS 權限，設定 crossOrigin 反而會讓部分外部圖片載入失敗。
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`圖片載入失敗：${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}
