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
## Node.js 安装指南

### Windows 系统

#### 方法1：官方安装包（推荐）
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS（长期支持）版本
3. 运行安装程序，按提示完成安装
4. 安装完成后，打开命令提示符或 PowerShell 验证安装：
   ```bash
   node --version
   npm --version
   ```

#### 方法2：包管理器安装

**使用 Chocolatey：**
```bash
# 安装 Chocolatey（如果未安装）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 Node.js
choco install nodejs-lts
```

**使用 Winget：**
```bash
# 安装 Node.js LTS
winget install OpenJS.NodeJS.LTS
```

### macOS 系统

#### 方法1：官方安装包
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 macOS 版本的安装包
3. 双击 .pkg 文件并按提示安装
4. 验证安装：
   ```bash
   node --version
   npm --version
   ```

#### 方法2：包管理器

**使用 Homebrew（推荐）：**
```bash
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node
```

**使用 NVM（Node Version Manager）：**
```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载终端配置
source ~/.bashrc  # 或 source ~/.zshrc

# 安装最新的 LTS 版本
nvm install --lts
nvm use --lts
```

### Linux 系统

#### Ubuntu/Debian 系统

**使用 APT 包管理器：**
```bash
# 更新包列表
sudo apt update

# 安装 Node.js 和 npm
sudo apt install nodejs npm

# 或者使用 NodeSource 仓库获取最新版本
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### CentOS/RHEL/Fedora 系统

**使用 DNF/YUM 包管理器：**
```bash
# CentOS/RHEL 7
sudo yum install epel-release
sudo yum install nodejs npm

# CentOS/RHEL 8+ 或 Fedora
sudo dnf install nodejs npm
```

**使用 NVM（推荐）：**
```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载终端配置
source ~/.bashrc

# 安装最新的 LTS 版本
nvm install --lts
nvm use --lts
```

### 验证安装

无论使用哪种安装方法，都可以通过以下命令验证安装是否成功：

```bash
# 检查 Node.js 版本
node --version
# 应该显示类似 v18.17.0 或更高版本

# 检查 npm 版本
npm --version
# 应该显示类似 9.6.7 或更高版本

# 检查安装路径
which node
which npm
```

### 常见问题解决

#### 1. 权限问题
如果在安装过程中遇到权限问题，可以尝试：

```bash
# macOS/Linux
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# 或者使用 nvm 安装，避免权限问题
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

#### 2. 版本管理
如果需要管理多个 Node.js 版本，推荐使用 NVM：

```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 查看可用的 Node.js 版本
nvm ls-remote

# 安装特定版本
nvm install 18.17.0

# 切换版本
nvm use 18.17.0

# 设置默认版本
nvm alias default 18.17.0
```

#### 3. 网络问题
如果下载速度慢或无法访问，可以：

- 使用国内镜像源
- 配置代理
- 下载离线安装包

#### 4. 环境变量问题
如果命令无法识别，可能需要手动配置环境变量：

**Windows：**
1. 右键"此电脑" → "属性" → "高级系统设置" → "环境变量"
2. 在"系统变量"中找到 Path 变量
3. 添加 Node.js 安装路径（如 `C:\Program Files\nodejs\`）

**macOS/Linux：**
```bash
# 编辑 bash 配置文件
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

### 安装完成后的下一步

安装完 Node.js 后，就可以开始使用 MemeOS 项目了：

```bash
# 克隆/下载项目
git clone <repository-url>
cd memeos或者cd MemeOS-main

# 安装依赖
npm run install:all(windows我已经打包，应该可以运行，不可以的话，运行这个)
# 其他版本，如mac/linux
1. 清理构建缓存
删除了所有旧的依赖和构建文件：
- client/node_modules
- client/dist
- client/build
- server/node_modules

```bash
# 清理客户端缓存
rm -rf client/node_modules client/dist client/build
# 清理服务端缓存
rm -rf server/node_modules
```

## 2. 重新安装依赖

### 客户端依赖安装
```bash
cd client && npm install --ignore-scripts
```

### 服务端依赖安装
```bash
cd server && npm install
```

## 3. 编译前端代码

```bash
cd client && npm run build
```
成功编译React应用后，会生成优化后的生产版本文件到client/dist目录：
- index.html (6.15 kB)
- assets/index-245cd770.css (84.31 kB)
- assets/index-8882bf30.js (1294.30 kB)

## 4. 部署和启动

### 复制前端文件到www目录
```bash
cp -r client/dist/* www/
```

### 启动后端服务器
```bash
cd server && npm start
```

## 安装和部署说明

### 可能遇到的问题

1. **依赖安装问题**
   - 如果使用`npm install`时出现husky钩子错误，请使用`--ignore-scripts`参数：
     ```bash
     cd client && npm install --ignore-scripts
     ```
   - 如果某些依赖无法安装，可能是由于网络问题或Node.js版本不兼容，建议：
     - 尝试使用国内镜像源：`npm config set registry https://registry.npmmirror.com`
     - 确保Node.js版本在16.0.0以上

2. **编译问题**
   - 如果前端编译失败，检查是否有足够的磁盘空间和内存
   - 某些旧版浏览器可能不支持最新的JavaScript特性，请使用现代浏览器

3. **启动问题**
   - 如果端口30002被占用，可以修改`server/index.js`中的端口配置
   - 数据库锁定问题：确保没有其他进程正在使用数据库文件

### 使用步骤

1. **下载/克隆本项目**
   ```bash
   git clone <repository-url>
   cd memeos/cd MemeOS-main
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

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件kk@ihuihui.me

---

**MemeOS** - 让笔记管理更简单、更高效！
