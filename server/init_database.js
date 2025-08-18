'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

/**
 * 数据库初始化脚本
 * 用于初始化主数据库和备份数据库的所有表结构
 */

class DatabaseInitializer {
  constructor() {
    this.mainDbPath = path.join(__dirname, 'database.sqlite');
    this.backupDbPath = path.join(__dirname, 'backup_database.sqlite');
  }

  /**
   * 初始化主数据库
   */
  async initMainDatabase() {
    console.log('开始初始化主数据库...');
    
    // 确保数据库目录存在
    await fs.mkdir(path.dirname(this.mainDbPath), { recursive: true });
    
    // 创建数据库连接
    const db = new sqlite3.Database(this.mainDbPath);
    
    try {
      await this.createMainTables(db);
      console.log('✅ 主数据库初始化完成');
    } catch (error) {
      console.error('❌ 主数据库初始化失败:', error);
      throw error;
    } finally {
      db.close();
    }
  }

  /**
   * 初始化备份数据库
   */
  async initBackupDatabase() {
    console.log('开始初始化备份数据库...');
    
    // 确保数据库目录存在
    await fs.mkdir(path.dirname(this.backupDbPath), { recursive: true });
    
    // 创建数据库连接
    const db = new sqlite3.Database(this.backupDbPath);
    
    try {
      await this.createBackupTables(db);
      console.log('✅ 备份数据库初始化完成');
    } catch (error) {
      console.error('❌ 备份数据库初始化失败:', error);
      throw error;
    } finally {
      db.close();
    }
  }

