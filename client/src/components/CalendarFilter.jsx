import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CalendarFilter = ({ onDateChange, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  // 获取最近30天的日期范围
  const getLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 29);
    
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - (29 - i));
      dates.push(date);
    }
    return dates;
  };

  // 格式化日期为YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // 检查是否是今天
  const isToday = (date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  // 检查是否是选中的日期
  const isSelected = (date) => {
    return selectedDate && formatDate(date) === selectedDate;
  };

  // 获取星期几的简写
  const getWeekday = (date) => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return weekdays[date.getDay()];
  };

  // 获取月份和年份
  const getMonthYear = (date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  const last30Days = getLast30Days();

  return (
    <div className="calendar-filter mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            最近30天
          </div>
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-2">
          {/* 日期单元格 */}
          {last30Days.map(date => {
            const dateStr = formatDate(date);
            const isCurrentToday = isToday(date);
            const isCurrentSelected = isSelected(date);
            
            return (
              <button
                key={dateStr}
                onClick={() => onDateChange(dateStr)}
                onMouseEnter={() => setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  relative flex flex-col items-center justify-center 
                  w-12 h-14 rounded-md text-xs transition-all flex-shrink-0
                  ${isCurrentSelected 
                    ? 'bg-theme-primary text-white shadow-sm' 
                    : isCurrentToday 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-700' 
                      : 'hover:bg-theme-elevated text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <span className="text-xxs text-gray-500 dark:text-gray-400 mb-1">
                  {getWeekday(date)}
                </span>
                <span className="font-medium">{date.getDate()}</span>
                {isCurrentToday && (
                  <span className="text-tiny leading-none mt-1">今天</span>
                )}
              </button>
            );
          })}
        </div>
        
        {selectedDate && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                已选择: {selectedDate}
              </span>
              <button
                onClick={() => onDateChange(null)}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                清除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarFilter;