const express = require('express');

// 默认用户ID常量
const userId = 'default_user';

class ConfigRouter {
  constructor(configModel) {
    this.configModel = configModel;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // 获取用户配置
    this.router.get('/', async (req, res) => {
      try {
        console.log('[CONFIG] 获取用户配置: default_user'); // 使用全局userId常量
        
        // 获取用户所有配置（使用固定用户ID）
        const configs = await this.configModel.getAllUserConfigs(userId);
        
        // 构建响应数据
        const responseData = {
          tags: configs.tags?.data || [],
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
        console.log('[CONFIG] 拉取配置: default_user'); // 使用全局userId常量
        
        const configs = await this.configModel.getAllUserConfigs(userId);
        
        const responseData = {
          tags: configs.tags?.data || [],
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
}

module.exports = ConfigRouter;