  /**
   * 创建主数据库的所有表
   */
  async createMainTables(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON');
        
        // 1. 用户表
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('创建用户表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 用户表已创建');
        });

        // 2. 笔记表
        db.run(`
          CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            tags TEXT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            is_pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            updated_at TIMESTAMP DEFAULT (datetime('now', 'localtime'))
          )
        `, (err) => {
          if (err) {
            console.error('创建笔记表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 笔记表已创建');
        });

        // 3. 标签表
        db.run(`
          CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            name TEXT NOT NULL,
            color TEXT DEFAULT 'blue',
            parent_id INTEGER DEFAULT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, name),
            FOREIGN KEY (parent_id) REFERENCES tags (id) ON DELETE SET NULL
          )
        `, (err) => {
          if (err) {
            console.error('创建标签表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 标签表已创建');
        });

        // 4. 标签颜色表
        db.run(`
          CREATE TABLE IF NOT EXISTS tag_colors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            tag_name TEXT NOT NULL,
            color_value TEXT NOT NULL,
            color_type TEXT DEFAULT 'preset',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, tag_name)
          )
        `, (err) => {
          if (err) {
            console.error('创建标签颜色表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 标签颜色表已创建');
        });

        // 5. 笔记引用表
        db.run(`
          CREATE TABLE IF NOT EXISTS note_references (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_note_id INTEGER NOT NULL,
            to_note_id INTEGER NOT NULL,
            reference_text TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (from_note_id) REFERENCES notes (id) ON DELETE CASCADE,
            FOREIGN KEY (to_note_id) REFERENCES notes (id) ON DELETE CASCADE,
            UNIQUE(from_note_id, to_note_id, reference_text)
          )
        `, (err) => {
          if (err) {
            console.error('创建笔记引用表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 笔记引用表已创建');
        });

        // 6. 全局卡片设置表
        db.run(`
          CREATE TABLE IF NOT EXISTS global_card_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            settings TEXT NOT NULL,
            theme_mode TEXT NOT NULL DEFAULT 'light',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, theme_mode)
          )
        `, (err) => {
          if (err) {
            console.error('创建全局卡片设置表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 全局卡片设置表已创建');
        });

        // 7. 笔记卡片设置表
        db.run(`
          CREATE TABLE IF NOT EXISTS note_card_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            note_id INTEGER NOT NULL,
            settings TEXT NOT NULL,
            theme_mode TEXT NOT NULL DEFAULT 'light',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
            UNIQUE(user_id, note_id, theme_mode)
          )
        `, (err) => {
          if (err) {
            console.error('创建笔记卡片设置表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 笔记卡片设置表已创建');
        });

        // 8. 配色方案表
        db.run(`
          CREATE TABLE IF NOT EXISTS color_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            name TEXT NOT NULL,
            scheme_data TEXT NOT NULL,
            theme_mode TEXT NOT NULL DEFAULT 'light',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('创建配色方案表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 配色方案表已创建');
        });

        // 9. 用户配置表
        db.run(`
          CREATE TABLE IF NOT EXISTS user_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            config_type TEXT NOT NULL,
            config_data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, config_type)
          )
        `, (err) => {
          if (err) {
            console.error('创建用户配置表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 用户配置表已创建');
        });

        // 10. 回收站表
        db.run(`
          CREATE TABLE IF NOT EXISTS recycle_bin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            is_pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            deleted_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            expire_at TIMESTAMP DEFAULT (datetime('now', '+30 days'))
          )
        `, (err) => {
          if (err) {
            console.error('创建回收站表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 回收站表已创建');
        });

        // 11. 笔记历史记录表
        db.run(`
          CREATE TABLE IF NOT EXISTS note_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            operation_type TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (note_id) REFERENCES notes(id)
          )
        `, (err) => {
          if (err) {
            console.error('创建笔记历史记录表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 笔记历史记录表已创建');
        });

        // 12. 文件引用计数表
        db.run(`
          CREATE TABLE IF NOT EXISTS file_references (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_hash TEXT NOT NULL UNIQUE,
            reference_count INTEGER NOT NULL DEFAULT 1,
            filename TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            updated_at TIMESTAMP DEFAULT (datetime('now', 'localtime'))
          )
        `, (err) => {
          if (err) {
            console.error('创建文件引用计数表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 文件引用计数表已创建');
        });

        // 创建索引
        const indexes = [
          'CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)',
          'CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)',
          'CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)',
          'CREATE INDEX IF NOT EXISTS idx_tag_colors_user_id ON tag_colors(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_references_from_note_id ON note_references(from_note_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_references_to_note_id ON note_references(to_note_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_references_user_id ON note_references(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_global_card_settings_user_id ON global_card_settings(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_card_settings_user_id ON note_card_settings(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_card_settings_note_id ON note_card_settings(note_id)',
          'CREATE INDEX IF NOT EXISTS idx_color_schemes_user_id ON color_schemes(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_recycle_bin_user_id ON recycle_bin(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON recycle_bin(deleted_at)',
          'CREATE INDEX IF NOT EXISTS idx_recycle_bin_expire_at ON recycle_bin(expire_at)',
          'CREATE INDEX IF NOT EXISTS idx_note_history_note_id ON note_history(note_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_history_user_id ON note_history(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_note_history_created_at ON note_history(created_at)',
          'CREATE INDEX IF NOT EXISTS idx_file_references_file_hash ON file_references(file_hash)',
          'CREATE INDEX IF NOT EXISTS idx_file_references_reference_count ON file_references(reference_count)',
          'CREATE INDEX IF NOT EXISTS idx_file_references_created_at ON file_references(created_at)'
        ];

        indexes.forEach((indexSql, index) => {
          db.run(indexSql, (err) => {
            if (err) {
              console.error(`创建索引失败 (${index + 1}):`, err.message);
            }
          });
        });

        resolve();
      });
    });
  }

  /**
   * 创建备份数据库的所有表
   */
  async createBackupTables(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON');
        
        // 1. 备份表
        db.run(`
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
            user_id TEXT NOT NULL DEFAULT 'default_user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('创建备份表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 备份表已创建');
        });

        // 2. 备份历史表
        db.run(`
          CREATE TABLE IF NOT EXISTS backup_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backup_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (backup_id) REFERENCES backups (backup_id)
          )
        `, (err) => {
          if (err) {
            console.error('创建备份历史表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 备份历史表已创建');
        });

        // 3. 系统历史表
        db.run(`
          CREATE TABLE IF NOT EXISTS system_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            description TEXT NOT NULL,
            details TEXT,
            notes_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('创建系统历史表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 系统历史表已创建');
        });

        // 4. 备份设置表
        db.run(`
          CREATE TABLE IF NOT EXISTS backup_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('创建备份设置表失败:', err.message);
            return reject(err);
          }
          console.log('✓ 备份设置表已创建');
        });

        // 创建索引
        const indexes = [
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

        indexes.forEach((indexSql, index) => {
          db.run(indexSql, (err) => {
            if (err) {
              console.error(`创建索引失败 (${index + 1}):`, err.message);
            }
          });
        });

        resolve();
      });
    });
  }

  /**
   * 初始化所有数据库
   */
  async initAll() {
    try {
      console.log('🚀 开始初始化所有数据库...\n');
      
      await this.initMainDatabase();
      console.log('');
      
      await this.initBackupDatabase();
      console.log('');
      
      console.log('🎉 所有数据库初始化完成！');
      console.log('📁 主数据库路径:', this.mainDbPath);
      console.log('📁 备份数据库路径:', this.backupDbPath);
      
    } catch (error) {
      console.error('❌ 数据库初始化过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 重置数据库（删除现有数据库并重新初始化）
   */
  async resetAll() {
    console.log('⚠️  开始重置所有数据库...');
    
    try {
      // 删除现有数据库文件
      if (await this.fileExists(this.mainDbPath)) {
        await fs.unlink(this.mainDbPath);
        console.log('✓ 已删除主数据库文件');
      }
      
      if (await this.fileExists(this.backupDbPath)) {
        await fs.unlink(this.backupDbPath);
        console.log('✓ 已删除备份数据库文件');
      }
      
      // 重新初始化
      await this.initAll();
      
    } catch (error) {
      console.error('❌ 重置数据库失败:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  const resetMode = args.includes('--reset') || args.includes('-r');
  
  if (resetMode) {
    console.log('🔄 重置模式：将删除所有现有数据库并重新初始化\n');
    initializer.resetAll()
      .then(() => {
        console.log('\n✅ 数据库重置完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ 数据库重置失败:', error);
        process.exit(1);
      });
  } else {
    initializer.initAll()
      .then(() => {
        console.log('\n✅ 数据库初始化完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ 数据库初始化失败:', error);
        process.exit(1);
      });
  }
}

module.exports = DatabaseInitializer;