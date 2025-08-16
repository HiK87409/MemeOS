// 模式切换工具
// 用于在本地模式和服务器模式之间切换

/**
 * 切换到服务器模式
 */
export const switchToServerMode = () => {
  // 清除本地模式相关的设置
  localStorage.removeItem('灰灰笔记_local_mode');
  localStorage.removeItem('灰灰笔记_use_local_api');
  
  // 移除URL参数中的localMode
  const url = new URL(window.location.href);
  url.searchParams.delete('localMode');
  
  // 刷新页面以应用新的模式设置
  window.location.href = url.toString();
};

/**
 * 切换到本地模式
 */
export const switchToLocalMode = () => {
  // 设置本地模式
  localStorage.setItem('灰灰笔记_local_mode', 'true');
  
  // 刷新页面以应用新的模式设置
  window.location.reload();
};

/**
 * 获取当前模式状态
 * @returns {Object} 包含当前模式信息的对象
 */
export const getCurrentMode = () => {
  const isLocalMode = localStorage.getItem('灰灰笔记_local_mode') === 'true' ||
                      localStorage.getItem('灰灰笔记_use_local_api') === 'true' ||
                      window.Capacitor !== undefined;
  
  const urlParams = new URLSearchParams(window.location.search);
  const localModeFromUrl = urlParams.get('localMode') === 'true';
  
  return {
    isLocalMode: isLocalMode || localModeFromUrl,
    isServerMode: !(isLocalMode || localModeFromUrl),
    isCapacitor: window.Capacitor !== undefined,
    hasLocalModeStorage: localStorage.getItem('灰灰笔记_local_mode') === 'true',
    hasUseLocalApiStorage: localStorage.getItem('灰灰笔记_use_local_api') === 'true',
    hasLocalModeUrlParam: localModeFromUrl
  };
};

/**
 * 重置所有模式相关设置
 */
export const resetModeSettings = () => {
  localStorage.removeItem('灰灰笔记_local_mode');
  localStorage.removeItem('灰灰笔记_use_local_api');
  localStorage.removeItem('API_BASE_URL');
  
  // 移除URL参数
  const url = new URL(window.location.href);
  url.searchParams.delete('localMode');
  
  window.location.href = url.toString();
};

/**
 * 设置自定义API服务器地址
 * @param {string} apiUrl - API服务器地址
 */
export const setCustomApiUrl = (apiUrl) => {
  if (apiUrl && apiUrl.trim()) {
    localStorage.setItem('API_BASE_URL', apiUrl.trim());
    // 清除本地模式设置
    localStorage.removeItem('灰灰笔记_local_mode');
    localStorage.removeItem('灰灰笔记_use_local_api');
    window.location.reload();
  }
};

/**
 * 获取当前API服务器地址
 * @returns {string} 当前API服务器地址
 */
export const getCurrentApiUrl = () => {
  return localStorage.getItem('API_BASE_URL') || '默认地址';
};