import { useState } from "react";
import ImageEditor from "./ImageEditor";
import { createEvent, updateEvent, uploadImage, resolveImageUrl } from "../api";

const DEFAULT_IMAGE_PARAMS = {
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  opacity: 1,
  brightness: 1,
  contrast: 1,
};

// 補齊缺漏欄位（例如舊資料或後端回傳不完整的 image_params），避免編輯器拿到 undefined
function normalizeImageParams(params) {
  return {
    ...DEFAULT_IMAGE_PARAMS,
    ...params,
    crop: { ...DEFAULT_IMAGE_PARAMS.crop, ...params?.crop },
  };
}

/**
 * 新增/編輯事件表單。
 * initialEvent 為 null 表示新增；帶入事件物件則為編輯模式（PUT 整筆覆寫）。
 */
export default function EventForm({ defaultDate, initialEvent, onCancel, onSaved }) {
  const isEditing = Boolean(initialEvent);

  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [date, setDate] = useState(initialEvent?.date ?? defaultDate);
  const [time, setTime] = useState(initialEvent?.time ?? "");
  const [imageType, setImageType] = useState(initialEvent?.image_type ?? "none");
  const [imageUrl, setImageUrl] = useState(initialEvent?.image_type === "url" ? initialEvent.image_source : "");
  const [uploadedFilename, setUploadedFilename] = useState(
    initialEvent?.image_type === "upload" ? initialEvent.image_source : null,
  );
  const [localPreviewSrc, setLocalPreviewSrc] = useState(
    initialEvent ? resolveImageUrl(initialEvent) : null,
  );
  // 圖片編輯參數：新增時用預設值，編輯時沿用原事件的參數（本階段起兩者都可透過 ImageEditor 修改）
  const [imageParams, setImageParams] = useState(() => normalizeImageParams(initialEvent?.image_params));

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalPreviewSrc(URL.createObjectURL(file)); // 先用本機圖片即時預覽，不用等上傳完成
    setImageParams(normalizeImageParams()); // 換了一張新圖片，舊的裁切/縮放/位移參數不一定還適用，重置為預設值
    setUploading(true);
    setErrorMessage("");
    try {
      const result = await uploadImage(file);
      setUploadedFilename(result.filename);
    } catch (err) {
      setErrorMessage(`圖片上傳失敗：${err.message}`);
      setUploadedFilename(null);
    } finally {
      setUploading(false);
    }
  };

  const handleImageTypeChange = (nextType) => {
    setImageType(nextType);
    setErrorMessage("");
    if (nextType === "none") {
      setLocalPreviewSrc(null);
    } else if (nextType === "url") {
      setLocalPreviewSrc(imageUrl || null);
    } else if (nextType === "upload") {
      setLocalPreviewSrc(uploadedFilename ? localPreviewSrc : null);
    }
  };

  const handleUrlChange = (value) => {
    setImageUrl(value);
    setLocalPreviewSrc(value || null);
  };

  const validate = () => {
    const errors = {};
    if (!title.trim()) errors.title = "標題為必填";
    if (!date) errors.date = "日期為必填";
    if (imageType === "url" && !imageUrl.trim()) errors.image = "請輸入圖片網址";
    if (imageType === "upload" && !uploadedFilename) errors.image = "請上傳圖片，或等待上傳完成";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      date,
      time: time || null,
      image_type: imageType,
      image_source: imageType === "none" ? null : imageType === "upload" ? uploadedFilename : imageUrl.trim(),
      // 圖片編輯參數一律來自 ImageEditor 目前的即時狀態
      image_params: imageParams,
    };

    setSubmitting(true);
    try {
      const saved = isEditing ? await updateEvent(initialEvent.id, payload) : await createEvent(payload);
      onSaved(saved);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h3>{isEditing ? "編輯事件" : "新增事件"}</h3>

      <label className="event-form__field">
        <span>標題 *</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        {fieldErrors.title && <span className="event-form__error">{fieldErrors.title}</span>}
      </label>

      <label className="event-form__field">
        <span>描述</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>

      <div className="event-form__row">
        <label className="event-form__field">
          <span>日期 *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {fieldErrors.date && <span className="event-form__error">{fieldErrors.date}</span>}
        </label>

        <label className="event-form__field">
          <span>時間</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      <fieldset className="event-form__field">
        <legend>圖片（上傳或網址擇一）</legend>
        <div className="event-form__image-type">
          <label>
            <input
              type="radio"
              name="image_type"
              checked={imageType === "none"}
              onChange={() => handleImageTypeChange("none")}
            />
            無圖片
          </label>
          <label>
            <input
              type="radio"
              name="image_type"
              checked={imageType === "upload"}
              onChange={() => handleImageTypeChange("upload")}
            />
            上傳檔案
          </label>
          <label>
            <input
              type="radio"
              name="image_type"
              checked={imageType === "url"}
              onChange={() => handleImageTypeChange("url")}
            />
            外部網址
          </label>
        </div>

        {imageType === "upload" && (
          <div className="event-form__image-input">
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {uploading && <span className="event-form__hint">上傳中…</span>}
          </div>
        )}

        {imageType === "url" && (
          <div className="event-form__image-input">
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>
        )}

        {fieldErrors.image && <span className="event-form__error">{fieldErrors.image}</span>}

        {imageType !== "none" && localPreviewSrc && (
          <ImageEditor src={localPreviewSrc} params={imageParams} onChange={setImageParams} />
        )}
      </fieldset>

      {errorMessage && <p className="event-form__error event-form__error--global">{errorMessage}</p>}

      <div className="event-form__actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button type="submit" disabled={submitting || uploading}>
          {submitting ? "儲存中…" : "儲存"}
        </button>
      </div>
    </form>
  );
}
