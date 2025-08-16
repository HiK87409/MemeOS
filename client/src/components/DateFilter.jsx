import { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';

const DateFilter = ({ selectedDate, onDateChange, noteDates = [], className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef(null);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 处理日期选择
  const handleDateSelect = (date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    // 如果选择的是已选中的日期，则取消筛选
    if (selectedDate === dateString) {
      onDateChange(null);
    } else {
      onDateChange(dateString);
    }
    setIsOpen(false);
  };
  
  // 清除筛选
  const clearFilter = () => {
    onDateChange(null);
    setIsOpen(false);
  };
  
  // 切换月份
  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // 渲染日历
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    return (
      <div className="p-4">
        {/* 月份导航 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-1 hover:bg-theme-elevated rounded"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-medium">
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-theme-elevated rounded"
          >
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayString = format(day, 'yyyy-MM-dd');
            const hasNotes = noteDates.includes(dayString);
            const isSelected = selectedDate === dayString;
            const isDayToday = isToday(day);
            
            return (
              <button
                key={dayString}
                onClick={() => handleDateSelect(day)}
                className={`
                  h-8 w-8 flex items-center justify-center text-xs rounded-full transition-colors
                  ${isDayToday ? 'bg-primary-500 text-white font-bold' : ''}
                  ${!isDayToday && isSelected ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold' : ''}
                  ${!isDayToday && !isSelected ? 'hover:bg-theme-elevated' : ''}
                  ${hasNotes && !isDayToday && !isSelected ? 'font-bold text-primary-600 dark:text-primary-400' : ''}
                  ${!hasNotes && !isDayToday && !isSelected ? 'text-gray-700 dark:text-gray-300' : ''}
                `}
                title={`${format(day, 'yyyy年MM月dd日', { locale: zhCN })}${hasNotes ? ' (有笔记)' : ''}`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
        
        {/* 快捷选择 */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                // 获取系统时区的今天
                const today = new Date();
                handleDateSelect(today);
              }}
              className="px-2 py-1 text-xs bg-theme-elevated hover:bg-theme-border rounded"
            >
              今天
            </button>
            <button
              onClick={() => {
                // 获取系统时区的昨天
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                handleDateSelect(yesterday);
              }}
              className="px-2 py-1 text-xs bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500 rounded"
            >
              昨天
            </button>
            <button
              onClick={() => {
                // 获取系统时区的前天
                const dayBeforeYesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
                handleDateSelect(dayBeforeYesterday);
              }}
              className="px-2 py-1 text-xs bg-green-200 dark:bg-green-600 hover:bg-green-300 dark:hover:bg-green-500 rounded"
            >
              前天
            </button>
            <button
              onClick={() => {
                // 获取系统时区的三天前
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                handleDateSelect(threeDaysAgo);
              }}
              className="px-2 py-1 text-xs bg-purple-200 dark:bg-purple-600 hover:bg-purple-300 dark:hover:bg-purple-500 rounded"
            >
              三天前
            </button>
            <button
              onClick={() => {
                // 获取系统时区的明天
                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                handleDateSelect(tomorrow);
              }}
              className="px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-600 hover:bg-yellow-300 dark:hover:bg-yellow-500 rounded"
            >
              明天
            </button>
            <button
              onClick={() => {
                // 获取系统时区的后天
                const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                handleDateSelect(dayAfterTomorrow);
              }}
              className="px-2 py-1 text-xs bg-pink-200 dark:bg-pink-600 hover:bg-pink-300 dark:hover:bg-pink-500 rounded"
            >
              后天
            </button>
            <button
              onClick={() => {
                // 获取系统时区的三天后
                const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                handleDateSelect(threeDaysLater);
              }}
              className="px-2 py-1 text-xs bg-indigo-200 dark:bg-indigo-600 hover:bg-indigo-300 dark:hover:bg-indigo-500 rounded"
            >
              三天后
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 筛选按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-3 py-1 text-sm rounded-md border transition-colors
          ${selectedDate 
            ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300' 
            : 'bg-theme-surface border-theme-border text-theme-text hover:bg-theme-elevated'}
        `}
      >
        <FiCalendar className="h-4 w-4 mr-2" />
        {selectedDate ? (
          <>
            {format(parseISO(selectedDate), 'MM月dd日', { locale: zhCN })}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilter();
              }}
              className="ml-2 hover:text-red-500"
            >
              <FiX className="h-3 w-3" />
            </button>
          </>
        ) : (
          '选择日期'
        )}
      </button>
      
      {/* 日期选择面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-theme-surface rounded-lg shadow-lg border border-theme-border z-20 min-w-80">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default DateFilter;
