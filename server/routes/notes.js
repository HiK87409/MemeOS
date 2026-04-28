const express = require('express');
const path = require('path');
const fs = require('fs');

// 默认用户ID常量
const userId = 'default_user';

/**
 * 从笔记内容中提取所有引用关系
 * 格式：[[wiki-link]] 语法：[[笔记ID]] 或 [[笔记ID|显示文本]]
 */
function extractAllReferences(content) {
  if (!content) return [];
  
  const references = [];
  const seenNoteIds = new Set();
  
  // 解析 [[wiki-link]] 语法
  // 格式：[[noteId]] 或 [[noteId|显示文本]]
  const wikiLinkRegex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const noteId = match[1].trim();
    const displayText = match[2]?.trim() || noteId;
    
    if (noteId && !seenNoteIds.has(noteId)) {
      seenNoteIds.add(noteId);
      references.push({
        noteId: noteId,
        text: displayText,
        format: 'wiki-link'
      });
    }
  }
  
  return references;
}

// 导入文件处理函数
let uploadUtils;
try {
  uploadUtils = require('./upload');
} catch (error) {
  // 静默处理upload模块加载失败
}

// 从笔记内容中提取文件路径
function extractFilesFromContent(content) {
  if (!content || !uploadUtils) {
    return [];
  }
  
  const files = [];
  
  // 匹配上传文件路径的正则表达式
  // 格式: /uploads/filename.ext 或 /uploads/hash.ext
  const fileRegex = /\/uploads\/([^\s\)\],]+)/g;
  let match;
  
  while ((match = fileRegex.exec(content)) !== null) {
    const filePath = match[0]; // 完整路径如 /uploads/filename.ext
    const filename = match[1]; // 文件名如 filename.ext
    
    // 提取哈希值（文件名去掉扩展名）
    const ext = path.extname(filename);
    const hash = path.basename(filename, ext);
    
    files.push({
      filePath: filePath,
      filename: filename,
      hash: hash,
      ext: ext
    });
  }
  
  return files;
}

// 处理笔记相关文件的删除
async function handleNoteFileDeletion(content) {
  if (!content || !uploadUtils) {
    return;
  }
  
  const files = extractFilesFromContent(content);
  // 静默处理文件删除日志
  
  for (const file of files) {
    try {
      // 直接删除文件
      const deleted = uploadUtils.deleteFile(file.filename);
      if (deleted) {
        // 静默处理文件删除成功日志
      } else {
        // 静默处理文件删除失败日志
      }
    } catch (error) {
      // 静默处理文件删除错误
    }
  }
}

// 立即删除文件
async function deleteFileImmediately(content) {
  if (!content || !uploadUtils) {
    return;
  }
  
  const files = extractFilesFromContent(content);
  // 静默处理立即删除日志
  
  for (const file of files) {
    try {
      // 直接删除文件
      const deleted = uploadUtils.deleteFile(file.filename);
      if (deleted) {
        // 静默处理立即删除成功日志
      } else {
        // 静默处理立即删除失败日志
      }
    } catch (error) {
      // 静默处理立即删除错误
    }
  }
}

// 处理笔记相关文件的恢复
async function handleNoteFileRestoration(content) {
  if (!content || !uploadUtils) {
    return;
  }
  
  const files = extractFilesFromContent(content);
  // 静默处理文件恢复日志
  
  for (const file of files) {
    try {
      // 恢复文件时不需要特殊处理，文件应该仍然存在
      // 静默处理文件恢复成功日志
    } catch (error) {
      // 静默处理文件恢复错误
    }
  }
}

