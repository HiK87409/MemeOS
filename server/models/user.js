const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class UserModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化用户表
  initTable() {
    return new Promise((resolve, reject) => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('创建用户表失败:', err.message);
          reject(err);
        } else {
          console.log('用户表已初始化');
          resolve();
        }
      });
    });
  }

  // 创建用户
  async createUser(userData) {
    const { username, email, password } = userData;
    
    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
        [username, email, hashedPassword],
        function(err) {
          if (err) {
            console.error('创建用户失败:', err.message);
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              username,
              email
            });
          }
        }
      );
    });
  }

  // 根据用户名查找用户
  findByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        (err, row) => {
          if (err) {
            console.error('查找用户失败:', err.message);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // 根据邮箱查找用户
  findByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, row) => {
          if (err) {
            console.error('查找用户失败:', err.message);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // 根据ID查找用户
  findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, username, email, avatar, created_at FROM users WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            console.error('查找用户失败:', err.message);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // 更新用户信息
  updateUser(id, userData) {
    const { username, email, avatar } = userData;
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE users SET username = ?, email = ?, avatar = ? WHERE id = ?`,
        [username, email, avatar, id],
        function(err) {
          if (err) {
            console.error('更新用户失败:', err.message);
            reject(err);
          } else {
            resolve({
              id,
              username,
              email,
              avatar
            });
          }
        }
      );
    });
  }

  // 更新用户密码
  async updatePassword(id, newPassword) {
    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE users SET password = ? WHERE id = ?`,
        [hashedPassword, id],
        function(err) {
          if (err) {
            console.error('更新密码失败:', err.message);
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  }

  // 验证用户密码
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserModel;