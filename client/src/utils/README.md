# 配置同步管理器

## 概述

`LocalConfigManager` 是一个用于管理本地配置并与服务器同步的工具类。它提供了以下功能：

- 本地配置持久化（使用 localStorage）
- 与服务器双向同步
- 基于时间戳的智能同步策略
- 自动同步机制
- 事件监听系统

## 主要功能

### 1. 本地配置管理

```javascript
import localConfigManager from './localconfigmanager.js';

// 获取配置
const tags = localConfigManager.getTags();
const tagColors = localConfigManager.getTagColors();
const preferences = localConfigManager.getUserPreferences();

// 修改配置
await localConfigManager.addTag({ name: '新标签' });
await localConfigManager.setTagColor('新标签', '#FF5733');
await localConfigManager.setUserPreferences({ theme: 'dark' });
```

### 2. 配置导出和导入

```javascript
// 导出配置
const config = localConfigManager.exportConfig();

// 导入配置
await localConfigManager.importConfig(config);

// 清空所有数据
await localConfigManager.clearAllData();
```

### 3. 事件监听

```javascript
// 监听标签变化
localConfigManager.addListener('tagsChanged', (tags) => {
  console.log('标签发生变化:', tags);
});

// 监听配置变化
localConfigManager.addListener('configChanged', (config) => {
  console.log('配置发生变化:', config);
});
```

## 配置结构

```javascript
{
  tags: [
    {
      id: 'unique_id',
      name: '标签名称',
      isPinned: false,
      isParent: true,
      children: []
    }
  ],
  tagColors: {
    '标签名称': '#FF5733'
  },
  userPreferences: {
    expandAllTags: false,
    theme: 'light'
  }
}
```

### 事件类型

- `tagsChanged`: 标签数据变化
- `tagColorsChanged`: 标签颜色变化
- `userPreferencesChanged`: 用户偏好变化
- `configChanged`: 配置变化

## 使用示例

```javascript
// 初始化
import localConfigManager from './localconfigmanager.js';

// 添加事件监听
localConfigManager.addListener('configChanged', (config) => {
  console.log('配置发生变化:', config);
});

// 修改配置
await localConfigManager.addTag({ name: '工作' });
await localConfigManager.setTagColor('工作', '#007AFF');

// 导出配置
const config = localConfigManager.exportConfig();
console.log('当前配置:', config);
```

## 注意事项

1. **本地存储限制**: localStorage 有大小限制（通常 5MB），请合理使用
2. **数据格式**: 确保配置数据格式正确，避免解析错误
3. **性能考虑**: 频繁的配置操作可能影响性能，建议批量操作
4. **数据备份**: 重要配置建议定期导出备份

## 错误处理

```javascript
try {
  await localConfigManager.addTag({ name: '新标签' });
} catch (error) {
  console.error('添加标签失败:', error);
}
```