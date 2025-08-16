const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (inboxModel) => {
  const router = express.Router();

  // 获取收件箱列表
  router.get('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const { unreadOnly, excludeArchived } = req.query;
      
      const options = {
        unreadOnly: unreadOnly === 'true',
        excludeArchived: excludeArchived !== 'false'
      };
      
      const items = await inboxModel.getAllByUserId(userId, options);
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error('获取收件箱列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取收件箱列表失败'
      });
    }
  });

  // 创建收件箱项目
  router.post('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, content, source = 'card', source_id } = req.body;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: '标题不能为空'
        });
      }
      
      const id = uuidv4();
      const inboxData = {
        id,
        title,
        content: content || '',
        source,
        source_id,
        user_id: userId
      };
      
      const item = await inboxModel.create(inboxData);
      
      // 通过WebSocket通知用户
      if (global.io && global.connectedUsers) {
        const socketId = global.connectedUsers.get(userId.toString());
        if (socketId) {
          global.io.to(socketId).emit('inbox:new', item);
        }
      }
      
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('创建收件箱项目失败:', error);
      res.status(500).json({
        success: false,
        error: '创建收件箱项目失败'
      });
    }
  });

  // 标记为已读
  router.patch('/:id/read', async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const result = await inboxModel.markAsRead(id, userId);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: '收件箱项目不存在'
        });
      }
      
      res.json({
        success: true,
        message: '已标记为已读'
      });
    } catch (error) {
      console.error('标记已读失败:', error);
      res.status(500).json({
        success: false,
        error: '标记已读失败'
      });
    }
  });

  // 标记为未读
  router.patch('/:id/unread', async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const result = await inboxModel.markAsUnread(id, userId);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: '收件箱项目不存在'
        });
      }
      
      res.json({
        success: true,
        message: '已标记为未读'
      });
    } catch (error) {
      console.error('标记未读失败:', error);
      res.status(500).json({
        success: false,
        error: '标记未读失败'
      });
    }
  });

  // 归档项目
  router.patch('/:id/archive', async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const result = await inboxModel.archive(id, userId);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: '收件箱项目不存在'
        });
      }
      
      res.json({
        success: true,
        message: '已归档'
      });
    } catch (error) {
      console.error('归档失败:', error);
      res.status(500).json({
        success: false,
        error: '归档失败'
      });
    }
  });

  // 删除项目
  router.delete('/:id', async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const result = await inboxModel.delete(id, userId);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: '收件箱项目不存在'
        });
      }
      
      res.json({
        success: true,
        message: '已删除'
      });
    } catch (error) {
      console.error('删除失败:', error);
      res.status(500).json({
        success: false,
        error: '删除失败'
      });
    }
  });

  // 获取未读数量
  router.get('/unread-count', async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await inboxModel.getUnreadCount(userId);
      
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('获取未读数量失败:', error);
      res.status(500).json({
        success: false,
        error: '获取未读数量失败'
      });
    }
  });

  return router;
};