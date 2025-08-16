import React, { useState, useRef, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX } from 'react-icons/fi';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  getDay, 
  isAfter 
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import PortalPopup from './PortalPopup';

const TimeEditor = ({ isOpen, triggerRef, onClose, selectedDate, onDateChange }) => {
  const [selectedDateLocal, setSelectedDateLocal] = useState(new Date());
  const [timeInput, setTimeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 初始化输入值
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (selectedDate) {
        // 直接使用传入的日期，不进行时区转换
        const date = new Date(selectedDate);
        setTimeInput(format(date, 'HH:mm'));
        setSelectedDateLocal(date);
        setCurrentMonth(date);
      } else {
        // 默认使用当前时间
        const now = new Date();
        setTimeInput(format(now, 'HH:mm'));
        setSelectedDateLocal(now);
        setCurrentMonth(now);
      }
    }
  }, [selectedDate, isOpen]);

  // 处理时间输入变化
  const handleTimeChange = (e) => {
    setTimeInput(e.target.value);
    setErrorMessage(''); // 清除错误信息
  };

  // 验证时间（移除时间限制，允许选择任何时间）
  const validateDateTime = (dateTime) => {
    // 移除时间限制，允许选择任何时间
    return false; // 总是返回false，表示没有错误
  };



  // 处理日期选择
  const handleDateSelect = (date) => {
    // 保持当前时间输入，只更新日期
    const [hours, minutes] = timeInput.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    
    setSelectedDateLocal(newDate);
    setErrorMessage(''); // 清除错误信息
  };

  // 处理确认保存
  const handleConfirm = () => {
    if (!selectedDateLocal || !timeInput) {
      setErrorMessage('请选择日期和时间');
      return;
    }

    const [hours, minutes] = timeInput.split(':');
    const finalDate = new Date(selectedDateLocal);
    finalDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);

    // 验证时间（当前已移除限制）
    if (validateDateTime(finalDate)) {
      setErrorMessage('时间格式错误');
      return;
    }

    // 使用本地时间，传递Date对象而不是ISO字符串
    onDateChange && onDateChange(finalDate);
    onClose && onClose();
  };

  // 渲染日历
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // 添加前面的空白日期
    const startDay = getDay(monthStart);
    const paddingDays = Array(startDay).fill(null);
    
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="mb-3">
        {/* 月份导航 */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-border)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiChevronLeft className="h-3 w-3" />
          </button>
          <h3 className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-border)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium py-1" style={{ color: 'var(--theme-text-muted)' }}>
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
            const isSelected = selectedDateLocal && isSameDay(day, selectedDateLocal);
            const isDayToday = isToday(day);

            return (
              <button
                key={day.toString()}
                type="button"
                onClick={() => handleDateSelect(day)}
                className={`
                  h-6 w-6 flex items-center justify-center text-xs rounded-full transition-colors
                  ${isDayToday ? 'font-bold' : ''}
                  ${!isDayToday && isSelected ? 'font-bold' : ''}
                `}
                style={{
                  backgroundColor: isDayToday ? 'var(--theme-primary)' : 
                                 (!isDayToday && isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'),
                  color: isDayToday ? 'white' : 
                         (!isDayToday && isSelected ? 'var(--theme-primary)' : 'var(--theme-text)')
                }}
                onMouseEnter={(e) => {
                  if (!isDayToday && !isSelected) {
                    e.target.style.backgroundColor = 'var(--theme-border)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDayToday && !isSelected) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 如果没有打开，不渲染任何内容
  if (!isOpen) return null;

  return (
    <PortalPopup
      isOpen={isOpen}
      triggerRef={triggerRef}
      onClose={() => onClose && onClose()}
      className="rounded-lg shadow-lg border w-64"
      style={{
      backgroundColor: 'var(--theme-surface)',
      borderColor: 'var(--theme-border)'
    }}
      position="bottom-right"
    >
      <div className="p-3" style={{ backgroundColor: 'var(--theme-surface)' }}>
        {/* 标题 */}
        <div className="mb-3">
          <h3 className="text-base font-medium" style={{ color: 'var(--theme-text)' }}>选择时间</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>系统时区</p>
        </div>

        {/* 日历 */}
        {renderCalendar()}

        {/* 时间输入 */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: 'var(--theme-text-secondary)' }}>时间</label>
          <input
            type="time"
            value={timeInput}
            onChange={handleTimeChange}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
              focusRingColor: 'var(--theme-primary)'
            }}
          />
        </div>



        {/* 错误信息 */}
        {errorMessage && (
          <div className="mb-3 p-2 border rounded text-xs" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: 'var(--theme-error)'
          }}>
            {errorMessage}
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="px-3 py-1 text-xs rounded transition-colors flex items-center gap-1"
            style={{
              backgroundColor: 'var(--theme-surface)',
              color: 'var(--theme-text-secondary)',
              hoverBackgroundColor: 'var(--theme-border)'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-border)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
          >
            <FiX className="h-3 w-3" />
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3 py-1 text-xs rounded transition-colors flex items-center gap-1"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'white',
              hoverBackgroundColor: 'var(--theme-primary-hover)'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-primary-hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--theme-primary)'}
          >
            <FiCheck className="h-3 w-3" />
            确认
          </button>
        </div>
      </div>
    </PortalPopup>
  );
};

export default TimeEditor;