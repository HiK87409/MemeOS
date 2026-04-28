// 引用链接处理工具函数 - 支持 [[wiki-link]] 语法

/**
 * 提取内容中的所有引用链接（wiki-link 格式）
 * @param {string} content - 笔记内容
 * @returns {Array} - 引用链接数组
 */
export const extractReferences = (content) => {
  if (!content) return [];
  
  const references = [];
  const seenNoteIds = new Set();
  
  // 解析 [[wiki-link]] 语法: [[noteId]] 或 [[noteId|displayText]]
  const wikiLinkRegex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  let match;
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const noteId = match[1].trim();
    const displayText = match[2]?.trim() || noteId;
    if (noteId && !seenNoteIds.has(noteId)) {
      seenNoteIds.add(noteId);
      references.push({
        noteId,
        title: displayText,
        format: 'wiki-link',
        fullMatch: match[0],
        position: match.index
      });
    }
  }
  
  return references;
};

/**
 * 创建 wiki-link 格式的引用链接
 * @param {string} title - 链接显示文本
 * @param {string} noteId - 笔记ID
 * @returns {string} - [[noteId|title]] 格式的引用链接
 */
export const createReferenceLink = (title, noteId) => {
  return `[[${noteId}|${title}]]`;
};

/**
 * 处理笔记内容，仅用于提取引用关系
 * @param {string} content - 原始内容
 * @returns {string} - 原始内容（无需处理）
 */
export const processNoteContent = (content) => {
  return content;
};
