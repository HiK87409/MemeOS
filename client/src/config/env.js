// 环境配置
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// 检测是否在Capacitor环境中运行
const isCapacitor = () => {
  return window.Capacitor !== undefined;
};



// 根据环境确定API基础URL
let API_BASE_URL;

// 检查是否有动态设置的API URL（本地服务器）
const dynamicApiUrl = typeof window !== 'undefined' ? localStorage.getItem('API_BASE_URL') : null;
if (dynamicApiUrl) {
  API_BASE_URL = dynamicApiUrl;

} else if (isCapacitor()) {
  // 在Capacitor环境中，使用动态设置的URL或回退到localhost
  API_BASE_URL = dynamicApiUrl || 'http://localhost:30002/api';
} else if (isDevelopment) {
  // 开发环境
  API_BASE_URL = 'http://localhost:30002/api';
} else {
  // 生产环境
  API_BASE_URL = '/api';
}

console.log('当前环境:', {
  isDevelopment,
  isProduction,
  isCapacitor: isCapacitor(),
  API_BASE_URL
});

export { API_BASE_URL, isDevelopment, isProduction, isCapacitor };