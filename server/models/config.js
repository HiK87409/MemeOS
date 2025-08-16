const sqlite3 = require('sqlite3').verbose();

class ConfigModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化配置表
  async initTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        config_type TEXT NOT NULL,
        config_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, config_type)
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableQuery, (err) => {
        if (err) {
          console.error('创建配置表失败:', err);
          reject(err);
        } else {
          console.log('配置表创建成功');
          resolve();
        }
      });
    });
  }

  // 获取用户配置
  async getUserConfig(userId, configType) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT config_data, updated_at FROM user_configs WHERE user_id = ? AND config_type = ?';
      
      this.db.get(query, [userId, configType], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            resolve({
              data: JSON.parse(row.config_data),
              updatedAt: row.updated_at
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  // 保存用户配置
  async saveUserConfig(userId, configType, configData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO user_configs (user_id, config_type, config_data, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(query, [userId, configType, JSON.stringify(configData)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            id: this.lastID,
            message: '配置保存成功'
          });
        }
      });
    });
  }

  // 获取用户所有配置
  async getAllUserConfigs(userId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT config_type, config_data, updated_at FROM user_configs WHERE user_id = ?';
      
      this.db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const configs = {};
          rows.forEach(row => {
            configs[row.config_type] = {
              data: JSON.parse(row.config_data),
              updatedAt: row.updated_at
            };
          });
          resolve(configs);
        }
      });
    });
  }

  // 删除用户配置
  async deleteUserConfig(userId, configType) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM user_configs WHERE user_id = ? AND config_type = ?';
      
      this.db.run(query, [userId, configType], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            changes: this.changes,
            message: '配置删除成功'
          });
        }
      });
    });
  }

  // 获取配置的最后更新时间
  async getConfigTimestamp(userId, configType) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT updated_at FROM user_configs WHERE user_id = ? AND config_type = ?';
      
      this.db.get(query, [userId, configType], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.updated_at : null);
        }
      });
    });
  }

  // 获取所有配置的时间戳
  async getAllConfigTimestamps(userId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT config_type, updated_at FROM user_configs WHERE user_id = ?';
      
      this.db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const timestamps = {};
          rows.forEach(row => {
            timestamps[row.config_type] = row.updated_at;
          });
          resolve(timestamps);
        }
      });
    });
  }
}

module.exports = ConfigModel;