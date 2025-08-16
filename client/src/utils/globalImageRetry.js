/**
 * 全局图片重试管理系统
 * 集中管理所有图片的加载状态和重试逻辑
 */

// 全局图片状态存储
const globalImageState = {
  // 存储所有图片的状态: { url: { status, retryCount, lastError, timestamp } }
  imageStates: new Map(),
  
  // 全局配置
  config: {
    maxRetries: 3,                    // 最大重试次数
    retryDelay: 1000,                 // 重试延迟(毫秒)
    permanentFailureCodes: [404],     // 永久失败状态码
    cacheTimeout: 5 * 60 * 1000,      // 状态缓存超时时间(5分钟)
    enableGlobalRetry: true,          // 启用全局重试
    logLevel: 'warn'                  // 日志级别
  },
  
  // 重试队列
  retryQueue: [],
  
  // 是否正在处理重试队列
  isProcessingQueue: false
};

/**
 * 初始化全局图片重试系统
 * @param {Object} config - 配置选项
 */
export function initGlobalImageRetry(config = {}) {
  globalImageState.config = {
    ...globalImageState.config,
    ...config
  };
  
  console.log('[全局图片重试] 系统已初始化', globalImageState.config);
}

/**
 * 获取图片状态
 * @param {string} url - 图片URL
 * @returns {Object} 图片状态
 */
export function getImageState(url) {
  if (!url) return null;
  
  const state = globalImageState.imageStates.get(url);
  
  // 检查状态是否过期
  if (state && Date.now() - state.timestamp > globalImageState.config.cacheTimeout) {
    globalImageState.imageStates.delete(url);
    return null;
  }
  
  return state;
}

/**
 * 设置图片状态
 * @param {string} url - 图片URL
 * @param {Object} state - 新状态
 */
export function setImageState(url, state) {
  if (!url) return;
  
  const fullState = {
    ...state,
    timestamp: Date.now()
  };
  
  globalImageState.imageStates.set(url, fullState);
  
  if (globalImageState.config.logLevel === 'debug') {
    console.log('[全局图片重试] 状态更新:', url, fullState);
  }
}

/**
 * 检查是否应该重试
 * @param {string} url - 图片URL
 * @param {Object} error - 错误信息
 * @returns {boolean} 是否应该重试
 */
export function shouldRetry(url, error = {}) {
  const state = getImageState(url);
  
  // 如果没有状态记录，允许首次加载
  if (!state) return true;
  
  // 检查是否达到最大重试次数
  if (state.retryCount >= globalImageState.config.maxRetries) {
    if (globalImageState.config.logLevel !== 'silent') {
      console.warn('[全局图片重试] 已达到最大重试次数，停止重试:', url);
    }
    return false;
  }
  
  // 检查是否是永久失败错误
  const statusCode = error.status || error.statusCode || 0;
  if (globalImageState.config.permanentFailureCodes.includes(statusCode)) {
    if (globalImageState.config.logLevel !== 'silent') {
      console.warn('[全局图片重试] 检测到永久失败错误，停止重试:', url, statusCode);
    }
    return false;
  }
  
  // 检查错误类型
  const errorMessage = (error.message || '').toLowerCase();
  if (errorMessage.includes('corb') || errorMessage.includes('cors')) {
    // 跨域错误通常重试也没用，但可以给一次机会
    return state.retryCount === 0;
  }
  
  return true;
}

/**
 * 处理图片加载错误
 * @param {string} url - 图片URL
 * @param {Object} error - 错误信息
 * @returns {Object} 处理后的状态
 */
export function handleImageError(url, error = {}) {
  if (!url) return null;
  
  const state = getImageState(url) || {
    status: 'loading',
    retryCount: 0,
    lastError: null
  };
  
  const statusCode = error.status || error.statusCode || 0;
  const isPermanentFailure = globalImageState.config.permanentFailureCodes.includes(statusCode);
  
  // 检查是否达到最大重试次数
  const hasReachedMaxRetries = state.retryCount >= globalImageState.config.maxRetries;
  
  const newState = {
    status: isPermanentFailure || hasReachedMaxRetries ? 'permanent-failure' : 'error',
    retryCount: state.retryCount + 1,
    lastError: {
      message: error.message || 'Unknown error',
      status: statusCode,
      timestamp: Date.now()
    }
  };
  
  setImageState(url, newState);
  
  // 如果应该重试，添加到重试队列
  if (shouldRetry(url, error) && globalImageState.config.enableGlobalRetry) {
    addToRetryQueue(url);
  }
  
  return newState;
}

/**
 * 处理图片加载成功
 * @param {string} url - 图片URL
 */
