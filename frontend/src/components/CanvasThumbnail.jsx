import { useEffect, useRef, useState } from "react";
import { drawImageWithParams, loadImage } from "../utils/imageRender";

/**
 * 依 image_params 用 Canvas 即時渲染圖片的共用元件。
 * 月曆縮圖、modal 事件列表、預覽全部透過這個元件顯示圖片，
 * 確保三處渲染邏輯一致（見 CLAUDE.md 的架構決策）。
 */
export default function CanvasThumbnail({ src, params, width = 48, height = 48, className = "" }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error

  useEffect(() => {
    if (!src) {
      setStatus("idle");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    loadImage(src)
      .then((img) => {
        if (cancelled || !canvasRef.current) return;
        drawImageWithParams(canvasRef.current, img, params);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, JSON.stringify(params), width, height]);

  if (!src) {
    return <div className={`canvas-thumbnail canvas-thumbnail--empty ${className}`} style={{ width, height }} />;
  }

  if (status === "error") {
    return (
      <div className={`canvas-thumbnail canvas-thumbnail--error ${className}`} style={{ width, height }}>
        圖片載入失敗
      </div>
    );
  }

  return <canvas ref={canvasRef} width={width} height={height} className={`canvas-thumbnail ${className}`} />;
}
