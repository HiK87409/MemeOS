# MemeOS（灰灰笔记） - 简单笔记，简单生活（本地应用）
# 强烈本地使用（本地存储），切勿暴露在公网！！！！！！！！！

## 项目简介

MemeOS 是一个现代化的笔记管理应用，支持双向链接、标签管理、卡片式视图等功能。采用前后端分离架构，前端使用 React + Vite，后端使用 Node.js + Express + SQLite。

## 项目演示视频
[![项目演示视频](https://i2.hdslb.com/bfs/archive/03e09589b48d16344ee736cfa3ef9026f97c4e1f.jpg)](https://www.bilibili.com/video/BV1NQYvz3EMP)

## 主要功能
<img width="2560" height="1440" alt="预览" src="https://github.com/user-attachments/assets/31f6072f-cfbb-43d9-b545-f338ff54f73b" />
<img width="688" height="1288" alt="笔记卡片个性化" src="https://github.com/user-attachments/assets/6345b324-4bde-4ee6-9e38-6d6fd3579ad0" />

<img width="859" height="1283" alt="PixPin_2025-08-10_00-01-35" src="https://github.com/user-attachments/assets/2387d79e-633d-4163-8381-db6fedd64a82" />

- 📝 **笔记管理** - 创建、编辑、删除笔记
- 🏷️ **标签系统** - 为笔记添加标签，支持颜色分类
- 🔗 **双向链接** - 支持笔记之间的双向引用
- 🎨 **卡片视图** - 多种卡片样式和配色方案
- 📱 **响应式设计** - 支持桌面和移动设备
- 💾 **数据备份** - 自动备份和数据恢复功能
- 🔄 **前后端通信** - WebSocket 实现实时数据同步

## 技术栈

### 前端
- React 18
- Vite
- Tailwind CSS
- React Router
- WebSocket

### 后端
- Node.js
- Express.js
- SQLite3
- WebSocket
- Multer (文件上传)

## 快速开始

### 环境要求

- Node.js 16+

## 部署步骤

### Windows 用户

Windows 用户可以直接使用已打包的版本：

```bash
# 启动应用
npm run start:all
```

### Mac/Linux 用户

需要按照以下步骤进行部署：

#### 1. 清理构建缓存

删除所有旧的依赖和构建文件：

```bash
# 清理客户端缓存
rm -rf client/node_modules client/dist client/build
# 清理服务端缓存
rm -rf server/node_modules
```

#### 2. 重新安装依赖

客户端依赖安装：

```bash
cd client && npm install --ignore-scripts
```
> 注意：使用`--ignore-scripts`参数避免husky钩子错误

服务端依赖安装：

```bash
cd server && npm install
```

#### 3. 编译前端代码

```bash
cd client && npm run build
```

成功编译React应用后，会生成优化后的生产版本文件到client/dist目录：
- index.html (6.15 kB)
- assets/index-245cd770.css (84.31 kB)
- assets/index-8882bf30.js (1294.30 kB)

#### 4. 部署和启动

复制前端文件到www目录：

```bash
cp -r client/dist/* www/
```

启动后端服务器：

```bash
cd server && npm start
```

服务器成功初始化数据库并运行在端口30002

## 可能遇到的问题

### 依赖安装问题
- **husky钩子错误**：客户端安装时必须使用`--ignore-scripts`参数
- **网络问题**：如果依赖下载缓慢，可以尝试使用国内镜像源
  ```bash
  npm config set registry https://registry.npmmirror.com
  ```
- **Node.js版本不兼容**：确保Node.js版本在16.0.0以上

### 编译问题
- 确保有足够的磁盘空间和内存
- 某些旧版浏览器可能不支持最新的JavaScript特性，请使用现代浏览器

### 启动问题
- 如果端口30002被占用，可以修改`server/index.js`中的端口配置
- 数据库锁定问题：确保没有其他进程正在使用数据库文件

## 使用步骤

1. **下载/克隆本项目**
   ```bash
   git clone <repository-url>
   cd memeos 或 cd MemeOS-main
   ```

2. **启动应用**
   ```bash
   # 同时启动前端和后端
   npm run start:all
   ```

3. **访问应用**
   - 前端界面: http://localhost:3000
   - 后端API: http://localhost:30002

## 项目结构

```
memeos/
├── client/                 # 前端应用
│   ├── src/               # 源代码
│   ├── public/            # 静态资源
│   ├── dist/              # 构建输出
│   └── package.json       # 前端依赖
├── server/                # 后端应用
│   ├── routes/            # API路由
│   ├── models/            # 数据模型
│   ├── utils/             # 工具函数
│   ├── uploads/           # 文件上传目录
│   └── package.json       # 后端依赖
├── www/                   # 静态文件服务
└── README.md              # 项目说明
```

## 数据库管理

### 数据库文件
- `database.sqlite` - 主数据库文件
- `backup_database.sqlite` - 备份数据库文件
- `database.db` - 旧版数据库文件（兼容性保留）

### 数据库清理

如果需要清理所有数据并重置数据库：

```bash
# 运行数据库清理脚本
node clean_database.js --force
```

### 数据库初始化

```bash
# 初始化数据库结构
node server/init_database.js
```

## API 文档

详细的 API 文档请参考 `server/API_DOCUMENTATION.md` 文件。

### 主要 API 端点

- `GET /api/notes` - 获取笔记列表
- `POST /api/notes` - 创建新笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记
- `GET /api/tags` - 获取标签列表
- `POST /api/tags` - 创建新标签
- `GET /api/config` - 获取配置信息
- `POST /api/upload` - 文件上传

## 开发指南

### 可用脚本

```bash
# 开发模式
npm run dev:client      # 启动前端开发服务器
npm run dev:server      # 启动后端开发服务器
npm run start:all       # 同时启动前后端

# 构建生产版本
npm run build:client    # 构建前端应用
npm run build:server    # 构建后端应用

# 其他
npm run clean           # 清理构建文件
npm run lint            # 代码检查
```

### 目录结构说明

#### 前端 (client/)
- `src/components/` - React 组件
- `src/pages/` - 页面组件
- `src/hooks/` - 自定义 Hooks
- `src/api/` - API 调用封装
- `src/utils/` - 工具函数

#### 后端 (server/)
- `routes/` - API 路由定义
- `models/` - 数据库模型
- `utils/` - 工具函数
- `uploads/` - 文件上传存储

## 常见问题

### Q: 数据库文件被锁定怎么办？
A: 停止运行中的服务器进程，然后重新操作数据库文件。

### Q: 前端无法连接后端怎么办？
A: 检查后端服务器是否正常运行，确认端口配置正确。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件kk@ihuihui.me

---

**MemeOS** - 让笔记管理更简单、更高效！