export function handleImageSuccess(url) {
  if (!url) return;
  
  const newState = {
    status: 'success',
    retryCount: 0,
    lastError: null
  };
  
  setImageState(url, newState);
  
  if (globalImageState.config.logLevel === 'debug') {
    console.log('[全局图片重试] 图片加载成功:', url);
  }
}

/**
 * 添加到重试队列
 * @param {string} url - 图片URL
 */
function addToRetryQueue(url) {
  if (!url) return;
  
  // 检查是否已在队列中
  const exists = globalImageState.retryQueue.some(item => item.url === url);
  if (exists) return;
  
  globalImageState.retryQueue.push({
    url,
    timestamp: Date.now(),
    delay: globalImageState.config.retryDelay
  });
  
  if (globalImageState.config.logLevel === 'debug') {
    console.log('[全局图片重试] 添加到重试队列:', url);
  }
  
  // 如果没有正在处理队列，开始处理
  if (!globalImageState.isProcessingQueue) {
    processRetryQueue();
  }
}

/**
 * 处理重试队列
 */
async function processRetryQueue() {
  if (globalImageState.isProcessingQueue || globalImageState.retryQueue.length === 0) {
    return;
  }
  
  globalImageState.isProcessingQueue = true;
  
  try {
    while (globalImageState.retryQueue.length > 0) {
      const item = globalImageState.retryQueue.shift();
      
      // 检查是否应该跳过重试
      const state = getImageState(item.url);
      if (!state || state.status === 'success') {
        continue;
      }
      
      // 等待重试延迟
      const now = Date.now();
      const elapsed = now - item.timestamp;
      const remainingDelay = Math.max(0, item.delay - elapsed);
      
      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
      }
      
      // 再次检查是否应该重试
      if (!shouldRetry(item.url, state.lastError || {})) {
        continue;
      }
      
      // 触发重试
      if (globalImageState.config.logLevel !== 'silent') {
        console.log('[全局图片重试] 执行重试:', item.url, `重试次数: ${state.retryCount}`);
      }
      
      // 更新状态为loading
      setImageState(item.url, {
        ...state,
        status: 'loading'
      });
      
      // 触发全局重试事件
      triggerGlobalRetry(item.url);
    }
  } catch (error) {
    console.error('[全局图片重试] 处理重试队列时出错:', error);
  } finally {
    globalImageState.isProcessingQueue = false;
  }
}

/**
 * 触发全局重试事件
 * @param {string} url - 图片URL
 */
function triggerGlobalRetry(url) {
  // 创建自定义事件
  const event = new CustomEvent('globalImageRetry', {
    detail: { url }
  });
  
  // 在document上触发事件
  document.dispatchEvent(event);
  
  if (globalImageState.config.logLevel === 'debug') {
    console.log('[全局图片重试] 触发重试事件:', url);
  }
}

/**
 * 清理过期的状态记录
 */
export function cleanupExpiredStates() {
  const now = Date.now();
  const expiredUrls = [];
  
  for (const [url, state] of globalImageState.imageStates) {
    if (now - state.timestamp > globalImageState.config.cacheTimeout) {
      expiredUrls.push(url);
    }
  }
  
  expiredUrls.forEach(url => {
    globalImageState.imageStates.delete(url);
  });
  
  if (expiredUrls.length > 0 && globalImageState.config.logLevel === 'debug') {
    console.log('[全局图片重试] 清理过期状态:', expiredUrls.length, '个记录');
  }
}

/**
 * 获取全局统计信息
 * @returns {Object} 统计信息
 */
export function getGlobalStats() {
  const stats = {
    totalImages: globalImageState.imageStates.size,
    loadingCount: 0,
    successCount: 0,
    errorCount: 0,
    permanentFailureCount: 0,
    retryQueueLength: globalImageState.retryQueue.length,
    isProcessingQueue: globalImageState.isProcessingQueue
  };
  
  for (const state of globalImageState.imageStates.values()) {
    switch (state.status) {
      case 'loading':
        stats.loadingCount++;
        break;
      case 'success':
        stats.successCount++;
        break;
      case 'error':
        stats.errorCount++;
        break;
      case 'permanent-failure':
        stats.permanentFailureCount++;
        break;
    }
  }
  
  return stats;
}

/**
 * 重置全局状态（用于测试或重置）
 */
export function resetGlobalState() {
  globalImageState.imageStates.clear();
  globalImageState.retryQueue = [];
  globalImageState.isProcessingQueue = false;
  
  console.log('[全局图片重试] 全局状态已重置');
}

// 定期清理过期状态
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredStates, 60000); // 每分钟清理一次
}

// 导出全局状态（用于调试）
if (process.env.NODE_ENV === 'development') {
  window.globalImageRetry = {
    getState: () => globalImageState,
    getStats: getGlobalStats,
    reset: resetGlobalState,
    cleanup: cleanupExpiredStates
  };
}