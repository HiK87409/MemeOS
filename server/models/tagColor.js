class TagColorModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化标签颜色表
  initTable() {
    return new Promise((resolve, reject) => {
      // 检查表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tag_colors'", (err, row) => {
        if (err) {
          console.error('检查标签颜色表失败:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          // 表不存在，创建新表
          this.db.run(`CREATE TABLE tag_colors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tag_name TEXT NOT NULL,
            color_value TEXT NOT NULL,
            color_type TEXT DEFAULT 'preset',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, tag_name)
          )`, (err) => {
            if (err) {
              console.error('创建标签颜色表失败:', err.message);
              reject(err);
            } else {
              console.log('标签颜色表已初始化');
              resolve();
            }
          });
        } else {
          console.log('标签颜色表已存在');
          resolve();
        }
      });
    });
  }

  // 保存标签颜色
  saveTagColor(userId, tagName, colorValue, colorType = 'preset') {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO tag_colors (user_id, tag_name, color_value, color_type, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, tagName, colorValue, colorType],
        function(err) {
          if (err) {
            console.error('保存标签颜色失败:', err.message);
            reject(err);
          } else {
            resolve({ success: true, id: this.lastID });
          }
        }
      );
    });
  }

  // 获取用户的所有标签颜色
  getUserTagColors(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT tag_name, color_value, color_type FROM tag_colors WHERE user_id = ?`,
        [userId],
        (err, rows) => {
          if (err) {
            console.error('获取标签颜色失败:', err.message);
            reject(err);
          } else {
            // 转换为对象格式
            const tagColors = {};
            rows.forEach(row => {
              tagColors[row.tag_name] = row.color_value;
            });
            resolve(tagColors);
          }
        }
      );
    });
  }

  // 获取用户的自定义颜色
  getUserCustomColors(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT DISTINCT color_value FROM tag_colors 
         WHERE user_id = ? AND color_type = 'custom' 
         ORDER BY updated_at DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            console.error('获取自定义颜色失败:', err.message);
            reject(err);
          } else {
            const customColors = rows.map(row => ({
              value: row.color_value,
              name: '自定义颜色',
              hexColor: row.color_value,
              class: ''
            }));
            resolve(customColors);
          }
        }
      );
    });
  }

  // 删除标签颜色
  deleteTagColor(userId, tagName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM tag_colors WHERE user_id = ? AND tag_name = ?`,
        [userId, tagName],
        function(err) {
          if (err) {
            console.error('删除标签颜色失败:', err.message);
            reject(err);
          } else {
            resolve({ success: true, changes: this.changes });
          }
        }
      );
    });
  }

  // 删除自定义颜色（删除所有使用该颜色的标签）
  deleteCustomColor(userId, colorValue) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM tag_colors WHERE user_id = ? AND color_value = ? AND color_type = 'custom'`,
        [userId, colorValue],
        function(err) {
          if (err) {
            console.error('删除自定义颜色失败:', err.message);
            reject(err);
          } else {
            resolve({ success: true, changes: this.changes });
          }
        }
      );
    });
  }

  // 获取特定标签的颜色
  getTagColor(userId, tagName) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT color_value FROM tag_colors WHERE user_id = ? AND tag_name = ?`,
        [userId, tagName],
        (err, row) => {
          if (err) {
            console.error('获取标签颜色失败:', err.message);
            reject(err);
          } else {
            resolve(row ? row.color_value : null);
          }
        }
      );
    });
  }
}

module.exports = TagColorModel;