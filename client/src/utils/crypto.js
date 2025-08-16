/**
 * 加密工具类
 * 提供数据加密和解密功能
 */

// 简单的加密函数 - 使用base64编码和简单混淆
export const encryptData = (data, password = 'memeos-default-key') => {
  try {
    // 将数据转换为字符串
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // 简单的混淆算法
    let encrypted = '';
    for (let i = 0; i < dataStr.length; i++) {
      const charCode = dataStr.charCodeAt(i);
      const keyChar = password.charCodeAt(i % password.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }
    
    // Base64编码 - 支持Unicode字符
    return btoa(unescape(encodeURIComponent(encrypted)));
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('数据加密失败');
  }
};

// 解密函数
export const decryptData = (encryptedData, password = 'memeos-default-key') => {
  try {
    // Base64解码 - 支持Unicode字符
    const encrypted = decodeURIComponent(escape(atob(encryptedData)));
    
    // 解密
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i);
      const keyChar = password.charCodeAt(i % password.length);
      decrypted += String.fromCharCode(charCode ^ keyChar);
    }
    
    // 尝试解析为JSON，如果不是JSON则返回字符串
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('数据解密失败');
  }
};

// 生成加密哈希用于验证数据完整性
export const generateHash = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(16);
};

// 验证数据完整性
export const verifyData = (data, hash) => {
  const currentHash = generateHash(data);
  return currentHash === hash;
};

// 压缩数据（简单的重复数据压缩）
export const compressData = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  
  // 简单的重复字符串压缩
  const compressed = str.replace(/(.)\1{2,}/g, (match, char) => {
    return `${char}[${match.length}]`;
  });
  
  return compressed.length < str.length ? compressed : str;
};

// 解压缩数据
export const decompressData = (compressed) => {
  return compressed.replace(/(.)\[(\d+)\]/g, (match, char, count) => {
    return char.repeat(parseInt(count));
  });
};