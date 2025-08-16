const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

// 加载环境变量
dotenv.config();

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 创建HTTP服务器和Socket.IO实例
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',  // 默认前端端口
      'http://localhost:3001',  // 备用前端端口
      'http://localhost:3002',  // 当前前端端口
      'http://localhost:5173',  // Vite默认端口
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 存储连接的用户和对应的socket ID
const connectedUsers = new Map();

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('[WebSocket] 新客户端连接:', socket.id);
  
  // 用户认证和绑定
  socket.on('authenticate', (userData) => {
    const { userId, token } = userData;
    if (userId && token) {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`[WebSocket] 用户 ${userId} 已认证，绑定到 socket ${socket.id}`);
    }
  });
  
  // 断开连接处理
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`[WebSocket] 用户 ${socket.userId} 断开连接`);
    }
    console.log('[WebSocket] 客户端断开连接:', socket.id);
  });
});

// 全局WebSocket实例，供路由使用
global.io = io;
global.connectedUsers = connectedUsers;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:3000',  // 默认前端端口
    'http://localhost:3001',  // 备用前端端口
    'http://localhost:3002',  // 当前前端端口
    'http://localhost:5173',  // Vite默认端口
    process.env.CLIENT_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(cookieParser());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 初始化数据库
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已连接到SQLite数据库');
    
    // 导入模型
    const UserModel = require('./models/user');
    const NoteModel = require('./models/note');
    const TagColorModel = require('./models/tagColor');
    const TagModel = require('./models/tag');
    const CardSettingsModel = require('./models/cardSettings');
    const NoteReferenceModel = require('./models/noteReference');
    const ConfigModel = require('./models/config');
    const RecycleBinModel = require('./models/recycleBin');
    const NoteHistoryModel = require('./models/noteHistory');
    const InboxModel = require('./models/inbox');
    const BackupDatabase = require('./utils/backupDatabase');
    
    // 创建模型实例
    const userModel = new UserModel(db);
    const noteModel = new NoteModel(db);
    const tagColorModel = new TagColorModel(db);
    const tagModel = new TagModel(db);
    const cardSettingsModel = new CardSettingsModel(db);
    const noteReferenceModel = new NoteReferenceModel(db);
    const configModel = new ConfigModel(db);
    const recycleBinModel = new RecycleBinModel(db);
    const noteHistoryModel = new NoteHistoryModel(db);
    const inboxModel = new InboxModel(db);
    
    // 初始化备份数据库
    const backupDatabase = new BackupDatabase();
    
    // 设置路由
    const setupRoutes = () => {
      // 导入路由
      const notesRoutes = require('./routes/notes');
      const uploadRoutes = require('./routes/upload');
      const backupRoutes = require('./routes/backup');
      const historyRoutes = require('./routes/history');
      const ConfigRouter = require('./routes/config');
      const inboxRoutes = require('./routes/inbox');
      
      // 设置备份数据库实例到全局
      global.backupDatabase = backupDatabase;
      
      // 设置笔记模型实例到全局，供备份功能使用
      global.notesModel = noteModel;
      
      // 设置路由 - 移除冲突的日期路由，统一在notes路由中处理
      app.use('/api/notes', (req, res, next) => {
        req.userModel = userModel;
        req.cardSettingsModel = cardSettingsModel;
        req.noteReferenceModel = noteReferenceModel;
        req.recycleBinModel = recycleBinModel;
        req.noteHistoryModel = noteHistoryModel;
        req.db = db; // 添加数据库实例到请求对象
        next();
      }, notesRoutes(noteModel, tagColorModel, tagModel));
      app.use('/api/upload', uploadRoutes());
      app.use('/api/backup', backupRoutes);
      app.use('/api/history', historyRoutes);
      
      // 配置同步路由
      const configRouter = new ConfigRouter(configModel);
      app.use('/api/config', configRouter.getRouter());
      
      // 收件箱路由
      app.use('/api/inbox', (req, res, next) => {
        req.userModel = userModel;
        next();
      }, inboxRoutes(inboxModel));
      
      // 健康检查端点
      app.get('/api/health', (req, res) => {
        res.json({ 
          status: 'ok', 
          message: 'MemeOS API服务器正常运行',
          timestamp: new Date().toISOString()
        });
      });
      
      // 404处理
      app.use('/api/*', (req, res) => {
        res.status(404).json({ error: '接口不存在' });
      });
      
      // 全局错误处理
      app.use((err, req, res, next) => {
        console.error('服务器错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
      });
    };

    // 初始化数据库并设置路由
    const initApp = async () => {
      try {
        // 初始化用户表
        await userModel.initTable();
        
        // 初始化笔记表
        await noteModel.initTable();
        
        // 初始化标签颜色表
        await tagColorModel.initTable();
        
        // 初始化标签表
        await tagModel.initTable();
        
        // 初始化卡片设置表
        await cardSettingsModel.initTable();
        
        // 初始化笔记引用表
        await noteReferenceModel.initTable();
        
        // 初始化配置表
        await configModel.initTable();
        
        // 初始化回收站表
        await recycleBinModel.initTable();
        
        // 初始化历史记录表
        await noteHistoryModel.initTable();
        
        // 初始化收件箱表
        await inboxModel.initTable();
        
        // 设置noteModel的回收站模型引用
        noteModel.setRecycleBinModel(recycleBinModel);
        
        // 初始化备份数据库
        await backupDatabase.init();
        console.log('备份数据库初始化完成');
        

        
        // 设置路由
        setupRoutes();
        
        // 启动服务器
        server.listen(PORT, '0.0.0.0', () => {
          console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
          console.log(`本地访问: http://localhost:${PORT}`);
          console.log(`网络访问: http://192.168.5.5:${PORT}`);
          console.log(`WebSocket服务器已启动`);
        });
      } catch (error) {
        console.error('初始化数据库表失败:', error);
      }
    };

    // 调用初始化函数
    initApp();
  }
});

// 创建表
async function initializeDatabase(userModel, noteModel) {
  try {
    // 初始化用户表
    await userModel.initTable();
    
    // 初始化笔记表
    await noteModel.initTable();
    
    console.log('数据库表已初始化');
  } catch (error) {
    console.error('初始化数据库表失败:', error);
    throw error;
  }
}



// 优雅关闭
process.on('SIGINT', async () => {
  try {
    // 关闭主数据库连接
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('关闭主数据库时出错:', err.message);
          reject(err);
        } else {
          console.log('主数据库连接已关闭');
          resolve();
        }
      });
    });
    
    // 关闭备份数据库连接
    if (backupDatabase) {
      await backupDatabase.close();
    }
    
    console.log('所有数据库连接已关闭，服务器正在退出');
    process.exit(0);
  } catch (error) {
    console.error('关闭数据库连接时出错:', error);
    process.exit(1);
  }
});