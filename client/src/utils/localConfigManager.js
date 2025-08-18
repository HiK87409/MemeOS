// 本地配置管理工具
// 支持本地存储和数据库持久化的配置管理器

// 导入API函数
import { fetchConfig, saveConfig } from '../api/configapi.js';

// 配置键名
const CONFIG_KEYS = {
  TAGS: 'memeos_tags',
  TAG_COLORS: 'memeos_tag_colors',
  USER_PREFERENCES: 'memeos_user_preferences'
};

// 默认配置
const DEFAULT_CONFIG = {
  tags: [],
  tagColors: {},
  userPreferences: {
    expandAllTags: false
  }
};

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 深拷贝对象
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// 本地存储管理类（支持数据库持久化）
class LocalConfigManager {
  constructor() {
    this.config = deepClone(DEFAULT_CONFIG);
    this.listeners = new Map();
    this.isOnline = false; // 是否在线模式
    this.syncInProgress = false; // 同步进行中标志
    this.init();
  }

  // 初始化配置
  async init() {
    try {
      // 首先尝试从数据库加载配置
      await this.loadFromDatabase();
      
      // 如果数据库加载失败，从本地存储加载作为回退
      if (!this.config.tags.length && !Object.keys(this.config.tagColors).length) {
        const savedConfig = localStorage.getItem(CONFIG_KEYS.TAGS);
        const savedColors = localStorage.getItem(CONFIG_KEYS.TAG_COLORS);
        const savedPreferences = localStorage.getItem(CONFIG_KEYS.USER_PREFERENCES);

        // 对从本地存储加载的标签数据进行字段转换，确保数据结构一致
        const parsedTags = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG.tags;
        const processedTags = parsedTags.map(tag => ({
          ...tag,
          // 将数据库的parent_id字段转换为前端的parentId字段（兼容旧数据）
          parentId: tag.parent_id !== null ? tag.parent_id : (tag.parentId || null),
          // 确保sort_order字段存在
          sort_order: tag.sort_order !== undefined ? tag.sort_order : (tag.sort_order || 0)
        }));

        this.config = {
          tags: processedTags,
          tagColors: savedColors ? JSON.parse(savedColors) : DEFAULT_CONFIG.tagColors,
          userPreferences: savedPreferences ? JSON.parse(savedPreferences) : DEFAULT_CONFIG.userPreferences
        };
      }

      // 保存到本地存储作为缓存
      this.saveToLocalStorage();
      
    } catch (error) {
      console.error('初始化配置失败:', error);
      this.config = deepClone(DEFAULT_CONFIG);
      this.saveToLocalStorage();
    }
  }

  // 从数据库加载配置
  async loadFromDatabase() {
    try {
      const response = await fetchConfig();
      if (response.data) {
        // 对标签数据进行字段转换和排序
        const processedTags = (response.data.tags || DEFAULT_CONFIG.tags).map(tag => ({
          ...tag,
          // 将数据库的parent_id字段转换为前端的parentId字段
          parentId: tag.parent_id !== null ? tag.parent_id : null,
          // 确保sort_order字段存在
          sort_order: tag.sort_order !== undefined ? tag.sort_order : 0
        }));
        
        const sortedTags = processedTags.sort((a, b) => {
          // 如果有sort_order字段，按照sort_order排序
          if (a.sort_order !== undefined && b.sort_order !== undefined) {
            return a.sort_order - b.sort_order;
          }
          // 如果没有sort_order字段，按照id排序作为后备
          return a.id - b.id;
        });
        
        this.config = {
          tags: sortedTags,
          tagColors: response.data.tagColors || DEFAULT_CONFIG.tagColors,
          userPreferences: response.data.userPreferences || DEFAULT_CONFIG.userPreferences
        };
        this.isOnline = true;
        console.log('从数据库加载配置成功，标签已按sort_order排序');
        
        // 通知监听器数据已更新
        this.notifyListeners('tagsChanged', this.config.tags);
        this.notifyListeners('tagColorsChanged', this.config.tagColors);
        this.notifyListeners('userPreferencesChanged', this.config.userPreferences);
      }
    } catch (error) {
      console.warn('从数据库加载配置失败，使用本地存储:', error);
      this.isOnline = false;
    }
  }

