# 配置管理器数据库持久化功能

## 概述
LocalConfigManager 现在支持数据库持久化功能，在保留本地存储的同时，将配置数据同步到服务器数据库。

## 主要特性

### 1. 双重存储策略
- **本地存储 (localStorage)**: 快速响应，离线可用
- **数据库持久化**: 数据安全，多设备同步

### 2. 智能同步机制
- 优先从数据库加载配置
- 数据库失败时自动回退到本地存储
- 所有修改操作同时保存到本地和数据库
- 异步同步，不阻塞用户操作

### 3. 错误处理
- 数据库连接失败时自动降级到本地模式
- 同步失败时保留本地数据
- 详细的错误日志记录

## 使用方法

### 基本使用
```javascript
import localConfigManager, { waitForInit } from './utils/localconfigmanager.js';

// 确保初始化完成
await waitForInit();

// 添加标签
await localConfigManager.addTag({
  id: 'tag1',
  name: '工作',
  color: '#ff0000'
});

// 更新标签
await localConfigManager.updateTag('tag1', { name: '工作任务' });

// 删除标签
await localConfigManager.deleteTag('tag1');
```

### 状态检查
```javascript
// 检查是否在线模式
const isOnline = localConfigManager.isOnlineMode();
console.log('当前模式:', isOnline ? '在线' : '离线');

// 手动同步
await localConfigManager.forceSync();

// 重新从数据库加载
await localConfigManager.reloadFromDatabase();
```

### 事件监听
```javascript
// 监听配置变化
localConfigManager.addListener('tagsChanged', (tags) => {
  console.log('标签列表已更新:', tags);
});

localConfigManager.addListener('userPreferencesChanged', (preferences) => {
  console.log('用户偏好已更新:', preferences);
});
```

## API 参考

### 异步方法
所有修改操作现在都是异步的，返回 Promise：

- `addTag(tagData, parentId?)` - 添加标签
- `updateTag(tagId, updates)` - 更新标签
- `deleteTag(tagId)` - 删除标签
- `setTagColor(tagName, color)` - 设置标签颜色
- `setUserPreferences(preferences)` - 设置用户偏好
- `importConfig(configData)` - 导入配置
- `clearAllData()` - 清除所有数据

### 新增方法
- `forceSync()` - 手动触发同步
- `reloadFromDatabase()` - 重新从数据库加载
- `isOnlineMode()` - 检查在线状态

### 工具函数
- `waitForInit()` - 等待初始化完成

## 迁移指南

### 从旧版本迁移
1. 将所有同步调用改为异步：
   ```javascript
   // 旧版本
   localConfigManager.addTag(tag);
   
   // 新版本
   await localConfigManager.addTag(tag);
   ```

2. 在应用启动时等待初始化：
   ```javascript
   // 在应用入口文件中
   import { waitForInit } from './utils/localconfigmanager.js';
   
   async function initializeApp() {
     await waitForInit();
     // 其他初始化逻辑
   }
   ```

3. 添加错误处理：
   ```javascript
   try {
     await localConfigManager.addTag(tag);
   } catch (error) {
     console.error('添加标签失败:', error);
     // 处理错误
   }
   ```

## 注意事项

1. **初始化等待**: 使用 LocalConfigManager 前必须等待初始化完成
2. **异步操作**: 所有修改操作都是异步的，需要使用 await
3. **错误处理**: 建议添加适当的错误处理逻辑
4. **网络依赖**: 数据库功能需要网络连接，离线时自动使用本地存储
5. **数据一致性**: 本地存储和数据库可能存在短暂不一致，系统会自动同步

## 故障排除

### 常见问题

**Q: 数据没有保存到数据库？**
A: 检查网络连接，查看控制台错误日志，确认服务器是否正常运行。

**Q: 加载的是旧数据？**
A: 调用 `localConfigManager.reloadFromDatabase()` 强制从数据库重新加载。

**Q: 操作失败？**
A: 检查是否使用了 `await`，添加错误处理逻辑。

### 调试方法
```javascript
// 检查在线状态
console.log('在线状态:', localConfigManager.isOnlineMode());

// 查看当前配置
console.log('当前配置:', localConfigManager.config);

// 手动同步并查看结果
try {
  await localConfigManager.forceSync();
  console.log('同步成功');
} catch (error) {
  console.error('同步失败:', error);
}
```