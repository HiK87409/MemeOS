class RecycleBinModel {
  constructor(db) {
    this.db = db;
  }

  // 初始化回收站表
  initTable() {
    return new Promise((resolve, reject) => {
      // 首先检查表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='recycle_bin'", (err, row) => {
        if (err) {
          // 静默处理错误
          reject(err);
          return;
        }
        
        if (!row) {
          // 表不存在，创建新表
          this.db.run(`CREATE TABLE recycle_bin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT,
            user_id INTEGER,
            is_pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            deleted_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            expire_at TIMESTAMP DEFAULT (datetime('now', '+30 days')),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              // 静默处理错误
              reject(err);
            } else {
              // 表初始化完成
              resolve();
            }
          });
        } else {
          // 表已存在
          resolve();
        }
      });
    });
  }

  // 添加笔记到回收站
  addToRecycleBin(note) {
    return new Promise((resolve, reject) => {
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 30);
      
      this.db.run(
        `INSERT INTO recycle_bin (note_id, content, tags, user_id, is_pinned, created_at, deleted_at, expire_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id,
          note.content,
          note.tags ? (Array.isArray(note.tags) ? note.tags.join(',') : note.tags) : '',
          note.user_id,
          note.is_pinned ? 1 : 0,
          note.created_at,
          new Date().toISOString(),
          expireAt.toISOString()
        ],
        function(err) {
          if (err) {
            // 静默处理错误
            reject(err);
          } else {
            resolve({ 
              success: true, 
              id: this.lastID,
              note_id: note.id
            });
          }
        }
      );
    });
  }

  // 获取用户的回收站笔记
  getByUserId(userId, searchQuery = '', page = 1, limit = 20) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      let whereClause = 'WHERE user_id = ?';
      let params = [userId];
      
      if (searchQuery) {
        whereClause += ' AND (content LIKE ? OR tags LIKE ?)';
        params.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }
      
      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM recycle_bin ${whereClause}`;
      
      this.db.get(countQuery, params, (err, countResult) => {
        if (err) {
          // 静默处理错误
          reject(err);
          return;
        }
        
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        
        // 获取分页数据
        const dataQuery = `SELECT * FROM recycle_bin ${whereClause} ORDER BY deleted_at DESC LIMIT ? OFFSET ?`;
        const dataParams = [...params, limit, offset];
        
        this.db.all(dataQuery, dataParams, (err, rows) => {
          if (err) {
            // 静默处理错误
            reject(err);
          } else {
            const notes = rows.map(note => {
              // 解析标签数据：将逗号分隔的字符串转换为数组
              let parsedTags = [];
              if (note.tags && typeof note.tags === 'string') {
                parsedTags = note.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
              } else if (Array.isArray(note.tags)) {
                parsedTags = note.tags;
              }
              
              return {
                ...note,
                is_pinned: Boolean(note.is_pinned),
                tags: parsedTags,
                deletedAt: note.deleted_at,
                expireAt: note.expire_at
              };
            });
            
            resolve({
              notes,
              pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
              }
            });
          }
        });
      });
    });
  }

  // 从回收站恢复笔记 - 按note_id匹配
  restore(noteId, userId) {
    return new Promise((resolve, reject) => {
      // 开始单个恢复操作
      
      // 首先获取回收站中的笔记
      this.db.get('SELECT * FROM recycle_bin WHERE note_id = ? AND user_id = ?', [noteId, userId], (err, row) => {
        if (err) {
          // 静默处理错误
          reject(err);
          return;
        }
        
        if (!row) {
          // 未找到匹配记录
          reject(new Error('回收站中不存在该笔记或无权限'));
          return;
        }
        
        // 取消哈希验证，直接恢复笔记
        // 将笔记恢复到notes表
        this.db.run(
          `INSERT INTO notes (id, content, tags, user_id, is_pinned, hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.note_id,
            row.content,
            row.tags,
            row.user_id,
            row.is_pinned,
            '', // 空哈希值
            row.created_at,
            new Date().toISOString()
          ],
          (err) => {
            if (err) {
              // 静默处理错误
              reject(err);
              return;
            }
            
            // 从回收站删除
            this.db.run('DELETE FROM recycle_bin WHERE id = ?', [row.id], (err) => {
              if (err) {
                // 静默处理错误
                reject(err);
              } else {
                // 单个恢复成功
                resolve({ success: true, restoredNoteId: row.note_id });
              }
            });
          }
        );
        })
        .catch(err => {
          // 静默处理错误
          reject(err);
        });
    });
  }

  // 从回收站永久删除笔记 - 按note_id匹配
  permanentDelete(noteId, userId) {
    return new Promise((resolve, reject) => {
      // 开始单个删除操作
      
      // 在删除前获取笔记内容以处理相关文件
      this.db.get('SELECT * FROM recycle_bin WHERE note_id = ? AND user_id = ?', [noteId, userId], (err, row) => {
        if (err) {
          // 静默处理错误
          reject(err);
          return;
        }
        
        if (!row) {
          // 未找到匹配记录
          reject(new Error('回收站中不存在该笔记或无权限'));
          return;
        }
        
        // 处理文件删除
        if (row.content && typeof global.deleteFileImmediately === 'function') {
          global.deleteFileImmediately(row.content)
            .catch(fileError => {
              // 静默处理文件删除失败
              // 文件删除失败不影响笔记删除流程
            })
            .then(() => {
              // 文件删除完成后，删除数据库记录
              deleteFromDatabase();
            });
        } else {
          // 没有文件处理函数，直接删除数据库记录
          deleteFromDatabase();
        }
        
        const self = this;
        function deleteFromDatabase() {
          self.db.run(
            'DELETE FROM recycle_bin WHERE note_id = ? AND user_id = ?',
            [noteId, userId],
            function(err) {
              if (err) {
                // 静默处理错误
                reject(err);
              } else {
                // 单个删除成功
                resolve({ success: true, deletedCount: this.changes });
              }
            }
          );
        }
      });
    });
  }

  // 批量从回收站恢复笔记 - 按note_id匹配
  bulkRestore(noteIds, userId) {
    return new Promise((resolve, reject) => {
      // 构建IN子句的占位符
      const placeholders = noteIds.map(() => '?').join(',');
      const params = [...noteIds, userId];
      
      // 开始批量恢复操作
      
      // 首先获取所有要恢复的笔记
      this.db.all(
        `SELECT * FROM recycle_bin WHERE note_id IN (${placeholders}) AND user_id = ?`,
        params,
        (err, rows) => {
          if (err) {
            // 静默处理错误
            reject(err);
            return;
          }
          
          // 记录查询结果
          // 记录找到的记录数
          // 记录查询结果详情
          
          if (rows.length === 0) {
            // 未找到匹配记录
            reject(new Error('回收站中不存在该笔记或无权限'));
            return;
          }
          
          let restoredCount = 0;
          let errorCount = 0;
          let duplicateCount = 0;
          let duplicateNotes = [];
          
          const processNext = (index) => {
            if (index >= rows.length) {
              const totalCount = rows.length;
              const message = duplicateCount > 0 
                ? `成功恢复 ${restoredCount} 条笔记，失败 ${errorCount} 条，跳过重复 ${duplicateCount} 条` 
                : `成功恢复 ${restoredCount} 条笔记，失败 ${errorCount} 条`;
              
              resolve({ 
                success: true, 
                restoredCount, 
                errorCount,
                duplicateCount,
                duplicateNotes,
                totalCount,
                message,
                details: {
                  requested: noteIds.length,
                  found: totalCount,
                  restored: restoredCount,
                  errors: errorCount,
                  duplicates: duplicateCount
                }
              });
              return;
            }
            
            const row = rows[index];
            
            // 取消哈希验证，直接恢复笔记
            const restoreNote = () => {
              // 将笔记恢复到notes表
              this.db.run(
                `INSERT INTO notes (id, content, tags, user_id, is_pinned, hash, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  row.note_id,
                  row.content,
                  row.tags,
                  row.user_id,
                  row.is_pinned,
                  '', // 空哈希值
                  row.created_at,
                  new Date().toISOString()
                ],
                (err) => {
                  if (err) {
                    // 静默处理错误
                    errorCount++;
                    processNext(index + 1);
                  } else {
                    // 笔记已经成功恢复到notes表，先增加恢复计数
                    restoredCount++;
                    // 笔记恢复成功
                    // 从回收站删除
                    this.db.run('DELETE FROM recycle_bin WHERE id = ?', [row.id], (err) => {
                      if (err) {
                        // 静默处理错误
                        // 即使从回收站删除失败，笔记已经恢复，不算错误
                      } else {
                        // 从回收站删除成功
                      }
                      processNext(index + 1);
                    });
                  }
                }
              );
            };
            
            // 直接恢复笔记
            restoreNote();
          };
          
          processNext(0);
        }
      );
    });
  }

  // 批量永久删除笔记 - 按note_id匹配
  bulkPermanentDelete(noteIds, userId) {
    return new Promise((resolve, reject) => {
      // 构建IN子句的占位符
      const placeholders = noteIds.map(() => '?').join(',');
      const params = [...noteIds, userId];
      
      // 开始批量删除操作
      
      // 在删除前获取所有要删除的笔记内容以处理相关文件
      this.db.all(
        `SELECT * FROM recycle_bin WHERE note_id IN (${placeholders}) AND user_id = ?`,
        params,
        (err, rows) => {
          if (err) {
            // 静默处理错误
            reject(err);
            return;
          }
          
          if (rows.length === 0) {
            // 未找到匹配记录
            reject(new Error('回收站中不存在该笔记或无权限'));
            return;
          }
          
          // 处理文件删除
          if (typeof global.deleteFileImmediately === 'function') {
            Promise.all(rows.map(row => {
              return global.deleteFileImmediately(row.content)
                .catch(fileError => {
                  // 静默处理文件删除失败
                  // 单个文件删除失败不影响整体流程
                });
            }))
            .then(() => {
              // 文件删除处理完成
              // 文件删除完成后，删除数据库记录
              deleteFromDatabase();
            })
            .catch(fileError => {
              // 静默处理文件删除失败
              // 文件删除失败不影响笔记删除流程
              deleteFromDatabase();
            });
          } else {
            // 没有文件处理函数，直接删除数据库记录
            deleteFromDatabase();
          }
          
          const self = this;
          function deleteFromDatabase() {
            self.db.run(
              `DELETE FROM recycle_bin WHERE note_id IN (${placeholders}) AND user_id = ?`,
              params,
              function(err) {
                if (err) {
                  // 静默处理错误
                  reject(err);
                } else if (this.changes === 0) {
                  // 未找到匹配记录
                  reject(new Error('回收站中不存在该笔记或无权限'));
                } else {
                  // 批量删除成功
                  resolve({ success: true, deletedCount: this.changes });
                }
              }
            );
          }
        }
      );
    });
  }

  // 清理过期的笔记
  cleanExpired(userId) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const self = this; // 保存 this 引用
      
      // 首先获取要删除的过期笔记，以便处理文件删除
      this.db.all(
        'SELECT * FROM recycle_bin WHERE expire_at <= ? AND user_id = ?',
        [now, userId],
        (err, rows) => {
          if (err) {
            // 静默处理错误
            reject(err);
            return;
          }
          
          // 记录找到的过期笔记数量
          
          // 处理文件删除（如果有文件处理函数）
          if (rows.length > 0 && typeof global.deleteFileImmediately === 'function') {
            Promise.all(rows.map(row => {
              return global.deleteFileImmediately(row.content)
                .catch(fileError => {
                  // 静默处理文件删除失败
                  // 单个文件删除失败不影响整体流程
                });
            }))
            .then(() => {
              // 文件删除处理完成
              // 继续删除数据库记录
              deleteExpiredNotes();
            })
            .catch(fileError => {
              // 静默处理文件删除失败
              // 文件删除失败不影响笔记删除流程
              deleteExpiredNotes();
            });
          } else {
            // 没有文件处理函数或没有过期笔记，直接删除数据库记录
            deleteExpiredNotes();
          }
          
          function deleteExpiredNotes() {
            self.db.run(
              'DELETE FROM recycle_bin WHERE expire_at <= ? AND user_id = ?',
              [now, userId],
              function(err) {
                if (err) {
                  // 静默处理错误
                  reject(err);
                } else {
                  // 清理过期笔记完成
                  resolve({ success: true, deletedCount: this.changes });
                }
              }
            );
          }
        }
      );
    });
  }

  // 根据ID获取回收站笔记
  getById(id, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM recycle_bin WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, row) => {
          if (err) {
            // 静默处理错误
            reject(err);
          } else if (!row) {
            // 未找到匹配的回收站笔记
            resolve(null);
          } else {
            // 解析标签数据：将逗号分隔的字符串转换为数组
            let parsedTags = [];
            if (row.tags && typeof row.tags === 'string') {
              parsedTags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            } else if (Array.isArray(row.tags)) {
              parsedTags = row.tags;
            }
            
            resolve({
              ...row,
              is_pinned: Boolean(row.is_pinned),
              tags: parsedTags,
              deletedAt: row.deleted_at,
              expireAt: row.expire_at
            });
          }
        }
      );
    });
  }

  // 获取回收站统计信息
  getStats(userId) {
    return new Promise((resolve, reject) => {
      // 获取总数量
      this.db.get(
        'SELECT COUNT(*) as total FROM recycle_bin WHERE user_id = ?',
        [userId],
        (err, totalResult) => {
          if (err) {
            // 静默处理错误
            reject(err);
            return;
          }
          
          // 获取即将过期的数量（7天内）
          const sevenDaysLater = new Date();
          sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
          
          this.db.get(
            'SELECT COUNT(*) as expiring_soon FROM recycle_bin WHERE user_id = ? AND expire_at <= ?',
            [userId, sevenDaysLater.toISOString()],
            (err, expiringResult) => {
              if (err) {
                // 静默处理错误
                reject(err);
              } else {
                resolve({
                  total: totalResult.total,
                  expiringSoon: expiringResult.expiring_soon
                });
              }
            }
          );
        }
      );
    });
  }
}

module.exports = RecycleBinModel;