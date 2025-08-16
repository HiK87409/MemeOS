// 全局事件管理器
class GlobalEventManager {
  constructor() {
    this.listeners = {};
  }

  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // 移除事件监听器
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  // 触发事件
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`全局事件 ${event} 处理失败:`, error);
      }
    });
  }

  // 移除所有监听器
  removeAllListeners(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

// 创建全局实例
const globalEvents = new GlobalEventManager();

// 定义事件常量
export const GLOBAL_EVENTS = {
  CARD_SETTINGS_GLOBAL_UPDATE: 'card_settings_global_update',
  CARD_SETTINGS_RESET_ALL: 'card_settings_reset_all',
  NOTE_REFERENCES_UPDATED: 'note_references_updated'
};

export default globalEvents;