import { format, parseISO, formatDistanceToNow, formatDistance } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';

/**
 * 解析日期字符串并转换为中国时区
 * @param {string} dateString - 日期字符串
 * @returns {Date} 中国时区的日期对象
 */
const parseToLocalTime = (dateString) => {
  let date;
  
  // 处理不同的日期格式
  if (dateString.includes('T') && dateString.includes('Z')) {
    // ISO格式: 2025-08-03T03:32:55.000Z (UTC时间)
    date = parseISO(dateString);
    // 转换为中国时区 (UTC+8)
    date = toZonedTime(date, 'Asia/Shanghai');
  } else if (dateString.includes('-') && dateString.includes(':')) {
    // SQLite格式: 2025-08-04 07:12:32
    // 这是本地时间，直接解析为中国时区时间
    date = new Date(dateString);
    date = toZonedTime(date, 'Asia/Shanghai');
  } else {
    // 其他格式，尝试直接解析
    date = new Date(dateString);
    // 将本地时间视为中国时区时间
    if (!isNaN(date.getTime())) {
      date = toZonedTime(date, 'Asia/Shanghai');
    }
  }
  
  return date;
};

/**
 * 格式化日期为相对时间（如"2分钟前"、"3天前"、"2分钟后"、"3天后"等）
 * @param {string} dateString - 日期字符串
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = parseToLocalTime(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无效的日期格式:', dateString);
      return dateString;
    }
    
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const isInFuture = diffInMs > 0;
    
    // 使用formatDistance获得更精确的时间显示
    const distance = formatDistance(date, now, { 
      locale: zhCN,
      includeSeconds: true // 包含秒数以获得更精确的显示
    });
    
    // 添加"前"或"后"的后缀
    return isInFuture ? `${distance}后` : `${distance}前`;
  } catch (error) {
    console.error('相对时间格式化错误:', error, '原始日期:', dateString);
    return dateString;
  }
};

/**
 * 格式化日期为完整格式（用于悬停显示）
 * @param {string} dateString - 日期字符串
 * @returns {string} 完整日期字符串
 */
export const formatFullDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = parseToLocalTime(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无效的日期格式:', dateString);
      return dateString;
    }
    
    return format(date, 'yyyy年MM月dd日 HH:mm (中国时间)', { locale: zhCN });
  } catch (error) {
    console.error('日期格式化错误:', error, '原始日期:', dateString);
    return dateString;
  }
};

/**
 * 基于未来时间优先的排序比较函数
 * 排序规则：
 * 1. 置顶笔记始终在前
 * 2. 未来时间优先，距离当前时间越近的未来时间排在越前面
 * 3. 过去时间按创建时间倒序排列
 * @param {Object} a - 第一个笔记对象
 * @param {Object} b - 第二个笔记对象
 * @returns {number} 排序结果
 */
export const sortByFuturePriority = (a, b) => {
  // 首先按置顶状态排序
  const aPinned = Boolean(a.is_pinned);
  const bPinned = Boolean(b.is_pinned);
  
  if (aPinned !== bPinned) {
    return bPinned ? 1 : -1; // 置顶的排在前面
  }
  
  // 解析时间
  const timeA = parseToLocalTime(a.created_at);
  const timeB = parseToLocalTime(b.created_at);
  const now = new Date();
  
  // 判断是否为未来时间
  const aIsFuture = timeA > now;
  const bIsFuture = timeB > now;
  
  // 如果一个是未来时间，一个不是，未来时间排在前面
  if (aIsFuture !== bIsFuture) {
    return aIsFuture ? -1 : 1;
  }
  
  // 如果都是未来时间，距离当前时间越近的排在前面（例如：1分钟后 > 1天后）
  if (aIsFuture && bIsFuture) {
    return timeA - timeB; // 升序，时间越早（越接近现在）的排在前面
  }
  
  // 如果都是过去时间，按创建时间倒序排列（创建时间晚的在前）
  return timeB - timeA; // 降序，最新创建的排在前面
};