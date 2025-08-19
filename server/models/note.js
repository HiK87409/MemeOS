class NoteModel {
  constructor(db) {
    this.db = db;
  }

  // 生成笔记内容的哈希值
  generateNoteHash(noteData) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      content: noteData.content,
      tags: noteData.tags || [],
      created_at: noteData.created_at
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // 初始化笔记表
  initTable() {
    return new Promise((resolve, reject) => {
      // 首先检查表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          // 表不存在，创建新表 (使用TEXT类型的ID以支持复杂ID)
          this.db.run(`CREATE TABLE notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            tags TEXT,
            user_id INTEGER,
            is_pinned INTEGER DEFAULT 0,
            hash TEXT,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            updated_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          // 表已存在，检查ID列类型和其他缺失的列
          this.db.all("PRAGMA table_info(notes)", (err, columns) => {
            if (err) {
              reject(err);
              return;
            }
            
            const columnNames = columns.map(col => col.name);
            const idColumn = columns.find(col => col.name === 'id');
            const missingColumns = [];
            
            // 检查ID列类型，如果是INTEGER则需要迁移
            if (idColumn && idColumn.type === 'INTEGER') {
              // console.log('检测到旧的INTEGER ID格式，保持兼容性');
              // 保持现有结构，支持向后兼容
            }
            
            if (!columnNames.includes('user_id')) {
              missingColumns.push("ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id)");
            }
            
            if (!columnNames.includes('is_pinned')) {
              missingColumns.push("ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0");
            }
            
            if (!columnNames.includes('hash')) {
              missingColumns.push("ALTER TABLE notes ADD COLUMN hash TEXT");
            }
            
            if (missingColumns.length === 0) {
              resolve();
              return;
            }
            
            // 执行所有ALTER TABLE语句
            const executeAlters = (index) => {
              if (index >= missingColumns.length) {
                resolve();
                return;
              }
              
              this.db.run(missingColumns[index], (err) => {
                if (err) {
                  reject(err);
                } else {
                  executeAlters(index + 1);
                }
              });
            };
            
            executeAlters(0);
          });
        }
      });
    })
  }

  // 获取用户的所有笔记 - 确保按创建时间倒序
  getAllByUserId(userId, searchQuery = '') {
    return new Promise((resolve, reject) => {
      let query;
      let params;

      if (searchQuery) {
        query = `SELECT id, content, tags, hash, user_id, is_pinned, created_at, updated_at FROM notes WHERE user_id = ? AND (content LIKE ? OR tags LIKE ?) ORDER BY CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, created_at DESC`;
        params = [userId, `%${searchQuery}%`, `%${searchQuery}%`];
      } else {
        query = `SELECT id, content, tags, hash, user_id, is_pinned, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, created_at DESC`;
        params = [userId];
      }

      this.db.all(query, params, (err, rows) => {
        if (err) {
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
              tags: parsedTags
            };
          });
          resolve(notes);
        }
      });
    });
  }

  // 获取用户的所有笔记（分页版本）
  getAllByUserIdWithPagination(userId, searchQuery = '', page = 1, limit = 10) {
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
      const countQuery = `SELECT COUNT(*) as total FROM notes ${whereClause}`;
      
      this.db.get(countQuery, params, (err, countResult) => {
        if (err) {
          reject(err);
          return;
        }
        
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        
        // 获取分页数据
      const dataQuery = `SELECT id, content, tags, hash, user_id, is_pinned, created_at, updated_at FROM notes ${whereClause} ORDER BY CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, created_at DESC LIMIT ? OFFSET ?`;
        const dataParams = [...params, limit, offset];
        
        this.db.all(dataQuery, dataParams, (err, rows) => {
          if (err) {
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
                tags: parsedTags
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

  // 根据标签获取用户的笔记（分页版本）
  getNotesByTagWithPagination(userId, tag, page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM notes WHERE user_id = ? AND tags LIKE ?`;
      const countParams = [userId, `%${tag}%`];
      
      this.db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
          reject(err);
          return;
        }
        
        // 获取分页数据
        const dataQuery = `SELECT id, content, tags, hash, user_id, is_pinned, created_at, updated_at FROM notes WHERE user_id = ? AND tags LIKE ? ORDER BY CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, created_at DESC LIMIT ? OFFSET ?`;
        const dataParams = [userId, `%${tag}%`, limit, offset];
        
        this.db.all(dataQuery, dataParams, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // 过滤出包含该标签的笔记
          const filteredNotes = rows.filter(note => {
            const noteTags = note.tags ? note.tags.split(',').map(t => t.trim()) : [];
            return noteTags.includes(tag);
          }).map(note => {
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
              tags: parsedTags
            };
          });
            
            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);
            
            resolve({
              notes: filteredNotes,
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





  // 根据ID获取笔记
  getById(id, userId) {
    return new Promise((resolve, reject) => {
      // 只允许用户获取自己的笔记
    const query = `SELECT id, content, tags, hash, user_id, is_pinned, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?`;
      const params = [id, userId];

      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            row.is_pinned = Boolean(row.is_pinned);
            // 解析标签数据：将逗号分隔的字符串转换为数组
            if (row.tags && typeof row.tags === 'string') {
              row.tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            } else if (!row.tags) {
              row.tags = [];
            }
          }
          resolve(row);
        }
      });
    });
  }

  // 更新笔记
  update(id, userId, noteData) {
    const { content, tags, created_at } = noteData;
    
    // 处理tags参数，可能是字符串或数组
    let tagsArray = [];
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      }
    }
    
    const tagsString = tagsArray.join(',');

    return new Promise((resolve, reject) => {
      // 首先检查笔记是否属于该用户
      this.db.get(
        `SELECT * FROM notes WHERE id = ? AND user_id = ?`,
        [id, userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            reject(new Error('笔记不存在或无权限修改'));
          } else {
            // 生成笔记哈希
            const noteHash = this.generateNoteHash({
              content: content !== undefined ? content : row.content,
              tags: tags !== undefined ? tagsArray : (row.tags ? row.tags.split(',').map(tag => tag.trim()) : []),
              created_at: created_at !== undefined ? created_at : row.created_at
            });
            
            // 构建SQL更新语句 - 支持部分更新
            let sql = `UPDATE notes SET updated_at = datetime('now', 'localtime')`;
            let params = [];
            
            // 只有在提供了content时才更新content字段
            if (content !== undefined) {
              sql += `, content = ?`;
              params.push(content);
            }
            
            // 只有在提供了tags时才更新tags字段
            if (tags !== undefined) {
              sql += `, tags = ?`;
              params.push(tagsString);
            }
            
            // 如果提供了created_at，则同时更新创建日期
            if (created_at !== undefined) {
              sql += `, created_at = ?`;
              params.push(created_at);
            }
            
            // 更新哈希字段
            sql += `, hash = ?`;
            params.push(noteHash);
            
            sql += ` WHERE id = ? AND user_id = ?`;
            params.push(id, userId);
            
            const db = this.db; // 保存数据库引用
            db.run(sql, params, function(err) {
              if (err) {
                reject(err);
              } else if (this.changes === 0) {
                reject(new Error('笔记不存在或无权限修改'));
              } else {
                // 获取更新后的笔记
          db.get(`SELECT * FROM notes WHERE id = ?`, [id], (err, row) => {
            if (err) {
              reject(err);
            } else {
              if (row) {
                row.is_pinned = !!row.is_pinned;
                // 解析标签数据：将逗号分隔的字符串转换为数组
                if (row.tags && typeof row.tags === 'string') {
                  row.tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                } else if (!row.tags) {
                  row.tags = [];
                }
              }
              resolve(row);
            }
          });
              }
            });
          }
        }
      );
    });
  }

  // 创建笔记
  create(noteData) {
    const { content, tags, userId, created_at } = noteData;
    // 处理tags参数，可能是字符串或数组
    let tagsArray = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      }
    }
    
    const tagsString = tagsArray.join(',');
    
    // 生成笔记哈希
    const noteHash = this.generateNoteHash({
      content,
      tags: tagsArray,
      created_at
    });

    return new Promise((resolve, reject) => {
      // 使用ID生成器生成字符串数字形式的ID，避免浮点型
      const IdGenerator = require('../utils/idGenerator');
      const noteId = IdGenerator.generateNoteId(userId || 'default_user');
      
      let sql, params;
      
      if (created_at) {
        // 如果提供了创建时间，使用自定义时间
        sql = `INSERT INTO notes (id, content, tags, hash, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const timeString = created_at instanceof Date ? created_at.toISOString() : created_at;
        params = [noteId, content, tagsString, noteHash, userId, timeString, timeString];
      } else {
        // 否则使用默认的当前时间
        sql = `INSERT INTO notes (id, content, tags, hash, user_id) VALUES (?, ?, ?, ?, ?)`;
        params = [noteId, content, tagsString, noteHash, userId];
      }
      
      const db = this.db; // 保存数据库引用
      
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          
          // 获取新创建的笔记
          db.get(`SELECT * FROM notes WHERE id = ?`, [noteId], (err, row) => {
            if (err) {
              reject(err);
            } else {
              if (row) {
                row.is_pinned = !!row.is_pinned;
                // 解析标签数据：将逗号分隔的字符串转换为数组
                if (row.tags && typeof row.tags === 'string') {
                  row.tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                } else if (!row.tags) {
                  row.tags = [];
                }
              }
              resolve(row);
            }
          });
        }
      });
    });
  }

  // 删除笔记（移动到回收站）
  delete(id, userId) {
    return new Promise((resolve, reject) => {

      
      // 首先获取笔记信息
      this.db.get(
        `SELECT * FROM notes WHERE id = ? AND user_id = ?`,
        [id, userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve({ success: true, deletedCount: 0 });
            return;
          }
          
          // 如果有回收站模型，将笔记添加到回收站
          if (this.recycleBinModel) {
            this.recycleBinModel.addToRecycleBin(row)
              .then(() => {
                // 从notes表中删除笔记
                this.db.run(
                  `DELETE FROM notes WHERE id = ? AND user_id = ?`,
                  [id, userId],
                  function(err) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve({ success: true, deletedCount: this.changes, movedToRecycleBin: true });
                    }
                  }
                );
              })
              .catch((recycleErr) => {
                // 即使回收站操作失败，仍然删除笔记
                this.db.run(
                  `DELETE FROM notes WHERE id = ? AND user_id = ?`,
                  [id, userId],
                  function(err) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve({ success: true, deletedCount: this.changes, movedToRecycleBin: false });
                    }
                  }
                );
              });
          } else {
            // 没有回收站模型，直接删除
            this.db.run(
              `DELETE FROM notes WHERE id = ? AND user_id = ?`,
              [id, userId],
              function(err) {
                if (err) {
                  reject(err);
                } else if (this.changes === 0) {
                  resolve({ success: true, deletedCount: 0 });
                } else {
                  resolve({ success: true, deletedCount: this.changes });
                }
              }
            );
          }
        }
      );
    });
  }
  
  // 设置回收站模型
  setRecycleBinModel(recycleBinModel) {
    this.recycleBinModel = recycleBinModel;
  }

  // 置顶/取消置顶笔记
  togglePin(id, userId) {
    return new Promise((resolve, reject) => {
      const db = this.db; // 保存数据库引用
      

      
      // 首先获取当前置顶状态
      db.get(
        `SELECT is_pinned FROM notes WHERE id = ? AND user_id = ?`,
        [id, userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            reject(new Error('笔记不存在或无权限修改'));
          } else {
            
            // 切换置顶状态
            const newPinnedState = row.is_pinned ? 0 : 1;
            
            db.run(
              `UPDATE notes SET is_pinned = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?`,
              [newPinnedState, id, userId],
              function(err) {
                if (err) {
                  reject(err);
                } else if (this.changes === 0) {
                  reject(new Error('笔记不存在或无权限修改'));
                } else {
                  
                  // 获取更新后的笔记
                  db.get(`SELECT * FROM notes WHERE id = ?`, [id], (err, updatedRow) => {
                    if (err) {
                      reject(err);
                    } else {
                      // 确保is_pinned是布尔值
                      updatedRow.is_pinned = Boolean(updatedRow.is_pinned);
                      resolve(updatedRow);
                    }
                  });
                }
              }
            );
          }
        }
      );
    });
  }

  // 获取用户的所有标签
  getAllTagsByUserId(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT DISTINCT tags FROM notes WHERE user_id = ? AND tags IS NOT NULL AND tags != ''`,
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // 处理标签数据
            const allTags = rows
              .map(row => row.tags.split(','))
              .flat()
              .filter(tag => tag.trim() !== '')
              .map(tag => tag.trim());
            
            // 去重
            const uniqueTags = [...new Set(allTags)];
            
            resolve(uniqueTags);
          }
        }
      );
    });
  }



  // 获取所有标签（从tag_colors表和notes表中获取）
  getAllTags(userId) {
    return new Promise((resolve, reject) => {
      if (!userId) {
        resolve([]);
        return;
      }

      // 从tag_colors表获取所有已创建的标签
      const tagColorsQuery = `SELECT DISTINCT tag_name FROM tag_colors WHERE user_id = ?`;
      
      // 从notes表获取所有使用过的标签
      const notesQuery = `SELECT DISTINCT tags FROM notes WHERE user_id = ? AND tags IS NOT NULL AND tags != ''`;

      // 先获取tag_colors表中的标签
      this.db.all(tagColorsQuery, [userId], (err, tagColorRows) => {
        if (err) {
          reject(err);
          return;
        }

        // 再获取notes表中的标签
        this.db.all(notesQuery, [userId], (err, noteRows) => {
          if (err) {
            reject(err);
            return;
          }

          // 处理tag_colors表中的标签
          const tagColorTags = tagColorRows.map(row => row.tag_name);

          // 处理notes表中的标签
          const noteTags = noteRows
            .map(row => row.tags.split(','))
            .flat()
            .filter(tag => tag.trim() !== '')
            .map(tag => tag.trim());

          // 合并所有标签并去重
          const allTags = [...tagColorTags, ...noteTags];
          const uniqueTags = [...new Set(allTags)];
          
          resolve(uniqueTags);
        });
      });
    });
  }

  // 根据标签获取用户的笔记
  getNotesByTag(userId, tag) {
    return new Promise((resolve, reject) => {
      // 使用更精确的标签匹配：
      // 1. 标签在开头：tag,%
      // 2. 标签在中间：%,tag,%
      // 3. 标签在结尾：%,tag
      // 4. 只有标签本身：tag
      const patterns = [
        `${tag},%`,     // 标签在开头
        `%,${tag},%`,   // 标签在中间
        `%,${tag}`,     // 标签在结尾
        `${tag}`        // 只有标签本身
      ];
      
      const conditions = patterns.map(pattern => `tags LIKE ?`).join(' OR ');
      const params = patterns.map(pattern => pattern);
      params.unshift(userId); // 添加userId作为第一个参数
      
      this.db.all(
        `SELECT * FROM notes WHERE user_id = ? AND (${conditions}) ORDER BY created_at DESC`,
        params,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // 再次精确过滤，确保完全匹配
            const filteredNotes = rows.filter(note => {
              const noteTags = note.tags ? note.tags.split(',').map(t => t.trim()) : [];
              return noteTags.includes(tag);
            });
            
            resolve(filteredNotes);
          }
        }
      );
    });
  }
  


  // 根据日期范围获取笔记日期列表
  getDatesByRange(startDate, endDate, userId) {
    return new Promise((resolve, reject) => {
      if (!userId) {
        resolve([]);
        return;
      }

      const query = `
        SELECT DISTINCT DATE(created_at) as note_date
        FROM notes 
        WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
        ORDER BY note_date
      `;
      const params = [userId, startDate, endDate];

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 返回日期字符串数组
          const dates = rows.map(row => row.note_date);
          resolve(dates);
        }
      });
    });
  }

  // 根据日期获取笔记
  getNotesByDate(date, userId) {
    return new Promise((resolve, reject) => {
      if (!userId) {
        resolve([]);
        return;
      }

      const query = `
        SELECT n.*, u.username as author_name 
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        WHERE n.user_id = ? AND DATE(n.created_at) = ?
        ORDER BY n.created_at DESC
      `;
      const params = [userId, date];

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 检查是否存在重复笔记（基于哈希值）
  checkDuplicateByHash(userId, noteHash) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id FROM notes WHERE user_id = ? AND hash = ?`,
        [userId, noteHash],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? { exists: true, noteId: row.id } : { exists: false });
          }
        }
      );
    });
  }

  // 删除标签（从所有笔记中移除该标签）
  deleteTag(userId, tagToDelete) {
    return new Promise((resolve, reject) => {
      if (!userId || !tagToDelete) {
        reject(new Error('用户ID和标签名称不能为空'));
        return;
      }

      // 首先获取所有包含该标签的笔记
      this.db.all(
        `SELECT id, tags FROM notes WHERE user_id = ? AND tags LIKE ?`,
        [userId, `%${tagToDelete}%`],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (rows.length === 0) {
            resolve({ deletedCount: 0 });
            return;
          }

          // 处理每个笔记，移除指定标签
          let updatedCount = 0;
          let processedCount = 0;

          rows.forEach(note => {
            const noteTags = note.tags ? note.tags.split(',').map(t => t.trim()) : [];
            const filteredTags = noteTags.filter(tag => tag !== tagToDelete);
            const newTagsString = filteredTags.join(',');

            this.db.run(
              `UPDATE notes SET tags = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
              [newTagsString, note.id],
              function(err) {
                processedCount++;
                
                if (err) {
                  // 静默处理错误
                } else if (this.changes > 0) {
                  updatedCount++;
                }

                // 当所有笔记都处理完成时
                if (processedCount === rows.length) {
                  resolve({ deletedCount: updatedCount });
                }
              }
            );
          });
        }
      );
    });
  }
}

module.exports = NoteModel;