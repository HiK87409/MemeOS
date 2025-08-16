import { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiX, FiChevronLeft, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const CalendarPicker = ({ selectedDate, onDateChange, noteDates = [], className = '' }) => {
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
  const clearFilter = (e) => {
    e.stopPropagation();
    e.preventDefault();
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
            className="p-1 hover:bg-theme-elevated rounded transition-colors"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-medium">
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-theme-elevated rounded transition-colors"
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
                  ${!isDayToday && !isSelected ? 'hover:bg-theme-elevated' : ''}"''}
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
              onClick={() => handleDateSelect(new Date())}
              className="px-2 py-1 text-xs bg-light-elevated dark:bg-dark-elevated hover:bg-light-border dark:hover:bg-dark-border rounded transition-colors"
            >
              今天
            </button>
            <button
              onClick={() => handleDateSelect(new Date(Date.now() - 24 * 60 * 60 * 1000))}
              className="px-2 py-1 text-xs bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500 rounded transition-colors"
            >
              昨天
            </button>
            <button
              onClick={() => handleDateSelect(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))}
              className="px-2 py-1 text-xs bg-green-200 dark:bg-green-600 hover:bg-green-300 dark:hover:bg-green-500 rounded transition-colors"
            >
              前天
            </button>
            <button
              onClick={() => handleDateSelect(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))}
              className="px-2 py-1 text-xs bg-purple-200 dark:bg-purple-600 hover:bg-purple-300 dark:hover:bg-purple-500 rounded transition-colors"
            >
              三天前
            </button>
            <button
              onClick={() => handleDateSelect(new Date(Date.now() + 24 * 60 * 60 * 1000))}
              className="px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-600 hover:bg-yellow-300 dark:hover:bg-yellow-500 rounded transition-colors"
            >
              明天
            </button>
            <button
              onClick={() => handleDateSelect(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))}
              className="px-2 py-1 text-xs bg-pink-200 dark:bg-pink-600 hover:bg-pink-300 dark:hover:bg-pink-500 rounded transition-colors"
            >
              后天
            </button>
            <button
              onClick={() => handleDateSelect(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))}
              className="px-2 py-1 text-xs bg-indigo-200 dark:bg-indigo-600 hover:bg-indigo-300 dark:hover:bg-indigo-500 rounded transition-colors"
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
      {/* 日历选择按钮 */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-theme-elevated transition-colors"
        >
          <FiCalendar className="h-4 w-4 text-gray-900 dark:text-gray-100" />
          <span className="text-gray-900 dark:text-gray-100">
            {selectedDate ? (
              format(parseISO(selectedDate), 'MM月dd日', { locale: zhCN })
            ) : (
              '选择日期'
            )}
          </span>
          <FiChevronDown className={`h-4 w-4 text-gray-900 dark:text-gray-100 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* 清除按钮 */}
        {selectedDate && (
          <button
            type="button"
            onClick={clearFilter}
            className="ml-2 p-1 hover:text-red-500 transition-colors text-gray-500 dark:text-gray-400"
            title="清除日期筛选"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* 日期选择面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 lg:right-0 lg:left-auto mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50 min-w-80">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default CalendarPicker;