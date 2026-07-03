import CanvasThumbnail from "./CanvasThumbnail";
import { resolveImageUrl } from "../api";

const MAX_VISIBLE_EVENTS = 3;

/**
 * 月曆單一日期格：顯示日期數字，以及當天事件（標題 + 縮圖），超出時顯示 "+N"。
 * 階段 5：每個事件卡片可用滑鼠拖曳到另一個日期格，變更該事件的日期。
 * - draggingEventId：目前正被拖曳的事件 id，用來讓來源卡片顯示半透明
 * - dropTarget：{ date, valid } | null，目前滑鼠懸停的目標日期格，valid 為 false 時顯示不可放置樣式
 * - onEventMouseDown：事件卡片 mousedown 時通知父層（Calendar）開始追蹤拖曳
 */
export default function DayCell({
  cellDate,
  day,
  inCurrentMonth,
  isToday,
  events,
  onClick,
  draggingEventId,
  dropTarget,
  onEventMouseDown,
}) {
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - visibleEvents.length;

  const isDropTarget = dropTarget?.date === cellDate;
  const dropClass = isDropTarget ? (dropTarget.valid ? "day-cell--drop-valid" : "day-cell--drop-invalid") : "";

  return (
    <button
      type="button"
      className={`day-cell ${inCurrentMonth ? "" : "day-cell--outside"} ${isToday ? "day-cell--today" : ""} ${dropClass}`}
      data-date={cellDate}
      data-in-current-month={inCurrentMonth}
      onClick={() => onClick(cellDate)}
    >
      <span className="day-cell__number">{day}</span>
      <div className="day-cell__events">
        {visibleEvents.map((event) => (
          <div
            key={event.id}
            className={`day-cell__event ${draggingEventId === event.id ? "day-cell__event--dragging" : ""}`}
            onMouseDown={(e) => onEventMouseDown(e, event, cellDate)}
          >
            <CanvasThumbnail src={resolveImageUrl(event)} params={event.image_params} width={20} height={20} />
            <span className="day-cell__event-title">{event.title}</span>
          </div>
        ))}
        {overflowCount > 0 && <div className="day-cell__overflow">+{overflowCount}</div>}
      </div>
    </button>
  );
}
