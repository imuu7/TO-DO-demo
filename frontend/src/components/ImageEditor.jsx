import { useEffect, useRef, useState } from "react";
import { drawImageWithParams, loadImage } from "../utils/imageRender";
import CropBoxEditor from "./CropBoxEditor";

const PREVIEW_W = 320;
const PREVIEW_H = 220;

/**
 * 事件圖片編輯器（階段 3）。
 *
 * 只負責「編輯 image_params」，不處理圖片上傳/URL 輸入（那是 EventForm 的職責）。
 * 每次 params 改變都立即呼叫共用的 drawImageWithParams 重繪即時預覽，不做防抖，
 * 確保拖曳 slider／拖曳畫布時能立刻看到效果。
 *
 * 畫面分兩塊：
 * 1. 裁切／顯示區域（CropBoxEditor）：顯示原圖 + 可拖曳的裁切框，寫入 params.crop
 * 2. 即時預覽 canvas：套用「全部」image_params 的最終渲染結果，
 *    在此 canvas 上拖曳可調整 offsetX/offsetY（沿用階段2「相對畫布比例」單位）
 */
export default function ImageEditor({ src, params, onChange }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const dragStateRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  // 載入圖片供即時預覽 canvas 使用
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    imgRef.current = null;
    if (!src) return undefined;
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        imgRef.current = img;
        redraw();
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // 任何參數變動都立即重繪預覽
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function redraw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    drawImageWithParams(canvas, img, params);
  }

  function update(patch) {
    onChange({ ...params, ...patch });
  }

  function updateCrop(crop) {
    onChange({ ...params, crop });
  }

  // 在即時預覽 canvas 上拖曳 → 調整 offsetX/offsetY（相對這個 canvas 尺寸的比例）
  function handlePreviewMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: params.offsetX,
      startOffsetY: params.offsetY,
      rectW: rect.width,
      rectH: rect.height,
    };
    window.addEventListener("mousemove", handlePreviewMouseMove);
    window.addEventListener("mouseup", handlePreviewMouseUp);
  }

  function handlePreviewMouseMove(e) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / drag.rectW;
    const dy = (e.clientY - drag.startY) / drag.rectH;
    update({ offsetX: drag.startOffsetX + dx, offsetY: drag.startOffsetY + dy });
  }

  function handlePreviewMouseUp() {
    dragStateRef.current = null;
    window.removeEventListener("mousemove", handlePreviewMouseMove);
    window.removeEventListener("mouseup", handlePreviewMouseUp);
  }

  // 旋轉 90 度步進按鈕，結果正規化到 -180~180 度之間，與 slider 範圍一致
  function rotateBy(deg) {
    let next = (params.rotation + deg) % 360;
    if (next > 180) next -= 360;
    if (next < -180) next += 360;
    update({ rotation: next });
  }

  if (!src) return null;

  return (
    <div className="image-editor">
      {loadError && <p className="event-form__error">圖片載入失敗，無法編輯</p>}

      <div className="image-editor__canvases">
        <div className="image-editor__panel">
          <span className="event-form__hint">裁切／顯示區域（拖曳邊框可移動、拖曳角落可縮放）</span>
          <CropBoxEditor src={src} crop={params.crop} onChange={updateCrop} />
        </div>

        <div className="image-editor__panel">
          <span className="event-form__hint">即時預覽（拖曳圖片可調整位置）</span>
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            className="image-editor__preview-canvas"
            onMouseDown={handlePreviewMouseDown}
          />
        </div>
      </div>

      <div className="image-editor__controls">
        <label className="image-editor__control">
          <span>縮放 {params.scale.toFixed(2)}x</span>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.01}
            value={params.scale}
            onChange={(e) => update({ scale: Number(e.target.value) })}
          />
        </label>

        <label className="image-editor__control">
          <span>旋轉 {Math.round(params.rotation)}°</span>
          <div className="image-editor__rotate-row">
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={params.rotation}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
            />
            <div className="image-editor__rotate-buttons">
              <button type="button" onClick={() => rotateBy(-90)}>
                -90°
              </button>
              <button type="button" onClick={() => rotateBy(90)}>
                +90°
              </button>
            </div>
          </div>
        </label>

        <label className="image-editor__control">
          <span>透明度 {params.opacity.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={params.opacity}
            onChange={(e) => update({ opacity: Number(e.target.value) })}
          />
        </label>

        <label className="image-editor__control">
          <span>亮度 {params.brightness.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={params.brightness}
            onChange={(e) => update({ brightness: Number(e.target.value) })}
          />
        </label>

        <label className="image-editor__control">
          <span>對比 {params.contrast.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={params.contrast}
            onChange={(e) => update({ contrast: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
