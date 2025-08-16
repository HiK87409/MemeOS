const crypto = require('crypto');

class IdGenerator {
  /**
   * 生成复杂的笔记ID
   * 格式: {timestamp_base36}_{random_string}_{user_hash}
   * 例如: 1k2m3n4o_a7b8c9d0_x1y2z3
   */
  static generateNoteId(userId) {
    // 1. 时间戳部分 (base36编码，更短更紧凑)
    const timestamp = Date.now().toString(36);
    
    // 2. 随机字符串部分 (8位)
    const randomBytes = crypto.randomBytes(4);
    const randomString = randomBytes.toString('hex');
    
    // 3. 用户ID哈希部分 (取前6位)
    const userHash = crypto.createHash('md5')
      .update(userId.toString())
      .digest('hex')
      .substring(0, 6);
    
    // 组合成最终ID
    return `${timestamp}_${randomString}_${userHash}`;
  }

  /**
   * 生成短格式ID (用于简单场景)
   * 格式: {timestamp_base36}{random_4chars}
   * 例如: 1k2m3n4oa7b8
   */
  static generateShortId() {
    const timestamp = Date.now().toString(36);
    const randomString = crypto.randomBytes(2).toString('hex');
    return `${timestamp}${randomString}`;
  }

  /**
   * 验证ID格式是否有效
   */
  static validateNoteId(id) {
    if (!id || typeof id !== 'string') {
      return false;
    }
    
    // 检查是否是新格式ID (包含下划线)
    if (id.includes('_')) {
      const parts = id.split('_');
      return parts.length === 3 && 
             parts[0].length > 0 && 
             parts[1].length === 8 && 
             parts[2].length === 6;
    }
    
    // 兼容旧格式ID (纯数字)
    return /^\d+$/.test(id);
  }

  /**
   * 从ID中提取时间戳 (仅适用于新格式)
   */
  static extractTimestamp(id) {
    if (!id || !id.includes('_')) {
      return null;
    }
    
    try {
      const timestampPart = id.split('_')[0];
      return parseInt(timestampPart, 36);
    } catch (error) {
      return null;
    }
  }

  /**
   * 从ID中提取用户哈希 (仅适用于新格式)
   */
  static extractUserHash(id) {
    if (!id || !id.includes('_')) {
      return null;
    }
    
    const parts = id.split('_');
    return parts.length === 3 ? parts[2] : null;
  }
}

module.exports = IdGenerator;