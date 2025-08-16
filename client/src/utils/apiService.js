/**
 * API服务类
 * 处理与后端的通信
 */

const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // 获取认证头
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // 只有在有token时才添加Authorization头
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // 获取所有笔记
  async getAllNotes() {
    try {
      const response = await fetch(`${this.baseURL}/notes/my`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.notes || data || [];
    } catch (error) {
      console.error('获取笔记失败:', error);
      throw error;
    }
  }

  // 创建笔记
  async createNote(noteData) {
    try {
      const response = await fetch(`${this.baseURL}/notes`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(noteData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('创建笔记失败:', error);
      throw error;
    }
  }

  // 更新笔记
  async updateNote(noteId, noteData) {
    try {
      const response = await fetch(`${this.baseURL}/notes/${noteId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(noteData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('更新笔记失败:', error);
      throw error;
    }
  }

  // 获取笔记详情
  async getNoteById(noteId) {
    try {
      const response = await fetch(`${this.baseURL}/notes/${noteId}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取笔记详情失败:', error);
      throw error;
    }
  }

  // 删除笔记
  async deleteNote(noteId) {
    try {
      const response = await fetch(`${this.baseURL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('删除笔记失败:', error);
      throw error;
    }
  }

  // 获取所有标签
  async getAllTags() {
    try {
      const response = await fetch(`${this.baseURL}/notes/tags/all`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取标签失败:', error);
      throw error;
    }
  }

  // 备份相关的API
  async createBackup(backupData) {
    try {
      // 使用与后端一致的字段结构
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
      
      const response = await fetch(`${this.baseURL}/backup/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(serverBackupData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('创建备份失败:', error);
      throw error;
    }
  }

  // 获取备份列表
  async getBackups(backupType = null) {
    try {
      let url = `${this.baseURL}/backup/list`;
      if (backupType) {
        url += `?type=${backupType}`;
      }
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const serverData = await response.json();
      
      // 直接使用后端返回的数据格式，保持字段一致性
      if (serverData.success && serverData.backups) {
        const backups = serverData.backups.map(serverBackup => ({
          backup_id: serverBackup.backup_id || serverBackup.id,
          created_at: serverBackup.created_at || serverBackup.timestamp,
          backup_type: serverBackup.backup_type || serverBackup.backupType || serverBackup.type || 'manual', // 确保默认为manual
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

  async restoreBackup(backupId) {
    try {
      const response = await fetch(`${this.baseURL}/backup/restore/${backupId}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 确保返回格式一致
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

  async deleteBackup(backupId) {
    try {
      const response = await fetch(`${this.baseURL}/backup/delete/${backupId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 确保返回格式一致
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

// 导出单例实例
export const apiService = new ApiService();
export default ApiService;