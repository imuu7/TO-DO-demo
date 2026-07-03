import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DayCell from "./DayCell";
import { WEEKDAY_LABELS, buildCalendarCells, todayDateString } from "../utils/dateUtils";

// 拖曳判定門檻（px）：滑鼠移動超過此距離才視為「拖曳」，否則視為單純點擊（開啟當日 modal）
const DRAG_THRESHOLD = 4;

/**
 * 月曆主體：年月標題、上下月切換、跳轉指定年月、星期列、日期格 grid。
 * 階段 5：支援在 DayCell 之間用滑鼠手刻拖曳事件卡片，放開時變更該事件的日期。
 * 不支援跨月拖曳（月曆格子上下月補齊的日期不可作為放置目標）。
 */
export default function Calendar({ year, month, events, onChangeMonth, onSelectDate, onEventDateChange }) {
  const [jumpYear, setJumpYear] = useState(String(year));
  const [jumpMonth, setJumpMonth] = useState(String(month + 1));

  // 拖曳狀態：draggingEventId 控制來源卡片半透明；dropTarget 控制目標格高亮
  const [draggingEventId, setDraggingEventId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { date, valid } | null
  const dragRef = useRef(null); // { eventId, sourceDate, startX, startY, dragging }

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

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDraggingEventId(null);
    setDropTarget(null);
    document.body.style.cursor = "";
  }, []);

  const handleWindowMouseMove = useCallback((e) => {
    const info = dragRef.current;
    if (!info) return;

    if (!info.dragging) {
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      info.dragging = true;
      setDraggingEventId(info.eventId);
      document.body.style.cursor = "grabbing";
    }

    const cellEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".day-cell");
    if (!cellEl) {
      setDropTarget(null);
      return;
    }
    const targetDate = cellEl.dataset.date;
    if (targetDate === info.sourceDate) {
      // 仍停留在來源格子本身，不算是「懸停目標」，不顯示可放置/不可放置樣式
      setDropTarget(null);
      return;
    }
    const targetInCurrentMonth = cellEl.dataset.inCurrentMonth === "true";
    setDropTarget({ date: targetDate, valid: targetInCurrentMonth });
  }, []);

  const handleWindowMouseUp = useCallback(
    (e) => {
      const info = dragRef.current;
      if (info?.dragging) {
        // 拖曳確實發生過：放開滑鼠後緊接著會有一個多餘的 click 事件（mousedown/mouseup
        // 落在同一個 day-cell 按鈕上時），用一次性的 capture 監聽把它吃掉，避免誤觸開啟當日 modal
        const suppressClick = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener("click", suppressClick, true);
        setTimeout(() => window.removeEventListener("click", suppressClick, true), 0);

        const cellEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".day-cell");
        const targetDate = cellEl?.dataset.date;
        const targetInCurrentMonth = cellEl?.dataset.inCurrentMonth === "true";
        if (targetDate && targetInCurrentMonth && targetDate !== info.sourceDate) {
          onEventDateChange(info.eventId, targetDate);
        }
      }
      endDrag();
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    },
    [endDrag, handleWindowMouseMove, onEventDateChange],
  );

  const handleEventMouseDown = useCallback(
    (e, event, cellDate) => {
      if (e.button !== 0) return; // 只處理滑鼠左鍵拖曳
      e.preventDefault(); // 避免瀏覽器原生圖片拖曳 / 文字選取干擾
      e.stopPropagation();
      dragRef.current = {
        eventId: event.id,
        sourceDate: cellDate,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
      };
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    },
    [handleWindowMouseMove, handleWindowMouseUp],
  );

  // 拖曳中若視窗失焦（例如切到其他視窗/分頁），直接取消拖曳，避免狀態卡住
  useEffect(() => {
    const handleBlur = () => {
      if (dragRef.current) {
        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);
        endDrag();
      }
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [endDrag, handleWindowMouseMove, handleWindowMouseUp]);

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
            draggingEventId={draggingEventId}
            dropTarget={dropTarget}
            onEventMouseDown={handleEventMouseDown}
          />
        ))}
      </div>
    </div>
  );
}
