import { useCallback, useEffect, useState } from "react";
import Calendar from "./components/Calendar";
import DayModal from "./components/DayModal";
import { fetchEventsByMonth } from "./api";
import { toMonthString } from "./utils/dateUtils";

const now = new Date();

function App() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD" | null

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchEventsByMonth(toMonthString(year, month));
      setEvents(data);
    } catch (err) {
      setError(`載入事件失敗：${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleChangeMonth = (nextYear, nextMonth) => {
    setYear(nextYear);
    setMonth(nextMonth);
  };

  // 新增/編輯/刪除完成後統一重新整理當月事件，確保畫面與後端一致。
  const handleEventChanged = () => {
    loadEvents();
  };

  const selectedDateEvents = selectedDate ? events.filter((event) => event.date === selectedDate) : [];

  return (
    <div className="app">
      <header className="app__header">
        <h1>月曆 To-do 編輯器</h1>
      </header>

      {error && <p className="app__error">{error}</p>}
      {loading && <p className="app__loading">載入中…</p>}

      <Calendar
        year={year}
        month={month}
        events={events}
        onChangeMonth={handleChangeMonth}
        onSelectDate={setSelectedDate}
      />

      {selectedDate && (
        <DayModal
          date={selectedDate}
          events={selectedDateEvents}
          onClose={() => setSelectedDate(null)}
          onEventChanged={handleEventChanged}
        />
      )}
    </div>
  );
}

export default App;
