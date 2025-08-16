/**
 * 日志管理器 - 用于控制应用中的日志输出
 */

class LogManager {
  constructor() {
    this.originalConsole = { ...console };
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logEnabled = !this.isProduction;
    this.disabledMethods = ['log', 'info', 'warn', 'error', 'debug'];
  }

  /**
   * 禁用所有日志输出
   */
  disableAllLogs() {
    this.disabledMethods.forEach(method => {
      if (typeof console[method] === 'function') {
        console[method] = () => {};
      }
    });
    this.logEnabled = false;
  }

  /**
   * 启用所有日志输出
   */
  enableAllLogs() {
    this.disabledMethods.forEach(method => {
      if (typeof this.originalConsole[method] === 'function') {
        console[method] = this.originalConsole[method];
      }
    });
    this.logEnabled = true;
  }

  /**
   * 禁用特定的日志方法
   * @param {string[]} methods - 要禁用的方法数组
   */
  disableMethods(methods) {
    methods.forEach(method => {
      if (typeof console[method] === 'function') {
        console[method] = () => {};
      }
    });
  }

  /**
   * 启用特定的日志方法
   * @param {string[]} methods - 要启用的方法数组
   */
  enableMethods(methods) {
    methods.forEach(method => {
      if (typeof this.originalConsole[method] === 'function') {
        console[method] = this.originalConsole[method];
      }
    });
  }

  /**
   * 根据环境自动设置日志级别
   */
  setupByEnvironment() {
    if (this.isProduction) {
      this.disableAllLogs();
    } else {
      this.enableAllLogs();
    }
  }

  /**
   * 获取当前日志状态
   * @returns {boolean} 日志是否启用
   */
  isLogEnabled() {
    return this.logEnabled;
  }
}

// 创建单例实例
const logManager = new LogManager();

// 导出单例
export default logManager;

// 便捷的导出函数
export const disableLogs = () => logManager.disableAllLogs();
export const enableLogs = () => logManager.enableAllLogs();
export const setupLogsByEnvironment = () => logManager.setupByEnvironment();