  // 保存配置到数据库
  async saveToDatabase() {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      
      // 为标签添加sort_order字段和parent_id字段转换
      const tagsWithOrder = this.config.tags.map((tag, index) => ({
        ...tag,
        sort_order: tag.sort_order !== undefined ? tag.sort_order : index,
        // 将前端的parentId字段转换为数据库的parent_id字段
        parent_id: tag.parentId !== null ? tag.parentId : null
      }));
      
      const configData = {
        tags: tagsWithOrder,
        tagColors: this.config.tagColors,
        userPreferences: this.config.userPreferences
      };
      
      await saveConfig(configData);
      this.isOnline = true;
      console.log('配置保存到数据库成功（包含sort_order字段）');
      
    } catch (error) {
      console.error('保存配置到数据库失败:', error);
      this.isOnline = false;
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // 初始化默认标签
  initializeDefaultTags() {
    const defaultTags = [
      {
        id: generateId(),
        name: '工作',
        isPinned: true,
        children: []
      },
      {
        id: generateId(),
        name: '学习',
        isPinned: false,
        children: []
      },
      {
        id: generateId(),
        name: '项目A',
        isPinned: false,
        children: []
      },
      {
        id: generateId(),
        name: '项目B',
        isPinned: false,
        children: []
      },
      {
        id: generateId(),
        name: '编程',
        isPinned: false,
        children: []
      },
      {
        id: generateId(),
        name: '设计',
        isPinned: false,
        children: []
      }
    ];

    this.config.tags = defaultTags;
    this.saveToLocalStorage();
  }

  // 保存到本地存储
  saveToLocalStorage() {
    try {
      localStorage.setItem(CONFIG_KEYS.TAGS, JSON.stringify(this.config.tags));
      localStorage.setItem(CONFIG_KEYS.TAG_COLORS, JSON.stringify(this.config.tagColors));
      localStorage.setItem(CONFIG_KEYS.USER_PREFERENCES, JSON.stringify(this.config.userPreferences));
    } catch (error) {
      console.error('保存到本地存储失败:', error);
    }
  }

  // 智能同步策略：同时保存到本地存储和数据库
  async syncConfig() {
    // 首先保存到本地存储（快速响应）
    this.saveToLocalStorage();
    
    // 异步保存到数据库
    try {
      await this.saveToDatabase();
    } catch (error) {
      console.warn('数据库同步失败，配置已保存到本地存储:', error);
      // 不抛出错误，因为本地存储已经成功
    }
  }

  // 获取所有标签
  getTags() {
    // 确保返回的标签数据使用统一的字段格式
    const tags = deepClone(this.config.tags);
    return tags.map(tag => ({
      ...tag,
      // 统一使用parentId字段，兼容旧数据中的parent_id
      parentId: tag.parent_id !== null ? tag.parent_id : (tag.parentId || null),
      // 确保sort_order字段存在
      sort_order: tag.sort_order !== undefined ? tag.sort_order : 0
    }));
  }

  // 获取标签颜色映射
  getTagColors() {
    return deepClone(this.config.tagColors);
  }

  // 获取用户偏好
  getUserPreferences() {
    return deepClone(this.config.userPreferences);
  }

  // 设置用户偏好
  async setUserPreferences(preferences) {
    this.config.userPreferences = { ...this.config.userPreferences, ...preferences };
    await this.syncConfig();
    this.notifyListeners('userPreferencesChanged', this.config.userPreferences);
  }

  // 添加标签
  async addTag(tagData, parentId = null) {
    const newTag = {
      id: generateId(),
      name: tagData.name,
      isPinned: tagData.isPinned || false,
      children: []
    };

    // 直接添加到标签列表
    this.config.tags.push(newTag);

    await this.syncConfig();
    this.notifyListeners('tagsChanged', this.config.tags);

    return newTag;
  }

  // 更新标签
  async updateTag(tagId, updates) {
    const tag = this.findTagById(tagId);
    if (!tag) return null;

    Object.assign(tag, updates);
    await this.syncConfig();
    this.notifyListeners('tagsChanged', this.config.tags);

    return tag;
  }

  // 更新标签顺序
  async updateTagOrder(tagOrders) {
    if (!tagOrders || !Array.isArray(tagOrders)) {
      throw new Error('标签顺序数据格式不正确');
    }

    // 更新每个标签的sort_order字段
    for (const orderData of tagOrders) {
      const { tagId, sortOrder } = orderData;
      const tag = this.findTagById(tagId);
      
      if (tag) {
        tag.sort_order = sortOrder;
      }
    }

    // 按sort_order重新排序标签
    this.config.tags.sort((a, b) => {
      if (a.sort_order !== undefined && b.sort_order !== undefined) {
        return a.sort_order - b.sort_order;
      }
      return a.id - b.id;
    });

    await this.syncConfig();
    this.notifyListeners('tagsChanged', this.config.tags);
    
    console.log('标签顺序已更新到本地配置:', tagOrders);
    return true;
  }

  // 删除标签
  async deleteTag(tagId) {
    const index = this.config.tags.findIndex(tag => tag.id === tagId);
    if (index !== -1) {
      this.config.tags.splice(index, 1);
      await this.syncConfig();
      this.notifyListeners('tagsChanged', this.config.tags);
      return true;
    }
    return false;
  }

  // 设置标签颜色
  async setTagColor(tagName, color) {
    if (!tagName || !color) {
      throw new Error('标签名和颜色不能为空');
    }
    
    this.config.tagColors[tagName] = color;
    await this.syncConfig();
    this.notifyListeners('tagColorsChanged', this.config.tagColors);
  }

  // 移动标签
  async moveTag(tagId, targetParentId, index = null) {
    const tag = this.findAndRemoveTagById(tagId);
    if (!tag) return false;

    // 直接移动到指定位置
    if (index !== null && index >= 0 && index <= this.config.tags.length) {
      this.config.tags.splice(index, 0, tag);
    } else {
      this.config.tags.push(tag);
    }

    await this.syncConfig();
    this.notifyListeners('tagsChanged', this.config.tags);

    return true;
  }

  // 根据ID查找标签
  findTagById(tagId) {
    return this.config.tags.find(tag => tag.id === tagId);
  }

  // 查找并移除标签
  findAndRemoveTagById(tagId) {
    for (let i = 0; i < this.config.tags.length; i++) {
      if (this.config.tags[i].id === tagId) {
        return this.config.tags.splice(i, 1)[0];
      }
    }
    return null;
  }

  // 添加事件监听器
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // 移除事件监听器
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // 通知监听器
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器执行失败 (${event}):`, error);
        }
      });
    }
  }



  // 导出配置
  exportConfig() {
    return {
      tags: this.config.tags,
      tagColors: this.config.tagColors,
      userPreferences: this.config.userPreferences,
      exportDate: new Date().toISOString()
    };
  }

  // 导入配置
  async importConfig(configData) {
    try {
      if (configData.tags) {
        this.config.tags = configData.tags;
      }
      if (configData.tagColors) {
        this.config.tagColors = configData.tagColors;
      }
      if (configData.userPreferences) {
        this.config.userPreferences = { ...this.config.userPreferences, ...configData.userPreferences };
      }

      await this.syncConfig();
      this.notifyListeners('tagsChanged', this.config.tags);
      this.notifyListeners('tagColorsChanged', this.config.tagColors);
      this.notifyListeners('userPreferencesChanged', this.config.userPreferences);

      return true;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }

  // 清除所有数据
  async clearAllData() {
    try {
      // 清除本地存储
      localStorage.removeItem(CONFIG_KEYS.TAGS);
      localStorage.removeItem(CONFIG_KEYS.TAG_COLORS);
      localStorage.removeItem(CONFIG_KEYS.USER_PREFERENCES);
      
      // 重置配置
      this.config = deepClone(DEFAULT_CONFIG);
      
      // 尝试清除数据库中的配置（保存默认配置）
      try {
        await this.saveToDatabase();
      } catch (error) {
        console.warn('清除数据库配置失败:', error);
      }
      
      this.notifyListeners('configCleared', this.config);
      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  }

  // 清除本地缓存并重新从数据库加载
  async clearCacheAndReload() {
    try {
      console.log('清除本地缓存并重新从数据库加载...');
      
      // 清除本地存储
      localStorage.removeItem(CONFIG_KEYS.TAGS);
      localStorage.removeItem(CONFIG_KEYS.TAG_COLORS);
      localStorage.removeItem(CONFIG_KEYS.USER_PREFERENCES);
      
      // 重置配置为默认值
      this.config = deepClone(DEFAULT_CONFIG);
      
      // 强制从数据库重新加载
      await this.loadFromDatabase();
      
      // 保存到本地存储
      this.saveToLocalStorage();
      
      console.log('缓存清除并重新加载完成');
      return true;
    } catch (error) {
      console.error('清除缓存并重新加载失败:', error);
      return false;
    }
  }

  // 获取在线状态
  isOnlineMode() {
    return this.isOnline;
  }

  // 手动触发同步
  async forceSync() {
    return await this.syncConfig();
  }

  // 重新从数据库加载配置
  async reloadFromDatabase() {
    return await this.loadFromDatabase();
  }



  

}

// 创建全局实例
const localConfigManager = new LocalConfigManager();

// 初始化Promise，确保在使用前完成初始化
const initPromise = localConfigManager.init().catch(error => {
  console.error('LocalConfigManager初始化失败:', error);
});

// 导出初始化Promise，供外部使用
export const waitForInit = () => initPromise;

export default localConfigManager;
export { CONFIG_KEYS, DEFAULT_CONFIG };