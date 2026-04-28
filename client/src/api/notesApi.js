import axios from 'axios';
import { API_BASE_URL } from '../config/env.js';

// 创建axios实例，支持凭证（cookies）
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});





// 获取我的笔记
export const fetchMyNotes = async (search = '') => {
  try {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get(`/notes${params}`);
    return response.data;
  } catch (error) {
    console.error('获取我的笔记失败:', error);
    throw error;
  }
};

// 获取我的笔记（分页版本）
export const fetchMyNotesWithPagination = async (search = '', page = 1, limit = 10) => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/notes/my?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('获取我的笔记失败:', error);
    throw error;
  }
};

// 创建笔记
export const createNote = async (noteData) => {
  try {
    const response = await api.post('/notes', noteData);
    return response.data;
  } catch (error) {
    console.error('创建笔记失败:', error);
    throw error;
  }
};

// 更新笔记
export const updateNote = async (id, noteData) => {
  try {
    const response = await api.put(`/notes/${id}`, noteData);
    
    // 后端现在会自动处理引用关系检查，无需前端手动触发
    console.log('[updateNote] 笔记更新成功，后端已自动处理引用关系');
    
    return response.data;
  } catch (error) {
    console.error('更新笔记失败:', error);
    throw error;
  }
};

// 删除笔记
export const deleteNote = async (id) => {
  try {
    const token = localStorage.getItem('token');
    console.log('[deleteNote] 开始删除笔记，ID:', id);
    console.log('[deleteNote] Token存在:', !!token);
    
    console.log('[deleteNote] Token前缀:', token ? token.substring(0, 20) + '...' : 'null');
    
    const response = await api.delete(`/notes/${id}`);
    console.log('[deleteNote] 删除成功，响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('[deleteNote] 删除笔记失败:', error);
    console.error('[deleteNote] 错误状态码:', error.response?.status);
    console.error('[deleteNote] 错误数据:', error.response?.data);
    throw error;
  }
};

// 置顶/取消置顶笔记
export const togglePinNote = async (id) => {
  try {
    const response = await api.patch(`/notes/${id}/pin`);
    return response.data;
  } catch (error) {
    console.error('切换置顶状态失败:', error);
    throw error;
  }
};

// 收藏/取消收藏笔记
export const toggleFavoriteNote = async (id) => {
  try {
    const response = await api.patch(`/notes/${id}/favorite`);
    return response.data;
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    throw error;
  }
};

// 获取所有标签
export const fetchAllTags = async () => {
  try {
    // 在线模式：调用API获取标签
    const response = await api.get('/notes/tags/all');
    return response.data;
  } catch (error) {
    console.error('获取标签失败:', error);
    throw error;
  }
};

// 获取回收站列表
export const fetchRecycleBin = async (search = '') => {
  try {
    // 在线模式：调用API获取回收站列表
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get(`/notes/recycle-bin${params}`);
    return response.data;
  } catch (error) {
    console.error('获取回收站列表失败:', error);
    throw error;
  }
};

// 恢复笔记
export const restoreNote = async (id) => {
  try {
    // 在线模式：调用API恢复笔记
    const response = await api.post(`/notes/recycle-bin/${id}/restore`);
    return response.data;
  } catch (error) {
    console.error('恢复笔记失败:', error);
    throw error;
  }
};

// 永久删除笔记
export const permanentDeleteNote = async (id) => {
  try {
    // 在线模式：调用API永久删除笔记
    const response = await api.delete(`/notes/recycle-bin/${id}`);
    return response.data;
  } catch (error) {
    console.error('永久删除笔记失败:', error);
    throw error;
  }
};

// 批量恢复笔记
export const batchRestoreNotes = async (ids) => {
  try {
    console.log('批量恢复笔记 - 传入的ids:', ids);
    console.log('批量恢复笔记 - ids类型:', typeof ids);
    console.log('批量恢复笔记 - 是否为数组:', Array.isArray(ids));
    
    // 在线模式：调用API批量恢复笔记
    const response = await api.post('/notes/recycle-bin/bulk-restore', { ids });
    console.log('批量恢复笔记 - API响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('批量恢复笔记失败:', error);
    console.error('批量恢复笔记 - 错误状态码:', error.response?.status);
    console.error('批量恢复笔记 - 错误数据:', error.response?.data);
    throw error;
  }
};

// 批量永久删除笔记
export const batchPermanentDeleteNotes = async (ids) => {
  try {
    // 在线模式：调用API批量永久删除笔记
    const response = await api.delete('/notes/recycle-bin/batch-delete', { data: { ids } });
    return response.data;
  } catch (error) {
    console.error('批量永久删除笔记失败:', error);
    throw error;
  }
};

// 清理过期笔记
export const cleanExpiredNotes = async () => {
  try {
    // 在线模式：调用API清理过期笔记
    const response = await api.post('/notes/recycle-bin/clean-expired');
    return response.data;
  } catch (error) {
    console.error('清理过期笔记失败:', error);
    throw error;
  }
};

// 获取回收站统计信息
export const getRecycleBinStats = async () => {
  try {
    // 在线模式：调用API获取统计信息
    const response = await api.get('/notes/recycle-bin/stats');
    return response.data;
  } catch (error) {
    console.error('获取回收站统计信息失败:', error);
    throw error;
  }
};

// 创建标签
export const createTag = async (tagName, color = 'blue') => {
  try {
    console.log('createTag API调用开始，参数:', { tagName, color });
    
    // 在线模式：调用API创建标签
    const response = await api.post('/notes/tags', { tagName, color });
    console.log('createTag API调用成功，响应:', response.data);
    return response.data;
  } catch (error) {
    // 409错误（标签已存在）时不显示错误信息，静默处理
    if (error.response?.status === 409) {
      console.log('标签已存在，将由上层组件处理颜色更新');
    } else {
      console.error('创建标签失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
    }
    throw error;
  }
};

// 删除标签
export const deleteTag = async (tag) => {
  try {
    // 在线模式：调用API删除标签
    // 判断传入的是标签ID还是标签名称
    let tagName = tag;
    if (typeof tag === 'object' && tag !== null) {
      tagName = tag.name;
    }
    
    const response = await api.delete(`/notes/tags/${encodeURIComponent(tagName)}`);
    return response.data;
  } catch (error) {
    console.error('删除标签失败:', error);
    throw error;
  }
};

// 同步标签数据
export const syncTags = async () => {
  try {
    // 在线模式：调用API同步标签数据
    const response = await api.get('/notes/tags');
    return response.data;
  } catch (error) {
    console.error('同步标签数据失败:', error);
    throw error;
  }
};

// 批量同步标签数据（用于本地模式切换到在线模式时的数据同步）
export const bulkSyncTags = async (localTags) => {
  try {
    // 在线模式：将本地标签批量同步到服务器
    const syncResults = [];
    
    for (const tag of localTags) {
      try {
        const response = await api.post('/notes/tags', { 
          tagName: tag.name, 
          color: tag.color || 'blue' 
        });
        syncResults.push({
          success: true,
          localTag: tag,
          serverResponse: response.data
        });
      } catch (error) {
        syncResults.push({
          success: false,
          localTag: tag,
          error: error.response?.data?.error || error.message
        });
      }
    }
    
    // 同步完成后，获取最新的服务器标签列表
    const finalTags = await syncTags();
    
    return {
      success: true,
      message: '批量同步完成',
      syncResults,
      finalTags
    };
  } catch (error) {
    console.error('批量同步标签数据失败:', error);
    throw error;
  }
};

// 根据标签获取笔记
export const fetchNotesByTag = async (tag) => {
  try {
    const response = await api.get(`/notes/tag/${encodeURIComponent(tag)}`);
    return response.data;
  } catch (error) {
    console.error('根据标签获取笔记失败:', error);
    throw error;
  }
};

// 移除标签并删除标签 - 从所有笔记中移除指定标签，并删除标签本身
export const removeTagFromNotes = async (tagName) => {
  try {
    // 强制使用在线API：调用API从所有笔记中移除标签并删除标签本身
    const response = await api.delete(`/notes/tags/${encodeURIComponent(tagName)}/remove-from-notes`);
    return response.data;
  } catch (error) {
    console.error('从笔记中移除标签并删除标签失败:', error);
    throw error;
  }
};

// 删除标签和笔记 - 删除标签以及所有带有该标签的笔记
export const deleteTagAndNotes = async (tagName) => {
  try {
    // 强制使用在线API：调用API删除标签和所有相关笔记
    const response = await api.delete(`/notes/tags/${encodeURIComponent(tagName)}/with-notes`);
    return response.data;
  } catch (error) {
    console.error('删除标签和笔记失败:', error);
    throw error;
  }
};

// 重命名标签
export const renameTag = async (oldTagName, newTagName) => {
  try {
    // 强制使用在线API：调用API重命名标签
    const response = await api.patch(`/notes/tags/${encodeURIComponent(oldTagName)}/rename`, { 
      newTagName 
    });
    return response.data;
  } catch (error) {
    console.error('重命名标签失败:', error);
    throw error;
  }
};

// 更新标签顺序
export const updateTagOrder = async (tagOrders, tagHierarchy = null) => {
  try {
    // 构建请求数据，包含标签顺序和层次结构
    const requestData = {
      tagOrders
    };
    
    // 如果提供了标签层次结构数据，也发送到服务器
    if (tagHierarchy && Array.isArray(tagHierarchy)) {
      requestData.tagHierarchy = tagHierarchy;
    }
    
    // 调用API更新标签顺序
    const response = await api.put('/notes/tags/order', requestData);
    return response.data;
  } catch (error) {
    console.error('更新标签顺序失败:', error);
    throw error;
  }
};



// 根据标签获取我的笔记
export const fetchMyNotesByTag = async (tag) => {
  try {
    const response = await api.get(`/notes/my/tag/${encodeURIComponent(tag)}`);
    return response.data;
  } catch (error) {
    console.error('根据标签获取我的笔记失败:', error);
    throw error;
  }
};

// 根据标签获取我的笔记（分页版本）
export const fetchMyNotesByTagWithPagination = async (tag, page = 1, limit = 10) => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('tag', tag);
    
    const response = await api.get(`/notes/my?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('根据标签获取我的笔记失败:', error);
    throw error;
  }
};

// 获取笔记日期列表
export const fetchNoteDates = async (start = null, end = null) => {
  try {
    // 如果没有提供日期范围，使用默认范围（过去一年到未来一年）
    if (!start || !end) {
      const now = new Date();
      const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const futureYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      start = pastYear.toISOString().split('T')[0];
      end = futureYear.toISOString().split('T')[0];
    }
    
    const response = await api.get(`/notes/dates?start=${start}&end=${end}`);
    return response.data;
  } catch (error) {
    console.error('获取笔记日期失败:', error);
    throw error;
  }
};

// 根据日期获取笔记
export const fetchNotesByDate = async (date) => {
  try {
    const response = await api.get(`/notes/date/${date}`);
    return response.data;
  } catch (error) {
    console.error('根据日期获取笔记失败:', error);
    throw error;
  }
};

// 根据精确日期获取笔记
export const fetchNotesByDateExact = async (date) => {
  try {
    const response = await api.get(`/notes/date/${date}`);
    return response.data;
  } catch (error) {
    console.error('根据精确日期获取笔记失败:', error);
    throw error;
  }
};

// 上传文件
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('上传文件失败:', error);
    throw error;
  }
};

// 上传图片（兼容性别名）
export const uploadImage = uploadFile;

// ===== 标签颜色相关 API =====

// 获取用户的标签颜色配置
export const fetchTagColors = async () => {
  try {
    // 在线模式：调用API获取标签颜色配置
    const response = await api.get('/notes/tag-colors/all');
    return response.data;
  } catch (error) {
    console.error('获取标签颜色失败:', error);
    throw error;
  }
};

// 获取用户的自定义颜色
export const fetchCustomColors = async () => {
  try {
    // 在线模式：调用API获取自定义颜色
    const response = await api.get('/notes/tag-colors/custom');
    return response.data;
  } catch (error) {
    console.error('获取自定义颜色失败:', error);
    throw error;
  }
};

// 保存标签颜色
export const saveTagColorApi = async (tagName, colorValue, colorType = 'preset') => {
  console.log('🌐 saveTagColorApi被调用，参数:', { tagName, colorValue, colorType });
  
  try {
    console.log('🌐 即将发送POST请求到 /notes/tag-colors');
    const response = await api.post('/notes/tag-colors', {
      tagName,
      colorValue,
      colorType
    });
    console.log('🌐 POST请求成功，响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('🌐 POST请求失败:', error);
    console.error('🌐 错误详情:', error.response?.data || error.message);
    throw error;
  }
};

// 删除标签颜色
export const deleteTagColorApi = async (tagName) => {
  try {
    // 在线模式：调用API删除标签颜色
    const response = await api.delete(`/notes/tag-colors/${encodeURIComponent(tagName)}`);
    return response.data;
  } catch (error) {
    console.error('删除标签颜色失败:', error);
    throw error;
  }
};

// 删除自定义颜色
export const deleteCustomColorApi = async (colorValue) => {
  try {
    // 在线模式：调用API删除自定义颜色
    const response = await api.delete(`/notes/tag-colors/custom/${encodeURIComponent(colorValue)}`);
    return response.data;
  } catch (error) {
    console.error('删除自定义颜色失败:', error);
    throw error;
  }
};

// ===== 卡片个性化设置相关 API =====

// 获取全局卡片设置
export const fetchGlobalCardSettings = async (themeMode = 'light') => {
  // 在线模式：调用API获取全局卡片设置
  const response = await api.get('/notes/card-settings/global', {
    params: { theme_mode: themeMode }
  });
  return response.data;
};

// 保存全局卡片设置
export const saveGlobalCardSettings = async (settings, themeMode = 'light') => {
  console.log('🌐 saveGlobalCardSettings API调用开始');
  console.log('🌐 设置参数:', settings);
  console.log('🌐 主题模式:', themeMode);
  
  
  try {
    const response = await api.post('/notes/card-settings/global', { 
      settings, 
      theme_mode: themeMode 
    });
    console.log('🌐 saveGlobalCardSettings API调用成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('🌐 saveGlobalCardSettings API调用失败:', error);
    console.error('🌐 错误状态码:', error.response?.status);
    console.error('🌐 错误数据:', error.response?.data);
    throw error;
  }
};

// 获取特定笔记的卡片设置
export const fetchNoteCardSettings = async (noteId, themeMode = 'light') => {
  // 在线模式：调用API获取笔记卡片设置
  const response = await api.get(`/notes/card-settings/note/${noteId}`, {
    params: { theme_mode: themeMode }
  });
  return response.data;
};

// 保存特定笔记的卡片设置
export const saveNoteCardSettings = async (noteId, settings, themeMode = 'light') => {
  console.log('🌐 saveNoteCardSettings API调用开始');
  console.log('🌐 笔记ID:', noteId);
  console.log('🌐 设置参数:', settings);
  console.log('🌐 主题模式:', themeMode);

  
  try {
    const response = await api.post(`/notes/card-settings/note/${noteId}`, { 
      settings, 
      theme_mode: themeMode 
    });
    console.log('🌐 saveNoteCardSettings API调用成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('🌐 saveNoteCardSettings API调用失败:', error);
    console.error('🌐 错误状态码:', error.response?.status);
    console.error('🌐 错误数据:', error.response?.data);
    throw error;
  }
};

// 删除特定笔记的卡片设置（恢复为全局设置）
export const deleteNoteCardSettings = async (noteId, themeMode = 'light') => {
  // 在线模式：调用API删除笔记卡片设置
  const response = await api.delete(`/notes/card-settings/note/${noteId}`, {
    params: { theme_mode: themeMode }
  });
  return response.data;
};

// 删除所有笔记的个性化设置（全部恢复默认）
export const deleteAllNoteCardSettings = async (themeMode = 'light') => {
  console.log('🌐 deleteAllNoteCardSettings API调用开始');
  console.log('🌐 主题模式:', themeMode);

  
  try {
    // 在线模式：调用API删除所有笔记卡片设置
    const response = await api.delete('/notes/card-settings/all-notes', {
      params: { theme_mode: themeMode }
    });
    console.log('🌐 deleteAllNoteCardSettings API调用成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('🌐 deleteAllNoteCardSettings API调用失败:', error);
    console.error('🌐 错误状态码:', error.response?.status);
    console.error('🌐 错误数据:', error.response?.data);
    throw error;
  }
};




// ===== 历史记录相关 API =====

// 获取笔记历史记录
export const fetchNoteHistory = async (noteId) => {
  try {
    const response = await api.get(`/notes/${noteId}/history`);
    return response.data;
  } catch (error) {
    console.error('获取笔记历史记录失败:', error);
    throw error;
  }
};

// ===== 双向链接相关 API =====

// 处理双向链接（基于 [[wiki-link]] 语法）
export const processBidirectionalLinks = async (noteId, content) => {
  try {
    const response = await api.post('/notes/bidirectional-links', {
      noteId,
      content
    });
    return response.data;
  } catch (error) {
    console.error('处理双向链接失败:', error);
    throw error;
  }
};

// 获取笔记的引用关系
export const fetchNoteReferences = async (noteId) => {
  try {
    // 在线模式：调用API获取笔记引用关系
    const response = await api.get(`/notes/references/${noteId}`);
    return response.data;
  } catch (error) {
    console.error('获取笔记引用关系失败:', error);
    throw error;
  }
};

export default api;