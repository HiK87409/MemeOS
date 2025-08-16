import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiX } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';

const CompactCalendarFilter = ({ onDateChange, selectedDate, noteDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 格式化日期
  const formatDate = (date) => {
    return date ? format(date, 'yyyy-MM-dd') : null;
  };

  // 获取日历网格的日期
  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      days.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    return days;
  };

  // 处理月份导航
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 处理日期选择
  const handleDateSelect = (date) => {
    const dateStr = formatDate(date);
    // 如果选择的是已选中的日期，则取消筛选
    if (selectedDate === dateStr) {
      onDateChange(null);
    } else {
      onDateChange(dateStr);
    }
  };

  // 清除选择
  const handleClear = () => {
    onDateChange(null);
  };

  // 回到今天
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateChange(formatDate(today));
  };

  const calendarDays = getCalendarDays();
  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

  // 计算每个日期的笔记数量
  const getNoteCount = (dateStr) => {
    return noteDates.filter(date => date === dateStr).length;
  };

  // 根据笔记数量获取绿色深度
  const getGreenIntensity = (count) => {
    if (count === 1) return 'bg-green-400';
    if (count === 2) return 'bg-green-500';
    if (count === 3) return 'bg-green-600';
    return 'bg-green-700';
  };

  return (
    <div className="compact-calendar-filter w-full" style={{ backgroundColor: 'transparent' }}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="w-4 h-4 text-green-500" />

          {selectedDate && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 rounded text-xs">
              <span className="text-green-700 dark:text-green-300">
                {format(toZonedTime(new Date(selectedDate), 'Asia/Shanghai'), 'MM/dd', { locale: zhCN })}
              </span>
              <button
                onClick={handleClear}
                className="text-green-500 hover:text-green-700 dark:hover:text-green-300"
              >
                <FiX className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={handleToday}
          className="px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
        >
          今天
        </button>
      </div>

      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
        >
          <FiChevronLeft className="w-3 h-3" />
        </button>
        
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
        </div>
        
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
        >
          <FiChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isCurrentDay = isToday(date);
          const isSelected = selectedDateObj && isSameDay(date, selectedDateObj);
          const dateStr = formatDate(date);
          const hasNotes = noteDates.includes(dateStr);
          const noteCount = hasNotes ? getNoteCount(dateStr) : 0;

          return (
            <button
              key={index}
              onClick={() => handleDateSelect(date)}
              className={`
                relative flex items-center justify-center h-6 w-full text-xs rounded
                transition-all duration-200
                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600 cursor-default' : ''}
                ${isCurrentDay && !isSelected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold' : ''}
                ${isSelected ? 'bg-green-500 text-white font-bold hover:bg-green-600' : ''}
                ${!isSelected && isCurrentMonth && !isCurrentDay ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300' : ''}
                ${hasNotes && !isSelected && !isCurrentDay ? 'text-green-600 dark:text-green-400 font-bold' : ''}
              `}
              disabled={!isCurrentMonth}
              title={`${format(date, 'yyyy年MM月dd日', { locale: zhCN })}${hasNotes ? ' (有笔记)' : ''}`}
            >
              {format(date, 'd')}
              {hasNotes && !isSelected && (
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 ${getGreenIntensity(noteCount)} rounded-full`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div className="flex items-center justify-between mt-3 pt-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => handleDateSelect(new Date(Date.now() - 24 * 60 * 60 * 1000))}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-700/50 rounded transition-colors"
          >
            昨天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-700/50 rounded transition-colors"
          >
            前天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-700/50 rounded transition-colors"
          >
            三天前
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() + 24 * 60 * 60 * 1000))}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-700/50 rounded transition-colors"
          >
            明天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-700/50 rounded transition-colors"
          >
            后天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-700/50 rounded transition-colors"
          >
            三天后
          </button>
        </div>
        
        {selectedDate && (
          <button
            onClick={handleClear}
            className="px-2 py-0.5 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
          >
            清除
          </button>
        )}
      </div>
    </div>
  );
};

export default CompactCalendarFilter;