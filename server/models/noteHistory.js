class NoteHistoryModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化历史记录表
  initTable() {
    return new Promise((resolve, reject) => {
      // 检查表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='note_history'", (err, row) => {
        if (err) {
          console.error('检查历史记录表失败:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          // 表不存在，创建新表
          this.db.run(`CREATE TABLE note_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            operation_type TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (note_id) REFERENCES notes(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              console.error('创建历史记录表失败:', err.message);
              reject(err);
            } else {
              console.log('历史记录表已初始化');
              // 创建索引以提高查询性能
              this.db.run(`CREATE INDEX idx_note_history_note_id ON note_history(note_id)`, (err) => {
                if (err) {
                  console.error('创建索引失败:', err.message);
                } else {
                  console.log('历史记录表索引已创建');
                }
                resolve();
              });
            }
          });
        } else {
          console.log('历史记录表已存在');
          resolve();
        }
      });
    });
  }

  // 创建历史记录
  create(noteId, title, content, tags, operationType, userId) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO note_history (note_id, title, content, tags, operation_type, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
      // 确保noteId始终作为字符串存储，避免数字类型被SQLite添加.0后缀
      const params = [String(noteId), title, content, tags, operationType, userId];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('创建历史记录失败:', err.message);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            noteId,
            title,
            content,
            tags,
            operationType,
            userId,
            createdAt: new Date().toISOString()
          });
        }
      });
    });
  }

  // 获取笔记的所有历史记录
  getByNoteId(noteId, userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM note_history WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC`;
      const params = [noteId, userId];
      
      console.log(`[历史记录查询] 查询笔记 ${noteId} 的历史记录，用户ID: ${userId}`);
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('获取历史记录失败:', err.message);
          reject(err);
        } else {
          const historyRecords = rows.map(record => {
            // 解析标签数据
            let parsedTags = [];
            if (record.tags && typeof record.tags === 'string') {
              parsedTags = record.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            } else if (Array.isArray(record.tags)) {
              parsedTags = record.tags;
            }
            
            return {
              ...record,
              tags: parsedTags,
              operation_type: record.operation_type
            };
          });
          resolve(historyRecords);
        }
      });
    });
  }

  // 获取用户的所有历史记录
  getByUserId(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM note_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
      const params = [userId, limit];
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('获取用户历史记录失败:', err.message);
          reject(err);
        } else {
          const historyRecords = rows.map(record => {
            // 解析标签数据
            let parsedTags = [];
            if (record.tags && typeof record.tags === 'string') {
              parsedTags = record.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            } else if (Array.isArray(record.tags)) {
              parsedTags = record.tags;
            }
            
            return {
              ...record,
              tags: parsedTags,
              operation_type: record.operation_type
            };
          });
          resolve(historyRecords);
        }
      });
    });
  }

  // 删除历史记录
  deleteByNoteId(noteId, userId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM note_history WHERE note_id = ? AND user_id = ?`;
      const params = [noteId, userId];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('删除历史记录失败:', err.message);
          reject(err);
        } else {
          resolve({
            deletedCount: this.changes,
            noteId,
            userId
          });
        }
      });
    });
  }

  // 清理旧的历史记录（保留最近N条）
  cleanupOldRecords(noteId, userId, keepCount = 10) {
    return new Promise((resolve, reject) => {
      // 首先获取总记录数
      const countQuery = `SELECT COUNT(*) as total FROM note_history WHERE note_id = ? AND user_id = ?`;
      this.db.get(countQuery, [noteId, userId], (err, row) => {
        if (err) {
          console.error('获取历史记录数量失败:', err.message);
          reject(err);
          return;
        }
        
        const total = row.total;
        if (total <= keepCount) {
          resolve({ deletedCount: 0, message: '无需清理' });
          return;
        }
        
        // 获取需要保留的记录ID
        const keepQuery = `SELECT id FROM note_history WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const offset = total - keepCount;
        
        this.db.all(keepQuery, [noteId, userId, keepCount, offset], (err, rows) => {
          if (err) {
            console.error('获取需要删除的记录失败:', err.message);
            reject(err);
            return;
          }
          
          if (rows.length === 0) {
            resolve({ deletedCount: 0, message: '无需清理' });
            return;
          }
          
          const deleteIds = rows.map(row => row.id);
          const deleteQuery = `DELETE FROM note_history WHERE id IN (${deleteIds.map(() => '?').join(',')})`;
          
          this.db.run(deleteQuery, deleteIds, function(err) {
            if (err) {
              console.error('清理历史记录失败:', err.message);
              reject(err);
            } else {
              resolve({
                deletedCount: this.changes,
                noteId,
                userId,
                message: `已清理 ${this.changes} 条旧记录`
              });
            }
          });
        });
      });
    });
  }
}

module.exports = NoteHistoryModel;