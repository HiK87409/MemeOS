const express = require('express');

const router = express.Router();

// 确保备份数据库已初始化
async function ensureBackupDb() {
  if (!global.backupDatabase || !global.backupDatabase.db) {
    await global.backupDatabase.init();
  }
}

// 创建备份
router.post('/create', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const { backupType, snapshotType, description, data } = req.body;
    
    // 获取当前笔记数据作为备份内容
    const notes = await global.notesModel.getAllByUserId('default_user');
    
    // 从客户端传递的数据中提取媒体文件
    const mediaFiles = data?.mediaFiles || [];
    
    const backupData = {
      backupType: backupType || 'manual',
      snapshotType: snapshotType,
      description: description || '手动备份',
      data: {
        notes: notes,
        mediaFiles: mediaFiles, // 添加媒体文件数据
        backupTime: new Date().toISOString(),
        version: '1.0'
      },
      userId: 'default_user'
    };
    
    console.log('创建备份，包含媒体文件数量:', mediaFiles.length);
    
    const result = await global.backupDatabase.createBackup(backupData);
    
    res.json({
      success: true,
      backupId: result.backupId,
      filename: result.filename,
      message: '备份创建成功'
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({ error: '创建备份失败' });
  }
});

// 获取备份列表
router.get('/list', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const { type, limit = 100, offset = 0 } = req.query;
    
    const backups = await global.backupDatabase.getBackups({
      type: type,
      userId: 'default_user', // 使用固定的用户ID
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      backups: backups
    });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({ error: '获取备份列表失败' });
  }
});

// 恢复备份（传统方式）
router.post('/restore/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    await ensureBackupDb();
    
    const backupData = await global.backupDatabase.getBackup(backupId, null); // 不再需要用户ID
    
    if (!backupData) {
      return res.status(404).json({ error: '备份不存在或无权限访问' });
    }
    
    // 记录恢复操作历史
    await global.backupDatabase.recordBackupHistory(backupId, 'restore', {
      restored_at: new Date().toISOString()
    });
    
    res.json({
      success: true,
      backupId: backupId,
      message: '备份恢复请求已处理',
      backupData: {
        notesCount: backupData.notesCount,
        description: backupData.description,
        createdAt: backupData.createdAt,
        data: backupData.data
      }
    });
  } catch (error) {
    console.error('恢复备份失败:', error);
    res.status(500).json({ error: '恢复备份失败' });
  }
});

// 恢复备份（带哈希比对）
router.post('/restore-with-hash/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    await ensureBackupDb();
    
    // 获取当前笔记数据
    const currentNotes = await global.notesModel.getAllByUserId('default_user');
    
    // 使用带哈希比对的恢复功能
    const result = await global.backupDatabase.restoreBackupWithHashCheck(
      backupId, 
      currentNotes, 
      'default_user'
    );
    
    res.json({
      success: true,
      backupId: backupId,
      message: '备份恢复完成（带哈希比对）',
      result: {
        restoredNotes: result.restoredNotes,
        skippedNotes: result.skippedNotes,
        updatedNotes: result.updatedNotes,
        summary: result.summary
      }
    });
  } catch (error) {
    console.error('恢复备份失败（带哈希比对）:', error);
    res.status(500).json({ error: '恢复备份失败: ' + error.message });
  }
});

// 删除备份
router.delete('/delete/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    await ensureBackupDb();
    
    // 获取备份信息用于记录历史
    const backupData = await global.backupDatabase.getBackup(backupId, null); // 不再需要用户ID
    
    const result = await global.backupDatabase.deleteBackup(backupId, null); // 不再需要用户ID
    
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    
    // 记录删除操作历史
    await global.backupDatabase.recordBackupHistory(backupId, 'delete', {
      deleted_at: new Date().toISOString(),
      notes_count: backupData ? backupData.notesCount : 0,
      filename: backupData ? backupData.filename : 'unknown'
    });
    
    res.json({
      success: true,
      backupId: backupId,
      message: result.message
    });
  } catch (error) {
    console.error('删除备份失败:', error);
    res.status(500).json({ error: '删除备份失败' });
  }
});

// 获取备份设置
router.get('/settings', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const settings = await global.backupDatabase.getSettings();
    
    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('获取备份设置失败:', error);
    res.status(500).json({ error: '获取备份设置失败' });
  }
});

// 保存备份设置
router.post('/settings', async (req, res) => {
  try {
    await ensureBackupDb();
    
    const settings = req.body;
    const result = await global.backupDatabase.saveSettings(settings);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('保存备份设置失败:', error);
    res.status(500).json({ error: '保存备份设置失败' });
  }
});

// 获取备份详情
router.get('/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    await ensureBackupDb();
    
    const backupData = await global.backupDatabase.getBackup(backupId, null);
    
    if (!backupData) {
      return res.status(404).json({ error: '备份不存在' });
    }
    
    res.json({
      success: true,
      backupData: backupData
    });
  } catch (error) {
    console.error('获取备份详情失败:', error);
    res.status(500).json({ error: '获取备份详情失败' });
  }
});

// 获取备份历史
router.get('/:backupId/history', async (req, res) => {
  try {
    const { backupId } = req.params;
    const { limit = 50 } = req.query;
    
    await ensureBackupDb();
    
    const history = await global.backupDatabase.getBackupHistory(backupId, parseInt(limit));
    
    res.json({
      success: true,
      backupId: backupId,
      history: history
    });
  } catch (error) {
    console.error('获取备份历史失败:', error);
    res.status(500).json({ error: '获取备份历史失败' });
  }
});

module.exports = router;