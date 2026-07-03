import { useEffect, useRef, useState } from "react";
import { loadImage } from "../utils/imageRender";

const CANVAS_W = 320;
const CANVAS_H = 220;
const HANDLE_SIZE = 10; // 角落控制點的繪製大小與點擊容許範圍（px）
const MIN_SIZE = 0.05; // 裁切框最小寬高（相對原圖比例），避免縮成一個點

/**
 * 裁切／顯示區域編輯器。
 *
 * 顯示「原圖」本身（不套用 scale/rotation/opacity 等 image_params），
 * 疊加一個可拖曳移動、可拖曳四角縮放的裁切框；框選範圍換算成
 * 相對原圖尺寸的比例（0~1），對應 image_params.crop 的 {x, y, width, height}。
 *
 * 為何原圖不能用 drawImageWithParams 畫：那支函式是「套用編輯參數後的最終渲染」，
 * 裁切框需要的是「未經任何編輯的原圖」讓使用者能看到完整照片再框選範圍，
 * 兩者用途不同，不算另開一條重複的「參數渲染」路徑。
 */
export default function CropBoxEditor({ src, crop, onChange }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null); // 已載入的原圖 HTMLImageElement
  const imgRectRef = useRef(null); // 原圖在 canvas 上的實際顯示範圍（contain fit）
  const dragStateRef = useRef(null); // 拖曳中的狀態（移動或縮放）
  const [ready, setReady] = useState(false);

  // 載入原圖並計算其在固定尺寸 canvas 上的 contain-fit 顯示範圍
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!src) return undefined;
    loadImage(src).then((img) => {
      if (cancelled) return;
      imgRef.current = img;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = CANVAS_W / CANVAS_H;
      let w;
      let h;
      if (imgAspect > canvasAspect) {
        w = CANVAS_W;
        h = CANVAS_W / imgAspect;
      } else {
        h = CANVAS_H;
        w = CANVAS_H * imgAspect;
      }
      imgRectRef.current = { x: (CANVAS_W - w) / 2, y: (CANVAS_H - h) / 2, w, h };
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  // 原圖載入完成、或裁切框參數改變時重繪
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, crop]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const imgRect = imgRectRef.current;
    if (!canvas || !img || !imgRect) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 畫出完整原圖（不套用任何 image_params）
    ctx.drawImage(img, imgRect.x, imgRect.y, imgRect.w, imgRect.h);

    const box = cropToPx(crop, imgRect);

    // 裁切框外的區域蓋上半透明黑色遮罩，凸顯目前選取的範圍
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(imgRect.x, imgRect.y, imgRect.w, box.y - imgRect.y); // 上
    ctx.fillRect(imgRect.x, box.y + box.h, imgRect.w, imgRect.y + imgRect.h - (box.y + box.h)); // 下
    ctx.fillRect(imgRect.x, box.y, box.x - imgRect.x, box.h); // 左
    ctx.fillRect(box.x + box.w, box.y, imgRect.x + imgRect.w - (box.x + box.w), box.h); // 右

    // 裁切框邊界
    ctx.strokeStyle = "#4f9dff";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // 四角控制點
    ctx.fillStyle = "#4f9dff";
    for (const [hx, hy] of cornerPoints(box)) {
      ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }
  }

  function cropToPx(c, imgRect) {
    return {
      x: imgRect.x + c.x * imgRect.w,
      y: imgRect.y + c.y * imgRect.h,
      w: c.width * imgRect.w,
      h: c.height * imgRect.h,
    };
  }

  function cornerPoints(box) {
    return [
      [box.x, box.y], // 左上 tl
      [box.x + box.w, box.y], // 右上 tr
      [box.x, box.y + box.h], // 左下 bl
      [box.x + box.w, box.y + box.h], // 右下 br
    ];
  }

  function getPointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function hitTestCorner(pos, box) {
    const names = ["tl", "tr", "bl", "br"];
    const points = cornerPoints(box);
    for (let i = 0; i < points.length; i += 1) {
      const [hx, hy] = points[i];
      if (Math.abs(pos.x - hx) <= HANDLE_SIZE && Math.abs(pos.y - hy) <= HANDLE_SIZE) {
        return names[i];
      }
    }
    return null;
  }

  function toRatio(pos, imgRect) {
    return {
      rx: clamp((pos.x - imgRect.x) / imgRect.w, 0, 1),
      ry: clamp((pos.y - imgRect.y) / imgRect.h, 0, 1),
    };
  }

  function handleMouseDown(e) {
    const imgRect = imgRectRef.current;
    if (!imgRect) return;
    const pos = getPointerPos(e);
    const box = cropToPx(crop, imgRect);
    const corner = hitTestCorner(pos, box);

    if (corner) {
      // 縮放：把「對角的固定角」記錄下來當錨點，整個拖曳過程都以此為基準計算，
      // 不受後續重新渲染／重新產生事件處理函式影響。
      dragStateRef.current = {
        mode: "resize",
        corner,
        anchor: {
          left: crop.x,
          top: crop.y,
          right: crop.x + crop.width,
          bottom: crop.y + crop.height,
        },
      };
    } else if (pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h) {
      // 移動：記錄拖曳起點與起始裁切框
      dragStateRef.current = { mode: "move", startPos: pos, startCrop: { ...crop } };
    } else {
      return; // 點在裁切框與控制點之外，不觸發任何動作
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e) {
    const drag = dragStateRef.current;
    const imgRect = imgRectRef.current;
    if (!drag || !imgRect) return;
    const pos = getPointerPos(e);
    const { rx, ry } = toRatio(pos, imgRect);

    if (drag.mode === "move") {
      const start = toRatio(drag.startPos, imgRect);
      const dx = rx - start.rx;
      const dy = ry - start.ry;
      const nx = clamp(drag.startCrop.x + dx, 0, 1 - drag.startCrop.width);
      const ny = clamp(drag.startCrop.y + dy, 0, 1 - drag.startCrop.height);
      onChange({ ...drag.startCrop, x: nx, y: ny });
      return;
    }

    // 縮放：依拖曳的角落，重新計算 x/y/width/height，對角錨點固定不動
    const { left, top, right, bottom } = drag.anchor;
    let x = left;
    let y = top;
    let width = right - left;
    let height = bottom - top;

    if (drag.corner === "tl") {
      x = clamp(rx, 0, right - MIN_SIZE);
      y = clamp(ry, 0, bottom - MIN_SIZE);
      width = right - x;
      height = bottom - y;
    } else if (drag.corner === "tr") {
      y = clamp(ry, 0, bottom - MIN_SIZE);
      width = clamp(rx, left + MIN_SIZE, 1) - left;
      height = bottom - y;
    } else if (drag.corner === "bl") {
      x = clamp(rx, 0, right - MIN_SIZE);
      width = right - x;
      height = clamp(ry, top + MIN_SIZE, 1) - top;
    } else if (drag.corner === "br") {
      width = clamp(rx, left + MIN_SIZE, 1) - left;
      height = clamp(ry, top + MIN_SIZE, 1) - top;
    }

    onChange({ x, y, width, height });
  }

  function handleMouseUp() {
    dragStateRef.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="image-editor__crop-canvas"
      onMouseDown={handleMouseDown}
    />
  );
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
