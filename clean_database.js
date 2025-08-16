'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 数据库清除脚本
 * 用于清除所有数据库文件并重新初始化
 */

class DatabaseCleaner {
  constructor() {
    this.serverDir = path.join(__dirname, 'server');
    this.mainDbPath = path.join(this.serverDir, 'database.sqlite');
    this.backupDbPath = path.join(this.serverDir, 'backup_database.sqlite');
    this.memeosDbPath = path.join(this.serverDir, 'memeos.db');
    this.uploadsDir = path.join(this.serverDir, 'uploads');
  }

  /**
   * 清除所有数据库文件
   */
  async cleanAllDatabases() {
    console.log('开始清除数据库...');
    
    const dbFiles = [
      this.mainDbPath,
      this.backupDbPath,
      this.memeosDbPath
    ];

    let cleanedCount = 0;
    
    for (const dbFile of dbFiles) {
      try {
        if (fs.existsSync(dbFile)) {
          fs.unlinkSync(dbFile);
          console.log(`✅ 已删除数据库文件: ${path.basename(dbFile)}`);
          cleanedCount++;
        } else {
          console.log(`⚠️  数据库文件不存在: ${path.basename(dbFile)}`);
        }
      } catch (error) {
        console.error(`❌ 删除数据库文件失败 ${path.basename(dbFile)}:`, error.message);
      }
    }

    console.log(`\n📊 数据库清除完成，共删除 ${cleanedCount} 个数据库文件`);
    return cleanedCount > 0;
  }

  /**
   * 清除上传文件（可选）
   */
  async cleanUploads() {
    console.log('\n开始清除上传文件...');
    
    if (!fs.existsSync(this.uploadsDir)) {
      console.log('⚠️  上传目录不存在');
      return false;
    }

    try {
      const files = fs.readdirSync(this.uploadsDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ 已删除上传文件: ${file}`);
          cleanedCount++;
        } catch (error) {
          console.error(`❌ 删除上传文件失败 ${file}:`, error.message);
        }
      }

      console.log(`\n📊 上传文件清除完成，共删除 ${cleanedCount} 个文件`);
      return cleanedCount > 0;
    } catch (error) {
      console.error('❌ 读取上传目录失败:', error.message);
      return false;
    }
  }

  /**
   * 重新初始化数据库
   */
  async reinitializeDatabase() {
    console.log('\n开始重新初始化数据库...');
    
    try {
      // 运行数据库初始化脚本
      execSync('node server/init_database.js', { 
        cwd: __dirname,
        stdio: 'inherit'
      });
      
      console.log('✅ 数据库重新初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 数据库重新初始化失败:', error.message);
      return false;
    }
  }

  /**
   * 执行完整的数据库清除和重置流程
   */
  async fullReset(cleanUploadsToo = false) {
    console.log('🔄 开始执行完整的数据库重置流程...\n');
    
    // 1. 清除数据库文件
    const dbCleaned = await this.cleanAllDatabases();
    
    // 2. 可选：清除上传文件
    if (cleanUploadsToo) {
      await this.cleanUploads();
    }
    
    // 3. 重新初始化数据库
    const reinitialized = await this.reinitializeDatabase();
    
    if (dbCleaned && reinitialized) {
      console.log('\n🎉 数据库重置完成！系统已恢复到初始状态。');
      return true;
    } else {
      console.log('\n❌ 数据库重置过程中出现问题，请检查错误信息。');
      return false;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const cleaner = new DatabaseCleaner();
  
  // 检查命令行参数
  const cleanUploads = process.argv.includes('--clean-uploads');
  const forceReset = process.argv.includes('--force');
  
  if (!forceReset) {
    console.log('⚠️  警告：此操作将清除所有数据库数据！');
    console.log('如果确定要继续，请使用 --force 参数');
    console.log('用法: node clean_database.js [--force] [--clean-uploads]');
    console.log('');
    console.log('参数说明:');
    console.log('  --force         强制执行数据库清除');
    console.log('  --clean-uploads  同时清除上传文件');
    process.exit(1);
  }
  
  cleaner.fullReset(cleanUploads)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 执行过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = DatabaseCleaner;