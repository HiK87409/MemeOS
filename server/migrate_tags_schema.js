'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * 数据库迁移脚本：为tags表添加parent_id和sort_order字段
 */

class TagSchemaMigrator {
  constructor() {
    this.dbPath = path.join(__dirname, 'database.sqlite');
  }

  /**
   * 执行数据库迁移
   */
  async migrate() {
    console.log('开始迁移tags表结构...');
    
    const db = new sqlite3.Database(this.dbPath);
    
    try {
      await this.addColumns(db);
      console.log('✅ tags表结构迁移完成');
    } catch (error) {
      console.error('❌ tags表结构迁移失败:', error);
      throw error;
    } finally {
      db.close();
    }
  }

  /**
   * 添加新字段到tags表
   */
  async addColumns(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // 检查parent_id字段是否存在
        db.all("PRAGMA table_info(tags)", (err, rows) => {
          if (err) {
            return reject(err);
          }
          
          const columns = rows ? rows.map(row => row.name) : [];
          
          // 添加parent_id字段（如果不存在）
          if (!columns.includes('parent_id')) {
            db.run(`
              ALTER TABLE tags ADD COLUMN parent_id INTEGER DEFAULT NULL
            `, (err) => {
              if (err) {
                console.error('添加parent_id字段失败:', err.message);
                return reject(err);
              }
              console.log('✓ parent_id字段已添加');
            });
          } else {
            console.log('✓ parent_id字段已存在');
          }
          
          // 添加sort_order字段（如果不存在）
          if (!columns.includes('sort_order')) {
            db.run(`
              ALTER TABLE tags ADD COLUMN sort_order INTEGER DEFAULT 0
            `, (err) => {
              if (err) {
                console.error('添加sort_order字段失败:', err.message);
                return reject(err);
              }
              console.log('✓ sort_order字段已添加');
            });
          } else {
            console.log('✓ sort_order字段已存在');
          }
          
          // 为现有标签设置默认的sort_order值
          db.run(`
            UPDATE tags SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0
          `, (err) => {
            if (err) {
              console.error('设置默认sort_order值失败:', err.message);
              return reject(err);
            }
            console.log('✓ 默认sort_order值已设置');
          });
          
          resolve();
        });
      });
    });
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const migrator = new TagSchemaMigrator();
  migrator.migrate()
    .then(() => {
      console.log('数据库迁移成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库迁移失败:', error);
      process.exit(1);
    });
}

module.exports = TagSchemaMigrator;