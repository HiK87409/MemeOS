import React, { useState, useRef, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiCalendar } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';

const RealCalendarFilter = ({ onDateChange, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
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
    onDateChange(dateStr);
    setIsOpen(false);
  };

  // 清除选择
  const handleClear = () => {
    onDateChange(null);
    setIsOpen(false);
  };

  // 回到今天
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateChange(formatDate(today));
    setIsOpen(false);
  };

  const calendarDays = getCalendarDays();
  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

  return (
    <div className="real-calendar-filter relative">
      {/* 触发器 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 h-10 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-theme-elevated transition-colors"
      >
        <FiCalendar className="h-4 w-4 text-gray-900 dark:text-gray-100" />
        <span className="text-gray-900 dark:text-gray-100">
          {selectedDate ? format(toZonedTime(new Date(selectedDate), 'Asia/Shanghai'), 'MM月dd日', { locale: zhCN }) : '选择日期'}
        </span>
        <FiChevronDown className={`h-4 w-4 text-gray-900 dark:text-gray-100 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 日历弹窗 */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 max-w-viewport-safe"
             style={{
               transform: 'translateX(min(0px, calc(100vw - 100% - 16px)))'
             }}>
          {/* 头部导航 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-theme-elevated rounded transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-theme-elevated rounded transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
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
              const isCurrentDay = isSameDay(date, new Date());
              const isSelected = selectedDateObj && isSameDay(date, selectedDateObj);

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  className={`
                    flex items-center justify-center h-8 w-8 text-sm rounded
                    transition-all duration-200
                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                    ${isCurrentDay ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold' : ''}
                    ${isSelected ? 'bg-theme-primary text-white hover:bg-theme-primary-hover' : ''}
                    ${!isSelected && isCurrentMonth && !isCurrentDay ? 'hover:bg-theme-elevated text-gray-700 dark:text-gray-300' : ''}"''}
                  `}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleToday}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              今天
            </button>
            
            {selectedDate && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                清除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default RealCalendarFilter;