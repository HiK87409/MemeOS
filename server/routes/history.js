const express = require('express');
const router = express.Router();
const BackupDatabase = require('../utils/backupDatabase');

// 初始化备份数据库
const backupDb = new BackupDatabase();

// 确保备份数据库已初始化
async function ensureBackupDb() {
  if (!backupDb.db) {
    await backupDb.init();
  }
}

// 创建系统历史记录
router.post('/record', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const { action, description, details = {} } = req.body;
    
    if (!action || !description) {
      return res.status(400).json({ error: '缺少必要参数: action 和 description' });
    }
    
    const result = await backupDb.recordSystemHistory(action, description, details);
    
    res.json({
      success: true,
      historyId: result.historyId,
      message: '历史记录创建成功'
    });
  } catch (error) {
    console.error('创建历史记录失败:', error);
    res.status(500).json({ error: '创建历史记录失败' });
  }
});

// 获取系统历史记录
router.get('/system', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const { limit = 100, offset = 0, action } = req.query;
    
    const history = await backupDb.getSystemHistory({
      limit: parseInt(limit),
      offset: parseInt(offset),
      action: action
    });
    
    res.json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error('获取系统历史记录失败:', error);
    res.status(500).json({ error: '获取系统历史记录失败' });
  }
});

// 获取所有历史记录（包括备份历史和系统历史）
router.get('/all', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const { limit = 100, offset = 0 } = req.query;
    
    const allHistory = await backupDb.getAllHistory({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      history: allHistory
    });
  } catch (error) {
    console.error('获取所有历史记录失败:', error);
    res.status(500).json({ error: '获取所有历史记录失败' });
  }
});

// 清除历史记录
router.delete('/clear', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const { type } = req.query; // 'system' 或 'all'
    
    const result = await backupDb.clearHistory(type);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('清除历史记录失败:', error);
    res.status(500).json({ error: '清除历史记录失败' });
  }
});

module.exports = router;