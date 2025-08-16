const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class NoteReference {
  constructor(db) {
    this.db = db;
  }

  // 初始化表
  initTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS note_references (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_note_id INTEGER NOT NULL,
        to_note_id INTEGER NOT NULL,
        reference_text TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (from_note_id) REFERENCES notes (id) ON DELETE CASCADE,
        FOREIGN KEY (to_note_id) REFERENCES notes (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(from_note_id, to_note_id, reference_text)
      )
    `;

    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error('创建note_references表失败:', err);
      } else {
        console.log('note_references表已创建或已存在');
      }
    });
  }

  // 创建笔记引用关系
  create(fromNoteId, toNoteId, referenceText, userId) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO note_references (from_note_id, to_note_id, reference_text, user_id)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(query, [fromNoteId, toNoteId, referenceText, userId], function(err) {
        if (err) {
          // 如果是唯一约束错误，说明引用关系已存在
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            resolve({ id: null, message: '引用关系已存在' });
          } else {
            reject(err);
          }
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }



  // 获取笔记的所有引用关系
  getByNoteId(noteId, userId) {
    return new Promise((resolve, reject) => {
      console.log('🔗 开始获取笔记引用关系，noteId:', noteId, 'userId:', userId);
      
      // 先检查notes表是否存在
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'", (err, row) => {
        if (err) {
          console.error('🔗 检查notes表失败:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          console.error('🔗 notes表不存在');
          reject(new Error('notes表不存在'));
          return;
        }
        
        console.log('🔗 notes表存在，继续查询引用关系');
        
        // 获取该笔记引用的其他笔记（outgoing）
        const outgoingQuery = `
          SELECT 
            nr.id,
            nr.to_note_id,
            nr.reference_text,
            nr.created_at,
            n.content as to_note_content
          FROM note_references nr
          JOIN notes n ON nr.to_note_id = n.id
          WHERE nr.from_note_id = ? AND nr.user_id = ?
          ORDER BY nr.created_at DESC
        `;

        // 获取引用该笔记的其他笔记（incoming）
        const incomingQuery = `
          SELECT 
            nr.id,
            nr.from_note_id,
            nr.reference_text,
            nr.created_at,
            n.content as from_note_content
          FROM note_references nr
          JOIN notes n ON nr.from_note_id = n.id
          WHERE nr.to_note_id = ? AND nr.user_id = ?
          ORDER BY nr.created_at DESC
        `;

        // 执行两个查询
        this.db.all(outgoingQuery, [noteId, userId], (err, outgoingRows) => {
          if (err) {
            console.error('🔗 获取outgoing引用失败:', err);
            reject(err);
            return;
          }

          console.log('🔗 获取outgoing引用成功，数量:', outgoingRows?.length || 0);

          this.db.all(incomingQuery, [noteId, userId], (err, incomingRows) => {
            if (err) {
              console.error('🔗 获取incoming引用失败:', err);
              reject(err);
              return;
            }

            console.log('🔗 获取incoming引用成功，数量:', incomingRows?.length || 0);

            resolve({
              outgoing: outgoingRows || [],
              incoming: incomingRows || []
            });
          });
        });
      });
    });
  }

  // 删除引用关系
  delete(fromNoteId, toNoteId, userId) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM note_references 
        WHERE from_note_id = ? AND to_note_id = ? AND user_id = ?
      `;
      
      this.db.run(query, [fromNoteId, toNoteId, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deletedCount: this.changes });
        }
      });
    });
  }

  // 根据引用文本搜索笔记
  searchByReference(referenceText, userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT DISTINCT n.* 
        FROM notes n
        JOIN note_references nr ON (n.id = nr.from_note_id OR n.id = nr.to_note_id)
        WHERE nr.reference_text LIKE ? AND nr.user_id = ?
        ORDER BY n.created_at DESC
      `;
      
      this.db.all(query, [`%${referenceText}%`, userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // 清理孤立的引用关系（当笔记被删除时）
  cleanupOrphanedReferences() {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM note_references 
        WHERE from_note_id NOT IN (SELECT id FROM notes) 
           OR to_note_id NOT IN (SELECT id FROM notes)
      `;
      
      this.db.run(query, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deletedCount: this.changes });
        }
      });
    });
  }


}

module.exports = NoteReference;