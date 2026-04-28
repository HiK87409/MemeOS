# MemOS API 文档

## 概述
本 API 系统提供了笔记管理、标签管理、回收站、卡片设置、配色方案和双向链接等完整功能。

**基础路径**: `/api/notes`  
**认证**: 当前版本无需认证（单用户模式，默认 userId = `default_user`）

---

## 笔记管理

### 获取笔记列表
`GET /api/notes/`

**查询参数**:
- `search` (可选): 搜索关键词，匹配内容和标签
- `tag` (可选): 按标签筛选

**响应**: 笔记数组

### 获取我的笔记（分页）
`GET /api/notes/my`

**查询参数**:
- `search` (可选): 搜索关键词
- `tag` (可选): 按标签筛选
- `page` (可选, 默认1): 页码
- `limit` (可选, 默认10): 每页数量

**响应**: `{ notes: [], total: number, page: number, totalPages: number }`

### 获取单个笔记
`GET /api/notes/:id`

**响应**: 笔记对象，不存在返回 404

### 创建笔记
`POST /api/notes/`

**请求体**:
```json
{
  "content": "笔记内容（必填）",
  "tags": ["标签1", "标签2"],
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**响应**: `201` 创建的笔记对象（自动解析内容中的引用链接）

### 更新笔记
`PUT /api/notes/:id`

**请求体**:
```json
{
  "content": "更新后的内容",
  "tags": ["标签1"],
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**响应**: 更新后的笔记对象

### 删除笔记（移到回收站）
`DELETE /api/notes/:id`

**响应**: `{ message: "笔记删除成功" }`

### 置顶/取消置顶笔记
`PATCH /api/notes/:id/pin`

**响应**: 更新后的笔记对象

### 收藏/取消收藏笔记
`PATCH /api/notes/:id/favorite`

**响应**: 更新后的笔记对象

### 获取笔记历史记录
`GET /api/notes/:id/history`

**响应**: 历史记录数组

---

## 日期相关

### 获取日期范围内有笔记的日期列表
`GET /api/notes/dates`

**查询参数**:
- `start` (必填): 开始日期
- `end` (必填): 结束日期

### 获取特定日期的笔记
`GET /api/notes/date/:date`

---

## 标签管理

### 获取所有标签（基本接口）
`GET /api/notes/tags`

**响应**: 标签数组

### 获取所有标签（完整信息，含关联笔记）
`GET /api/notes/tags/all`

**响应**:
```json
[
  {
    "id": 1,
    "name": "工作",
    "color": "blue",
    "customColor": "#3b82f6",
    "noteCount": 3,
    "notes": [{ "id": "...", "title": "...", "content": "...", "created_at": "...", "updated_at": "..." }],
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### 根据标签获取笔记
`GET /api/notes/tag/:tag`

`GET /api/notes/my/tag/:tag`

### 创建标签
`POST /api/notes/tags`

**请求体**:
```json
{
  "tagName": "新标签（必填）",
  "color": "blue"
}
```

**响应**: `201` `{ message, tagName, tagId, allTags }`（标签已存在返回 `409`）

### 删除标签（按名称）
`DELETE /api/notes/tags/:tag`

**响应**: `{ message, deletedFromTags, deletedFromNotes }`

### 删除标签（按ID）
`DELETE /api/notes/tags/by-id/:tagId`

**响应**: `{ message, deletedFromTags, deletedFromNotes, deletedTag }`

### 删除标签和关联笔记
`DELETE /api/notes/tags/:tag/with-notes`

**响应**: `{ success, message, deletedNotesCount, deletedFromTags }`

### 从所有笔记中移除标签并删除标签本身
`DELETE /api/notes/tags/:tag/remove-from-notes`

**响应**: `{ success, message, updatedCount, deletedFromTags }`

### 同步标签配置（批量处理）
`POST /api/notes/tags/sync`

**请求体**:
```json
{
  "tags": [
    {
      "name": "工作（必填）",
      "color": "blue",
      "customColor": "#3b82f6",
      "pinned": false,
      "order": 0,
      "notes": []
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "message": "标签同步完成",
  "results": {
    "added": [],
    "updated": [],
    "deleted": [],
    "errors": [],
    "summary": { "totalProcessed": 0, "addedCount": 0, "updatedCount": 0, "deletedCount": 0, "errorCount": 0 }
  }
}
```

### 更新标签顺序（支持父子关系）
`PUT /api/notes/tags/order`

**请求体**:
```json
{
  "tagOrders": [{ "tagId": 1, "sortOrder": 0 }],
  "tagHierarchy": [{ "tagId": 2, "parentId": 1 }]
}
```

---

## 标签颜色

### 获取用户标签颜色配置
`GET /api/notes/tag-colors/all`

**响应**: `{ "标签名": "颜色值", ... }`

### 获取用户自定义颜色
`GET /api/notes/tag-colors/custom`

### 保存标签颜色
`POST /api/notes/tag-colors`

**请求体**:
```json
{
  "tagName": "工作（必填）",
  "colorValue": "#3b82f6（必填）",
  "colorType": "preset"
}
```

### 删除标签颜色
`DELETE /api/notes/tag-colors/:tagName`

### 删除自定义颜色
`DELETE /api/notes/tag-colors/custom/:colorValue`

---

## 配色方案

### 获取所有配色方案
`GET /api/notes/color-schemes`

**查询参数**:
- `theme_mode` (可选): 主题模式

### 保存配色方案
`POST /api/notes/color-schemes`

**请求体**:
```json
{
  "name": "方案名称（必填）",
  "schemeData": { ... },
  "theme_mode": "light"
}
```

（最多保存10个，超出返回 `400`）

### 删除配色方案
`DELETE /api/notes/color-schemes/:id`

---

## 回收站

### 获取回收站笔记列表
`GET /api/notes/recycle-bin`

**查询参数**:
- `search` (可选, 默认'')
- `page` (可选, 默认1)
- `limit` (可选, 默认20)

### 获取回收站统计信息
`GET /api/notes/recycle-bin/stats`

### 恢复笔记
`POST /api/notes/recycle-bin/:id/restore`

### 批量恢复笔记
`POST /api/notes/recycle-bin/bulk-restore`

**请求体**: `{ "ids": ["noteId1", "noteId2"] }`

### 永久删除笔记
`DELETE /api/notes/recycle-bin/:id`

### 批量永久删除笔记
`DELETE /api/notes/recycle-bin/batch-delete`

**请求体**: `{ "ids": ["noteId1", "noteId2"] }`

### 清理过期笔记
`POST /api/notes/recycle-bin/clean-expired`

---

## 卡片设置

### 获取全局卡片设置
`GET /api/notes/card-settings/global`

**查询参数**:
- `theme_mode` (可选, 默认'light')

### 保存全局卡片设置
`POST /api/notes/card-settings/global`

**请求体**:
```json
{
  "settings": { ... },
  "theme_mode": "light"
}
```

### 获取特定笔记的卡片设置
`GET /api/notes/card-settings/note/:noteId`

**查询参数**:
- `theme_mode` (可选, 默认'light')

### 保存特定笔记的卡片设置
`POST /api/notes/card-settings/note/:noteId`

**请求体**:
```json
{
  "settings": { ... },
  "theme_mode": "light"
}
```

### 删除特定笔记的卡片设置
`DELETE /api/notes/card-settings/note/:noteId`

### 删除所有笔记的个性化设置
`DELETE /api/notes/card-settings/all-notes`

---

## 双向链接 / 引用关系

### 创建笔记引用关系
`POST /api/notes/references`

**请求体**:
```json
{
  "fromNoteId": "笔记ID（必填）",
  "toNoteId": "被引用笔记ID（必填）",
  "referenceText": "引用文本（必填）"
}
```

### 获取笔记的引用关系
`GET /api/notes/references/:noteId`

### 删除笔记引用关系
`DELETE /api/notes/references/:fromNoteId/:toNoteId`

### 根据引用文本搜索笔记
`GET /api/notes/search-by-reference`

**查询参数**:
- `referenceText` (必填): 引用文本

### 解析引用关系（基于特殊字符检测）
`POST /api/notes/parse-references/:noteId`

**响应**:
```json
{
  "success": true,
  "processedReferences": 2,
  "createdReferences": 2,
  "updatedBacklinks": 1,
  "affectedNoteIds": ["noteId1", "noteId2"],
  "message": "成功处理 2 个引用，创建 2 个引用关系，更新 1 个反向链接"
}
```

### 处理双向链接
`POST /api/notes/bidirectional-links/:noteId`

**请求体**:
```json
{
  "noteId": "笔记ID（必填）",
  "content": "笔记内容（必填）"
}
```

支持解析多种引用格式：
- Markdown 链接: `[文本](http://localhost:{port}/note/{id})`
- 带 HTML 标签: `[<u>文本</u>](http://localhost:{port}/note/{id})`
- 纯 URL: `http://localhost:{port}/note/{id}`

### 检测笔记中的隐藏字符标签
`GET /api/notes/detect-references/:noteId`

**响应**:
```json
{
  "noteId": "...",
  "hasReferences": true,
  "hasBacklinks": false,
  "referenceCount": 2,
  "backlinkCount": 0,
  "contentLength": 500
}
```

### 格式化引用符号前面的回车
`POST /api/notes/format-references/:noteId`

### 清理笔记中的隐藏字符标识
`POST /api/notes/clean-references/:noteId`

**响应**:
```json
{
  "success": true,
  "noteId": "...",
  "originalLength": 500,
  "cleanedLength": 495,
  "removedChars": 5,
  "message": "成功清理 5 个隐藏字符"
}
```

---

## 其他路由

上传文件: `/api/upload/*`  
备份管理: `/api/backup/*`

---

## 错误响应格式

所有错误响应统一格式：
```json
{ "error": "错误描述信息" }
```

常见 HTTP 状态码：
- `400`: 请求参数错误
- `404`: 资源不存在
- `409`: 资源冲突（如标签已存在）
- `500`: 服务器内部错误
