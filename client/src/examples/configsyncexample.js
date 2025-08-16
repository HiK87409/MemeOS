import localConfigManager from '../utils/localconfigmanager.js';

// 配置同步使用示例
const ConfigSyncExample = {
  // 初始化示例
  async init() {
    console.log('=== 配置同步示例 ===');
    
    // 添加事件监听器
    this.addEventListeners();
    
    // 演示基本操作
    await this.demoBasicOperations();
    
    // 演示同步功能
    await this.demoSyncOperations();
  },
  
  // 添加事件监听器
  addEventListeners() {
    // 监听标签变化
    localConfigManager.addListener('tagsChanged', (tags) => {
      console.log('标签发生变化:', tags);
    });
    
    // 监听标签颜色变化
    localConfigManager.addListener('tagColorsChanged', (colors) => {
      console.log('标签颜色发生变化:', colors);
    });
    
    // 监听用户偏好变化
    localConfigManager.addListener('userPreferencesChanged', (preferences) => {
      console.log('用户偏好发生变化:', preferences);
    });
    
    // 监听配置导入事件
    localConfigManager.addListener('configImported', (config) => {
      console.log('配置导入完成:', config);
    });
    
    // 监听配置清除事件
    localConfigManager.addListener('configCleared', (config) => {
      console.log('配置已清除:', config);
    });
  },
  
  // 演示基本操作
  async demoBasicOperations() {
    console.log('\n--- 基本操作演示 ---');
    
    // 获取当前配置
    const tags = localConfigManager.getTags();
    const tagColors = localConfigManager.getTagColors();
    const preferences = localConfigManager.getUserPreferences();
    
    console.log('当前标签:', tags);
    console.log('当前标签颜色:', tagColors);
    console.log('当前用户偏好:', preferences);
    
    // 添加新标签
    const newTag = await localConfigManager.addTag({
      name: '新标签',
      isPinned: false,
      isParent: false
    });
    console.log('添加新标签:', newTag);
    
    // 设置标签颜色
    await localConfigManager.setTagColor('新标签', '#FF5733');
    console.log('设置标签颜色');
    
    // 更新用户偏好
    await localConfigManager.setUserPreferences({
      expandAllTags: true,
      theme: 'dark'
    });
    console.log('更新用户偏好');
  },
  
  // 演示同步功能
  async demoSyncOperations() {
    console.log('\n--- 数据库持久化功能演示 ---');
    
    // 检查在线状态
    const isOnline = localConfigManager.isOnlineMode();
    console.log('当前在线状态:', isOnline ? '在线' : '离线');
    
    // 手动同步
    console.log('开始手动同步...');
    try {
      await localConfigManager.forceSync();
      console.log('同步成功');
    } catch (error) {
      console.log('同步失败:', error.message);
    }
    
    // 重新从数据库加载
    console.log('重新从数据库加载...');
    try {
      await localConfigManager.reloadFromDatabase();
      console.log('重新加载成功');
    } catch (error) {
      console.log('重新加载失败:', error.message);
    }
    
    // 导出配置
    const exportedConfig = localConfigManager.exportConfig();
    console.log('导出的配置:', exportedConfig);
    
    // 导入配置
    console.log('导入配置...');
    try {
      const importresult = await localconfigmanager.importconfig(exportedconfig);
      console.log('导入结果:', importresult ? '成功' : '失败');
    } catch (error) {
      console.log('导入失败:', error.message);
    }
  },
  
  // 清理
  cleanup() {
    console.log('示例清理完成');
  }
};

// 自动运行示例
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.addEventListener('load', () => {
    ConfigSyncExample.init();
  });
  
  window.addEventListener('beforeunload', () => {
    ConfigSyncExample.cleanup();
  });
} else {
  // Node.js环境
  ConfigSyncExample.init()
    .then(() => {
      console.log('示例运行完成');
    })
    .catch((error) => {
      console.error('示例运行失败:', error);
    })
    .finally(() => {
      ConfigSyncExample.cleanup();
    });
}

export default ConfigSyncExample;