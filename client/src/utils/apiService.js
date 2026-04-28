/**
 * API服务类 - 已废弃，请使用 notesApi.js 中的统一API
 * 本文件仅作为向后兼容的代理层
 */

import api from '../api/notesApi.js';

class ApiService {
  constructor() {
    this.baseURL = '/api';
  }

  // 获取所有笔记
  async getAllNotes() {
    try {
      const response = await api.get('/notes/my');
      const data = response.data;
      return data.notes || data || [];
    } catch (error) {
      console.error('获取笔记失败:', error);
      throw error;
    }
  }

  // 创建笔记
  async createNote(noteData) {
    try {
      const response = await api.post('/notes', noteData);
      return response.data;
    } catch (error) {
      console.error('创建笔记失败:', error);
      throw error;
    }
  }

  // 更新笔记
  async updateNote(noteId, noteData) {
    try {
      const response = await api.put(`/notes/${noteId}`, noteData);
      return response.data;
    } catch (error) {
      console.error('更新笔记失败:', error);
      throw error;
    }
  }

  // 获取笔记详情
  async getNoteById(noteId) {
    try {
      const response = await api.get(`/notes/${noteId}`);
      return response.data;
    } catch (error) {
      console.error('获取笔记详情失败:', error);
      throw error;
    }
  }

  // 删除笔记
  async deleteNote(noteId) {
    try {
      const response = await api.delete(`/notes/${noteId}`);
      return response.data;
    } catch (error) {
      console.error('删除笔记失败:', error);
      throw error;
    }
  }

  // 获取所有标签
  async getAllTags() {
    try {
      const response = await api.get('/notes/tags/all');
      return response.data;
    } catch (error) {
      console.error('获取标签失败:', error);
      throw error;
    }
  }

  // 创建备份
  async createBackup(backupData) {
    try {
      const serverBackupData = {
        backupType: backupData.backupType || backupData.type || 'manual',
        snapshotType: backupData.snapshotType || (backupData.type === 'auto' ? 'incremental' : 'full'),
        description: backupData.description || (backupData.type === 'auto' ? '自动备份' : '手动备份'),
        data: {
          notes: backupData.notes || [],
          tags: backupData.tags || [],
          mediaFiles: backupData.mediaFiles || [],
          backupTime: backupData.timestamp || new Date().toISOString(),
          version: backupData.version || '1.0'
        }
      };

      const response = await api.post('/backup/create', serverBackupData);
      return response.data;
    } catch (error) {
      console.error('创建备份失败:', error);
      throw error;
    }
  }

  // 获取备份列表
  async getBackups(backupType = null) {
    try {
      let url = '/backup/list';
      if (backupType) {
        url += `?type=${backupType}`;
      }

      const response = await api.get(url);
      const serverData = response.data;

      if (serverData.success && serverData.backups) {
        const backups = serverData.backups.map(serverBackup => ({
          backup_id: serverBackup.backup_id || serverBackup.id,
          created_at: serverBackup.created_at || serverBackup.timestamp,
          backup_type: serverBackup.backup_type || serverBackup.backupType || serverBackup.type || 'manual',
          description: serverBackup.description,
          data: serverBackup.data || {
            notes: serverBackup.notes || [],
            tags: serverBackup.tags || [],
            mediaFiles: serverBackup.mediaFiles || [],
            backupTime: serverBackup.timestamp || new Date().toISOString(),
            version: serverBackup.version || '1.0'
          },
          filename: serverBackup.filename,
          size: serverBackup.size,
          notesCount: serverBackup.notesCount || (serverBackup.data?.notes?.length || 0)
        }));

        return {
          success: true,
          backups: backups
        };
      }

      return serverData;
    } catch (error) {
      console.error('获取备份失败:', error);
      throw error;
    }
  }

  // 恢复备份
  async restoreBackup(backupId) {
    try {
      const response = await api.post(`/backup/restore/${backupId}`);
      const result = response.data;
      return {
        success: result.success !== false,
        backupId: backupId,
        message: result.message || '备份恢复成功'
      };
    } catch (error) {
      console.error('恢复备份失败:', error);
      throw error;
    }
  }

  // 删除备份
  async deleteBackup(backupId) {
    try {
      const response = await api.delete(`/backup/delete/${backupId}`);
      const result = response.data;
      return {
        success: result.success !== false,
        backupId: backupId,
        message: result.message || '备份删除成功'
      };
    } catch (error) {
      console.error('删除备份失败:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default ApiService;
