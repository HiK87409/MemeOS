class TagModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化标签表
  initTable() {
    return new Promise((resolve, reject) => {
      // 检查表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'", (err, row) => {
        if (err) {
          console.error('检查标签表失败:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          // 表不存在，创建新表
          this.db.run(`CREATE TABLE tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            color TEXT DEFAULT 'blue',
            sort_order INTEGER DEFAULT 0,
            parent_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, name)
          )`, (err) => {
            if (err) {
              console.error('创建标签表失败:', err.message);
              reject(err);
            } else {
              console.log('标签表已初始化');
              resolve();
            }
          });
        } else {
          console.log('标签表已存在');
          // 检查是否需要添加sort_order字段
          this.db.run(`ALTER TABLE tags ADD COLUMN sort_order INTEGER DEFAULT 0`, (err) => {
            if (err) {
              // 字段可能已存在，忽略错误
              console.log('sort_order字段已存在或添加失败:', err.message);
            } else {
              console.log('sort_order字段添加成功');
            }
            resolve();
          });
        }
      });
    });
  }

  // 创建标签
  createTag(userId, tagName, color = 'blue') {
    return new Promise((resolve, reject) => {
      if (!userId || !tagName) {
        reject(new Error('用户ID和标签名称不能为空'));
        return;
      }

      // 检查标签是否已存在
      this.db.get(
        `SELECT id FROM tags WHERE user_id = ? AND name = ?`,
        [userId, tagName],
        (err, row) => {
          if (err) {
            console.error('检查标签是否存在失败:', err.message);
            reject(err);
            return;
          }

          if (row) {
            // 标签已存在，返回现有标签
            resolve({ success: true, message: '标签已存在', tagId: row.id });
            return;
          }

          // 创建新标签
          this.db.run(
            `INSERT INTO tags (user_id, name, color, updated_at) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [userId, tagName, color],
            function(err) {
              if (err) {
                console.error('创建标签失败:', err.message);
                reject(err);
              } else {
                resolve({ 
                  success: true, 
                  message: '标签创建成功', 
                  tagId: this.lastID,
                  tag: { id: this.lastID, name: tagName, color: color }
                });
              }
            }
          );
        }
      );
    });
  }

  // 获取用户的所有标签
  getAllTags(userId) {
    return new Promise((resolve, reject) => {
      if (!userId) {
        resolve([]);
        return;
      }

      this.db.all(
        `SELECT id, name, color, sort_order, parent_id, created_at, updated_at FROM tags 
         WHERE user_id = ? ORDER BY sort_order ASC, name ASC`,
        [userId],
        (err, rows) => {
          if (err) {
            console.error('获取标签失败:', err.message);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  // 获取标签名称列表（用于兼容现有API）
  getAllTagNames(userId) {
    return new Promise((resolve, reject) => {
      if (!userId) {
        resolve([]);
        return;
      }

      this.db.all(
        `SELECT name FROM tags WHERE user_id = ? ORDER BY name ASC`,
        [userId],
        (err, rows) => {
          if (err) {
            console.error('获取标签名称失败:', err.message);
            reject(err);
          } else {
            const tagNames = rows.map(row => row.name);
            resolve(tagNames);
          }
        }
      );
    });
  }

  // 更新标签
  updateTag(userId, tagId, updates) {
    return new Promise((resolve, reject) => {
      if (!userId || !tagId) {
        reject(new Error('用户ID和标签ID不能为空'));
        return;
      }

      const allowedFields = ['name', 'color', 'sort_order', 'parent_id'];
      const updateFields = [];
      const updateValues = [];

      // 构建更新字段
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        reject(new Error('没有有效的更新字段'));
        return;
      }

      // 添加updated_at字段
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(userId, tagId);

      const sql = `UPDATE tags SET ${updateFields.join(', ')} WHERE user_id = ? AND id = ?`;

      this.db.run(sql, updateValues, function(err) {
        if (err) {
          console.error('更新标签失败:', err.message);
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('标签不存在或无权限'));
        } else {
          resolve({ success: true, message: '标签更新成功', changes: this.changes });
        }
      });
    });
  }

  // 删除标签
  deleteTag(userId, tagId) {
    return new Promise((resolve, reject) => {
      if (!userId || !tagId) {
        reject(new Error('用户ID和标签ID不能为空'));
        return;
      }

      this.db.run(
        `DELETE FROM tags WHERE user_id = ? AND id = ?`,
        [userId, tagId],
        function(err) {
          if (err) {
            console.error('删除标签失败:', err.message);
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('标签不存在或无权限'));
          } else {
            resolve({ success: true, message: '标签删除成功', changes: this.changes });
          }
        }
      );
    });
  }

  // 根据名称删除标签
  deleteTagByName(userId, tagName) {
    return new Promise((resolve, reject) => {
      if (!userId || !tagName) {
        reject(new Error('用户ID和标签名称不能为空'));
        return;
      }

      this.db.run(
        `DELETE FROM tags WHERE user_id = ? AND name = ?`,
        [userId, tagName],
        function(err) {
          if (err) {
            console.error('删除标签失败:', err.message);
            reject(err);
          } else {
            resolve({ success: true, message: '标签删除成功', changes: this.changes });
          }
        }
      );
    });
  }

  // 获取特定标签信息
  getTag(userId, tagId) {
    return new Promise((resolve, reject) => {
      if (!userId || !tagId) {
        reject(new Error('用户ID和标签ID不能为空'));
        return;
      }

      this.db.get(
        `SELECT id, name, color, parent_id, sort_order, created_at, updated_at FROM tags 
         WHERE user_id = ? AND id = ?`,
        [userId, tagId],
        (err, row) => {
          if (err) {
            console.error('获取标签失败:', err.message);
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  // 根据名称获取标签
  getTagByName(userId, tagName) {
    return new Promise((resolve, reject) => {
      if (!userId || !tagName) {
        reject(new Error('用户ID和标签名称不能为空'));
        return;
      }

      this.db.get(
        `SELECT id, name, color, parent_id, sort_order, created_at, updated_at FROM tags 
         WHERE user_id = ? AND name = ?`,
        [userId, tagName],
        (err, row) => {
          if (err) {
            console.error('获取标签失败:', err.message);
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }
}

module.exports = TagModel;