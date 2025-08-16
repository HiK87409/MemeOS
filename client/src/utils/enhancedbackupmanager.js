/**
 * 增强备份管理器
 * 支持数据库备份、增量备份、加密备份、历史记录等功能
 */

import { generateHash, verifyData, compressData, decompressData } from './crypto';
import { sha256 } from 'js-sha256';
import { format, toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import { API_BASE_URL } from '../config/env.js';
import { apiService } from './apiService';
import JSZip from 'jszip';

class EnhancedBackupManager {
  constructor() {
    this.backupKey = 'memeos-enhanced-backups';
    this.historyKey = 'memeos-note-history';
    this.settingsKey = 'memeos-backup-settings';
    this.defaultPassword = 'memeos-secure-backup-2024';
  }

  // 获取备份设置
  async getSettings() {
    try {
      // 优先从数据库获取设置
      try {
        const response = await fetch('/api/backup/settings');
        const result = await response.json();
        
        if (result.success && result.settings) {
          // 如果数据库中有设置，同时更新localStorage
          localStorage.setItem(this.settingsKey, JSON.stringify(result.settings));
          return result.settings;
        }
      } catch (dbError) {
        console.warn('从数据库获取设置失败:', dbError);
      }
      
      // 如果数据库中没有设置，则从localStorage获取
      const settings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
      return {
        autoBackup: settings.autoBackup ?? true,
        backupInterval: settings.backupInterval ?? 10, // 分钟
        compressionEnabled: settings.compressionEnabled ?? true
      };
    } catch (error) {
      console.error('获取备份设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  // 保存备份设置
  async saveSettings(settings) {
    try {
      // 同时保存到localStorage和数据库
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
      
      // 保存到数据库
      try {
        const response = await fetch('/api/backup/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        if (!result.success) {
          console.warn('保存设置到数据库失败:', result.error);
        }
      } catch (dbError) {
        console.warn('保存设置到数据库失败:', dbError);
      }
      
      // 创建历史记录
      await this.createHistoryRecord([], 'settings', 'manual');
      
      return true;
    } catch (error) {
      console.error('保存备份设置失败:', error);
      return false;
    }
  }

  // 默认设置
  getDefaultSettings() {
    return {
      autoBackup: true,
      backupInterval: 10,
      compressionEnabled: true
    };
  }

  // 获取所有笔记 - 从数据库获取
  async getAllNotes() {
    try {
      const notes = await apiService.getAllNotes();
      return notes;
    } catch (error) {
      console.error('从数据库获取笔记失败:', error);
      // 如果API失败，回退到本地存储
      try {
        return JSON.parse(localStorage.getItem('notes') || '[]');
      } catch (fallbackError) {
        console.error('本地存储也失败:', fallbackError);
        return [];
      }
    }
  }

  // 提取并下载媒体文件
  async extractAndDownloadMediaFiles(notes) {
    const mediaFiles = [];
    const processedUrls = new Set();
    
    console.log('开始提取媒体文件，笔记数量:', notes.length);
    
    for (const note of notes) {
      if (!note.content) {
        console.log(`笔记 ${note.id} 没有内容，跳过`);
        continue;
      }
      
      console.log(`处理笔记 ${note.id}，内容长度:`, note.content.length);
      
      // 使用正则表达式匹配Markdown格式的图片链接 ![alt](url)
      const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
      let match;
      
      while ((match = imageRegex.exec(note.content)) !== null) {
        const url = match[1];
        console.log('发现图片链接:', url);
        
        // 处理多种格式的媒体文件URL
        let shouldProcess = false;
        let processedUrl = url;
        let localFilePath = '';
        
        // 1. 处理以/uploads/开头的URL
        if (url.startsWith('/uploads/')) {
          shouldProcess = true;
          // 构建本地文件路径
          localFilePath = `d:\\memeos\\server${url.replace(/\//g, '\\')}`;
        }
        // 2. 处理相对路径的uploads URL
        else if (url.startsWith('uploads/')) {
          shouldProcess = true;
          processedUrl = '/' + url;
          // 构建本地文件路径
          localFilePath = `d:\\memeos\\server\\uploads\\${url.split('/').pop()}`;
        }
        // 3. 处理完整URL但包含uploads的
        else if (url.includes('/uploads/')) {
          shouldProcess = true;
          // 从完整URL中提取文件路径
          try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            localFilePath = `d:\\memeos\\server${pathname.replace(/\//g, '\\')}`;
          } catch (e) {
            console.warn('无法解析URL:', url);
          }
        }
        // 4. 处理其他可能的图片格式（jpg, png, gif, webp等）
        else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|mp3|wav|avi|mov|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
          shouldProcess = true;
          // 如果不是完整URL，添加/uploads/前缀
          if (!url.startsWith('http') && !url.startsWith('/')) {
            processedUrl = '/uploads/' + url;
            localFilePath = `d:\\memeos\\server\\uploads\\${url}`;
          }
        }
        
        if (shouldProcess && !processedUrls.has(url)) {
          processedUrls.add(url);
          console.log('处理媒体文件:', processedUrl);
          console.log('本地文件路径:', localFilePath);
          
          try {
              // 首先尝试通过服务器API获取本地文件
              console.log('尝试通过服务器API获取文件:', processedUrl);
              
              // 构建服务器API URL
              const baseUrl = API_BASE_URL.replace('/api', '');
              const apiUrl = `${baseUrl}${processedUrl}`;
              console.log('服务器API URL:', apiUrl);
              
              const response = await fetch(apiUrl);
              if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const base64Content = btoa(
                  new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                
                // 从URL中提取文件名
                let filename;
                if (processedUrl.startsWith('http')) {
                  // 从完整URL中提取文件名
                  const urlObj = new URL(processedUrl);
                  filename = urlObj.pathname.split('/').pop();
                } else {
                  filename = processedUrl.split('/').pop();
                }
                
                const contentType = response.headers.get('content-type') || this.getContentType(filename);
                
                mediaFiles.push({
                  filename: filename,
                  url: processedUrl,
                  content: base64Content,
                  contentType: contentType,
                  size: arrayBuffer.byteLength
              });
              
              console.log(`已下载媒体文件: ${filename}, 大小: ${arrayBuffer.byteLength} bytes, 类型: ${contentType}`);
            } else {
                console.error(`下载媒体文件失败，HTTP状态: ${response.status}, URL: ${apiUrl}`);
              }
          } catch (error) {
            console.error(`下载媒体文件失败 ${processedUrl}:`, error);
          }
        } else {
          console.log('跳过链接:', url, '原因:', shouldProcess ? '已处理' : '不符合处理条件');
        }
      }
    }
    
    console.log('媒体文件提取完成，共找到', mediaFiles.length, '个媒体文件');
    return mediaFiles;
  }

  // 创建备份
  async createBackup(noteId = null, type = 'manual') {
    try {
      const settings = await this.getSettings();
      const allNotes = await this.getAllNotes();
      
      let notesToBackup = noteId 
        ? allNotes.filter(note => note.id === noteId)
        : allNotes;
      
      if (notesToBackup.length === 0) {
        throw new Error('没有找到需要备份的笔记');
      }

      // 提取媒体文件URL并下载文件内容
      console.log('开始提取媒体文件，笔记数量:', notesToBackup.length);
      const mediaFiles = await this.extractAndDownloadMediaFiles(notesToBackup);
      console.log('媒体文件提取完成，数量:', mediaFiles.length);
      
      // 记录媒体文件信息
      if (mediaFiles.length > 0) {
        console.log('媒体文件详情:');
        mediaFiles.forEach((file, index) => {
          console.log(`${index + 1}. ${file.filename} (${file.contentType}, ${file.size} bytes)`);
        });
      } else {
        console.log('未找到任何媒体文件');
      }

      const backupData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: type,
        version: '2.0',
        notes: notesToBackup.map(note => ({
          id: note.id,
          title: note.title || '',
          content: note.content,
          tags: note.tags || [],
          created_at: note.created_at,
          updated_at: note.updated_at,
          is_pinned: note.is_pinned || false,
          mood: note.mood,
          weather: note.weather,
          content_hash: this.generateContentHash(note) // 添加内容哈希
        })),
        mediaFiles: mediaFiles // 添加媒体文件数据
      };
      
      console.log('备份数据创建完成，包含', backupData.notes.length, '个笔记和', backupData.mediaFiles.length, '个媒体文件');

      // 生成数据哈希
      backupData.hash = generateHash(backupData.notes);

      // 数据不再压缩，直接存储
      let dataToStore = backupData;



      // 优先同步到服务器
      let finalBackupId = backupData.id;
      let serverSuccess = false;
      
      try {
        const serverResult = await apiService.createBackup(dataToStore);
        if (serverResult.success && serverResult.backupId) {
          // 服务器同步成功，使用服务器返回的ID
          finalBackupId = serverResult.backupId;
          dataToStore.id = serverResult.backupId;
          serverSuccess = true;
          console.log('备份已成功保存到服务器，ID:', finalBackupId);
        } else {
          console.warn('服务器返回失败响应:', serverResult);
        }
      } catch (serverError) {
        console.warn('同步备份到服务器失败:', serverError);
      }
      
      // 只有在服务器失败时才使用本地存储作为后备
      if (!serverSuccess) {
        console.warn('服务器不可用，使用本地存储作为后备');
        const allBackups = await this.getAllBackups();
        // 检查是否已存在相同ID的备份，避免重复
        const existingIndex = allBackups.findIndex(b => b.id === finalBackupId);
        if (existingIndex !== -1) {
          // 如果已存在，替换现有备份
          allBackups[existingIndex] = dataToStore;
        } else {
          // 如果不存在，添加新备份
          allBackups.unshift(dataToStore);
        }
        
        // 限制备份数量
        const maxBackups = settings.maxBackupsPerNote * (noteId ? 1 : allNotes.length);
        if (allBackups.length > maxBackups) {
          allBackups.splice(maxBackups);
        }
        
        console.log('保存备份到本地存储:', allBackups);
        localStorage.setItem(this.backupKey, JSON.stringify(allBackups));
      }

      // 创建历史记录
      await this.createHistoryRecord(notesToBackup, type, type);

      return {
        success: true,
        backupId: backupData.id,
        notesCount: notesToBackup.length
      };
    } catch (error) {
      console.error('创建备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取所有备份 - 优先服务器，减少localStorage依赖
  async getAllBackups() {
    try {
      // 优先从服务器获取备份
      try {
        const serverResponse = await apiService.getBackups();
        if (serverResponse.success && serverResponse.backups) {
          console.log('服务器备份数据:', serverResponse.backups);
          
          // 标准化服务器备份数据
          const allBackups = serverResponse.backups.map(serverBackup => ({
            ...serverBackup,
            id: serverBackup.backup_id || serverBackup.id, // 统一使用id字段
            timestamp: serverBackup.createdAt || serverBackup.timestamp || serverBackup.created_at,
            type: serverBackup.backupType || serverBackup.backup_type || serverBackup.type || 'manual', // 确保默认为manual
            notes: serverBackup.data?.notes || serverBackup.notes || [],
            tags: serverBackup.data?.tags || serverBackup.tags || [],
            content: serverBackup.data?.notes?.[0]?.content || serverBackup.content || '',
            mediaFiles: serverBackup.data?.mediaFiles || serverBackup.mediaFiles || serverBackup.media_files || [],
            created_at: serverBackup.createdAt || serverBackup.created_at || serverBackup.timestamp,
            backup_type: serverBackup.backupType || serverBackup.backup_type || serverBackup.type || 'manual' // 确保默认为manual
          }));
          
          // 按创建时间排序，最新的在前面
          allBackups.sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
          
          console.log('标准化后的服务器备份数据:', allBackups);
          return allBackups;
        }
      } catch (serverError) {
        console.warn('从服务器获取备份失败:', serverError);
      }
      
      // 只有在服务器完全不可用时才使用本地缓存作为后备
      console.warn('服务器不可用，使用本地缓存作为后备');
      const localBackups = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
      console.log('本地缓存备份数据:', localBackups);
      
      return localBackups;
    } catch (error) {
      console.error('获取备份失败:', error);
      return [];
    }
  }

  // 恢复备份
  async restoreBackup(backupId) {
    try {
      const settings = await this.getSettings();
      const allBackups = await this.getAllBackups();
      const backup = allBackups.find(b => b.id === backupId);
      
      if (!backup) {
        throw new Error('备份不存在');
      }

      let backupData = { ...backup };

      // 解压缩数据 - 只有当notes确实是压缩的字符串时才解压
      if (backupData.compressed && typeof backupData.notes === 'string') {
        try {
          backupData.notes = JSON.parse(decompressData(backupData.notes));
        } catch (decompressError) {
          console.warn('解压备份数据失败，可能已经是解压状态:', decompressError);
          // 如果解压失败，假设数据已经是解压状态
        }
      } else if (!Array.isArray(backupData.notes)) {
        // 如果notes不是数组，尝试从data字段获取
        backupData.notes = backupData.data?.notes || [];
      }

      // 验证数据完整性
      if (backupData.hash && !verifyData(backupData.notes, backupData.hash)) {
        throw new Error('备份数据完整性验证失败');
      }

      // 恢复媒体文件
      if (backupData.mediaFiles && backupData.mediaFiles.length > 0) {
        await this.restoreMediaFiles(backupData.mediaFiles);
      }

      // 恢复笔记到数据库
      const restoreResults = [];
      const existingNotes = await this.getAllNotes();
      
      for (const backupNote of backupData.notes) {
        try {
          // 生成备份笔记的哈希值用于重复检查
          const noteHash = this.generateContentHash(backupNote);
          
          // 检查是否存在相同内容的笔记（基于哈希值）
          const isDuplicate = existingNotes.some(existingNote => {
            const existingHash = this.generateContentHash(existingNote);
            return existingHash === noteHash;
          });
          
          if (isDuplicate) {
            console.log(`笔记内容已存在（哈希: ${noteHash.substring(0, 8)}...），跳过恢复`);
            restoreResults.push({ id: backupNote.id, action: 'skipped', success: true, reason: 'duplicate_content' });
            continue;
          }
          
          // 只恢复不重复的笔记
          await apiService.createNote(backupNote);
          restoreResults.push({ id: backupNote.id, action: 'created', success: true });
        } catch (noteError) {
          console.error(`恢复笔记 ${backupNote.id} 失败:`, noteError);
          restoreResults.push({ id: backupNote.id, action: 'failed', success: false, error: noteError.message });
        }
      }

      // 同时更新本地存储作为缓存
      try {
        const allNotes = await this.getAllNotes();
        
        backupData.notes.forEach(backupNote => {
          // 生成备份笔记的哈希值用于重复检查
          const noteHash = this.generateContentHash(backupNote);
          
          // 检查是否存在相同内容的笔记（基于哈希值）
          const isDuplicate = allNotes.some(existingNote => {
            const existingHash = this.generateContentHash(existingNote);
            return existingHash === noteHash;
          });
          
          // 只添加不重复的笔记到本地缓存
          if (!isDuplicate) {
            allNotes.push(backupNote);
          }
        });

        localStorage.setItem('notes', JSON.stringify(allNotes));
      } catch (localError) {
        console.warn('更新本地缓存失败:', localError);
      }

      // 尝试从服务器同步恢复
      try {
        await apiService.restoreBackup(backupId);
      } catch (serverError) {
        console.warn('从服务器恢复备份失败，仅本地恢复:', serverError);
      }

      // 创建历史记录
      await this.createHistoryRecord(backupData.notes, 'restore', 'manual');

      return {
        success: true,
        backupId: backupId,
        results: restoreResults,
        totalNotes: backupData.notes.length,
        successCount: restoreResults.filter(r => r.success).length,
        failureCount: restoreResults.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('恢复备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 强制同步服务器备份，清理本地孤立备份
  async syncWithServer() {
    try {
      // 获取本地备份
      const localBackups = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
      
      // 获取服务器备份
      try {
        const serverResponse = await apiService.getBackups();
        if (serverResponse.success && serverResponse.backups) {
          const serverBackupIds = new Set(serverResponse.backups.map(b => b.id));
          
          // 找出在本地但不在服务器上的备份ID（排除纯本地备份）
          const orphanedLocalBackups = localBackups.filter(localBackup => {
            const isServerBackup = localBackup.id.includes('backup_') && !localBackup.id.startsWith(Date.now().toString());
            return isServerBackup && !serverBackupIds.has(localBackup.id);
          });
          
          // 如果有孤立的本地备份，清理它们
          if (orphanedLocalBackups.length > 0) {
            console.log('同步清理孤立的本地备份:', orphanedLocalBackups.map(b => b.id));
            const cleanedBackups = localBackups.filter(localBackup => {
              const isServerBackup = localBackup.id.includes('backup_') && !localBackup.id.startsWith(Date.now().toString());
              return !isServerBackup || serverBackupIds.has(localBackup.id);
            });
            
            localStorage.setItem(this.backupKey, JSON.stringify(cleanedBackups));
            console.log('清理完成，保留备份数量:', cleanedBackups.length);
            
            return {
              success: true,
              cleanedCount: orphanedLocalBackups.length,
              remainingCount: cleanedBackups.length,
              message: `已清理 ${orphanedLocalBackups.length} 个孤立的本地备份`
            };
          } else {
            console.log('没有发现孤立的本地备份');
            return {
              success: true,
              cleanedCount: 0,
              remainingCount: localBackups.length,
              message: '没有发现孤立的本地备份'
            };
          }
        }
      } catch (serverError) {
        console.warn('从服务器获取备份失败，无法同步清理:', serverError);
        return {
          success: false,
          error: '无法连接到服务器'
        };
      }
    } catch (error) {
      console.error('同步服务器备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 删除备份 - 优先服务器，减少localStorage依赖
  async deleteBackup(backupId) {
    try {
      const allBackups = await this.getAllBackups();
      const backupToDelete = allBackups.find(b => b.id === backupId);
      
      if (!backupToDelete) {
        throw new Error('备份不存在');
      }
      
      // 优先删除服务器端的备份
      let serverSuccess = false;
      try {
        const response = await apiService.deleteBackup(backupId);
        if (response.success) {
          serverSuccess = true;
          console.log('备份已从服务器成功删除，ID:', backupId);
        } else {
          console.warn('服务器删除备份失败:', response.message || '未知错误');
        }
      } catch (serverError) {
        console.warn('服务器删除备份失败:', serverError);
      }
      
      // 只有在服务器失败时才删除本地存储
      if (!serverSuccess) {
        console.warn('服务器不可用，删除本地存储中的备份');
        const filteredBackups = allBackups.filter(b => b.id !== backupId);
        localStorage.setItem(this.backupKey, JSON.stringify(filteredBackups));
      }
      
      // 创建历史记录
      await this.createHistoryRecord(backupToDelete.notes || [], 'delete', 'manual');
      
      return { success: true };
    } catch (error) {
      console.error('删除备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 导出备份为ZIP文件（包含JSON格式）
  async exportBackup(backupId = null) {
    try {
      const settings = await this.getSettings();
      let exportData;

      if (backupId) {
        // 导出单个备份
        const allBackups = await this.getAllBackups();
        const backup = allBackups.find(b => b.id === backupId);
        if (!backup) {
          throw new Error('备份不存在');
        }
        exportData = [backup];
      } else {
        // 导出所有备份 - 创建全量备份（所有笔记合并为一个备份）
        const allBackups = await this.getAllBackups();
        const allNotes = [];
        const allMediaFiles = [];
        const processedMediaUrls = new Set();
        
        // 收集所有笔记和媒体文件
        for (const backup of allBackups) {
          if (backup.notes && backup.notes.length > 0) {
            // 去重笔记（根据ID）
            for (const note of backup.notes) {
              if (!allNotes.find(n => n.id === note.id)) {
                allNotes.push(note);
              }
            }
          }
          
          // 收集媒体文件（去重）
          if (backup.mediaFiles && backup.mediaFiles.length > 0) {
            for (const mediaFile of backup.mediaFiles) {
              if (!processedMediaUrls.has(mediaFile.url)) {
                processedMediaUrls.add(mediaFile.url);
                allMediaFiles.push(mediaFile);
              }
            }
          }
        }
        
        // 创建全量备份数据
        const fullBackup = {
          id: `full_backup_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'full_export',
          version: '2.0',
          notes: allNotes,
          mediaFiles: allMediaFiles,
          description: '全量备份导出',
          backupTime: new Date().toISOString(),
          notesCount: allNotes.length
        };
        
        exportData = [fullBackup];
        console.log(`创建全量备份，包含 ${allNotes.length} 个笔记和 ${allMediaFiles.length} 个媒体文件`);
      }

      // 解密和解压缩数据用于导出
      const processedData = exportData.map(backup => {
        let backupData = { ...backup };
        
        if (backupData.compressed) {
          backupData.notes = JSON.parse(decompressData(backupData.notes));
        }
        
        return backupData;
      });

      // 创建ZIP文件内容
      const zipContent = {};
      const timestamp = format(toZonedTime(new Date(), 'Asia/Shanghai'), 'yyyy-MM-dd-HH-mm-ss');
      
      // 添加媒体文件（在生成JSON之前处理，确保能访问到content字段）
      const mediaFilesDir = `media_files_${timestamp}/`;
      let totalMediaFiles = 0;
      const mediaFileStructure = {};
      
      console.log('开始处理媒体文件，备份数量:', processedData.length);
      
      for (const backup of processedData) {
        console.log(`处理备份 ${backup.id}，媒体文件数量:`, backup.mediaFiles?.length || 0);
        
        if (backup.mediaFiles && backup.mediaFiles.length > 0) {
          for (const mediaFile of backup.mediaFiles) {
            console.log(`处理媒体文件: ${mediaFile.filename}, 有content字段: ${!!mediaFile.content}`);
            
            try {
              // 检查媒体文件是否有content字段
              if (!mediaFile.content) {
                console.warn(`媒体文件 ${mediaFile.filename} 没有content字段，跳过`);
                continue;
              }
              
              // 检查content字段是否为有效的base64字符串
              if (typeof mediaFile.content !== 'string' || mediaFile.content.length === 0) {
                console.warn(`媒体文件 ${mediaFile.filename} 的content字段无效，跳过`);
                continue;
              }
              
              console.log(`媒体文件 ${mediaFile.filename} content长度: ${mediaFile.content.length}`);
              
              // 将base64内容转换回二进制数据
              const binaryContent = atob(mediaFile.content);
              const bytes = new Uint8Array(binaryContent.length);
              for (let i = 0; i < binaryContent.length; i++) {
                bytes[i] = binaryContent.charCodeAt(i);
              }
              
              console.log(`媒体文件 ${mediaFile.filename} 转换为二进制数据，大小: ${bytes.length} bytes`);
              
              // 创建Blob对象
              const blob = new Blob([bytes], { type: mediaFile.contentType });
              
              // 添加到ZIP文件中的媒体文件夹
              const mediaFilePath = mediaFilesDir + mediaFile.filename;
              zipContent[mediaFilePath] = blob;
              totalMediaFiles++;
              
              // 记录媒体文件结构信息
              mediaFileStructure[mediaFile.filename] = {
                originalUrl: mediaFile.url,
                contentType: mediaFile.contentType,
                size: mediaFile.size,
                filePath: mediaFilePath
              };
              
              console.log(`已添加媒体文件到导出: ${mediaFile.filename} (${mediaFilePath})`);
            } catch (error) {
              console.error(`处理媒体文件失败 ${mediaFile.filename}:`, error);
            }
          }
        }
      }
      
      console.log('媒体文件处理完成，总共添加:', totalMediaFiles, '个文件');
      
      // 如果有媒体文件，创建媒体文件清单
      if (totalMediaFiles > 0) {
        zipContent[mediaFilesDir + 'file_list.json'] = JSON.stringify(mediaFileStructure, null, 2);
      }
      
      // 添加JSON格式（移除媒体文件的content字段，避免JSON中出现二进制乱码）
      const jsonData = processedData.map(backup => {
        let backupCopy = { ...backup };
        if (backupCopy.mediaFiles && backupCopy.mediaFiles.length > 0) {
          backupCopy.mediaFiles = backupCopy.mediaFiles.map(mediaFile => {
            const { content, ...mediaFileInfo } = mediaFile;
            return mediaFileInfo;
          });
        }
        return backupCopy;
      });
      zipContent[`灰灰笔记备份_${timestamp}.json`] = JSON.stringify(jsonData, null, 2);
      
      // 添加README文件
      zipContent['README.txt'] = `灰灰笔记备份导出
========================================

导出时间: ${format(toZonedTime(new Date(), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
备份数量: ${processedData.length}
媒体文件数量: ${totalMediaFiles}
包含格式: JSON

${totalMediaFiles > 0 ? `媒体文件目录: ${mediaFilesDir}
----------------------------------------
` : ''}
使用说明:
========================================

1. 主要文件:
   - 灰灰笔记备份_${timestamp}.json: 包含所有笔记数据的JSON文件
${totalMediaFiles > 0 ? `   - ${mediaFilesDir}: 媒体文件文件夹，包含所有图片等附件
   - ${mediaFilesDir}file_list.json: 媒体文件清单，包含文件信息映射
` : ''}

2. 恢复步骤:
   a. 使用JSON文件进行笔记数据恢复
${totalMediaFiles > 0 ? `   b. 媒体文件会自动从 ${mediaFilesDir} 目录中恢复
   c. 恢复时会跳过已存在的笔记，只恢复新的笔记
` : ''}

3. 媒体文件结构:
${totalMediaFiles > 0 ? `   - 所有媒体文件都存储在 ${mediaFilesDir} 文件夹中
   - 文件保持原始格式和名称
   - file_list.json 包含文件映射信息
   - 支持的格式: 图片、音频、视频等媒体文件
` : '   - 本次备份不包含媒体文件\n'}

4. 注意事项:
   - 备份文件采用ZIP格式压缩
   - 恢复时需要网络连接以重新上传媒体文件
   - 相同的笔记在恢复时会被跳过，避免重复
   - 媒体文件以原始二进制格式存储，不包含在JSON中

此备份由增强备份管理器生成
生成时间: ${new Date().toLocaleString('zh-CN')}
`;
      
      // 创建并下载ZIP文件
      await this.createAndDownloadZip(zipContent, `灰灰笔记备份_${timestamp}.zip`);
      
      // 创建历史记录
      const allNotesInExport = processedData.flatMap(backup => backup.notes || []);
      const exportType = backupId ? 'export_single' : 'export_all';
      await this.createHistoryRecord(allNotesInExport, exportType, 'manual');
      
      return { success: true };
    } catch (error) {
      console.error('导出备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 创建并下载ZIP文件
  async createAndDownloadZip(filesContent, zipFileName) {
    try {
      // 使用JSZip库创建ZIP文件
      const zip = new JSZip();
      
      // 添加文件到ZIP
      for (const [fileName, content] of Object.entries(filesContent)) {
        zip.file(fileName, content);
      }
      
      // 生成ZIP文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 下载ZIP文件
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('创建ZIP文件失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 导入ZIP备份文件
  async importZipBackup(zipFile) {
    try {
      console.log('开始导入ZIP备份文件:', zipFile.name);
      
      // 1. 读取ZIP文件
      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      
      // 2. 查找JSON备份文件
      const jsonFiles = Object.keys(zipData.files).filter(fileName => 
        fileName.endsWith('.json') && !fileName.includes('file_list.json')
      );
      
      if (jsonFiles.length === 0) {
        throw new Error('ZIP文件中未找到有效的JSON备份文件');
      }
      
      console.log('找到JSON文件:', jsonFiles);
      
      // 3. 读取JSON数据
      const jsonFile = jsonFiles[0]; // 使用第一个找到的JSON文件
      const jsonContent = await zipData.file(jsonFile).async('text');
      let backupData;
      
      try {
        backupData = JSON.parse(jsonContent);
      } catch (error) {
        throw new Error('JSON解析失败: ' + error.message);
      }
      
      // 4. 查找媒体文件目录
      const mediaFiles = [];
      const mediaDirs = Object.keys(zipData.files).filter(fileName => 
        fileName.includes('media_files_') && fileName.endsWith('/')
      );
      
      console.log('找到媒体文件目录:', mediaDirs);
      
      // 5. 处理媒体文件
      if (mediaDirs.length > 0) {
        const mediaDir = mediaDirs[0];
        const mediaFileNames = Object.keys(zipData.files).filter(fileName => 
          fileName.startsWith(mediaDir) && !fileName.endsWith('/') && !fileName.endsWith('file_list.json')
        );
        
        console.log('找到媒体文件:', mediaFileNames);
        
        // 尝试读取媒体文件清单
        let fileList = {};
        try {
          const fileListPath = mediaDir + 'file_list.json';
          if (zipData.files[fileListPath]) {
            const fileListContent = await zipData.file(fileListPath).async('text');
            fileList = JSON.parse(fileListContent);
          }
        } catch (error) {
          console.warn('读取媒体文件清单失败:', error);
        }
        
        // 处理每个媒体文件
        for (const mediaFileName of mediaFileNames) {
          try {
            const mediaFileData = await zipData.file(mediaFileName).async('arraybuffer');
            const base64Content = btoa(
              new Uint8Array(mediaFileData).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            const filename = mediaFileName.split('/').pop();
            const fileInfo = fileList[filename] || {};
            
            mediaFiles.push({
              filename: filename,
              url: fileInfo.originalUrl || `/uploads/${filename}`,
              content: base64Content,
              contentType: fileInfo.contentType || this.getContentType(filename),
              size: mediaFileData.byteLength
            });
            
            console.log(`已处理媒体文件: ${filename}, 大小: ${mediaFileData.byteLength} bytes`);
          } catch (error) {
            console.error(`处理媒体文件失败 ${mediaFileName}:`, error);
          }
        }
      }
      
      // 6. 将媒体文件添加到备份数据中
      const processedBackupData = Array.isArray(backupData) ? backupData : [backupData];
      
      for (const backup of processedBackupData) {
        if (mediaFiles.length > 0) {
          backup.mediaFiles = mediaFiles;
        }
      }
      
      console.log(`ZIP导入处理完成，包含 ${processedBackupData.length} 个备份和 ${mediaFiles.length} 个媒体文件`);
      
      // 7. 使用现有的导入逻辑处理数据
      const importResults = await this.processImportData(processedBackupData);
      
      // 8. 统计导入结果
      let importedNotesCount = 0;
      let skippedCount = 0;
      
      importResults.forEach(result => {
        if (result.results) {
          const createdCount = result.results.filter(r => r.success && r.action === 'created').length;
          const skippedCountResult = result.results.filter(r => r.success && r.action === 'skipped').length;
          importedNotesCount += createdCount;
          skippedCount += skippedCountResult;
        }
      });
      
      return {
        success: true,
        importedNotesCount: importedNotesCount,
        skippedCount: skippedCount,
        details: importResults
      };
      
    } catch (error) {
      console.error('导入ZIP备份失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 根据文件名获取内容类型
  getContentType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }



  // 创建笔记编辑历史记录（针对单个笔记）
  async createNoteEditHistory(noteId, content, tags, action = 'edit') {
    try {
      const noteHistoryKey = `note_history_${noteId}`;
      const history = JSON.parse(localStorage.getItem(noteHistoryKey) || '[]');
      
      const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: action, // 'edit', 'create', 'delete'
        content: content,
        tags: tags || []
      };
      
      history.unshift(record);
      
      // 清理30天前的历史记录
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      const filteredHistory = history.filter(record => 
        new Date(record.timestamp) > cutoffDate
      );
      
      localStorage.setItem(noteHistoryKey, JSON.stringify(filteredHistory));
      
      return { success: true };
    } catch (error) {
      console.error('创建笔记编辑历史记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取单个笔记的历史记录
  getNoteHistory(noteId) {
    try {
      const noteHistoryKey = `note_history_${noteId}`;
      const history = JSON.parse(localStorage.getItem(noteHistoryKey) || '[]');
      return history;
    } catch (error) {
      console.error('获取笔记历史记录失败:', error);
      return [];
    }
  }

  // 创建历史记录（在createBackup方法中调用）
  async createHistoryRecord(notes, action, type = null) {
    try {
      const settings = await this.getSettings();
      const history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
      
      // 根据操作类型生成详细描述
      let description = '';
      switch (action) {
        case 'backup':
          description = `创建完整备份，备份了 ${notes.length} 条笔记`;
          break;
        case 'restore':
          description = `恢复备份，恢复了 ${notes.length} 条笔记`;
          break;
        case 'delete':
          description = `删除备份，删除了 ${notes.length} 条笔记的备份数据`;
          break;
        case 'settings':
          description = '保存备份设置';
          break;
        case 'reset_settings':
          description = '重置设置到默认值';
          break;
        case 'clear_history':
          description = '清除所有历史记录';
          break;
        case 'export_single':
          description = `导出单个备份，包含 ${notes.length} 条笔记`;
          break;
        case 'export_all':
          description = `导出所有备份，包含 ${notes.length} 条笔记`;
          break;
        case 'enable_auto_backup':
          description = '启用自动备份功能';
          break;
        default:
          description = `${action} 操作，涉及 ${notes.length} 条笔记`;
      }
      
      // 添加类型信息
      if (type === 'auto') {
        description += '（自动备份）';
      } else if (type === 'manual') {
        description += '（手动操作）';
      }
      
      const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: action,
        type: type,
        description: description,
        notesCount: notes.length,
        notes: notes.map(note => ({
          id: note.id,
          title: note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : '无标题',
          tags: note.tags || [],
          created_at: note.created_at,
          updated_at: note.updated_at
        }))
      };
      
      history.unshift(record);
      
      // 清理过期历史记录（保留指定天数）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.historyRetentionDays);
      
      const filteredHistory = history.filter(record => 
        new Date(record.timestamp) > cutoffDate
      );
      
      localStorage.setItem(this.historyKey, JSON.stringify(filteredHistory));
      
      return { success: true };
    } catch (error) {
      console.error('创建历史记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 恢复媒体文件
  async restoreMediaFiles(mediaFiles) {
    const restoredFiles = [];
    
    for (const mediaFile of mediaFiles) {
      try {
        console.log(`处理媒体文件: ${mediaFile.filename}`);
        
        // 首先检查服务器上是否已存在同名文件
        const checkResponse = await fetch(`${API_BASE_URL}/upload/check?filename=${encodeURIComponent(mediaFile.filename)}`);
        
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          if (checkResult.exists) {
            console.log(`文件 ${mediaFile.filename} 已存在，跳过上传`);
            restoredFiles.push({
              filename: mediaFile.filename,
              originalUrl: mediaFile.url,
              newUrl: checkResult.url, // 使用服务器返回的现有文件URL
              success: true,
              skipped: true
            });
            continue;
          }
        }
        
        // 将base64内容转换回二进制数据
        const binaryContent = atob(mediaFile.content);
        const bytes = new Uint8Array(binaryContent.length);
        for (let i = 0; i < binaryContent.length; i++) {
          bytes[i] = binaryContent.charCodeAt(i);
        }
        
        // 创建File对象，保持原始文件名
        const file = new File([bytes], mediaFile.filename, { 
          type: mediaFile.contentType 
        });
        
        console.log(`上传文件: ${mediaFile.filename} (${mediaFile.contentType}, ${bytes.length} bytes)`);
        
        // 重新上传文件到服务器
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: this.createFormData(file)
        });
        
        if (response.ok) {
          const result = await response.json();
          restoredFiles.push({
            filename: mediaFile.filename,
            originalUrl: mediaFile.url,
            newUrl: result.url,
            success: true,
            skipped: false
          });
          console.log(`媒体文件恢复成功: ${mediaFile.filename} -> ${result.url}`);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error(`恢复媒体文件失败 ${mediaFile.filename}:`, error);
        restoredFiles.push({
          filename: mediaFile.filename,
          success: false,
          error: error.message
        });
      }
    }
    
    return restoredFiles;
  }
  
  // 创建FormData对象
  createFormData(file) {
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  }

  // 更新内容中的媒体文件路径
  updateImagePathsInContent(content, mediaFileMappings) {
    let updatedContent = content;
    
    // 1. 匹配markdown图片语法 ![alt text](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    updatedContent = updatedContent.replace(imageRegex, (match, altText, imageUrl) => {
      // 检查是否需要替换这个图片URL
      if (mediaFileMappings[imageUrl]) {
        // 替换为新的URL
        return `![${altText}](${mediaFileMappings[imageUrl]})`;
      }
      // 如果没有找到映射，保持原样
      return match;
    });
    
    // 2. 匹配markdown链接语法 [text](url)
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    
    updatedContent = updatedContent.replace(linkRegex, (match, linkText, linkUrl) => {
      // 检查是否需要替换这个链接URL（排除图片链接，因为已经处理过了）
      if (mediaFileMappings[linkUrl] && !match.startsWith('![')) {
        // 替换为新的URL
        return `[${linkText}](${mediaFileMappings[linkUrl]})`;
      }
      // 如果没有找到映射，保持原样
      return match;
    });
    
    // 3. 匹配直接的URL（用于处理没有markdown包装的媒体文件链接）
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    
    updatedContent = updatedContent.replace(urlRegex, (match, url) => {
      // 检查是否需要替换这个URL
      if (mediaFileMappings[url]) {
        // 替换为新的URL
        return mediaFileMappings[url];
      }
      // 如果没有找到映射，保持原样
      return match;
    });
    
    return updatedContent;
  }

  // 创建系统历史记录（用于备份和快照操作）
  async createSystemHistoryRecord(notes, action) {
    try {
      const settings = await this.getSettings();
      const history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
      
      const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: action, // 'backup', 'restore', 'snapshot_create', 'snapshot_restore'
        notes: notes.map(note => ({
          id: note.id,
          title: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
          tags: note.tags || []
        }))
      };
      
      history.unshift(record);
      
      // 清理过期历史记录（保留指定天数）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.historyRetentionDays);
      
      const filteredHistory = history.filter(record => 
        new Date(record.timestamp) > cutoffDate
      );
      
      localStorage.setItem(this.historyKey, JSON.stringify(filteredHistory));
      
      return { success: true };
    } catch (error) {
      console.error('创建系统历史记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取历史记录
  getHistory(noteId = null) {
    try {
      const history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
      
      if (noteId) {
        // 返回特定笔记的历史记录
        return history.filter(record => 
          record.notes.some(note => note.id === noteId)
        );
      }
      
      return history;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  }

  // 获取所有笔记的系统历史记录
  getSystemHistory() {
    try {
      const history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
      return history;
    } catch (error) {
      console.error('获取系统历史记录失败:', error);
      return [];
    }
  }

  // 获取所有笔记的历史记录摘要（用于快照）
  async getAllNotesHistorySummary() {
    try {
      const allNotes = await this.getAllNotes();
      const historySummary = {};
      
      for (const note of allNotes) {
        const noteHistory = this.getNoteHistory(note.id);
        historySummary[note.id] = {
          noteId: note.id,
          noteTitle: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
          historyCount: noteHistory.length,
          latestEdit: noteHistory.length > 0 ? noteHistory[0].timestamp : note.updated_at,
          history: noteHistory.slice(0, 10) // 只保留最近10条历史记录用于快照
        };
      }
      
      return historySummary;
    } catch (error) {
      console.error('获取所有笔记历史记录摘要失败:', error);
      return {};
    }
  }

  // 自动备份检查
  async checkAutoBackup() {
    try {
      const settings = await this.getSettings();
      
      if (!settings.autoBackup) {
        return { success: true, message: '自动备份已禁用' };
      }
      
      const lastBackupTime = localStorage.getItem('lastBackupTime');
      const now = new Date();
      
      if (lastBackupTime) {
        const lastBackup = new Date(lastBackupTime);
        const timeDiff = now - lastBackup;
        const intervalMs = settings.backupInterval * 60 * 1000;
        
        if (timeDiff < intervalMs) {
          return { success: true, message: '还未到下次备份时间' };
        }
      }
      
      // 执行自动备份
      const result = await this.createBackup(null, 'auto');
      
      if (result.success) {
        localStorage.setItem('lastBackupTime', now.toISOString());
        
        // 创建启用自动备份的历史记录
        await this.createHistoryRecord([], 'enable_auto_backup', 'auto');
        
        return { success: true, message: `自动备份完成，备份了 ${result.notesCount} 条笔记` };
      } else {
        return { success: false, message: `自动备份失败: ${result.error}` };
      }
    } catch (error) {
      console.error('自动备份检查失败:', error);
      return { success: false, error: error.message };
    }
  }













  async getBackupStats() {
    try {
      const backups = await this.getAllBackups();
      const history = this.getHistory();
      
      // 计算所有备份中的唯一笔记数量（处理增量备份）
      let uniqueNotes = new Set();
      
      // 遍历所有备份，收集唯一的笔记ID
      backups.forEach(backup => {
        if (backup.notes) {
          // 处理压缩的备份数据
          let notes = backup.notes;
          if (backup.compressed && typeof notes === 'string') {
            try {
              notes = JSON.parse(decompressData(notes));
            } catch (e) {
              console.warn('解压缩备份数据失败:', e);
              return;
            }
          }
          
          // 添加笔记ID到集合中
          if (Array.isArray(notes)) {
            notes.forEach(note => {
              if (note.id) {
                uniqueNotes.add(note.id);
              }
            });
          }
        }
      });
      
      const stats = {
        totalBackups: backups.length,
        totalHistory: history.length,
        totalNotes: uniqueNotes.size, // 使用唯一笔记数量
        lastBackupTime: backups.length > 0 ? backups[0].timestamp : null,
        backupTypes: {
          manual: backups.filter(b => b.type === 'manual').length,
          auto: backups.filter(b => b.type === 'auto').length,
          restore: history.filter(h => h.action === 'restore').length
        },
        storageSize: new Blob([JSON.stringify(backups)]).size
      };
      
      return { success: true, stats };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 清除历史记录
  async clearHistory() {
    try {
      localStorage.removeItem(this.historyKey);
      
      // 创建历史记录
      await this.createHistoryRecord([], 'clear_history', 'manual');
      
      return { success: true, message: '历史记录已清除' };
    } catch (error) {
      console.error('清除历史记录失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 重置所有设置
  async resetSettings() {
    try {
      const defaultSettings = this.getDefaultSettings();
      localStorage.setItem(this.settingsKey, JSON.stringify(defaultSettings));
      
      // 创建历史记录
      await this.createHistoryRecord([], 'reset_settings', 'manual');
      
      return { success: true, message: '设置已重置' };
    } catch (error) {
      console.error('重置设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 导入所有备份(支持JSON和ZIP格式)
  async importBackups(files) {
    try {
      // 处理单个文件或文件数组
      let fileArray;
      if (files instanceof File) {
        fileArray = [files];
      } else if (Array.isArray(files)) {
        fileArray = files;
      } else {
        throw new Error('请选择有效的备份文件');
      }

      if (fileArray.length === 0) {
        throw new Error('请选择有效的备份文件');
      }

      const allResults = [];
      let totalImportedNotes = 0;
      let totalSkippedNotes = 0;

      // 处理每个文件
      for (const file of fileArray) {
        // 1. 检查文件格式合规性
        if (!(file instanceof File)) {
          console.warn('跳过无效文件:', file);
          continue;
        }

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json') && !fileName.endsWith('.zip')) {
          console.warn('跳过不支持的文件格式:', fileName);
          continue;
        }

        try {
          // 如果是ZIP文件，先解压处理
          if (fileName.endsWith('.zip')) {
            const zipResult = await this.importZipBackup(file);
            if (zipResult.success) {
              allResults.push(...(zipResult.details || []));
              totalImportedNotes += zipResult.importedNotesCount || 0;
              totalSkippedNotes += zipResult.skippedCount || 0;
            }
            continue;
          }

          // 2. 读取文件内容
          console.log('开始读取文件:', file.name, '文件大小:', file.size, '字节');
          let fileContent;
          try {
            fileContent = await this.readFileAsText(file);
            console.log('文件读取成功，内容长度:', fileContent.length, '字符');
            console.log('文件内容前100个字符:', fileContent.substring(0, 100));
          } catch (error) {
            console.error('读取文件失败:', file.name, error);
            continue;
          }

          // 3. 检查字符格式合规性
          if (!this.isValidJSON(fileContent)) {
            console.error('JSON格式不正确:', file.name);
            continue;
          }

          // 4. 解析JSON数据
          console.log('开始解析JSON数据...');
          let backupData;
          try {
            backupData = JSON.parse(fileContent);
            console.log('JSON解析成功，数据类型:', typeof backupData, '是否为数组:', Array.isArray(backupData));
            if (Array.isArray(backupData)) {
              console.log('数组长度:', backupData.length);
            } else if (backupData && backupData.notes) {
              console.log('笔记数量:', backupData.notes.length);
            }
          } catch (error) {
            console.error('JSON解析失败:', file.name, error);
            continue;
          }

          // 5. 验证数据结构
          console.log('开始验证备份数据结构...');
          const validationResult = this.validateBackupData(backupData);
          console.log('验证结果:', validationResult);
          if (!validationResult.valid) {
            console.error('数据结构验证失败:', file.name, validationResult.error);
            continue;
          }
          console.log('数据结构验证通过');

          // 6. 处理导入数据
          const importResults = await this.processImportData(backupData);
          allResults.push(...importResults);
          
          // 统计导入的笔记数量
          importResults.forEach(result => {
            console.log('处理导入结果:', result);
            console.log('结果详情:', {
              backupId: result.backupId,
              success: result.success,
              hasResults: !!result.results,
              resultsLength: result.results ? result.results.length : 0,
              results: result.results
            });
            
            if (result.results) {
              const createdCount = result.results.filter(r => r.success && r.action === 'created').length;
              const skippedCount = result.results.filter(r => r.success && r.action === 'skipped').length;
              const failedCount = result.results.filter(r => !r.success).length;
              console.log(`创建笔记数: ${createdCount}, 跳过笔记数: ${skippedCount}, 失败笔记数: ${failedCount}`);
              console.log('所有结果详情:', result.results);
              totalImportedNotes += createdCount;
              totalSkippedNotes += skippedCount;
            } else {
              console.log('结果中没有results字段');
            }
          });
          console.log(`当前总计 - 导入: ${totalImportedNotes}, 跳过: ${totalSkippedNotes}`);

        } catch (error) {
          console.error('处理文件失败:', file.name, error);
        }
      }

      console.log(`最终统计 - 导入: ${totalImportedNotes}, 跳过: ${totalSkippedNotes}`);
      
      // 检查是否有任何处理结果
      if (allResults.length === 0) {
        console.log('没有成功处理任何备份文件');
        throw new Error('备份文件格式不正确或数据验证失败，请检查备份文件是否完整');
      }
      
      // 检查是否有失败的结果
      const failedResults = allResults.filter(r => !r.success);
      if (failedResults.length === allResults.length) {
        // 所有结果都失败了
        const errorMessages = failedResults.map(r => r.error).join('; ');
        throw new Error(`导入失败: ${errorMessages}`);
      }
      
      // 如果没有导入任何新笔记，但有一些跳过的笔记，这是正常情况
      if (totalImportedNotes === 0) {
        if (totalSkippedNotes > 0) {
          console.log('所有笔记都已存在，跳过了重复笔记');
        } else {
          // 既没有导入也没有跳过，但有一些成功的结果（可能是空备份）
          console.log('没有导入任何笔记，但备份文件处理成功');
        }
      }

      // 7. 创建历史记录
      const allImportedNotes = allResults.flatMap(result => result.notes || []);
      await this.createHistoryRecord(allImportedNotes, 'import', 'manual');

      return {
        success: true,
        message: `成功导入 ${allResults.length} 个备份`,
        importedNotesCount: totalImportedNotes,
        skippedCount: totalSkippedNotes,
        details: allResults
      };
    } catch (error) {
      console.error('导入备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 读取文件为文本
  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  // 检查JSON格式合规性
  isValidJSON(jsonString) {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 验证备份数据结构
  validateBackupData(data) {
    // 如果是数组，验证每个备份项
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { valid: false, error: '备份数据为空' };
      }

      for (let i = 0; i < data.length; i++) {
        const backup = data[i];
        const result = this.validateSingleBackup(backup);
        if (!result.valid) {
          return { valid: false, error: `第 ${i + 1} 个备份验证失败: ${result.error}` };
        }
      }
      return { valid: true };
    }
    // 如果是单个对象，验证单个备份
    else if (typeof data === 'object' && data !== null) {
      return this.validateSingleBackup(data);
    }
    else {
      return { valid: false, error: '数据格式不正确，应该是对象或数组' };
    }
  }

  // 验证单个备份
  validateSingleBackup(backup) {
    // 检查必需字段
    const requiredFields = ['id', 'timestamp', 'notes'];
    for (const field of requiredFields) {
      if (!backup[field]) {
        return { valid: false, error: `缺少必需字段: ${field}` };
      }
    }

    // 检查notes字段
    if (!Array.isArray(backup.notes)) {
      return { valid: false, error: 'notes字段必须是数组' };
    }

    // 检查每个笔记的结构
    for (let i = 0; i < backup.notes.length; i++) {
      const note = backup.notes[i];
      if (!note.id || !note.content) {
        return { valid: false, error: `第 ${i + 1} 个笔记缺少id或content字段` };
      }
    }

    // 检查时间戳格式
    try {
      new Date(backup.timestamp);
    } catch (error) {
      return { valid: false, error: 'timestamp格式不正确' };
    }

    // 检查ID格式
    if (typeof backup.id !== 'string' || backup.id.trim() === '') {
      return { valid: false, error: 'id必须是有效的字符串' };
    }

    return { valid: true };
  }

  // 处理导入数据
  async processImportData(backupData) {
    const results = [];
    const backups = Array.isArray(backupData) ? backupData : [backupData];
    console.log('开始处理导入数据，备份数量:', backups.length);
    
    // 获取现有笔记
    let existingNotes = [];
    let existingNoteIds = new Set();
    try {
      existingNotes = await this.getAllNotes();
      existingNoteIds = new Set(existingNotes.map(note => note.id));
      console.log('获取现有笔记成功，数量:', existingNotes.length);
    } catch (error) {
      console.error('获取现有笔记失败:', error);
      // 如果获取现有笔记失败，继续执行但记录错误
      existingNotes = [];
      existingNoteIds = new Set();
    }

    for (const backup of backups) {
      try {
        const result = await this.importSingleBackup(backup, existingNoteIds);
        results.push(result);
      } catch (error) {
        console.error('导入单个备份失败:', error);
        results.push({
          backupId: backup.id,
          success: false,
          error: error.message,
          notes: [],
          results: []
        });
      }
    }

    return results;
  }

  // 计算文件哈希值
  async calculateFileHash(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  // 检查哈希值是否已存在
  checkHashExists(hash, existingBackups) {
    return existingBackups.some(backup => backup.fileHash === hash);
  }

  // 导入备份到列表（仅添加备份信息，不恢复笔记）
  async importBackupToList(files) {
    try {
      // 处理单个文件或文件数组
      let fileArray;
      if (files instanceof File) {
        fileArray = [files];
      } else if (Array.isArray(files)) {
        fileArray = files;
      } else {
        throw new Error('请选择有效的备份文件');
      }

      if (fileArray.length === 0) {
        throw new Error('请选择有效的备份文件');
      }

      const importedBackups = [];
      const existingBackups = this.getStoredBackups();
      const duplicateFiles = [];

      // 处理每个文件
      for (const file of fileArray) {
        // 1. 检查文件格式合规性
        if (!(file instanceof File)) {
          console.warn('跳过无效文件:', file);
          continue;
        }

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json') && !fileName.endsWith('.zip')) {
          console.warn('跳过不支持的文件格式:', fileName);
          continue;
        }

        try {
          // 计算文件哈希值
          console.log('计算文件哈希值:', file.name);
          let fileHash;
          try {
            fileHash = await this.calculateFileHash(file);
            console.log('文件哈希值:', fileHash);
          } catch (error) {
            console.error('计算哈希值失败:', file.name, error);
            continue;
          }

          // 检查哈希值是否已存在
          if (this.checkHashExists(fileHash, existingBackups)) {
            console.warn('文件已存在，跳过:', file.name);
            duplicateFiles.push({
              fileName: file.name,
              reason: '文件内容已存在'
            });
            continue;
          }

          // 如果是ZIP文件，先解压处理
          if (fileName.endsWith('.zip')) {
            // 对于ZIP文件，我们只提取基本信息
            const zipInfo = {
              id: this.generateBackupId(),
              name: file.name.replace('.zip', ''),
              timestamp: new Date().toISOString(),
              fileName: file.name,
              fileSize: file.size,
              format: 'zip',
              notesCount: 0, // ZIP文件需要解压才能知道确切数量
              isImported: true,
              importedAt: new Date().toISOString(),
              fileHash: fileHash
            };
            importedBackups.push(zipInfo);
            continue;
          }

          // 2. 读取文件内容
          console.log('开始读取文件:', file.name, '文件大小:', file.size, '字节');
          let fileContent;
          try {
            fileContent = await this.readFileAsText(file);
            console.log('文件读取成功，内容长度:', fileContent.length, '字符');
          } catch (error) {
            console.error('读取文件失败:', file.name, error);
            continue;
          }

          // 3. 检查字符格式合规性
          if (!this.isValidJSON(fileContent)) {
            console.error('JSON格式不正确:', file.name);
            continue;
          }

          // 4. 解析JSON数据
          console.log('开始解析JSON数据...');
          let backupData;
          try {
            backupData = JSON.parse(fileContent);
            console.log('JSON解析成功，数据类型:', typeof backupData);
          } catch (error) {
            console.error('JSON解析失败:', file.name, error);
            continue;
          }

          // 5. 验证数据结构（简化版）
          console.log('开始验证备份数据结构...');
          const validationResult = this.validateBackupDataBasic(backupData);
          console.log('验证结果:', validationResult);
          if (!validationResult.valid) {
            console.error('数据结构验证失败:', file.name, validationResult.error);
            continue;
          }
          console.log('数据结构验证通过');

          // 6. 创建备份信息对象
          const backups = Array.isArray(backupData) ? backupData : [backupData];
          for (const backup of backups) {
            const backupInfo = {
              id: backup.id || this.generateBackupId(),
              name: backup.name || `备份_${new Date().toLocaleDateString()}`,
              timestamp: backup.timestamp || new Date().toISOString(),
              fileName: file.name,
              fileSize: file.size,
              format: 'json',
              notesCount: backup.notes ? backup.notes.length : 0,
              isImported: true,
              importedAt: new Date().toISOString(),
              description: backup.description || '',
              tags: backup.tags || [],
              fileHash: fileHash
            };
            importedBackups.push(backupInfo);
          }

        } catch (error) {
          console.error('处理文件失败:', file.name, error);
        }
      }

      if (importedBackups.length === 0) {
        if (duplicateFiles.length > 0) {
          throw new Error(`所有文件都已存在，跳过了 ${duplicateFiles.length} 个重复文件`);
        } else {
          throw new Error('没有成功导入任何备份文件，请检查文件格式');
        }
      }

      // 7. 保存备份信息到本地存储
      try {
        const updatedBackups = [...existingBackups, ...importedBackups];
        this.saveStoredBackups(updatedBackups);
        console.log('备份信息已保存到本地存储');
      } catch (error) {
        console.error('保存备份信息失败:', error);
        throw new Error('保存备份信息失败: ' + error.message);
      }

      return {
        success: true,
        message: `成功导入 ${importedBackups.length} 个备份到列表${duplicateFiles.length > 0 ? `，跳过了 ${duplicateFiles.length} 个重复文件` : ''}`,
        importedBackupsCount: importedBackups.length,
        duplicateFilesCount: duplicateFiles.length,
        notesCount: importedBackups.reduce((total, backup) => total + backup.notesCount, 0),
        details: importedBackups,
        duplicates: duplicateFiles
      };
    } catch (error) {
      console.error('导入备份到列表失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 简化版备份数据验证（仅用于导入列表）
  validateBackupDataBasic(data) {
    // 如果是数组，验证每个备份项
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { valid: false, error: '备份数据为空' };
      }
      return { valid: true };
    }
    // 如果是单个对象，验证单个备份
    else if (typeof data === 'object' && data !== null) {
      // 只检查是否有基本结构，不严格要求所有字段
      if (data.id || data.timestamp || data.notes) {
        return { valid: true };
      }
      return { valid: false, error: '数据格式不正确，缺少基本备份信息' };
    }
    else {
      return { valid: false, error: '数据格式不正确，应该是对象或数组' };
    }
  }

  // 获取存储的备份列表
  getStoredBackups() {
    try {
      const stored = localStorage.getItem('backup_list');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('获取存储的备份列表失败:', error);
      return [];
    }
  }

  // 保存备份列表到本地存储
  saveStoredBackups(backups) {
    try {
      localStorage.setItem('backup_list', JSON.stringify(backups));
    } catch (error) {
      console.error('保存备份列表失败:', error);
      throw error;
    }
  }

  // 生成备份ID
  generateBackupId() {
    return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 删除导入的备份
  async deleteImportedBackup(backupId) {
    try {
      // 获取当前存储的备份列表
      const storedBackups = this.getStoredBackups();
      
      // 查找要删除的备份
      const backupIndex = storedBackups.findIndex(backup => backup.id === backupId);
      
      if (backupIndex === -1) {
        return { success: false, error: '未找到指定的备份' };
      }
      
      // 检查是否为导入的备份
      const backup = storedBackups[backupIndex];
      if (!backup.isImported) {
        return { success: false, error: '只能删除导入的备份' };
      }
      
      // 从数组中移除备份
      storedBackups.splice(backupIndex, 1);
      
      // 保存更新后的备份列表
      this.saveStoredBackups(storedBackups);
      
      console.log('成功删除导入的备份:', backupId);
      
      return {
        success: true,
        message: '备份删除成功',
        deletedBackupId: backupId
      };
    } catch (error) {
      console.error('删除导入的备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 导入单个备份
  async importSingleBackup(backup, existingNoteIds) {
    const restoreResults = [];
    const notesToImport = [];

    // 恢复媒体文件（如果有）
    let mediaFileMappings = {};
    if (backup.mediaFiles && backup.mediaFiles.length > 0) {
      try {
        const restoreResults = await this.restoreMediaFiles(backup.mediaFiles);
        // 创建文件名映射：旧URL -> 新URL
        restoreResults.forEach(result => {
          if (result.success && result.originalUrl && result.newUrl) {
            mediaFileMappings[result.originalUrl] = result.newUrl;
          }
        });
      } catch (error) {
        console.warn('恢复媒体文件失败:', error);
      }
    }

    // 获取现有笔记的内容哈希值，用于重复检查
    const existingNoteHashes = new Set();
    try {
      const existingNotes = await this.getAllNotes();
      console.log(`[重复检测] 获取到 ${existingNotes.length} 个现有笔记`);
      existingNotes.forEach((note, index) => {
        if (note.content) {
          // 生成内容哈希值（标题+内容，与导出时保持一致）
          const hash = this.generateContentHash(note);
          existingNoteHashes.add(hash);
          
          // 调试：输出前3个笔记的哈希值
          if (index < 3) {
            console.log(`[重复检测] 现有笔记[${index}] ID: ${note.id}, 哈希: ${hash}`);
            console.log(`[重复检测] 现有笔记[${index}] 内容预览: ${note.content.substring(0, 50)}...`);
          }
        }
      });
      console.log(`[重复检测] 最终获取到 ${existingNoteHashes.size} 个现有笔记的内容哈希值`);
    } catch (error) {
      console.warn('[重复检测] 获取现有笔记哈希值失败:', error);
    }

    // 导入笔记
    for (const note of backup.notes) {
      try {
        // 检查笔记是否有content_hash，如果没有则生成
        const noteHash = note.content_hash || this.generateContentHash(note);
        
        // 调试：输出哈希值和现有哈希集合信息
        console.log(`[重复检测] 笔记ID: ${note.id}`);
        console.log(`[重复检测] 笔记内容长度: ${note.content ? note.content.length : 0}`);
        console.log(`[重复检测] 生成哈希值: ${noteHash}`);
        console.log(`[重复检测] 备份中存储的哈希值: ${note.content_hash}`);
        console.log(`[重复检测] 现有哈希集合大小: ${existingNoteHashes.size}`);
        console.log(`[重复检测] 哈希值是否已存在: ${existingNoteHashes.has(noteHash)}`);
        
        // 如果哈希值不存在，输出前几个现有哈希值用于对比
        if (!existingNoteHashes.has(noteHash) && existingNoteHashes.size > 0) {
          console.log(`[重复检测] 前5个现有哈希值:`);
          Array.from(existingNoteHashes).slice(0, 5).forEach((hash, index) => {
            console.log(`[重复检测]   ${index + 1}: ${hash}`);
          });
        }
        
        // 检查笔记内容是否已存在（基于备份中存储的哈希值）
        if (existingNoteHashes.has(noteHash)) {
          console.log(`[重复检测] 笔记内容已存在（哈希: ${noteHash.substring(0, 8)}...），跳过导入`);
          restoreResults.push({ 
            id: note.id, 
            action: 'skipped', 
            success: true,
            reason: 'duplicate_content',
            hash: noteHash
          });
          continue;
        }
        
        // 检查笔记ID是否已存在（避免ID冲突）
        if (existingNoteIds.has(note.id)) {
          console.log(`笔记ID ${note.id} 已存在，生成新ID`);
          // 为笔记生成新的ID，避免ID冲突
          note.id = this.generateNoteId();
        }

        // 更新笔记内容中的图片路径
        let updatedNote = { ...note };
        if (Object.keys(mediaFileMappings).length > 0) {
          updatedNote.content = this.updateImagePathsInContent(note.content, mediaFileMappings);
        }
        
        // 创建新笔记
        console.log(`正在创建笔记 ${updatedNote.id}, 内容长度: ${updatedNote.content.length}`);
        try {
          await apiService.createNote(updatedNote);
          console.log(`笔记 ${updatedNote.id} 创建成功`);
          notesToImport.push(updatedNote);
          restoreResults.push({ id: note.id, action: 'created', success: true });
          existingNoteIds.add(note.id); // 添加到已存在集合中
          
          // 将新创建笔记的哈希值添加到现有哈希集合中，避免同一备份中的重复
          const newNoteHash = this.generateContentHash(updatedNote);
          existingNoteHashes.add(newNoteHash);
          console.log(`新笔记哈希值 ${newNoteHash.substring(0, 8)}... 已添加到重复检查集合`);
        } catch (error) {
          console.error(`导入笔记 ${note.id} 失败:`, error);
          console.error(`错误详情:`, error.message, '状态码:', error.response?.status);
          restoreResults.push({ id: note.id, action: 'failed', success: false, error: error.message });
        }
      } catch (error) {
        console.error(`导入笔记 ${note.id} 失败:`, error);
        console.error(`错误详情:`, error.message, '状态码:', error.response?.status);
        restoreResults.push({ id: note.id, action: 'failed', success: false, error: error.message });
      }
    }

    // 导入恢复功能只恢复笔记，不保存备份信息到备份列表中
    // 这样可以避免导入的备份出现在备份列表里

    return {
      backupId: backup.id,
      success: true,
      notes: notesToImport,
      results: restoreResults,
      totalNotes: backup.notes.length,
      successCount: restoreResults.filter(r => r.success).length,
      failureCount: restoreResults.filter(r => !r.success).length,
      skippedCount: restoreResults.filter(r => r.action === 'skipped').length
    };
  }

  /**
   * 生成笔记内容哈希值
   * @param {Object} note - 笔记对象
   * @returns {string} 内容哈希值
   */
  generateContentHash(note) {
    const hashInput = {
      content: note.content,
      tags: note.tags || [],
      created_at: note.created_at
    };
    const content = JSON.stringify(hashInput);
    const hash = sha256(content);
    
    // 调试：输出哈希生成过程
    console.log(`[哈希生成] 输入数据:`, {
      contentLength: note.content ? note.content.length : 0,
      tagsCount: (note.tags || []).length,
      hasCreatedAt: !!note.created_at
    });
    console.log(`[哈希生成] JSON字符串长度: ${content.length}`);
    console.log(`[哈希生成] 生成哈希值: ${hash}`);
    
    return hash;
  }

  /**
   * 生成新的笔记ID
   * @returns {string} 新的笔记ID
   */
  generateNoteId() {
    // 生成基于时间戳和随机数的唯一ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `note_${timestamp}_${random}`;
  }

}

// 导出单例实例
export const enhancedBackupManager = new EnhancedBackupManager();
export default EnhancedBackupManager;