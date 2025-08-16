import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiX } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';

const CalendarFilterView = ({ onDateChange, selectedDate, noteDates = [] }) => {
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

  // 回到当前月
  const handleCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const calendarDays = getCalendarDays();
  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

  return (
    <div className="calendar-filter-view bg-surface dark:bg-gray-800 rounded-lg shadow-sm border border-border dark:border-gray-700 p-6 mb-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FiCalendar className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            
          </h3>
          {selectedDate && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-full">
              <span className="text-sm text-primary-700 dark:text-primary-300">
                {format(toZonedTime(new Date(selectedDate), 'Asia/Shanghai'), 'yyyy年MM月dd日', { locale: zhCN })}
              </span>
              <button
                onClick={handleClear}
                className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-300"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-md transition-colors"
          >
            今天
          </button>
          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-theme-elevated rounded-md transition-colors"
          >
            本月
          </button>
        </div>
      </div>

      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-theme-elevated rounded-md transition-colors"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span>上月</span>
        </button>
        
        <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
        </div>
        
        <button
          onClick={handleNextMonth}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-theme-elevated rounded-md transition-colors"
        >
          <span>下月</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isCurrentDay = isToday(date);
          const isSelected = selectedDateObj && isSameDay(date, selectedDateObj);
          const dateStr = formatDate(date);
          const hasNotes = noteDates.includes(dateStr);

          return (
            <button
              key={index}
              onClick={() => handleDateSelect(date)}
              className={`
                relative flex items-center justify-center h-10 w-full text-sm rounded-lg
                transition-all duration-200 font-medium
                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600 cursor-default' : ''}
                ${isCurrentDay && !isSelected ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 ring-2 ring-primary-200 dark:ring-primary-700' : ''}
                ${isSelected ? 'bg-primary-500 text-white shadow-md hover:bg-primary-600' : ''}
                ${!isSelected && isCurrentMonth && !isCurrentDay ? 'hover:bg-theme-elevated text-gray-700 dark:text-gray-300' : ''}"''}
                ${hasNotes && !isSelected && !isCurrentDay ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}
              `}
              disabled={!isCurrentMonth}
              title={`${format(date, 'yyyy年MM月dd日', { locale: zhCN })}${hasNotes ? ' (有笔记)' : ''}`}
            >
              {format(date, 'd')}
              {hasNotes && !isSelected && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDateSelect(new Date())}
            className="px-3 py-1 text-xs bg-theme-elevated hover:bg-theme-border rounded-md transition-colors"
          >
            今天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() - 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-xs bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500 rounded-md transition-colors"
          >
            昨天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-xs bg-green-200 dark:bg-green-600 hover:bg-green-300 dark:hover:bg-green-500 rounded-md transition-colors"
          >
            前天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-xs bg-purple-200 dark:bg-purple-600 hover:bg-purple-300 dark:hover:bg-purple-500 rounded-md transition-colors"
          >
            三天前
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() + 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-xs bg-yellow-200 dark:bg-yellow-600 hover:bg-yellow-300 dark:hover:bg-yellow-500 rounded-md transition-colors"
          >
            明天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-xs bg-pink-200 dark:bg-pink-600 hover:bg-pink-300 dark:hover:bg-pink-500 rounded-md transition-colors"
          >
            后天
          </button>
          <button
            onClick={() => handleDateSelect(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-xs bg-indigo-200 dark:bg-indigo-600 hover:bg-indigo-300 dark:hover:bg-indigo-500 rounded-md transition-colors"
          >
            三天后
          </button>
        </div>
        
        {selectedDate && (
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarFilterView;