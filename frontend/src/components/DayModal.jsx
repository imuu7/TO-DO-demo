import { useState } from "react";
import CanvasThumbnail from "./CanvasThumbnail";
import EventForm from "./EventForm";
import { deleteEvent, resolveImageUrl } from "../api";

/**
 * 點選日期格後開啟的 modal：列出當天事件，並提供新增/編輯/刪除/預覽圖片。
 * 新增/編輯共用 EventForm；刪除呼叫後端後回報給 App 重新整理事件清單。
 */
export default function DayModal({ date, events, onClose, onEventChanged }) {
  const [mode, setMode] = useState("list"); // list | form
  const [editingEvent, setEditingEvent] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const openCreateForm = () => {
    setEditingEvent(null);
    setMode("form");
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setMode("form");
  };

  const handleSaved = (savedEvent) => {
    setMode("list");
    setEditingEvent(null);
    onEventChanged(savedEvent);
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`確定要刪除「${event.title}」嗎？`)) return;
    setDeletingId(event.id);
    setErrorMessage("");
    try {
      await deleteEvent(event.id);
      onEventChanged(null); // null 代表需要重新整理清單（無單一物件可回傳）
    } catch (err) {
      setErrorMessage(`刪除失敗：${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{date}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </div>

        {errorMessage && <p className="event-form__error event-form__error--global">{errorMessage}</p>}

        {mode === "form" && (
          <EventForm
            defaultDate={date}
            initialEvent={editingEvent}
            onCancel={() => setMode("list")}
            onSaved={handleSaved}
          />
        )}

        {mode === "list" && (
          <>
            <div className="day-modal__list">
              {events.length === 0 && <p className="day-modal__empty">這天還沒有事件。</p>}
              {events.map((event) => (
                <div key={event.id} className="day-modal__event">
                  <button
                    type="button"
                    className="day-modal__event-thumb"
                    onClick={() => setPreviewEvent(event)}
                    aria-label="預覽圖片"
                  >
                    <CanvasThumbnail src={resolveImageUrl(event)} params={event.image_params} width={56} height={56} />
                  </button>
                  <div className="day-modal__event-info">
                    <div className="day-modal__event-title">{event.title}</div>
                    {event.time && <div className="day-modal__event-time">{event.time}</div>}
                    {event.description && <div className="day-modal__event-desc">{event.description}</div>}
                  </div>
                  <div className="day-modal__event-actions">
                    <button type="button" onClick={() => openEditForm(event)}>
                      編輯
                    </button>
                    <button type="button" onClick={() => handleDelete(event)} disabled={deletingId === event.id}>
                      {deletingId === event.id ? "刪除中…" : "刪除"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="day-modal__actions">
              <button type="button" onClick={openCreateForm}>
                ＋ 新增事件
              </button>
            </div>
          </>
        )}

        {previewEvent && (
          <div className="modal-overlay modal-overlay--nested" onClick={() => setPreviewEvent(null)}>
            <div className="image-preview" onClick={(e) => e.stopPropagation()}>
              <div className="image-preview__header">
                <h3>{previewEvent.title}</h3>
                <button type="button" onClick={() => setPreviewEvent(null)} aria-label="關閉預覽">
                  ×
                </button>
              </div>
              <CanvasThumbnail
                src={resolveImageUrl(previewEvent)}
                params={previewEvent.image_params}
                width={400}
                height={300}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
