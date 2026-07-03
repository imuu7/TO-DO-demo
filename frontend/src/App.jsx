import { useCallback, useEffect, useState } from "react";
import Calendar from "./components/Calendar";
import DayModal from "./components/DayModal";
import { fetchEventsByMonth, updateEvent } from "./api";
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

  // 階段 5：月曆格子間拖曳事件卡片，放開滑鼠後直接呼叫 PUT 整筆覆寫、僅變更 date 欄位。
  // PUT /events/{id} 為整筆覆寫，因此需帶上事件原本的其餘欄位，只替換 date。
  const handleEventDateChange = async (eventId, newDate) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    const payload = {
      title: event.title,
      description: event.description,
      date: newDate,
      time: event.time,
      image_type: event.image_type,
      image_source: event.image_source,
      image_params: event.image_params,
    };

    try {
      await updateEvent(eventId, payload);
      await loadEvents();
    } catch (err) {
      setError(`更新事件日期失敗：${err.message}`);
    }
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
        onEventDateChange={handleEventDateChange}
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
