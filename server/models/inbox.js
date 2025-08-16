class InboxModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化收件箱表
  initTable() {
    return new Promise((resolve, reject) => {
      // 首先检查表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inbox'", (err, row) => {
        if (err) {
          console.error('检查收件箱表失败:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          // 表不存在，创建新表
          this.db.run(`CREATE TABLE inbox (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            source TEXT DEFAULT 'card',
            source_id TEXT,
            user_id INTEGER,
            is_read INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            updated_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              console.error('创建收件箱表失败:', err.message);
              reject(err);
            } else {
              console.log('收件箱表已初始化');
              resolve();
            }
          });
        } else {
          console.log('收件箱表已存在');
          resolve();
        }
      });
    });
  }

  // 创建收件箱项目
  create(inboxData) {
    return new Promise((resolve, reject) => {
      const { id, title, content, source = 'card', source_id, user_id } = inboxData;
      
      const query = `INSERT INTO inbox (id, title, content, source, source_id, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
      const params = [id, title, content, source, source_id, user_id];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('创建收件箱项目失败:', err.message);
          reject(err);
        } else {
          // 获取刚创建的项目
          this.db.get("SELECT * FROM inbox WHERE id = ?", [id], (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                ...row,
                is_read: Boolean(row.is_read),
                is_archived: Boolean(row.is_archived)
              });
            }
          });
        }
      });
    });
  }

  // 获取用户的所有收件箱项目
  getAllByUserId(userId, { unreadOnly = false, excludeArchived = true } = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM inbox WHERE user_id = ?';
      let params = [userId];
      
      if (unreadOnly) {
        query += ' AND is_read = 0';
      }
      
      if (excludeArchived) {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY created_at DESC';
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('获取收件箱项目失败:', err.message);
          reject(err);
        } else {
          const items = rows.map(item => ({
            ...item,
            is_read: Boolean(item.is_read),
            is_archived: Boolean(item.is_archived)
          }));
          resolve(items);
        }
      });
    });
  }

  // 标记为已读
  markAsRead(id, userId) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE inbox SET is_read = 1, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?`;
      const params = [id, userId];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('标记已读失败:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // 标记为未读
  markAsUnread(id, userId) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE inbox SET is_read = 0, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?`;
      const params = [id, userId];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('标记未读失败:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // 归档项目
  archive(id, userId) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE inbox SET is_archived = 1, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?`;
      const params = [id, userId];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('归档失败:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // 删除项目
  delete(id, userId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM inbox WHERE id = ? AND user_id = ?`;
      const params = [id, userId];
      
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('删除收件箱项目失败:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // 获取未读数量
  getUnreadCount(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT COUNT(*) as count FROM inbox WHERE user_id = ? AND is_read = 0 AND is_archived = 0`;
      const params = [userId];
      
      this.db.get(query, params, (err, row) => {
        if (err) {
          console.error('获取未读数量失败:', err.message);
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}

module.exports = InboxModel;