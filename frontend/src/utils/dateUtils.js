// 月曆計算相關的純函式工具。

export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

/** 轉成 "YYYY-MM" 格式（給 GET /events?month= 用）。 */
export function toMonthString(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** 轉成 "YYYY-MM-DD" 格式（給 date 欄位用）。 */
export function toDateString(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 產生月曆 grid 需要的日期格資料（含上下月補齊的格子）。
 * 回傳一個長度為 6*7 = 42 的陣列，每格為 { date: "YYYY-MM-DD", day, inCurrentMonth }。
 */
export function buildCalendarCells(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0 = 週日
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // 上個月補齊的格子
  for (let i = 0; i < startWeekday; i += 1) {
    const day = daysInPrevMonth - startWeekday + 1 + i;
    const prevMonthDate = new Date(year, month - 1, day);
    cells.push({
      date: toDateString(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), day),
      day,
      inCurrentMonth: false,
    });
  }

  // 本月格子
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: toDateString(year, month, day),
      day,
      inCurrentMonth: true,
    });
  }

  // 下個月補齊的格子（補到 42 格，維持 6 週固定版面）
  let nextDay = 1;
  while (cells.length < 42) {
    const nextMonthDate = new Date(year, month + 1, nextDay);
    cells.push({
      date: toDateString(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextDay),
      day: nextDay,
      inCurrentMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}

/** 取得今天的 "YYYY-MM-DD" 字串（本地時區）。 */
export function todayDateString() {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}
