# 标签同步API文档

## 概述
本API系统提供了完整的标签配置同步功能，支持标签的增删改查、颜色配置、层级管理以及关联卡片（笔记）的同步操作。

## API端点

### 1. 获取所有标签完整信息

**端点**: `GET /api/notes/tags/all`

**描述**: 获取当前用户的所有标签及其关联的卡片（笔记）信息

**认证**: 需要JWT token认证

**响应示例**:
```json
{
  "success": true,
  "tags": [
    {
      "id": 1,
      "name": "工作",
      "color": "#3b82f6",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "isPinned": false,
      "isFavorite": false,
      "level": 0,
      "cards": [
        {
          "id": 1,
          "content": "会议记录",
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z",
          "tags": ["工作"]
        }
      ]
    }
  ]
}
```

### 2. 删除标签

**端点**: `DELETE /api/notes/tags/:tagId`

**描述**: 删除指定标签及其相关配置

**认证**: 需要JWT token认证

**参数**:
- `tagId` (路径参数): 标签ID

**响应示例**:
```json
{
  "success": true,
  "message": "标签删除成功",
  "deletedTag": {
    "id": 1,
    "name": "工作"
  },
  "affectedNotes": 3
}
```

### 3. 同步所有标签配置

**端点**: `POST /api/notes/tags/sync`

**描述**: 批量同步标签配置，支持添加、更新、删除标签以及关联的卡片

**认证**: 需要JWT token认证

**请求体**:
```json
{
  "tags": [
    {
      "id": 1, // 可选，为空时表示新增标签
      "name": "工作",
      "color": "#3b82f6",
      "isPinned": true, // 可选
      "isFavorite": false, // 可选
      "level": 1, // 可选
      "cards": [ // 可选，关联的卡片（笔记）
        {
          "id": 1, // 可选，为空时表示新增卡片
          "content": "会议记录",
          "createdAt": "2024-01-01T00:00:00.000Z" // 可选
        }
      ]
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "标签同步完成",
  "results": {
    "added": [
      {
        "id": 2,
        "name": "生活",
        "color": "#10b981",
        "isPinned": false,
        "isFavorite": false,
        "level": 0
      }
    ],
    "updated": [
      {
        "id": 1,
        "name": "工作",
        "color": "#3b82f6",
        "isPinned": true,
        "isFavorite": false,
        "level": 1
      }
    ],
    "deleted": [
      {
        "id": 3,
        "name": "旧标签"
      }
    ],
    "errors": []
  },
  "tags": [
    {
      "id": 1,
      "name": "工作",
      "color": "#3b82f6",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "生活",
      "color": "#10b981",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 功能说明

### 标签属性
- `id`: 标签唯一标识符
- `name`: 标签名称
- `color`: 标签颜色（十六进制格式）
- `isPinned`: 是否置顶
- `isFavorite`: 是否收藏
- `level`: 标签层级
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### 卡片属性
- `id`: 卡片（笔记）ID
- `content`: 卡片内容
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `tags`: 关联的标签数组

### 同步逻辑
1. **新增标签**: 当标签ID为空时，创建新标签
2. **更新标签**: 当标签ID存在时，更新现有标签信息
3. **删除标签**: 服务器存在但客户端未发送的标签会被删除
4. **卡片同步**: 每个标签可以关联多个卡片，支持新增和更新
5. **错误处理**: 每个操作都有独立的错误处理，不会影响其他操作

## 使用示例

### 获取所有标签
```javascript
const response = await fetch('/api/notes/tags/all', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});
const data = await response.json();
console.log(data.tags);
```

### 同步标签配置
```javascript
const syncData = {
  tags: [
    {
      name: '新标签',
      color: '#ef4444',
      isPinned: true,
      cards: [
        {
          content: '这是一个新卡片'
        }
      ]
    },
    {
      id: 1,
      name: '更新的标签',
      color: '#8b5cf6'
    }
  ]
};

const response = await fetch('/api/notes/tags/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify(syncData)
});

const result = await response.json();
console.log('同步结果:', result.results);
```

### 删除标签
```javascript
const response = await fetch('/api/notes/tags/1', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

const result = await response.json();
console.log('删除结果:', result);
```

## 注意事项

1. **认证**: 所有API都需要JWT token认证
2. **数据验证**: 服务器会对输入数据进行验证，无效数据会返回错误
3. **并发处理**: 同步操作是原子的，确保数据一致性
4. **错误恢复**: 单个操作失败不会影响其他操作的执行
5. **性能考虑**: 大量数据同步时建议分批处理