import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiX } from 'react-icons/fi';
import { fetchNotesByDate } from '../api/notesApi';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameMonth, parseISO, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Calendar = ({ onDateFilter = () => {}, currentDateFilter = null }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteDates, setNoteDates] = useState([]);

  // 同步外部日期筛选状态
  useEffect(() => {
    if (currentDateFilter) {
      try {
        setSelectedDate(parseISO(currentDateFilter));
      } catch (err) {
        console.error('日期解析错误:', err);
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  }, [currentDateFilter]);

  // 获取当月有笔记的日期
  useEffect(() => {
    const fetchDatesWithNotes = async () => {
      try {
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        
        // 捕获可能的错误并返回空数组
        try {
          const dates = await fetchNotesByDate(start, end, true);
          const parsedDates = Array.isArray(dates) ? dates.map(date => parseISO(date)) : [];
          setNoteDates(parsedDates);
        } catch (error) {
          console.error('获取日期失败:', error);
          setNoteDates([]);
        }
      } catch (error) {
        console.error('日历组件错误:', error);
        setNoteDates([]);
      }
    };

    fetchDatesWithNotes();
  }, [currentMonth]);

  // 前一个月
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 后一个月
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 选择日期进行筛选
  const handleDateClick = (day) => {
    if (!isSameMonth(day, currentMonth)) return;
    
    const clickedDate = format(day, 'yyyy-MM-dd');
    
    // 如果点击已选中的日期，则取消筛选，否则设置筛选
    if (selectedDate && format(selectedDate, 'yyyy-MM-dd') === clickedDate) {
      setSelectedDate(null);
      if (typeof onDateFilter === 'function') {
        onDateFilter(null);
      }
    } else {
      setSelectedDate(day);
      if (typeof onDateFilter === 'function') {
        onDateFilter(clickedDate);
      }
    }
  };

  // 清除筛选
  const clearFilter = () => {
    setSelectedDate(null);
    onDateFilter(null);
  };

  // 创建日历单元格
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;

    const dateFormat = 'd';
    const rows = [];

    let days = [];
    let day = startDate;
    let formattedDate = '';

    // 创建星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const daysHeader = weekDays.map((day, i) => (
      <div key={i} className="text-center py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {day}
      </div>
    ));
    rows.unshift(<div className="grid grid-cols-7 gap-1 mb-1" key="header">{daysHeader}</div>);

    // 创建日期单元格
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const hasNotes = noteDates.some(date => 
          format(date, 'yyyy-MM-dd') === format(cloneDay, 'yyyy-MM-dd')
        );
        
        // 检查是否是被选中的日期
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        
        days.push(
          <div
            key={day.toString()}
            className={`
              calendar-day-cell h-7 w-7 flex items-center justify-center text-xs rounded-full cursor-pointer
              ${isToday(day) ? 'bg-primary-500 text-white' : ''}
              ${!isToday(day) && isSameMonth(day, monthStart) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}
              ${selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') 
                ? 'ring-2 ring-primary-500 font-bold bg-primary-100 dark:bg-primary-900/50' 
                : ''}
              ${hasNotes && !isToday(day) ? 'font-bold text-primary-600 dark:text-primary-400' : ''}
              ${isSameMonth(day, monthStart) ? 'hover:bg-theme-elevated' : 'pointer-events-none'}"
            `}
            onClick={() => isSameMonth(day, monthStart) && handleDateClick(cloneDay)}
            title={format(day, 'yyyy年MM月dd日')}
          >
            {formattedDate}
          </div>
        );
        day = new Date(day.setDate(day.getDate() + 1));
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="mt-1">{rows}</div>;
  };

  return (
    <div className="calendar bg-surface dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-4">
      <div className="header flex justify-between items-center mb-2">
        <FiCalendar className="text-primary-500" />
        <h2 className="text-sm font-medium">
          日历
        </h2>
        <div className="flex">
          {selectedDate ? (
            <button 
              onClick={clearFilter} 
              className="p-1 hover:bg-theme-elevated rounded text-red-500"
              title="清除筛选"
            >
              <FiX className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button 
                onClick={prevMonth} 
                className="p-1 hover:bg-theme-elevated rounded"
                title="上个月"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1 hover:bg-theme-elevated rounded"
                title="下个月"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {selectedDate ? (
        <div className="text-center mb-2 p-1 bg-primary-50 dark:bg-primary-900/30 rounded-md">
          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
            {selectedDate && format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
          </span>
        </div>
      ) : (
        <div className="text-center text-sm font-medium mb-2">
          {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
        </div>
      )}
      
      {renderCells()}
    </div>
  );
};

export default Calendar;