module.exports = (noteModel, tagColorModel, tagModel) => {
  const router = express.Router();

  // 获取笔记
  router.get('/', async (req, res) => {
    try {
      const { search, tag } = req.query;
      // 使用全局userId常量
      let notes;

      // 使用随机用户ID获取笔记
      if (tag) {
        notes = await noteModel.getNotesByTag(userId, tag);
      } else {
        notes = await noteModel.getAllByUserId(userId, search);
      }

      res.json(notes);
    } catch (error) {
      // 静默处理获取笔记错误
      res.status(500).json({ error: '获取笔记失败' });
    }
  });
  

  
  // 获取我的笔记
  router.get('/my', async (req, res) => {
    try {
      const { search, tag, page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      // 使用全局userId常量
      
      let result;
      
      if (tag) {
        result = await noteModel.getNotesByTagWithPagination(userId, tag, pageNum, limitNum);
      } else {
        result = await noteModel.getAllByUserIdWithPagination(userId, search, pageNum, limitNum);
      }
      
      res.json(result);
    } catch (error) {
      // 静默处理获取我的笔记错误
      res.status(500).json({ error: '获取我的笔记失败' });
    }
  });

  // 获取所有标签（基本接口）
  router.get('/tags', async (req, res) => {
    try {
      // 使用全局userId常量
      // 静默处理获取标签日志
      
      // 获取所有标签基本信息
      const tags = await tagModel.getAllTags(userId);
      
      // 静默处理返回标签数量日志
      res.json(tags);
    } catch (error) {
      // 静默处理获取标签错误
      res.status(500).json({ error: '获取标签失败' });
    }
  });

  // 获取所有标签- 返回完整标签信息
  router.get('/tags/all', async (req, res) => {
    try {
      // 使用全局userId常量
      // 静默处理获取完整标签信息日志
      
      // 获取所有标签基本信息
      const tags = await tagModel.getAllTags(userId);
      
      // 获取标签颜色配置
      const tagColors = await tagColorModel.getUserTagColors(userId);
      
      // 获取每个标签关联的笔记数组
      const tagsWithNotes = [];
      for (const tag of tags) {
        const notes = await noteModel.getNotesByTag(userId, tag.name);
        tagsWithNotes.push({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          customColor: tagColors[tag.name] || null,
          parent_id: tag.parent_id,
          sort_order: tag.sort_order,
          noteCount: notes.length,
          notes: notes.map(note => ({
            id: note.id,
            title: note.title,
            content: note.content,
            created_at: note.created_at,
            updated_at: note.updated_at
          })),
          created_at: tag.created_at,
          updated_at: tag.updated_at
        });
      }
      
      // 静默处理返回完整标签信息日志
      res.json(tagsWithNotes);
    } catch (error) {
      // 静默处理获取完整标签信息错误
      res.status(500).json({ error: '获取标签失败' });
    }
  });

  // 根据标签获取笔记
  router.get('/tag/:tag', async (req, res) => {
    try {
      const { tag } = req.params;
      // 使用全局userId常量
      const notes = await noteModel.getNotesByTag(userId, tag);
      res.json(notes);
    } catch (error) {
      // 静默处理获取笔记错误
      res.status(500).json({ error: '获取笔记失败' });
    }
  });
  
  // 根据标签获取我的笔记
  router.get('/my/tag/:tag', async (req, res) => {
    try {
      const { tag } = req.params;
      // 使用全局userId常量
      const notes = await noteModel.getNotesByTag(userId, tag);
      res.json(notes);
    } catch (error) {
      // 静默处理获取笔记错误
      res.status(500).json({ error: '获取笔记失败' });
    }
  });

  // ===== 日期相关路由 - 必须在 /:id 路由之前定义 =====
  
  // 获取日期范围内有笔记的日期列表
  router.get('/dates', async (req, res) => {
    try {
      const { start, end } = req.query;
      // userId已经在文件开头定义
      
      if (!start || !end) {
        return res.status(400).json({ error: '需要提供开始和结束日期' });
      }
      
      // 静默处理获取日期范围日志
      
      const dates = await noteModel.getDatesByRange(start, end, userId);
      
      // 静默处理返回日期数量日志
      res.json(dates);
    } catch (error) {
      // 静默处理获取日期列表错误
      res.status(500).json({ error: '获取日期列表失败' });
    }
  });

  // 获取特定日期的笔记
  router.get('/date/:date', async (req, res) => {
    try {
      const { date } = req.params;
      // 使用全局userId常量
      
      // 静默处理获取特定日期日志
      
      const notes = await noteModel.getNotesByDate(date, userId);
      
      // 静默处理返回笔记数量日志
      res.json(notes);
    } catch (error) {
      // 静默处理获取日期笔记错误
      res.status(500).json({ error: '获取日期笔记失败' });
    }
  });

  // 删除标签 - 必须在 /:id 路由之前定义
  router.delete('/tags/:tag', async (req, res) => {
    try {
      const { tag } = req.params;
      // 使用全局userId常量
      // 解码URL编码的标签名称
      const decodedTag = decodeURIComponent(tag);
      // 静默处理删除标签日志
      
      // 从标签表中删除标签
      const tagResult = await tagModel.deleteTagByName(userId, decodedTag);
      
      // 从所有笔记中移除该标签
      const noteResult = await noteModel.deleteTag(userId, decodedTag);
      
      // 删除标签颜色配置
      await tagColorModel.deleteTagColor(userId, decodedTag);
      
      res.json({ 
        message: '标签删除成功', 
        deletedFromTags: tagResult.changes,
        deletedFromNotes: noteResult.deletedCount 
      });
    } catch (error) {
      // 静默处理删除标签错误
      res.status(500).json({ error: '删除标签失败' });
    }
  });

  // 删除标签（通过ID）- 必须在 /:id 路由之前定义
  router.delete('/tags/by-id/:tagId', async (req, res) => {
    try {
      const { tagId } = req.params;
      // 使用全局userId常量
      // 静默处理按ID删除标签日志
      
      // 获取标签信息
      const tagInfo = await tagModel.getTag(userId, tagId);
      if (!tagInfo) {
        return res.status(404).json({ error: '标签不存在' });
      }
      
      // 从标签表中删除标签
      const tagResult = await tagModel.deleteTag(userId, tagId);
      
      // 从所有笔记中移除该标签
      const noteResult = await noteModel.deleteTag(userId, tagInfo.name);
      
      // 删除标签颜色配置
      await tagColorModel.deleteTagColor(userId, tagInfo.name);
      
      res.json({ 
        message: '标签删除成功', 
        deletedFromTags: tagResult.changes,
        deletedFromNotes: noteResult.deletedCount,
        deletedTag: tagInfo
      });
    } catch (error) {
      // 静默处理按ID删除标签错误
      res.status(500).json({ error: '删除标签失败' });
    }
  });

  // 删除标签和关联笔记 - 必须在 /:id 路由之前定义
  router.delete('/tags/:tag/with-notes', async (req, res) => {
    try {
      const { tag } = req.params;
      // 解码URL编码的标签名称
      const decodedTag = decodeURIComponent(tag);
      // 使用全局userId常量
      // 静默处理删除标签和笔记日志
      
      // 获取所有包含该标签的笔记
      const notesWithTag = await noteModel.getNotesByTag(userId, decodedTag);
      
      // 删除所有包含该标签的笔记
      let deletedNotesCount = 0;
      for (const note of notesWithTag) {
        await noteModel.delete(note.id, userId);
        deletedNotesCount++;
      }
      
      // 从标签表中删除标签
      const tagResult = await tagModel.deleteTagByName(userId, decodedTag);
      
      // 删除标签颜色配置
      await tagColorModel.deleteTagColor(userId, decodedTag);
      
      res.json({ 
        success: true,
        message: `已删除标签"${decodedTag}" 和 ${deletedNotesCount} 个关联笔记`,
        deletedNotesCount,
        deletedFromTags: tagResult.changes
      });
    } catch (error) {
      // 静默处理删除标签和笔记错误
      res.status(500).json({ error: '删除标签和笔记失败' });
    }
  });

  // 从所有笔记中移除标签并删除标签本身 - 必须在 /:id 路由之前定义
  router.delete('/tags/:tag/remove-from-notes', async (req, res) => {
    try {
      const { tag } = req.params;
      // 解码URL编码的标签名称
      const decodedTag = decodeURIComponent(tag);
      // 使用全局userId常量
      // 静默处理从笔记移除标签日志
      
      // 获取所有包含该标签的笔记
      // 静默处理调用getNotesByTag日志
      const notesWithTag = await noteModel.getNotesByTag(userId, decodedTag);
      // 静默处理找到包含标签的笔记数量日志
      // 静默处理笔记详情日志
      
      // 从所有笔记中移除该标签
      let updatedCount = 0;
      for (const note of notesWithTag) {
        // 静默处理处理笔记日志
        // 正确处理字符串格式的tags字段
        const currentTags = note.tags ? (Array.isArray(note.tags) ? note.tags : note.tags.split(',').map(t => t.trim())) : [];
        // 静默处理解析标签数组日志
        const updatedTags = currentTags.filter(t => t !== decodedTag);
        // 静默处理过滤后标签日志
        
        if (updatedTags.length !== currentTags.length) {
          // 静默处理更新笔记日志
          await noteModel.update(note.id, userId, { tags: updatedTags });
          updatedCount++;
          // 静默处理笔记更新成功日志
        } else {
          // 静默处理笔记不需要更新日志
        }
      }
      
      // 静默处理更新笔记数量日志
      
      // 从标签表中删除标签本身
      // 静默处理删除标签日志
      const tagResult = await tagModel.deleteTagByName(userId, decodedTag);
      // 静默处理标签删除结果日志
      
      // 删除标签颜色配置
      // 静默处理删除标签颜色配置日志
      await tagColorModel.deleteTagColor(userId, decodedTag);
      // 静默处理标签颜色配置删除完成日志
      
      res.json({ 
        success: true,
        message: `已从 ${updatedCount} 个笔记中移除标签 "${decodedTag}" 并删除标签本身`,
        updatedCount,
        deletedFromTags: tagResult.changes
      });
    } catch (error) {
      // 静默处理从笔记移除标签错误
      // 静默处理错误堆栈
      res.status(500).json({ error: '从笔记中移除标签失败' });
    }
  });

  // 同步标签配置 - 批量处理标签的添加、更新、删除及关联卡片操作
  router.post('/tags/sync', async (req, res) => {
    try {
      const { tags } = req.body;
      // 使用全局userId常量
      
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: '标签数据必须是数组格式' });
      }
      
      // 静默处理开始同步标签配置日志
      
      // 获取当前用户的所有现有标签
      const existingTags = await tagModel.getAllTags(userId);
      const existingTagMap = new Map(existingTags.map(tag => [tag.name, tag]));
      
      // 获取现有标签颜色配置
      const existingTagColors = await tagColorModel.getUserTagColors(userId);
      
      const results = {
        added: [],
        updated: [],
        deleted: [],
        errors: [],
        summary: {
          totalProcessed: tags.length,
          addedCount: 0,
          updatedCount: 0,
          deletedCount: 0,
          errorCount: 0
        }
      };
      
      // 处理每个标签
      for (const tagData of tags) {
        try {
          const { id, name, color, customColor, pinned, order, notes } = tagData;
          
          if (!name || name.trim() === '') {
            results.errors.push({
              tag: tagData,
              error: '标签名称不能为空'
            });
            results.summary.errorCount++;
            continue;
          }
          
          const existingTag = existingTagMap.get(name);
          
          if (existingTag) {
            // 更新现有标签
            const updates = {};
            if (color && color !== existingTag.color) {
              updates.color = color;
            }
            
            if (Object.keys(updates).length > 0) {
              await tagModel.updateTag(userId, existingTag.id, updates);
              results.updated.push({
                id: existingTag.id,
                name: name,
                changes: updates
              });
              results.summary.updatedCount++;
              // 静默处理更新标签日志
            }
            
            // 更新标签颜色配置
            if (customColor && customColor !== existingTagColors[name]) {
              await tagColorModel.saveTagColor(userId, name, customColor, 'custom');
              // 静默处理更新标签颜色日志
            }
          } else {
            // 创建新标签
            const tagColor = color || 'blue';
            const newTag = await tagModel.createTag(userId, name, tagColor);
            
            results.added.push({
              id: newTag.tagId,
              name: name,
              color: tagColor
            });
            results.summary.addedCount++;
            // 静默处理创建新标签日志
            
            // 保存自定义颜色
            if (customColor) {
              await tagColorModel.saveTagColor(userId, name, customColor, 'custom');
              // 静默处理设置标签颜色日志
            }
          }
          
          // 处理关联的卡片笔记（如果提供）
          if (notes && Array.isArray(notes)) {
            for (const noteData of notes) {
              try {
                // 这里可以添加笔记关联逻辑
                // 例如：为笔记添加或移除标签
                // 静默处理处理标签关联笔记日志
              } catch (noteError) {
                // 静默处理处理关联笔记错误
              }
            }
          }
          
        } catch (tagError) {
          // 静默处理处理标签错误
          results.errors.push({
            tag: tagData,
            error: tagError.message
          });
          results.summary.errorCount++;
        }
      }
      
      // 处理需要删除的标签（服务器存在但客户端不存在的标签）
      const clientTagNames = new Set(tags.map(tag => tag.name));
      const tagsToDelete = existingTags.filter(tag => !clientTagNames.has(tag.name));
      
      for (const tagToDelete of tagsToDelete) {
        try {
          // 从标签表中删除标签
          await tagModel.deleteTag(userId, tagToDelete.id);
          
          // 从所有笔记中移除该标签
          await noteModel.deleteTag(userId, tagToDelete.name);
          
          // 删除标签颜色配置
          await tagColorModel.deleteTagColor(userId, tagToDelete.name);
          
          results.deleted.push({
            id: tagToDelete.id,
            name: tagToDelete.name
          });
          results.summary.deletedCount++;
          // 静默处理删除标签日志
        } catch (deleteError) {
          // 静默处理删除标签错误
          results.errors.push({
            tag: tagToDelete,
            error: deleteError.message
          });
          results.summary.errorCount++;
        }
      }
      
      // 静默处理同步完成日志
      
      res.json({
        success: true,
        message: '标签同步完成',
        results: results
      });
      
    } catch (error) {
      // 静默处理标签同步错误
      res.status(500).json({ error: '标签同步失败' });
    }
  });

  // 置顶/取消置顶笔记 - 必须在/:id 路由之前定义
  router.patch('/:id/pin', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      // 静默处理置顶请求日志
      
      const note = await noteModel.togglePin(id, userId);
      // 静默处理置顶操作成功日志
      
      res.json(note);
    } catch (error) {
      // 静默处理切换置顶状态错误
      if (error.message === '笔记不存在或无权限修改') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: '切换置顶状态失败' });
    }
  });

  // 收藏/取消收藏笔记 - 必须在/:id 路由之前定义
  router.patch('/:id/favorite', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      // 静默处理收藏请求日志
      
      // 获取当前笔记
      const currentNote = await noteModel.getById(id, userId);
      if (!currentNote) {
        return res.status(404).json({ error: '笔记不存在或无权访问' });
      }
      
      // 切换收藏状态
      const newFavoriteStatus = !(currentNote.is_favorite || false);
      const updatedNote = await noteModel.update(id, userId, { 
        is_favorite: newFavoriteStatus 
      });
      
      // 静默处理收藏操作成功日志
      
      res.json(updatedNote);
    } catch (error) {
      // 静默处理切换收藏状态错误
      res.status(500).json({ error: '切换收藏状态失败' });
    }
  });

  // ===== 配色方案相关路由 - 必须在/:id 路由之前定义 =====
  
  // 获取用户的所有配色方案
  router.get('/color-schemes', async (req, res) => {
    try {
      // 使用全局userId常量
      const { theme_mode } = req.query;
      const schemes = await req.cardSettingsModel.getColorSchemes(userId, theme_mode);
      res.json(schemes);
    } catch (error) {
      // 静默处理获取配色方案错误
      res.status(500).json({ error: '获取配色方案失败' });
    }
  });

  // 保存配色方案
  router.post('/color-schemes', async (req, res) => {
    try {
      // 使用全局userId常量
      const { name, schemeData, theme_mode } = req.body;
      if (!name || !schemeData) {
        return res.status(400).json({ error: '配色方案名称和数据不能为空' });
      }
      
      const result = await req.cardSettingsModel.saveColorScheme(userId, name, schemeData, theme_mode || 'light');
      res.json(result);
    } catch (error) {
      // 静默处理保存配色方案错误
      if (error.message === '最多只能保存10个配色方案') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: '保存配色方案失败' });
      }
    }
  });

  // 删除配色方案
  router.delete('/color-schemes/:id', async (req, res) => {
    try {
      // 使用全局userId常量
      const schemeId = parseInt(req.params.id);
      if (!schemeId) {
        return res.status(400).json({ error: '无效的配色方案ID' });
      }
      
      const result = await req.cardSettingsModel.deleteColorScheme(userId, schemeId);
      res.json(result);
    } catch (error) {
      // 静默处理删除配色方案错误
      res.status(500).json({ error: '删除配色方案失败' });
    }
  });

  // ===== 回收站相关路由 - 必须在/:id 路由之前定义 =====
  
  // 获取回收站笔记列表
  router.get('/recycle-bin', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 20 } = req.query;
      // 使用全局userId常量
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      const result = await req.recycleBinModel.getByUserId(
        userId, 
        search, 
        parseInt(page), 
        parseInt(limit)
      );
      
      res.json(result);
    } catch (error) {
      // 静默处理获取回收站笔记错误
      res.status(500).json({ error: '获取回收站笔记失败' });
    }
  });
  
  // 恢复笔记
  router.post('/recycle-bin/:id/restore', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      // 在恢复前获取笔记内容以处理相关文件
      try {
        const recycleNote = await req.recycleBinModel.getById(id, userId);
        if (recycleNote && recycleNote.content) {
          // 静默处理恢复笔记文件恢复日志
          await handleNoteFileRestoration(recycleNote.content);
        }
      } catch (fileError) {
          // 静默处理恢复笔记文件恢复错误
        // 文件恢复失败不影响笔记恢复流程
      }
      
      const result = await req.recycleBinModel.restore(id, userId);
      res.json(result);
    } catch (error) {
      // 静默处理恢复笔记错误
      res.status(500).json({ error: '恢复笔记失败: ' + error.message });
    }
  });
  
  // 批量永久删除笔记
  // 兼容客户端的batch-delete路径
  router.delete('/recycle-bin/batch-delete', async (req, res) => {
    try {
      // 静默处理批量删除路由调用日志
      // 静默处理请求体日志
      
      const { ids } = req.body;
      // 使用全局userId常量
      
      // 静默处理批量删除请求IDs日志
      // 静默处理批量删除请求IDs类型日志
      // 静默处理批量删除请求是否为数组日志
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供要删除的笔记ID列表' });
      }
      
      // 检查每个ID的类型
      ids.forEach((id, index) => {
        // 静默处理ID类型日志
      });
      
      // 直接使用原始ID，因为现在按note_id匹配删除
      // 静默处理使用的note_ids日志
      // 静默处理note_id类型日志
      
      // 在删除前获取所有笔记内容以处理相关文件
      try {
        // 静默处理批量永久删除开始文件删除日志
        for (const id of ids) {
          try {
            const recycleNote = await req.recycleBinModel.getById(id, userId);
            if (recycleNote && recycleNote.content) {
              // 静默处理批量永久删除处理笔记文件删除日志
              await deleteFileImmediately(recycleNote.content);
            }
          } catch (fileError) {
            // 静默处理批量永久删除文件删除错误
            // 单个文件删除失败不影响整体流程
          }
        }
        // 静默处理批量永久删除文件删除完成日志
      } catch (fileError) {
        // 静默处理批量永久删除文件删除错误
        // 文件删除失败不影响笔记删除流程
      }
      
      const result = await req.recycleBinModel.bulkPermanentDelete(ids, userId);
      res.json(result);
    } catch (error) {
      // 静默处理批量永久删除笔记错误
      res.status(500).json({ error: '批量永久删除笔记失败: ' + error.message });
    }
  });
  
  // 永久删除笔记
  router.delete('/recycle-bin/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      // 在删除前获取笔记内容以处理相关文件
      try {
        const recycleNote = await req.recycleBinModel.getById(id, userId);
        if (recycleNote && recycleNote.content) {
          // 静默处理永久删除处理笔记文件删除日志
          await deleteFileImmediately(recycleNote.content);
        }
      } catch (fileError) {
        // 静默处理永久删除文件删除错误
        // 文件删除失败不影响笔记删除流程
      }
      
      const result = await req.recycleBinModel.permanentDelete(id, userId);
      res.json(result);
    } catch (error) {
      // 静默处理永久删除笔记错误
      res.status(500).json({ error: '永久删除笔记失败: ' + error.message });
    }
  });
  
  // 批量恢复笔记
  router.post('/recycle-bin/bulk-restore', async (req, res) => {
    try {
      // 静默处理批量恢复路由调用日志
      // 静默处理请求体日志
      
      const { ids } = req.body;
      // 使用全局userId常量
      
      // 静默处理批量恢复请求IDs日志
      // 静默处理批量恢复请求IDs类型日志
      // 静默处理批量恢复请求是否为数组日志
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供要恢复的笔记ID列表' });
      }
      
      // 检查每个ID的类型
      ids.forEach((id, index) => {
        // 静默处理ID类型日志
      });
      
      // 直接使用原始ID，因为现在按note_id匹配恢复
      // 静默处理使用的note_ids日志
      // 静默处理note_id类型日志
      
      // 在恢复前获取所有笔记内容以处理相关文件
      try {
        // 静默处理批量恢复开始文件恢复日志
        for (const id of ids) {
          try {
            const recycleNote = await req.recycleBinModel.getById(id, userId);
            if (recycleNote && recycleNote.content) {
              // 静默处理批量恢复处理笔记文件恢复日志
              await handleNoteFileRestoration(recycleNote.content);
            }
          } catch (fileError) {
            // 静默处理批量恢复文件恢复错误
            // 单个文件恢复失败不影响整体流程
          }
        }
        // 静默处理批量恢复文件恢复完成日志
      } catch (fileError) {
        // 静默处理批量恢复文件恢复错误
        // 文件恢复失败不影响笔记恢复流程
      }
      
      const result = await req.recycleBinModel.bulkRestore(ids, userId);
      res.json(result);
    } catch (error) {
      // 静默处理批量恢复笔记错误
      res.status(500).json({ error: '批量恢复笔记失败: ' + error.message });
    }
  });
  
  // 清理过期笔记
  router.post('/recycle-bin/clean-expired', async (req, res) => {
    try {
      // 使用全局userId常量
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      // 将deleteFileImmediately函数设置为全局函数，以便在模型中调用
      global.deleteFileImmediately = deleteFileImmediately;
      
      const result = await req.recycleBinModel.cleanExpired(userId);
      res.json(result);
    } catch (error) {
      // 静默处理清理过期笔记错误
      res.status(500).json({ error: '清理过期笔记失败: ' + error.message });
    }
  });
  
  // 获取回收站统计信?
  router.get('/recycle-bin/stats', async (req, res) => {
    try {
      // 使用全局userId常量
      
      if (!req.recycleBinModel) {
        return res.status(500).json({ error: '回收站服务未初始化' });
      }
      
      const result = await req.recycleBinModel.getStats(userId);
      res.json(result);
    } catch (error) {
      // 静默处理获取回收站统计信息错误
      res.status(500).json({ error: '获取回收站统计信息失败' });
    }
  });

  // 获取单个笔记
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量

      const note = await noteModel.getById(id, userId);
      if (!note) {
        return res.status(404).json({ error: '笔记不存在或无权访问' });
      }

      res.json(note);
    } catch (error) {
      // 静默处理获取笔记错误
      res.status(500).json({ error: '获取笔记失败' });
    }
  });

  // 获取笔记的历史记录
  router.get('/:id/history', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      
      if (!req.noteHistoryModel) {
        return res.status(500).json({ error: '历史记录服务未初始化' });
      }
      
      // 静默处理历史记录查询日志
      
      const historyRecords = await req.noteHistoryModel.getByNoteId(id, userId);
      res.json(historyRecords);
    } catch (error) {
      // 静默处理获取历史记录错误
      res.status(500).json({ error: '获取历史记录失败' });
    }
  });

  // 创建笔记
  router.post('/', async (req, res) => {
    try {
      const { content, tags, created_at } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: '内容不能为空' });
      }

      // 使用全局userId常量
      const noteData = {
        content,
        tags: tags || [],
        userId: userId,
        created_at // 支持自定义创建时间
      };

      const newNote = await noteModel.create(noteData);
      
      // 创建历史记录
      if (req.noteHistoryModel && newNote.id) {
        try {
          // 从内容中提取标题（取第一行或前50个字符）
          const title = content.split('\n')[0].trim().substring(0, 50) || '无标签';
          await req.noteHistoryModel.create(
            newNote.id,
            title,
            content,
            JSON.stringify(tags || []),
            'create',
            userId
          );
          // 静默处理创建历史记录日志
        } catch (historyError) {
          // 静默处理创建历史记录错误
        }
      }
      
      // 自动触发引用关系检查和创建（支持 [[wiki-link]] 语法）
      if (content && newNote.id) {
        try {
          // 提取引用关系：解析 [[wiki-link]] 语法
          const references = extractAllReferences(content);
          
          // 创建引用关系
          for (const reference of references) {
            try {
              const referencedNote = await noteModel.getById(reference.noteId, userId);
              if (!referencedNote) {
                continue;
              }
              
              // 避免自引用
              if (reference.noteId === newNote.id.toString()) {
                continue;
              }
              
              await new Promise((resolve, reject) => {
                req.db.run(
                  'INSERT OR IGNORE INTO note_references (from_note_id, to_note_id, reference_text, user_id) VALUES (?, ?, ?, ?)',
                  [newNote.id, reference.noteId, reference.text, userId],
                  function(err) {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            } catch (refError) {
              console.error('创建引用关系失败:', refError.message);
            }
          }
        } catch (autoRefError) {
          console.error('自动引用检查失败:', autoRefError.message);
        }
      }
      
      res.status(201).json(newNote);
    } catch (error) {
      console.error('创建笔记失败:', error.message);
      res.status(500).json({ error: '创建笔记失败' });
    }
  });

  // 更新笔记
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      
      // 从请求体中获取笔记数组
      const { content, tags, created_at } = req.body;
      
      // 注意：更新笔记时不删除图片文件，
      // 图片文件只在永久删除时才删除
      const oldNote = await noteModel.getById(id, userId);
      // 移除了文件删除逻辑，避免图片被过早删除
      
      // 更新笔记
      const note = await noteModel.update(id, userId, { 
        content, 
        tags, 
        created_at // 添加创建日期以支持修改
      });
      
      // 创建历史记录
      if (req.noteHistoryModel && note) {
        try {
          // 从内容中提取标题（取第一行或前50个字符）
          const title = content.split('\n')[0].trim().substring(0, 50) || '无标签'
          await req.noteHistoryModel.create(
            id,
            title,
            content,
            JSON.stringify(tags || []),
            'update',
            userId
          );
          // 静默处理更新历史记录日志
        } catch (historyError) {
          // 静默处理创建历史记录错误
        }
      }
      
      // 自动触发引用关系检查和更新（支持 [[wiki-link]] 语法）
      if (content) {
        try {
          // 提取引用关系：解析 [[wiki-link]] 语法
          const references = extractAllReferences(content);
          
          // 清理旧的引用关系
          await new Promise((resolve, reject) => {
            req.db.run(
              'DELETE FROM note_references WHERE from_note_id = ? AND user_id = ?',
              [id, userId],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          // 创建新的引用关系
          for (const reference of references) {
            try {
              const referencedNote = await noteModel.getById(reference.noteId, userId);
              if (!referencedNote) {
                continue;
              }
              
              // 避免自引用
              if (reference.noteId === id.toString()) {
                continue;
              }
              
              await new Promise((resolve, reject) => {
                req.db.run(
                  'INSERT OR IGNORE INTO note_references (from_note_id, to_note_id, reference_text, user_id) VALUES (?, ?, ?, ?)',
                  [id, reference.noteId, reference.text, userId],
                  function(err) {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            } catch (refError) {
              console.error('创建引用关系失败:', refError.message);
            }
          }

          // 通过WebSocket通知前端更新引用数据
          if (global.io) {
            global.io.emit('references_updated', {
              type: 'NOTE_REFERENCES_UPDATED',
              noteId: id,
              affectedNoteIds: [id, ...references.map(r => r.noteId)],
              message: `引用关系已更新`
            });
          }
        } catch (autoRefError) {
          console.error('自动引用检查失败:', autoRefError.message);
        }
      }
      
      res.json(note);
    } catch (error) {
      // 静默处理更新笔记错误
      res.status(400).json({ error: error.message || '更新笔记失败' });
    }
  });

  // 删除笔记
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 使用全局userId常量
      
      // 注意：删除笔记时（移到回收站）不删除图片文件，
      // 图片文件只在永久删除时才删除
      const note = await noteModel.getById(id, userId);
      if (!note) {
        return res.status(404).json({ message: '笔记未找到或无权删除' });
      }
      
      const result = await noteModel.delete(id, userId);

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: '笔记未找到或无权删除' });
      }

      res.status(200).json({ message: '笔记删除成功' });
    } catch (error) {
      // 静默处理删除笔记错误
      res.status(500).json({ error: '删除笔记失败' });
    }
  });



  // ===== 标签相关路由 =====
  
  // 创建标签
  router.post('/tags', async (req, res) => {
    try {
      // 静默处理创建标签请求日志
      const { tagName, color = 'blue' } = req.body;
      
      if (!tagName || !tagName.trim()) {
        return res.status(400).json({ error: '标签名称不能为空' });
      }

      const trimmedTagName = tagName.trim();
      // 使用全局userId常量
      // 静默处理标签处理日志
      
      // 使用TagModel创建标签
      const result = await tagModel.createTag(userId, trimmedTagName, color);
      
      // 获取更新后的标签列表
      const updatedTags = await tagModel.getAllTagNames(userId);
      
      // 如果标签已存在，返回409状态码
      if (result.message === '标签已存在') {
        return res.status(409).json({ 
          error: '标签已存在',
          message: result.message,
          tagName: trimmedTagName,
          tagId: result.tagId,
          allTags: updatedTags
        });
      }
      
      res.status(201).json({ 
        message: result.message,
        tagName: trimmedTagName,
        tagId: result.tagId,
        allTags: updatedTags
      });
    } catch (error) {
      // 静默处理创建标签错误
      res.status(500).json({ error: '创建标签失败' });
    }
  });

  // 更新标签顺序（重新实现，支持父子标签关系）
  router.put('/tags/order', async (req, res) => {
    try {
      const { tagOrders, tagHierarchy } = req.body;
      
      if (!tagOrders || !Array.isArray(tagOrders)) {
        return res.status(400).json({ error: '标签顺序数据格式不正确' });
      }

      // 使用全局userId常量
      const results = {
        updated: [],
        errors: [],
        hierarchyUpdated: false
      };

      // 首先更新所有标签的sort_order字段
      for (const orderData of tagOrders) {
        try {
          const { tagId, sortOrder } = orderData;
          
          if (!tagId || sortOrder === undefined) {
            results.errors.push({
              tagId,
              error: '标签ID和排序顺序不能为空'
            });
            continue;
          }

          // 更新标签的sort_order字段
          const updateResult = await tagModel.updateTag(userId, tagId, { sort_order: sortOrder });
          
          if (updateResult.success) {
            results.updated.push({
              tagId,
              sortOrder
            });
          } else {
            results.errors.push({
              tagId,
              error: '更新标签顺序失败'
            });
          }
        } catch (error) {
          results.errors.push({
            tagId: orderData.tagId,
            error: '处理标签顺序失败: ' + error.message
          });
        }
      }

      // 如果提供了标签层次结构数据，同时更新父子关系
      if (tagHierarchy && Array.isArray(tagHierarchy)) {
        try {
          // 先将所有标签的parentId设置为null（清除现有关系）
          const allTags = await tagModel.getAllTags(userId);
          for (const tag of allTags) {
            await tagModel.updateTag(userId, tag.id, { parent_id: null });
          }
          
          // 根据层次结构重新建立父子关系
          for (const hierarchyData of tagHierarchy) {
            const { tagId, parentId } = hierarchyData;
            
            if (!tagId) {
              results.errors.push({
                tagId,
                error: '标签ID不能为空'
              });
              continue;
            }
            
            // 更新父子关系
            const updateResult = await tagModel.updateTag(userId, tagId, { parent_id: parentId });
            
            if (updateResult.success) {
              results.hierarchyUpdated = true;
            } else {
              results.errors.push({
                tagId,
                error: '更新父子关系失败'
              });
            }
          }
        } catch (error) {
          results.errors.push({
            error: '处理标签层次结构失败: ' + error.message
          });
        }
      }

      // 获取更新后的完整标签列表（按sort_order排序）
      const finalTags = await tagModel.getAllTags(userId);

      res.json({
        success: true,
        message: '标签顺序更新完成',
        results: results,
        tags: finalTags,
        hierarchyUpdated: results.hierarchyUpdated
      });
    } catch (error) {
      console.error('标签顺序更新失败:', error);
      res.status(500).json({ error: '标签顺序更新失败' });
    }
  });




  // ===== 标签颜色相关路由 =====
  
  // 获取用户的标签颜色配置
  router.get('/tag-colors/all', async (req, res) => {
    try {
      // 使用全局userId常量
      const tagColors = await tagColorModel.getUserTagColors(userId);
      res.json(tagColors);
    } catch (error) {
      // 静默处理获取标签颜色错误
      res.status(500).json({ error: '获取标签颜色失败' });
    }
  });

  // 获取用户的自定义颜色
  router.get('/tag-colors/custom', async (req, res) => {
    try {
      // 使用全局userId常量
      const customColors = await tagColorModel.getUserCustomColors(userId);
      res.json(customColors);
    } catch (error) {
      // 静默处理获取自定义颜色错误
      res.status(500).json({ error: '获取自定义颜色失败' });
    }
  });

  // 保存标签颜色
  router.post('/tag-colors', async (req, res) => {
    try {
      const { tagName, colorValue, colorType = 'preset' } = req.body;
      
      if (!tagName || !colorValue) {
        return res.status(400).json({ error: '标签名称和颜色值不能为空' });
      }

      // 使用全局userId常量
      const result = await tagColorModel.saveTagColor(userId, tagName, colorValue, colorType);
      res.json(result);
    } catch (error) {
      // 静默处理保存标签颜色错误
      res.status(500).json({ error: '保存标签颜色失败' });
    }
  });

  // 删除标签颜色
  router.delete('/tag-colors/:tagName', async (req, res) => {
    try {
      const { tagName } = req.params;
      const decodedTagName = decodeURIComponent(tagName);
      // 使用全局userId常量
      
      const result = await tagColorModel.deleteTagColor(userId, decodedTagName);
      res.json(result);
    } catch (error) {
      // 静默处理删除标签颜色错误
      res.status(500).json({ error: '删除标签颜色失败' });
    }
  });

  // 删除自定义颜色
  router.delete('/tag-colors/custom/:colorValue', async (req, res) => {
    try {
      const { colorValue } = req.params;
      const decodedColorValue = decodeURIComponent(colorValue);
      // 使用全局userId常量
      
      const result = await tagColorModel.deleteCustomColor(userId, decodedColorValue);
      res.json(result);
    } catch (error) {
      // 静默处理删除自定义颜色错误
      res.status(500).json({ error: '删除自定义颜色失败'});
    }
  });

  // ===== 卡片设置相关路由 =====
  
  // 获取全局卡片设置
  router.get('/card-settings/global', async (req, res) => {
    try {
      const { theme_mode } = req.query;
      // 使用全局userId常量
      const settings = await req.cardSettingsModel.getGlobalSettings(userId, theme_mode || 'light');
      res.json(settings);
    } catch (error) {
      // 静默处理获取全局卡片设置错误
      res.status(500).json({ error: '获取全局卡片设置失败' });
    }
  });

  // 保存全局卡片设置
  router.post('/card-settings/global', async (req, res) => {
    try {
      // 使用全局userId常量
      // 静默处理保存全局卡片设置请求开始日志
      // 静默处理用户ID日志
      // 静默处理请求体日志
      
      const { settings, theme_mode } = req.body;
      // 静默处理设置参数日志
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: '设置数据格式不正确' });
      }

      const result = await req.cardSettingsModel.saveGlobalSettings(userId, settings, theme_mode || 'light');
      // 静默处理保存全局卡片设置成功日志
      
      res.json(result);
    } catch (error) {
      // 静默处理保存全局卡片设置失败错误
      res.status(500).json({ error: '保存全局卡片设置失败' });
    }
  });

  // 获取特定笔记的卡片设置
  router.get('/card-settings/note/:noteId', async (req, res) => {
    try {
      // 使用全局userId常量
      const { noteId } = req.params;
      const { theme_mode } = req.query;
      const settings = await req.cardSettingsModel.getNoteSettings(userId, noteId, theme_mode || 'light');
      res.json(settings);
    } catch (error) {
      // 静默处理获取笔记卡片设置错误
      res.status(500).json({ error: '获取笔记卡片设置失败' });
    }
  });

  // 保存特定笔记的卡片设置
  router.post('/card-settings/note/:noteId', async (req, res) => {
    try {
      // 使用全局userId常量
      // 静默处理保存笔记卡片设置请求开始日志
      // 静默处理用户ID日志
      // 静默处理笔记ID日志
      // 静默处理请求体日志
      
      const { noteId } = req.params;
      const { settings, theme_mode } = req.body;
      // 静默处理设置参数日志
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: '设置数据格式不正确' });
      }

      const result = await req.cardSettingsModel.saveNoteSettings(userId, noteId, settings, theme_mode || 'light');
      // 静默处理保存笔记卡片设置成功日志
      
      res.json(result);
    } catch (error) {
      // 静默处理保存笔记卡片设置失败错误
      res.status(500).json({ error: '保存笔记卡片设置失败' });
    }
  });

  // 删除特定笔记的卡片设置（恢复为全局设置）
  router.delete('/card-settings/note/:noteId', async (req, res) => {
    try {
      // 使用全局userId常量
      const { noteId } = req.params;
      const { theme_mode } = req.query;
      const result = await req.cardSettingsModel.deleteNoteSettings(userId, noteId, theme_mode || 'light');
      res.json(result);
    } catch (error) {
      // 静默处理删除笔记卡片设置错误
      res.status(500).json({ error: '删除笔记卡片设置失败' });
    }
  });

  // 删除所有笔记的个性化设置（全部恢复默认）
  router.delete('/card-settings/all-notes', async (req, res) => {
    try {
      // 使用全局userId常量
      // 静默处理删除所有笔记卡片设置请求开始日志
      // 静默处理用户ID日志
      
      const { theme_mode } = req.query;
      const result = await req.cardSettingsModel.deleteAllNoteSettings(userId, theme_mode || 'light');
      // 静默处理删除所有笔记卡片设置成功日志
      
      res.json(result);
    } catch (error) {
      // 静默处理删除所有笔记卡片设置失败错误
      res.status(500).json({ error: '删除所有笔记卡片设置失败' });
    }
  });

  // ===== 双向链接相关路由 =====
  
  // 创建笔记引用关系
  router.post('/references', async (req, res) => {
    try {
      const { fromNoteId, toNoteId, referenceText } = req.body;
      
      if (!fromNoteId || !toNoteId || !referenceText) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // 使用全局userId常量
      const result = await req.noteReferenceModel.create(fromNoteId, toNoteId, referenceText, userId);
      res.json(result);
    } catch (error) {
      // 静默处理创建笔记引用错误
      res.status(500).json({ error: '创建笔记引用失败' });
    }
  });

  // 获取笔记的引用关系
  router.get('/references/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      
      // 使用全局userId常量
      const references = await req.noteReferenceModel.getByNoteId(noteId, userId);
      
      res.json(references);
    } catch (error) {
      // 静默处理获取笔记引用错误
      res.status(500).json({ error: '获取笔记引用失败' });
    }
  });

  // 删除笔记引用关系
  router.delete('/references/:fromNoteId/:toNoteId', async (req, res) => {
    try {
      const { fromNoteId, toNoteId } = req.params;
      
      // 使用全局userId常量
      const result = await req.noteReferenceModel.delete(fromNoteId, toNoteId, userId);
      res.json(result);
    } catch (error) {
      // 静默处理删除笔记引用错误
      res.status(500).json({ error: '删除笔记引用失败' });
    }
  });

  // 根据引用文本搜索笔记
  router.get('/search-by-reference', async (req, res) => {
    try {
      const { referenceText } = req.query;
      
      if (!referenceText) {
        return res.status(400).json({ error: '缺少引用文本参数' });
      }

      // 使用全局userId常量
      const notes = await req.noteReferenceModel.searchByReference(referenceText, userId);
      res.json(notes);
    } catch (error) {
      // 静默处理根据引用文本搜索笔记错误
      res.status(500).json({ error: '根据引用文本搜索笔记失败' });
    }
  });

  // 解析引用关系（基于特殊字符检测）
  // 处理双向链接 - 简化版：仅管理 note_references 表，不注入隐藏字符和反向链接文本
  router.post('/bidirectional-links/:noteId', async (req, res) => {
    try {
      const { noteId, content } = req.body;
      
      if (!noteId || !content) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      console.log('[双向链接] 开始处理双向链接，笔记ID:', noteId);

      // 使用 extractAllReferences 解析 [[wiki-link]] 语法
      const references = extractAllReferences(content);
      // 过滤自引用
      const filteredReferences = references.filter(ref => ref.noteId !== noteId.toString());

      console.log('[双向链接] 发现引用:', filteredReferences.length, '个');

      // 清理当前笔记的所有引用关系（避免重复）
      await req.noteReferenceModel.db.run(
        'DELETE FROM note_references WHERE from_note_id = ? AND user_id = ?',
        [noteId, userId]
      );
      
      let createdReferences = 0;
      const affectedNoteIds = new Set([noteId]);

      // 为每个被引用的笔记创建引用关系记录
      for (const reference of filteredReferences) {
        try {
          // 验证被引用的笔记是否存在
          const referencedNote = await noteModel.getById(reference.noteId, userId);
          if (!referencedNote) {
            console.log('[双向链接] 被引用笔记不存在:', reference.noteId);
            continue;
          }
          
          // 创建引用关系记录（INSERT OR IGNORE 避免重复）
          const result = await req.noteReferenceModel.create(
            noteId, 
            reference.noteId, 
            reference.text, 
            userId
          );
          
          if (result.id) {
            createdReferences++;
            affectedNoteIds.add(reference.noteId);
          }
        } catch (error) {
          console.error('[双向链接] 创建引用关系失败:', error.message);
        }
      }
      
      // 通过 WebSocket 通知前端更新引用数据
      if (global.io) {
        const eventData = {
          type: 'NOTE_REFERENCES_UPDATED',
          noteId: noteId,
          affectedNoteIds: Array.from(affectedNoteIds),
          message: `引用关系已更新，影响 ${affectedNoteIds.size} 个笔记`
        };
        
        // 向特定用户发送事件
        if (global.connectedUsers) {
          const userSocketId = global.connectedUsers.get(userId);
          if (userSocketId) {
            global.io.to(userSocketId).emit('references_updated', eventData);
          }
        }
        
        // 广播给所有连接的客户端
        global.io.emit('references_updated', {
          ...eventData,
          broadcast: true
        });
      }
      
      res.json({ 
        success: true, 
        processedReferences: filteredReferences.length,
        createdReferences: createdReferences,
        message: `成功处理 ${filteredReferences.length} 个引用，创建 ${createdReferences} 个引用关系`
      });
    } catch (error) {
      console.error('[双向链接] 处理失败:', error.message);
      res.status(500).json({ error: '处理双向链接失败' });
    }
  });

  // 检测笔记中的隐藏字符标签
  return router;
};
