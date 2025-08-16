import axios from 'axios';
import { API_BASE_URL } from '../config/env.js';

// 创建axios实例，支持凭证（cookies）
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 获取配置数据
export const fetchConfig = async () => {
  try {
    // 在线模式：调用API获取配置
    const response = await api.get('/config');
    return response;
  } catch (error) {
    console.error('获取配置失败:', error);
    throw error;
  }
};

// 保存配置数据
export const saveConfig = async (configData) => {
  try {
    // 在线模式：调用API保存配置
    const response = await api.post('/config', configData);
    return response;
  } catch (error) {
    console.error('保存配置失败:', error);
    throw error;
  }
};

// 获取服务器时间戳
export const fetchServerTimestamp = async () => {
  try {
    // 在线模式：调用API获取服务器时间戳
    const response = await api.get('/config/timestamp');
    return response;
  } catch (error) {
    console.error('获取服务器时间戳失败:', error);
    throw error;
  }
};

// 同步配置数据（双向同步）
export const syncConfig = async (localData) => {
  try {
    // 在线模式：调用API同步配置
    const response = await api.post('/config/sync', localData);
    return response;
  } catch (error) {
    console.error('同步配置失败:', error);
    throw error;
  }
};

// 拉取配置数据
export const pullConfig = async () => {
  try {
    // 在线模式：调用API拉取配置
    const response = await api.get('/config/pull');
    return response;
  } catch (error) {
    console.error('拉取配置失败:', error);
    throw error;
  }
};

// 推送配置数据
export const pushConfig = async (configData) => {
  try {
    // 在线模式：调用API推送配置
    const response = await api.post('/config/push', configData);
    return response;
  } catch (error) {
    console.error('推送配置失败:', error);
    throw error;
  }
};

export default api;