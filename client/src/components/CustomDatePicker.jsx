import { useState, useRef, useEffect } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const CustomDatePicker = ({ 
  selected, 
  onChange, 
  showTimeSelect = false, 
  className = '',
  placeholder = '选择日期时间'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());
  const [timeInput, setTimeInput] = useState('');
  const dropdownRef = useRef(null);

  // 初始化时间输入
  useEffect(() => {
    if (selected) {
      setTimeInput(format(selected, 'HH:mm'));
    } else {
      setTimeInput('');
    }
  }, [selected]);

  // 点击外部关闭
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
    let newDate = new Date(date);
    
    if (showTimeSelect && timeInput) {
      const [hours, minutes] = timeInput.split(':');
      newDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    }
    
    onChange(newDate);
    if (!showTimeSelect) {
      setIsOpen(false);
    }
  };

  // 处理时间输入
  const handleTimeChange = (e) => {
    const time = e.target.value;
    setTimeInput(time);
    
    if (selected && time) {
      const [hours, minutes] = time.split(':');
      const newDate = new Date(selected);
      newDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      onChange(newDate);
    }
  };

  // 渲染日历
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = monthStart;
    const endDate = monthEnd;

    // 获取月份的所有日期
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // 添加前面的空白日期
    const startDay = getDay(monthStart);
    const paddingDays = Array(startDay).fill(null);
    
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="p-3">
        {/* 月份导航 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-theme-elevated rounded"
          >
            <FiChevronLeft className="h-3 w-3" />
          </button>
          <h3 className="text-xs font-medium">
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-theme-elevated rounded"
          >
            <FiChevronRight className="h-3 w-3" />
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
          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="h-6 w-6" />
          ))}
          {days.map(day => {
            const isSelected = selected && isSameDay(day, selected);
            const isDayToday = isToday(day);

            return (
              <button
                key={day.toString()}
                type="button"
                onClick={() => handleDateSelect(day)}
                className={`
                  h-6 w-6 flex items-center justify-center text-xs rounded-full transition-colors
                  ${isDayToday ? 'bg-primary-500 text-white font-bold' : ''}
                  ${!isDayToday && isSelected ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold' : ''}
                  ${!isDayToday && !isSelected ? 'hover:bg-theme-elevated text-gray-700 dark:text-gray-300' : ''}"''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* 时间选择 */}
        {showTimeSelect && (
          <div className="mt-3 pt-3 border-t dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <FiClock className="h-3 w-3 text-gray-500" />
              <input
                type="time"
                value={timeInput}
                onChange={handleTimeChange}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="mt-3 pt-3 border-t dark:border-gray-700 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-300"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 text-xs bg-primary-500 hover:bg-primary-600 rounded text-white"
          >
            确定
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 输入框 - 更小尺寸 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center justify-center w-full h-full p-1 rounded text-xs text-gray-800 dark:text-gray-300 bg-theme-surface hover:bg-theme-elevated border border-gray-200 dark:border-gray-600 cursor-pointer transition-colors"
      >
        <FiCalendar className="h-2.5 w-2.5 mb-0.5" />
        <span className="text-center leading-none text-xs">
          {selected ? (
            showTimeSelect ? 
              format(selected, 'MM-dd HH:mm') : 
              format(selected, 'MM月dd日', { locale: zhCN })
          ) : (
            '日期'
          )}
        </span>
      </div>

      {/* 下拉面板 - 紧凑尺寸 */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-20 w-56">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
