const express = require('express');

// 默认用户ID常量
const userId = 'default_user';

class ConfigRouter {
  constructor(configModel, noteModel) {
    this.configModel = configModel;
    this.noteModel = noteModel;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // 获取用户配置
    this.router.get('/', async (req, res) => {
      try {
        console.log('[CONFIG] 获取用户配置: default_user');
        
        // 获取用户所有配置（使用固定用户ID）
        const configs = await this.configModel.getAllUserConfigs(userId);
        
        let tags = configs.tags?.data || [];
        
        // 自动同步：从笔记中提取标签，将缺失的标签添加到配置中
        tags = await this.syncNoteTags(tags);
        
        // 构建响应数据
        const responseData = {
          tags: tags,
          tagColors: configs.tagColors?.data || {},
          userPreferences: configs.userPreferences?.data || {},
          syncTimestamp: configs.tags?.updatedAt || new Date().toISOString()
        };
        
        res.json(responseData);
      } catch (error) {
        console.error('获取用户配置失败:', error);
        res.status(500).json({ error: '获取用户配置失败' });
      }
    });

    // 保存用户配置
    this.router.post('/', async (req, res) => {
      try {
        console.log('[CONFIG] 保存用户配置: default_user'); // 使用全局userId常量
        const { tags, tagColors, userPreferences } = req.body;
        
        // 保存各种配置
        if (tags !== undefined) {
          await this.configModel.saveUserConfig(userId, 'tags', tags);
        }
        
        if (tagColors !== undefined) {
          await this.configModel.saveUserConfig(userId, 'tagColors', tagColors);
        }
        
        if (userPreferences !== undefined) {
          await this.configModel.saveUserConfig(userId, 'userPreferences', userPreferences);
        }
        
        res.json({ 
          success: true, 
          message: '配置保存成功',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('保存用户配置失败:', error);
        res.status(500).json({ error: '保存用户配置失败' });
      }
    });

    // 获取服务器时间戳
    this.router.get('/timestamp', async (req, res) => {
      try {
        const timestamps = await this.configModel.getAllConfigTimestamps(userId);
        const latestTimestamp = Object.values(timestamps).reduce((latest, current) => {
          return !latest || new Date(current) > new Date(latest) ? current : latest;
        }, new Date().toISOString());
        
        res.json({ timestamp: latestTimestamp });
      } catch (error) {
        console.error('获取服务器时间戳失败:', error);
        res.status(500).json({ error: '获取服务器时间戳失败' });
      }
    });

    // 双向同步配置
    this.router.post('/sync', async (req, res) => {
      try {
        console.log('[CONFIG] 双向同步配置: default_user'); // 使用全局userId常量
        const localData = req.body;
        
        // 获取服务器当前配置
        const serverConfigs = await this.configModel.getAllUserConfigs(userId);
        
        // 合并策略：对于删除操作，应该优先使用本地数据（因为本地已经执行了删除）
        const mergedData = {
          tags: localData.tags || [], // 直接使用本地标签数据，包含删除操作的结果
          tagColors: { ...serverConfigs.tagColors?.data || {}, ...localData.tagColors || {} },
          userPreferences: { ...serverConfigs.userPreferences?.data || {}, ...localData.userPreferences || {} }
        };
        
        // 保存合并后的配置
        await this.configModel.saveUserConfig(userId, 'tags', mergedData.tags);
        await this.configModel.saveUserConfig(userId, 'tagColors', mergedData.tagColors);
        await this.configModel.saveUserConfig(userId, 'userPreferences', mergedData.userPreferences);
        
        res.json({ 
          success: true, 
          message: '配置同步成功',
          data: mergedData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('同步配置失败:', error);
        res.status(500).json({ error: '同步配置失败' });
      }
    });

    // 拉取配置
    this.router.get('/pull', async (req, res) => {
      try {
        console.log('[CONFIG] 拉取配置: default_user');
        
        const configs = await this.configModel.getAllUserConfigs(userId);
        let tags = configs.tags?.data || [];
        
        // 自动同步笔记标签
        tags = await this.syncNoteTags(tags);
        
        const responseData = {
          tags: tags,
          tagColors: configs.tagColors?.data || {},
          userPreferences: configs.userPreferences?.data || {},
          syncTimestamp: configs.tags?.updatedAt || new Date().toISOString()
        };
        
        res.json(responseData);
      } catch (error) {
        console.error('拉取配置失败:', error);
        res.status(500).json({ error: '拉取配置失败' });
      }
    });

    // 推送配置
    this.router.post('/push', async (req, res) => {
      try {
        console.log('[CONFIG] 推送配置: default_user'); // 使用全局userId常量
        const { tags, tagColors, userPreferences } = req.body;
        
        // 保存各种配置
        if (tags !== undefined) {
          await this.configModel.saveUserConfig(userId, 'tags', tags);
        }
        
        if (tagColors !== undefined) {
          await this.configModel.saveUserConfig(userId, 'tagColors', tagColors);
        }
        
        if (userPreferences !== undefined) {
          await this.configModel.saveUserConfig(userId, 'userPreferences', userPreferences);
        }
        
        res.json({ 
          success: true, 
          message: '配置推送成功',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('推送配置失败:', error);
        res.status(500).json({ error: '推送配置失败' });
      }
    });
  }

  // 合并标签数据的辅助方法
  mergeTags(serverTags, localTags) {
    const merged = [...serverTags];
    
    // 添加本地独有的标签
    localTags.forEach(localTag => {
      if (!serverTags.find(serverTag => 
        serverTag.name === localTag.name || serverTag.id === localTag.id
      )) {
        merged.push(localTag);
      }
    });
    
    return merged;
  }

  getRouter() {
    return this.router;
  }

  // 自动同步：从笔记中提取标签，将缺失的标签添加到配置中
  async syncNoteTags(tags) {
    if (!this.noteModel) return tags;
    
    try {
      const noteTagNames = await this.noteModel.getAllTagsByUserId(userId);
      const existingTagNames = new Set(tags.map(t => t.name));
      let tagsAdded = false;
      
      for (const tagName of noteTagNames) {
        if (!existingTagNames.has(tagName)) {
          const newTag = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            name: tagName,
            isPinned: false,
            parentId: null,
            sort_order: tags.length
          };
          tags.push(newTag);
          existingTagNames.add(tagName);
          tagsAdded = true;
        }
      }
      
      // 如果添加了新标签，保存回数据库
      if (tagsAdded) {
        await this.configModel.saveUserConfig(userId, 'tags', tags);
        console.log(`[CONFIG] 自动同步了笔记标签到配置中`);
      }
    } catch (syncError) {
      console.warn('[CONFIG] 笔记标签同步失败:', syncError.message);
    }
    
    return tags;
  }
}

module.exports = ConfigRouter;
