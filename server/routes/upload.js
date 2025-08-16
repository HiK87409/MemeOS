const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 生成唯一文件名
function generateUniqueFilename(originalName) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  return uniqueSuffix + ext;
}

// 直接删除文件
function deleteFile(filename) {
  const filePath = path.join(uploadDir, filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[文件删除] 已删除文件: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[文件删除] 删除文件失败: ${filePath}`, error);
    return false;
  }
}

// 根据文件名前缀删除文件（用于哈希文件）
function deleteFileByPrefix(prefix) {
  try {
    const files = fs.readdirSync(uploadDir);
    let deleted = false;
    
    for (const file of files) {
      if (file.startsWith(prefix)) {
        const filePath = path.join(uploadDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`[文件删除] 已删除文件: ${filePath}`);
          deleted = true;
        } catch (error) {
          console.error(`[文件删除] 删除文件失败: ${filePath}`, error);
        }
      }
    }
    
    return deleted;
  } catch (error) {
    console.error('[文件删除] 读取上传目录失败:', error);
    return false;
  }
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 直接使用原始文件名，不生成唯一名
    cb(null, file.originalname);
  }
});

// 文件类型过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 设置上传限制
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = function() {
  const router = express.Router();

  // 检查文件是否存在的路由
  router.get('/check', async (req, res) => {
    try {
      const { filename } = req.query;
      
      if (!filename) {
        return res.status(400).json({ error: '缺少文件名参数' });
      }
      
      console.log(`[文件检查] 检查文件是否存在: ${filename}`);
      
      // 检查文件是否存在
      const filePath = path.join(uploadDir, filename);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        const fileUrl = `/uploads/${filename}`;
        console.log(`[文件检查] 找到文件: ${filename}`);
        return res.json({
          exists: true,
          url: fileUrl,
          filename: filename,
          matchType: 'exact'
        });
      }
      
      // 没有找到匹配的文件
      console.log(`[文件检查] 文件不存在: ${filename}`);
      res.json({
        exists: false,
        filename: filename
      });
      
    } catch (error) {
      console.error('[文件检查] 检查文件失败:', error);
      res.status(500).json({ error: '检查文件失败' });
    }
  });

  // 文件上传路由
  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    try {
      const fileUrl = `/uploads/${req.file.filename}`;
      
      console.log(`[文件上传] 文件上传成功: ${req.file.filename}`);
      
      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error('[文件上传] 处理文件失败:', error);
      
      // 清理临时文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: '文件上传失败' });
    }
  });

  // 错误处理中间件
  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      // Multer错误
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '文件大小超过限制' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // 其他错误
      return res.status(500).json({ error: err.message });
    }
    next();
  });

  // 删除文件路由
  router.delete('/:filename', async (req, res) => {
    const { filename } = req.params;
    
    try {
      const deleted = deleteFile(filename);
      
      if (deleted) {
        res.json({ success: true, message: '文件删除成功' });
      } else {
        res.status(404).json({ error: '文件不存在或删除失败' });
      }
    } catch (error) {
      console.error('[文件删除] 删除文件失败:', error);
      res.status(500).json({ error: '文件删除失败' });
    }
  });

  // 根据前缀删除文件路由（用于删除哈希文件）
  router.delete('/prefix/:prefix', async (req, res) => {
    const { prefix } = req.params;
    
    try {
      const deleted = deleteFileByPrefix(prefix);
      
      if (deleted) {
        res.json({ success: true, message: '文件删除成功' });
      } else {
        res.status(404).json({ error: '文件不存在或删除失败' });
      }
    } catch (error) {
      console.error('[文件删除] 删除文件失败:', error);
      res.status(500).json({ error: '文件删除失败' });
    }
  });

  // 完全删除uploads目录中的所有文件（用于回收站完全删除）
  router.delete('/uploads/all', async (req, res) => {
    try {
      console.log('[完全删除] 开始删除uploads目录中的所有文件');
      
      if (!fs.existsSync(uploadDir)) {
        return res.json({ success: true, message: 'uploads目录不存在，无需删除' });
      }
      
      const files = fs.readdirSync(uploadDir);
      let deletedCount = 0;
      let errorCount = 0;
      
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        try {
          // 只删除文件，不删除子目录
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            fs.unlinkSync(filePath);
            console.log(`[完全删除] 已删除文件: ${file}`);
            deletedCount++;
          }
        } catch (error) {
          console.error(`[完全删除] 删除文件失败: ${file}`, error);
          errorCount++;
        }
      }
      
      console.log(`[完全删除] 删除完成，成功删除 ${deletedCount} 个文件，失败 ${errorCount} 个`);
      
      res.json({ 
        success: true, 
        message: `完全删除完成，成功删除 ${deletedCount} 个文件${errorCount > 0 ? `，失败 ${errorCount} 个` : ''}`
      });
    } catch (error) {
      console.error('[完全删除] 删除uploads目录文件失败:', error);
      res.status(500).json({ error: '完全删除失败' });
    }
  });

  return router;
}

// 导出函数供其他模块使用
module.exports.deleteFile = deleteFile;
module.exports.deleteFileByPrefix = deleteFileByPrefix;