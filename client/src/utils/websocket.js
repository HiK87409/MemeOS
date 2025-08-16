// WebSocket服务管理器
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = {};
  }

  // 连接WebSocket（对外接口）
  connect(userId, token) {
    // 可以在这里保存用户信息用于认证
    if (userId) this.userId = userId;
    if (token) this.token = token;
    this.init();
  }

  // 初始化WebSocket连接
  init() {
    if (this.socket) {
      return;
    }

    // 获取服务器地址
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:30002';
    

    
    // 创建Socket.IO连接
    this.socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    // 设置事件监听器
    this.setupEventListeners();

    // 开始连接
    this.socket.connect();
  }

  // 设置事件监听器
  setupEventListeners() {
    // 连接成功
    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // 发送认证信息
      this.authenticate();
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      this.connected = false;
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      this.connected = false;
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', (attempt) => {
      // 重连尝试
    });

    // 重连成功
    this.socket.on('reconnect', () => {
      this.connected = true;
      this.authenticate();
    });

    // 重连失败
    this.socket.on('reconnect_failed', () => {
      this.connected = false;
    });

    // 引用更新事件
    this.socket.on('references_updated', (data) => {
      this.emit('references_updated', data);
    });
  }

  // 用户认证（已移除认证逻辑）
  authenticate() {
    if (!this.connected) {
      return;
    }

    // 不再需要认证，直接连接
  }

  // 从token中提取用户ID（已移除，不再需要）

  // 添加事件监听器
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  // 移除事件监听器
  off(event, callback) {
    if (!this.eventListeners[event]) return;
    
    const index = this.eventListeners[event].indexOf(callback);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  // 触发事件
  emit(event, data) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        // 静默处理错误
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;

    }
  }

  // 获取连接状态
  isConnected() {
    return this.connected;
  }
}

// 创建全局WebSocket服务实例
const websocketService = new WebSocketService();

export default websocketService;