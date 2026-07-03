import { useMemo, useState } from "react";
import DayCell from "./DayCell";
import { WEEKDAY_LABELS, buildCalendarCells, todayDateString } from "../utils/dateUtils";

/** 月曆主體：年月標題、上下月切換、跳轉指定年月、星期列、日期格 grid。 */
export default function Calendar({ year, month, events, onChangeMonth, onSelectDate }) {
  const [jumpYear, setJumpYear] = useState(String(year));
  const [jumpMonth, setJumpMonth] = useState(String(month + 1));

  const cells = useMemo(() => buildCalendarCells(year, month), [year, month]);
  const today = todayDateString();

  // 將當月事件依日期分組，方便日期格快速查找
  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date).push(event);
    }
    return map;
  }, [events]);

  const goPrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    onChangeMonth(prev.getFullYear(), prev.getMonth());
  };

  const goNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    onChangeMonth(next.getFullYear(), next.getMonth());
  };

  const handleJump = (e) => {
    e.preventDefault();
    const y = Number(jumpYear);
    const m = Number(jumpMonth);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return;
    onChangeMonth(y, m - 1);
  };

  return (
    <div className="calendar">
      <div className="calendar__header">
        <div className="calendar__nav">
          <button type="button" onClick={goPrevMonth} aria-label="上個月">
            ‹
          </button>
          <h2 className="calendar__title">
            {year} 年 {month + 1} 月
          </h2>
          <button type="button" onClick={goNextMonth} aria-label="下個月">
            ›
          </button>
        </div>
        <form className="calendar__jump" onSubmit={handleJump}>
          <input
            type="number"
            value={jumpYear}
            onChange={(e) => setJumpYear(e.target.value)}
            aria-label="跳轉年份"
            className="calendar__jump-year"
          />
          <span>年</span>
          <input
            type="number"
            min={1}
            max={12}
            value={jumpMonth}
            onChange={(e) => setJumpMonth(e.target.value)}
            aria-label="跳轉月份"
            className="calendar__jump-month"
          />
          <span>月</span>
          <button type="submit">跳轉</button>
        </form>
      </div>

      <div className="calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar__weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar__grid">
        {cells.map((cell) => (
          <DayCell
            key={cell.date}
            cellDate={cell.date}
            day={cell.day}
            inCurrentMonth={cell.inCurrentMonth}
            isToday={cell.date === today}
            events={eventsByDate.get(cell.date) || []}
            onClick={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
