const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

// 默认用户ID常量
// 使用全局userId常量

class BackupDatabase {
  constructor() {
    this.backupDbPath = path.join(__dirname, '../backup_database.sqlite');
    this.db = null;
  }

  // 初始化备份数据库
  async init() {
    try {
      // 确保数据库文件存在
      await fs.mkdir(path.dirname(this.backupDbPath), { recursive: true });
      
      // 创建数据库连接
      this.db = new sqlite3.Database(this.backupDbPath);
      
      // 创建备份表
      await this.createTables();
      
      console.log('备份数据库初始化成功');
    } catch (error) {
      console.error('备份数据库初始化失败:', error);
      throw error;
    }
  }

  // 创建数据库表
  async createTables() {
    const createBackupTable = `
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_id TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        backup_type TEXT NOT NULL,
        snapshot_type TEXT,
        description TEXT,
        data TEXT NOT NULL,
        size INTEGER NOT NULL,
        notes_count INTEGER DEFAULT 0,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    // 添加user_id列到现有表（如果不存在）
    const addUserIdColumn = `
      ALTER TABLE backups ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default_user' -- 使用全局userId常量
    `;

    const createBackupHistoryTable = `
      CREATE TABLE IF NOT EXISTS backup_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (backup_id) REFERENCES backups (backup_id)
      )
    `;

    const createSystemHistoryTable = `
      CREATE TABLE IF NOT EXISTS system_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        details TEXT,
        notes_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `;

    const createBackupSettingsTable = `
      CREATE TABLE IF NOT EXISTS backup_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_backups_backup_id ON backups(backup_id)',
      'CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_backups_backup_type ON backups(backup_type)',
      'CREATE INDEX IF NOT EXISTS idx_backup_history_backup_id ON backup_history(backup_id)',
      'CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_system_history_action ON system_history(action)',
      'CREATE INDEX IF NOT EXISTS idx_system_history_created_at ON system_history(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_backup_settings_key ON backup_settings(setting_key)',
      'CREATE INDEX IF NOT EXISTS idx_backup_settings_updated_at ON backup_settings(updated_at)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createBackupTable, (err) => {
          if (err) return reject(err);
        });

        // 尝试添加user_id列（如果列已存在，会忽略错误）
        this.db.run(addUserIdColumn, (err) => {
          // 忽略列已存在的错误
          if (err && !err.message.includes('duplicate column name')) {
            console.warn('添加user_id列失败:', err.message);
          }
        });

        this.db.run(createBackupHistoryTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createSystemHistoryTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createBackupSettingsTable, (err) => {
          if (err) return reject(err);
        });

        // 创建索引
        createIndexes.forEach(indexSql => {
          this.db.run(indexSql, (err) => {
            if (err) console.error('创建索引失败:', err);
          });
        });

        resolve();
      });
    });
  }

  // 生成笔记内容的哈希值
  generateNoteHash(note) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      content: note.content,
      tags: note.tags || [],
      created_at: note.created_at
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // 创建备份
  async createBackup(backupData) {
    const {
      backupType,
      snapshotType,
      description,
      data,
      userId
    } = backupData;

    const backupId = this.generateBackupId();
    const filename = this.generateFilename(backupType, snapshotType);
    const createdAt = new Date().toISOString();
    const self = this; // 保存类实例引用

    // 为每个笔记生成哈希值并添加到备份数据中
    const notesWithHashes = (data.notes || []).map(note => ({
      ...note,
      _hash: this.generateNoteHash(note)
    }));

    const backupDataWithHashes = {
      ...data,
      notes: notesWithHashes
    };

    const sql = `
      INSERT INTO backups (
        backup_id, filename, backup_type, snapshot_type, 
        description, data, size, notes_count, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      backupId,
      filename,
      backupType || 'backup',
      snapshotType || null,
      description || null,
      JSON.stringify(backupDataWithHashes),
      JSON.stringify(backupDataWithHashes).length,
      notesWithHashes.length,
      userId || 'default_user', // 使用固定的用户ID而不是随机生成的
      createdAt,
      createdAt
    ];

    return new Promise((resolve, reject) => {
      self.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          // 记录备份历史
          self.recordBackupHistory(backupId, 'create', {
            filename: filename,
            size: JSON.stringify(backupDataWithHashes).length
          }).catch(err => console.error('记录备份历史失败:', err));
          
          resolve({
            success: true,
            backupId: backupId,
            filename: filename,
            createdAt: createdAt
          });
        }
      });
    });
  }

  // 获取备份列表
  async getBackups(filters = {}) {
    const { type, userId, limit = 100, offset = 0 } = filters;
    
    let whereClause = '';
    let params = [];
    
    // 始终使用固定用户ID进行过滤
    const effectiveUserId = userId || 'default_user';
    
    const conditions = [];
    conditions.push('user_id = ?');
    params.push(effectiveUserId);
    
    if (type) {
      conditions.push('backup_type = ?');
      params.push(type);
    }
    
    whereClause = 'WHERE ' + conditions.join(' AND ');
    
    console.log(`获取备份列表，用户ID: ${effectiveUserId}, 类型: ${type}`);
    
    const sql = `
      SELECT 
        backup_id, filename, backup_type, snapshot_type, 
        description, data, size, notes_count, created_at, updated_at
      FROM backups 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const backups = rows.map(row => {
            let parsedData = { notes: [], tags: [], mediaFiles: [], backupTime: row.created_at, version: '1.0' };
            try {
              if (row.data) {
                parsedData = JSON.parse(row.data);
              }
            } catch (parseError) {
              console.warn('解析备份数据失败:', parseError.message);
            }
            
            return {
              id: row.backup_id,
              filename: row.filename,
              backupType: row.backup_type,
              snapshotType: row.snapshot_type,
              description: row.description,
              data: parsedData,
              size: row.size,
              notesCount: row.notes_count,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
          });
          resolve(backups);
        }
      });
    });
  }

  // 获取备份详情
  async getBackup(backupId, userId) {
    const effectiveUserId = userId || 'default_user';
    const sql = 'SELECT * FROM backups WHERE backup_id = ? AND user_id = ?';

    return new Promise((resolve, reject) => {
      this.db.get(sql, [backupId, effectiveUserId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          console.log(`备份不存在或用户ID不匹配: backupId=${backupId}, userId=${effectiveUserId}`);
          resolve(null);
        } else {
          try {
            const backupData = {
              id: row.backup_id,
              filename: row.filename,
              backupType: row.backup_type,
              snapshotType: row.snapshot_type,
              description: row.description,
              data: JSON.parse(row.data),
              size: row.size,
              notesCount: row.notes_count,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            console.log(`成功获取备份: ${backupId}, 用户ID: ${effectiveUserId}`);
            resolve(backupData);
          } catch (parseError) {
            reject(new Error('备份数据解析失败'));
          }
        }
      });
    });
  }

  // 删除备份
  async deleteBackup(backupId, userId) {
    const effectiveUserId = userId || 'default_user';
    const sql = 'DELETE FROM backups WHERE backup_id = ? AND user_id = ?';
    const self = this; // 保存类实例引用

    return new Promise((resolve, reject) => {
      self.db.run(sql, [backupId, effectiveUserId], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          console.log(`删除备份失败: backupId=${backupId}, userId=${effectiveUserId} - 备份不存在或用户ID不匹配`);
          resolve({ success: false, message: '备份不存在或无权限删除' });
        } else {
          console.log(`成功删除备份: ${backupId}, 用户ID: ${effectiveUserId}`);
          // 记录删除历史
          self.recordBackupHistory(backupId, 'delete', {
            deleted_at: new Date().toISOString()
          }).catch(err => console.error('记录备份历史失败:', err));
          
          resolve({ success: true, message: '备份删除成功' });
        }
      });
    });
  }

  // 记录备份历史
  async recordBackupHistory(backupId, action, details = {}) {
    const sql = `
      INSERT INTO backup_history (backup_id, action, details, created_at)
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      backupId,
      action,
      JSON.stringify(details),
      new Date().toISOString()
    ];

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // 获取备份历史
  async getBackupHistory(backupId, limit = 50) {
    const sql = `
      SELECT action, details, created_at
      FROM backup_history
      WHERE backup_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [backupId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const history = rows.map(row => ({
            action: row.action,
            details: JSON.parse(row.details || '{}'),
            createdAt: row.created_at
          }));
          resolve(history);
        }
      });
    });
  }

  // 生成备份ID
  generateBackupId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 9);
    return `backup_${timestamp}_${random}`;
  }

  // 生成文件名
  generateFilename(backupType, snapshotType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 9);
    
    if (snapshotType) {
      return `${backupType}_${snapshotType}_${timestamp}_${random}.json`;
    }
    return `${backupType}_${timestamp}_${random}.json`;
  }

  // 生成随机用户ID
  generateRandomUserId() {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  // 记录系统历史记录
  async recordSystemHistory(action, description, details = {}) {
    const sql = `
      INSERT INTO system_history (action, description, details, notes_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      action,
      description,
      JSON.stringify(details),
      details.notesCount || 0,
      new Date().toISOString()
    ];

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            historyId: this.lastID
          });
        }
      });
    });
  }

  // 获取系统历史记录
  async getSystemHistory(filters = {}) {
    const { limit = 100, offset = 0, action } = filters;
    
    let whereClause = '';
    let params = [];
    
    if (action) {
      whereClause = 'WHERE action = ?';
      params.push(action);
    }
    
    const sql = `
      SELECT id, action, description, details, notes_count, created_at
      FROM system_history
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const history = rows.map(row => ({
            id: row.id,
            action: row.action,
            description: row.description,
            details: JSON.parse(row.details || '{}'),
            notesCount: row.notes_count,
            createdAt: row.created_at
          }));
          resolve(history);
        }
      });
    });
  }

  // 获取所有历史记录（备份历史和系统历史）
  async getAllHistory(filters = {}) {
    const { limit = 100, offset = 0 } = filters;
    
    // 获取备份历史（包含备份信息）
    const backupHistoryQuery = `
      SELECT 
        bh.id,
        bh.action,
        bh.details,
        bh.created_at,
        b.notes_count,
        b.filename,
        'backup' as record_type
      FROM backup_history bh
      JOIN backups b ON bh.backup_id = b.backup_id
      ORDER BY bh.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // 获取系统历史
    const systemHistoryQuery = `
      SELECT 
        id,
        action,
        description,
        details,
        notes_count,
        created_at,
        'system' as record_type
      FROM system_history
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const backupHistory = await new Promise((resolve, reject) => {
        this.db.all(backupHistoryQuery, [limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const systemHistory = await new Promise((resolve, reject) => {
        this.db.all(systemHistoryQuery, [limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // 合并并格式化历史记录
      const allHistory = [
        ...backupHistory.map(row => ({
          id: `backup_${row.id}`,
          action: row.action,
          description: this.getBackupActionDescription(row.action, row.notes_count, row.filename),
          details: JSON.parse(row.details || '{}'),
          notesCount: row.notes_count,
          createdAt: row.created_at,
          recordType: row.record_type
        })),
        ...systemHistory.map(row => ({
          id: `system_${row.id}`,
          action: row.action,
          description: row.description,
          details: JSON.parse(row.details || '{}'),
          notesCount: row.notes_count,
          createdAt: row.created_at,
          recordType: row.record_type
        }))
      ];

      // 按时间排序
      allHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return allHistory.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // 清除历史记录
  async clearHistory(type = 'system') {
    try {
      if (type === 'system' || type === 'all') {
        await new Promise((resolve, reject) => {
          this.db.run('DELETE FROM system_history', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      if (type === 'all') {
        await new Promise((resolve, reject) => {
          this.db.run('DELETE FROM backup_history', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      const message = type === 'all' ? '所有历史记录已清除' : '系统历史记录已清除';
      return { success: true, message };
    } catch (error) {
      throw error;
    }
  }

  // 获取备份操作描述
  getBackupActionDescription(action, notesCount, filename) {
    const descriptions = {
      'create': `创建完整备份，备份了${notesCount}条笔记`,
      'restore': `恢复备份，恢复了${notesCount}条笔记`,
      'delete': `删除备份，删除了${notesCount}条笔记的备份数据`,
      'export_single': `导出单条笔记备份`,
      'export_all': `导出全部笔记备份，导出了${notesCount}条笔记`
    };
    
    return descriptions[action] || `${action}操作`;
  }

  // 保存备份设置
  async saveSettings(settings) {
    const settingsMap = {
      'autoBackup': settings.autoBackup,
      'backupInterval': settings.backupInterval,
      'compressionEnabled': settings.compressionEnabled
    };

    const createdAt = new Date().toISOString();
    
    try {
      for (const [key, value] of Object.entries(settingsMap)) {
        const sql = `
          INSERT OR REPLACE INTO backup_settings 
          (setting_key, setting_value, description, created_at, updated_at)
          VALUES (?, ?, ?, COALESCE((SELECT created_at FROM backup_settings WHERE setting_key = ?), ?), ?)
        `;
        
        const params = [
          key,
          JSON.stringify(value),
          `备份设置: ${key}`,
          key,
          createdAt,
          createdAt
        ];
        
        await new Promise((resolve, reject) => {
          this.db.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      return { success: true, message: '备份设置保存成功' };
    } catch (error) {
      console.error('保存备份设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取备份设置
  async getSettings() {
    const sql = `
      SELECT setting_key, setting_value
      FROM backup_settings
      WHERE setting_key IN ('autoBackup', 'backupInterval', 'compressionEnabled')
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const settings = {
            autoBackup: true,
            backupInterval: 10,
            compressionEnabled: true
          };
          
          rows.forEach(row => {
            try {
              settings[row.setting_key] = JSON.parse(row.setting_value);
            } catch (parseError) {
              console.warn(`解析设置值失败 ${row.setting_key}:`, parseError);
            }
          });
          
          resolve(settings);
        }
      });
    });
  }

  // 恢复备份（带哈希比对）
  async restoreBackupWithHashCheck(backupId, currentNotes, userId) {
    const effectiveUserId = userId || 'default_user';
    
    // 获取备份数据
    const backupData = await this.getBackup(backupId, effectiveUserId);
    if (!backupData) {
      throw new Error('备份不存在或无权限访问');
    }

    const backupNotes = backupData.data.notes || [];
    const restoredNotes = [];
    const skippedNotes = [];
    const updatedNotes = [];

    // 创建当前笔记的哈希映射
    const currentNotesHashMap = new Map();
    currentNotes.forEach(note => {
      const hash = this.generateNoteHash(note);
      currentNotesHashMap.set(hash, note);
    });

    // 处理每个备份笔记
    for (const backupNote of backupNotes) {
      const backupHash = backupNote._hash;
      
      if (!backupHash) {
        // 如果没有哈希值，直接恢复
        restoredNotes.push(backupNote);
        continue;
      }

      const existingNote = currentNotesHashMap.get(backupHash);
      
      if (existingNote) {
        // 哈希相同，跳过恢复
        skippedNotes.push({
          id: backupNote.id,
          title: backupNote.title,
          reason: '哈希相同，内容未变化'
        });
      } else {
        // 哈希不同，需要恢复
        // 检查是否有相同ID的笔记需要更新
        const existingNoteById = currentNotes.find(note => note.id === backupNote.id);
        if (existingNoteById) {
          // 更新现有笔记
          updatedNotes.push({
            id: backupNote.id,
            title: backupNote.title,
            reason: '哈希不同，内容已更新'
          });
          restoredNotes.push(backupNote);
        } else {
          // 新笔记，直接恢复
          restoredNotes.push(backupNote);
        }
      }
    }

    // 记录恢复历史
    await this.recordBackupHistory(backupId, 'restore_with_hash_check', {
      restored_at: new Date().toISOString(),
      total_backup_notes: backupNotes.length,
      restored_notes: restoredNotes.length,
      skipped_notes: skippedNotes.length,
      updated_notes: updatedNotes.length,
      skipped_details: skippedNotes,
      updated_details: updatedNotes
    });

    return {
      success: true,
      backupId: backupId,
      restoredNotes: restoredNotes,
      skippedNotes: skippedNotes,
      updatedNotes: updatedNotes,
      summary: {
        totalBackupNotes: backupNotes.length,
        restoredCount: restoredNotes.length,
        skippedCount: skippedNotes.length,
        updatedCount: updatedNotes.length
      }
    };
  }

  // 关闭数据库连接
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('备份数据库连接已关闭');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = BackupDatabase;