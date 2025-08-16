class CardSettingsModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化卡片设置表
  initTable() {
    return new Promise((resolve, reject) => {
      // 创建全局卡片设置表
      this.db.run(`CREATE TABLE IF NOT EXISTS global_card_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        settings TEXT NOT NULL,
        theme_mode TEXT NOT NULL DEFAULT 'light',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, theme_mode)
      )`, (err) => {
        if (err) {
          console.error('创建全局卡片设置表失败:', err.message);
          reject(err);
          return;
        }

        // 创建单个笔记卡片设置表
      this.db.run(`CREATE TABLE IF NOT EXISTS note_card_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        note_id INTEGER NOT NULL,
        settings TEXT NOT NULL,
        theme_mode TEXT NOT NULL DEFAULT 'light',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE(user_id, note_id, theme_mode)
      )`, (err) => {
          if (err) {
            console.error('创建笔记卡片设置表失败:', err.message);
            reject(err);
          } else {
            // 创建配色方案表
        this.db.run(`CREATE TABLE IF NOT EXISTS color_schemes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          scheme_data TEXT NOT NULL,
          theme_mode TEXT NOT NULL DEFAULT 'light',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
              if (err) {
                console.error('创建配色方案表失败:', err.message);
                reject(err);
              } else {
                console.log('卡片设置表和配色方案表已初始化');
                resolve();
              }
            });
          }
        });
      });
    });
  }

  // 获取用户的全局卡片设置
  getGlobalSettings(userId, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const tableName = 'global_card_settings';
      
      this.db.get(`SELECT settings FROM ${tableName} WHERE user_id = ? AND theme_mode = ?`, [userId, themeMode], (err, row) => {
        if (err) {
          console.error('获取全局卡片设置失败:', err.message);
          reject(err);
        } else {
          if (row) {
            try {
              const settings = JSON.parse(row.settings);
              resolve(settings);
            } catch (parseErr) {
              console.error('解析全局卡片设置失败:', parseErr.message);
              resolve({});
            }
          } else {
            resolve({});
          }
        }
      });
    });
  }

  // 保存用户的全局卡片设置
  saveGlobalSettings(userId, settings, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const settingsJson = JSON.stringify(settings);
      const tableName = 'global_card_settings';
      
      // 检查是否已存在该用户的设置
      this.db.get(
        `SELECT id FROM ${tableName} WHERE user_id = ? AND theme_mode = ?`,
        [userId, themeMode],
        (err, row) => {
          if (err) {
            console.error(`查询${themeMode === 'dark' ? '深色' : '浅色'}模式全局卡片设置失败:`, err.message);
            reject(err);
            return;
          }

          if (row) {
            // 更新现有设置
            this.db.run(
              `UPDATE ${tableName} SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND theme_mode = ?`,
              [settingsJson, userId, themeMode],
              function(err) {
                if (err) {
                  console.error(`更新${themeMode === 'dark' ? '深色' : '浅色'}模式全局卡片设置失败:`, err.message);
                  reject(err);
                } else {
                  console.log(`${themeMode === 'dark' ? '深色' : '浅色'}模式全局卡片设置已更新，用户ID: ${userId}`);
                  resolve({ id: this.lastID, success: true });
                }
              }
            );
          } else {
            // 插入新设置
            this.db.run(
              `INSERT INTO ${tableName} (user_id, settings, theme_mode, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [userId, settingsJson, themeMode],
              function(err) {
                if (err) {
                  console.error(`插入${themeMode === 'dark' ? '深色' : '浅色'}模式全局卡片设置失败:`, err.message);
                  reject(err);
                } else {
                  console.log(`${themeMode === 'dark' ? '深色' : '浅色'}模式全局卡片设置已插入，用户ID: ${userId}`);
                  resolve({ id: this.lastID, success: true });
                }
              }
            );
          }
        }
      );
    });
  }

  // 获取特定笔记的卡片设置
  getNoteSettings(userId, noteId, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const tableName = 'note_card_settings';
      
      this.db.get(`SELECT settings FROM ${tableName} WHERE user_id = ? AND note_id = ? AND theme_mode = ?`, [userId, noteId, themeMode], (err, row) => {
        if (err) {
          console.error('获取笔记卡片设置失败:', err.message);
          reject(err);
        } else {
          if (row) {
            try {
              const settings = JSON.parse(row.settings);
              resolve(settings);
            } catch (parseErr) {
              console.error('解析笔记卡片设置失败:', parseErr.message);
              resolve({});
            }
          } else {
            resolve({});
          }
        }
      });
    });
  }

  // 保存特定笔记的卡片设置
  saveNoteSettings(userId, noteId, settings, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const settingsJson = JSON.stringify(settings);
      const tableName = 'note_card_settings';
      
      // 检查是否已存在该用户的设置
      this.db.get(
        `SELECT id FROM ${tableName} WHERE user_id = ? AND note_id = ? AND theme_mode = ?`,
        [userId, noteId, themeMode],
        (err, row) => {
          if (err) {
            console.error(`查询${themeMode === 'dark' ? '深色' : '浅色'}模式笔记卡片设置失败:`, err.message);
            reject(err);
            return;
          }

          if (row) {
            // 更新现有设置
            this.db.run(
              `UPDATE ${tableName} SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND note_id = ? AND theme_mode = ?`,
              [settingsJson, userId, noteId, themeMode],
              function(err) {
                if (err) {
                  console.error(`更新${themeMode === 'dark' ? '深色' : '浅色'}模式笔记卡片设置失败:`, err.message);
                  reject(err);
                } else {
                  console.log(`${themeMode === 'dark' ? '深色' : '浅色'}模式笔记卡片设置已更新，用户ID: ${userId}, 笔记ID: ${noteId}`);
                  resolve({ id: this.lastID, success: true });
                }
              }
            );
          } else {
            // 插入新设置
            this.db.run(
              `INSERT INTO ${tableName} (user_id, note_id, settings, theme_mode, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [userId, noteId, settingsJson, themeMode],
              function(err) {
                if (err) {
                  console.error(`插入${themeMode === 'dark' ? '深色' : '浅色'}模式笔记卡片设置失败:`, err.message);
                  reject(err);
                } else {
                  console.log(`${themeMode === 'dark' ? '深色' : '浅色'}模式笔记卡片设置已插入，用户ID: ${userId}, 笔记ID: ${noteId}`);
                  resolve({ id: this.lastID, success: true });
                }
              }
            );
          }
        }
      );
    });
  }

  // 删除特定笔记的卡片设置（恢复为全局设置）
  deleteNoteSettings(userId, noteId, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const tableName = 'note_card_settings';
      
      this.db.run(`DELETE FROM ${tableName} WHERE user_id = ? AND note_id = ? AND theme_mode = ?`, [userId, noteId, themeMode], function(err) {
        if (err) {
          console.error('删除笔记卡片设置失败:', err.message);
          reject(err);
        } else {
          console.log(`笔记卡片设置已删除，用户ID: ${userId}, 笔记ID: ${noteId}`);
          resolve({ success: true, message: '笔记卡片设置删除成功', deletedCount: this.changes });
        }
      });
    });
  }

  // 获取用户所有笔记的自定义设置
  getAllNoteSettings(userId, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const tableName = 'note_card_settings';
      
      this.db.all(`SELECT note_id, settings FROM ${tableName} WHERE user_id = ? AND theme_mode = ?`, [userId, themeMode], (err, rows) => {
        if (err) {
          console.error('获取所有笔记卡片设置失败:', err.message);
          reject(err);
        } else {
          const settingsMap = {};
          rows.forEach(row => {
            try {
              settingsMap[row.note_id] = JSON.parse(row.settings);
            } catch (parseErr) {
              console.error(`解析笔记${row.note_id}的卡片设置失败:`, parseErr.message);
            }
          });
          resolve(settingsMap);
        }
      });
    });
  }

  // 删除用户所有笔记的个性化设置（全部恢复默认）
  deleteAllNoteSettings(userId, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      const tableName = 'note_card_settings';
      
      this.db.run(`DELETE FROM ${tableName} WHERE user_id = ? AND theme_mode = ?`, [userId, themeMode], function(err) {
        if (err) {
          console.error('删除所有笔记卡片设置失败:', err.message);
          reject(err);
        } else {
          console.log(`所有笔记卡片设置已删除，用户ID: ${userId}, 删除数量: ${this.changes}`);
          resolve({ success: true, message: '所有笔记卡片设置删除成功', deletedCount: this.changes });
        }
      });
    });
  }

  // 获取用户的所有配色方案
  getColorSchemes(userId, themeMode = null) {
    return new Promise((resolve, reject) => {
      let query = `SELECT id, name, scheme_data, theme_mode, created_at FROM color_schemes WHERE user_id = ?`;
      const params = [userId];
      
      if (themeMode) {
        query += ` AND theme_mode = ?`;
        params.push(themeMode);
      }
      
      query += ` ORDER BY created_at DESC`;
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('获取配色方案失败:', err.message);
          reject(err);
        } else {
          const schemes = rows.map(row => {
            try {
              return {
                id: row.id,
                name: row.name,
                created_at: row.created_at,
                theme_mode: row.theme_mode,
                settings: JSON.parse(row.scheme_data)
              };
            } catch (parseErr) {
              console.error(`解析配色方案${row.id}失败:`, parseErr.message);
              return null;
            }
          }).filter(scheme => scheme !== null);
          resolve(schemes);
        }
      });
    });
  }

  // 保存配色方案
  saveColorScheme(userId, name, schemeData, themeMode = 'light') {
    return new Promise((resolve, reject) => {
      // 检查用户配色方案数量限制
      const countQuery = `SELECT COUNT(*) as count FROM color_schemes WHERE user_id = ?`;
      
      this.db.get(countQuery, [userId], (err, row) => {
        if (err) {
          console.error('检查配色方案数量失败:', err.message);
          reject(err);
          return;
        }

        if (row.count >= 10) {
          reject(new Error('最多只能保存10个配色方案'));
          return;
        }

        const schemeJson = JSON.stringify(schemeData);
        const insertQuery = `INSERT INTO color_schemes (user_id, name, scheme_data, theme_mode) VALUES (?, ?, ?, ?)`;
        
        this.db.run(insertQuery, [userId, name, schemeJson, themeMode], function(err) {
          if (err) {
            console.error('保存配色方案失败:', err.message);
            reject(err);
          } else {
            console.log(`配色方案已保存，用户ID: ${userId}, 方案ID: ${this.lastID}`);
            resolve({ success: true, id: this.lastID, message: '配色方案保存成功' });
          }
        });
      });
    });
  }

  // 删除配色方案
  deleteColorScheme(userId, schemeId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM color_schemes WHERE user_id = ? AND id = ?`;
      
      this.db.run(query, [userId, schemeId], function(err) {
        if (err) {
          console.error('删除配色方案失败:', err.message);
          reject(err);
        } else {
          console.log(`配色方案已删除，用户ID: ${userId}, 方案ID: ${schemeId}`);
          resolve({ success: true, message: '配色方案删除成功', deletedCount: this.changes });
        }
      });
    });
  }
}

module.exports = CardSettingsModel;