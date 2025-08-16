import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import Calendar from '../components/Calendar';
import { FiCalendar } from 'react-icons/fi';

const CalendarView = () => {
  return (
    <div>
      <div className="mb-6 flex items-center">
        <FiCalendar className="mr-2 h-6 w-6 text-primary-500" />
        <h2 className="text-2xl font-bold">日历视图</h2>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium">
            {format(toZonedTime(new Date(), 'Asia/Shanghai'), 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            点击日期查看对应的笔记
          </p>
        </div>
        
        <Calendar />
      </div>
    </div>
  );
};

export default CalendarView;
