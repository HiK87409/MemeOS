// 引用链接处理工具函数 - 仅支持HTTP链接

/**
 * 提取内容中的所有HTTP引用链接
 * @param {string} content - 笔记内容
 * @returns {Array} - 引用链接数组
 */
export const extractReferences = (content) => {
  if (!content) return [];
  
  const references = [];
  // 匹配 HTTP 格式的笔记引用链接，支持复杂ID格式
  const linkPattern = /\[([^\]]+)\]\(http:\/\/localhost:(\d+)\/note\/([a-zA-Z0-9\-_]+)\)/g;
  
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const [fullMatch, title, port, noteId] = match;
    references.push({
      fullMatch,
      title,
      port: parseInt(port),
      noteId: noteId,
      position: match.index
    });
  }
  
  return references;
};

/**
 * 创建引用链接的 Markdown 格式
 * @param {string} title - 链接标题
 * @param {number} noteId - 笔记ID
 * @param {number} port - 端口号（默认3000）
 * @returns {string} - Markdown 格式的引用链接
 */
export const createReferenceLink = (title, noteId, port = 3000) => {
  return `[${title}](http://localhost:${port}/note/${noteId})`;
};

/**
 * 处理笔记内容，仅用于提取引用关系
 * @param {string} content - 原始内容
 * @returns {string} - 原始内容（无需处理）
 */
export const processNoteContent = (content) => {
  return content;
};