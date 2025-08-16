const express = require('express');

module.exports = () => {
  const router = express.Router();

  // 测试端点，用于验证API可访问性
  router.get('/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
  });

  return router;
};
