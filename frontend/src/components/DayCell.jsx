import CanvasThumbnail from "./CanvasThumbnail";
import { resolveImageUrl } from "../api";

const MAX_VISIBLE_EVENTS = 3;

/** 月曆單一日期格：顯示日期數字，以及當天事件（標題 + 縮圖），超出時顯示 "+N"。 */
export default function DayCell({ cellDate, day, inCurrentMonth, isToday, events, onClick }) {
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - visibleEvents.length;

  return (
    <button
      type="button"
      className={`day-cell ${inCurrentMonth ? "" : "day-cell--outside"} ${isToday ? "day-cell--today" : ""}`}
      onClick={() => onClick(cellDate)}
    >
      <span className="day-cell__number">{day}</span>
      <div className="day-cell__events">
        {visibleEvents.map((event) => (
          <div key={event.id} className="day-cell__event">
            <CanvasThumbnail src={resolveImageUrl(event)} params={event.image_params} width={20} height={20} />
            <span className="day-cell__event-title">{event.title}</span>
          </div>
        ))}
        {overflowCount > 0 && <div className="day-cell__overflow">+{overflowCount}</div>}
      </div>
    </button>
  );
}
