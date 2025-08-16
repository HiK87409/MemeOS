import EnhancedBackupManager from './enhancedbackupmanager';

/**
 * 创建自动备份的独立函数
 * @param {Object} note - 笔记对象
 * @returns {Promise<void>}
 */
export const createAutoBackup = async (note) => {
  try {
    const backupManager = new EnhancedBackupManager();
    
    const settings = await backupManager.getSettings();
    if (settings.autoBackup === false) return;
    
    // 检查是否需要创建新备份（内容有变化）
    const backups = await backupManager.getAllBackups();
    const noteBackups = backups.filter(b => b.noteId === note.id);
    const lastBackup = noteBackups[0];
    
    if (!lastBackup || lastBackup.notes[0]?.content !== note.content) {
      const result = await backupManager.createBackup(note.id, 'auto');
      if (result.success) {
        // 创建历史记录
        await backupManager.createHistoryRecord(note.id, {
          title: note.title || '无标题',
          content: note.content,
          action: 'edit',
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('自动备份失败:', error);
  }
};

export default createAutoBackup;