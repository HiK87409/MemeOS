import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { API_BASE_URL } from '../config/env.js';
import { 
  initGlobalImageRetry, 
  getImageState, 
  setImageState as setGlobalImageState, 
  handleImageError as handleGlobalImageError, 
  handleImageSuccess,
  shouldRetry
} from '../utils/globalImageRetry';

const MarkdownRenderer = ({ content, className = '', onContentChange, editable = false, textColors = {}, onNoteClick, notes = [] }) => {
  // 初始化全局图片重试系统
  useEffect(() => {
    initGlobalImageRetry({
      maxRetries: 3,
      retryDelay: 1000,
      permanentFailureCodes: [404],
      cacheTimeout: 5 * 60 * 1000,
      enableGlobalRetry: true,
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
    });
    
    // 监听全局重试事件
    const handleGlobalRetry = (event) => {
      const { url } = event.detail;
      console.log('[MarkdownRenderer] 收到全局重试事件:', url);
      // 触发重新渲染
      forceUpdate({});
    };
    
    document.addEventListener('globalImageRetry', handleGlobalRetry);
    
    return () => {
      document.removeEventListener('globalImageRetry', handleGlobalRetry);
    };
  }, []);
  
  // 强制重新渲染的机制
  const [, forceUpdate] = useState({});
  // 处理图片URL，确保正确的路径并处理跨域
  const processImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    
    // 清理URL，移除多余的空格和换行符
    const cleanUrl = url.trim();
    if (!cleanUrl) return '';
    
    // 如果是本地文件路径（file://开头），直接返回空字符串避免加载
    if (cleanUrl.startsWith('file://') || cleanUrl.startsWith('\\') || /^[A-Za-z]:\\/.test(cleanUrl)) {
      console.log('检测到本地文件路径，跳过加载:', cleanUrl);
      return '';
    }
    
    // 如果是本地上传的图片
    if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
      const normalizedUrl = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
      return `${API_BASE_URL.replace('/api', '')}${normalizedUrl}`;
    }
    
    // 如果是data URL（base64图片），直接返回
    if (cleanUrl.startsWith('data:image/')) {
      return cleanUrl;
    }
    
    // 如果是相对路径但不是uploads，可能是其他本地资源
    if (cleanUrl.startsWith('/')) {
      return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
    }
    
    // 如果是完整的HTTP/HTTPS URL，检查是否需要代理
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      // 检查是否是同源URL
      const currentOrigin = window.location.origin;
      const urlOrigin = new URL(cleanUrl).origin;
      
      // 如果是跨域URL，尝试使用代理
      if (urlOrigin !== currentOrigin) {
        console.log('检测到跨域图片URL:', cleanUrl);
        // 尝试使用CORS代理
        const proxyUrl = `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(cleanUrl)}`;
        console.log('使用代理URL:', proxyUrl);
        return proxyUrl;
      }
      
      return cleanUrl;
    }
    
    // 检查是否是有效的域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    const urlWithPath = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}\/.*$/;
    
    // 如果看起来像是域名或域名+路径，添加https协议
    if (domainRegex.test(cleanUrl) || urlWithPath.test(cleanUrl)) {
      const fullUrl = `https://${cleanUrl}`;
      // 对外部域名也使用代理
      const proxyUrl = `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(fullUrl)}`;
      console.log('外部域名使用代理:', proxyUrl);
      return proxyUrl;
    }
    
    // 如果包含常见的图片文件扩展名，尝试添加https
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(cleanUrl)) {
      if (cleanUrl.includes('://')) {
        // 对已有协议的外部图片使用代理
        const proxyUrl = `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(cleanUrl)}`;
        console.log('外部图片使用代理:', proxyUrl);
        return proxyUrl;
      }
      const fullUrl = `https://${cleanUrl}`;
      const proxyUrl = `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(fullUrl)}`;
      console.log('外部图片使用代理:', proxyUrl);
      return proxyUrl;
    }
    
    // 最后的兜底处理 - 对所有非本地URL使用代理
    if (cleanUrl.includes('://')) {
      const proxyUrl = `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(cleanUrl)}`;
      console.log('兜底代理处理:', proxyUrl);
      return proxyUrl;
    }
    
    // 其他情况返回空字符串
    console.log('无法处理的URL格式:', cleanUrl);
    return '';
  };



  // 处理复选框点击
  const handleCheckboxChange = useCallback((lineIndex, isChecked) => {
    if (!editable || !onContentChange) return;
    
    const lines = content.split('\n');
    const updatedLines = lines.map((line, index) => {
      if (index === lineIndex && (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]'))) {
        // 替换任务状态
        return isChecked 
          ? line.replace('- [ ]', '- [x]')
          : line.replace('- [x]', '- [ ]');
      }
      return line;
    });
    
    const updatedContent = updatedLines.join('\n');
    onContentChange(updatedContent);
  }, [content, editable, onContentChange]);

  // 自定义组件
  const components = {
    // 处理图片 - 使用全局重试机制
    img: ({ src, alt, ...props }) => {
      // 添加样式确保图片不超过卡片宽度但保持原始比例
      const imgStyle = { 
        maxWidth: '100%', 
        height: 'auto',
        width: 'auto',
        display: 'block',
        margin: '0 auto'
      };
      const processedSrc = processImageUrl(src);
      
      // 使用全局状态管理
      const [imageState, setImageState] = useState(() => {
        const globalState = getImageState(processedSrc);
        return globalState || {
          status: 'loading',
          retryCount: 0,
          lastError: null
        };
      });
      
      // 同步全局状态到本地状态
      useEffect(() => {
        const globalState = getImageState(processedSrc);
        if (globalState && JSON.stringify(globalState) !== JSON.stringify(imageState)) {
          setImageState(globalState);
        }
      }, [processedSrc, imageState]);
      
      const handleImageLoad = () => {
        console.log('图片加载成功:', processedSrc);
        handleImageSuccess(processedSrc);
        setImageState(prev => ({
          ...prev,
          status: 'success',
          errorMessage: ''
        }));
      };
      
      const handleImageError = (e) => {
        console.log('图片加载失败:', processedSrc, e);
        
        // 构造错误对象
        const error = {
          message: e.message || (e.target && e.target.error ? e.target.error.message : 'Unknown error'),
          status: e.target ? e.target.status : undefined,
          timestamp: Date.now()
        };
        
        // 使用全局错误处理
        const newState = handleGlobalImageError(processedSrc, error);
        
        // 更新本地状态
        setImageState(newState);
      };
      
      const handleManualRetry = () => {
        console.log('手动重试加载图片:', processedSrc);
        
        // 重置状态为loading
        const newState = {
          status: 'loading',
          retryCount: imageState.retryCount + 1,
          lastError: null
        };
        
        setGlobalImageState(processedSrc, newState);
        setImageState(newState);
      };
      
      // 生成图片URL，重试时添加缓存破坏参数
      const getImageSrc = () => {
        // 在loading和success状态下都返回图片URL
        if (!processedSrc || (imageState.status !== 'loading' && imageState.status !== 'success')) {
          return '';
        }
        
        if (imageState.retryCount > 0) {
          const separator = processedSrc.includes('?') ? '&' : '?';
          return `${processedSrc}${separator}retry=${imageState.retryCount}&t=${Date.now()}`;
        }
        return processedSrc;
      };
      
      // 如果没有src或processedSrc为空，直接显示错误
      if (!src || !processedSrc) {
        return (
          <div className="max-w-full h-32 bg-theme-elevated my-2 flex items-center justify-center" style={{...imgStyle, borderRadius: '0', border: 'none'}}>
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">本地图片文件不存在或无法访问</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 break-all">{alt || src}</p>
            </div>
          </div>
        );
      }
      
      // 错误状态、超时状态和永久失败状态都显示错误提示，不渲染img标签
      if (imageState.status === 'error' || imageState.status === 'timeout' || imageState.status === 'permanent-failure') {
        const isPermanentFailure = imageState.status === 'permanent-failure';
        const errorMessage = imageState.lastError ? imageState.lastError.message : '图片加载失败';
        
        return (
          <div className="max-w-full h-32 bg-theme-elevated my-2 flex items-center justify-center" style={{borderRadius: '0', border: 'none'}}> 
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">
                {errorMessage}
                {imageState.retryCount > 0 && ` (重试次数: ${imageState.retryCount})`}
                {isPermanentFailure && ' (文件不存在)'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 break-all">{alt || processedSrc}</p>
              <button 
                onClick={handleManualRetry}
                className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        );
      }
      
      // 在loading和success状态且getImageSrc返回有效URL时显示图片，避免错误状态下继续发送请求
      if ((imageState.status === 'loading' || imageState.status === 'success') && getImageSrc()) {
        return (
          <img
            key={`${processedSrc}-${imageState.retryCount}`}
            src={getImageSrc()}
            alt={alt}
            className="max-w-full h-auto max-h-96 my-2 mx-auto block w-full"
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{...imgStyle, borderRadius: '0', border: 'none'}}
            {...props}
          />
        );
      }
      
      // 其他状态返回null，不渲染任何内容
      return null;
    },
    // 处理斜体
    em: ({ children, ...props }) => (
      <em 
        className="italic force-italic" 
        style={{ 
          fontStyle: 'italic !important',
          fontFamily: 'inherit !important',
          fontSynthesis: 'style !important',
          color: textColors?.main || 'inherit'
        }} 
        {...props}
      >
        {children}
      </em>
    ),
    // 处理粗体
    strong: ({ children, ...props }) => (
      <strong 
        className="font-bold" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </strong>
    ),
    // 处理删除线
    del: ({ children, ...props }) => (
          <del 
            className="line-through opacity-60" 
            style={{ color: textColors.secondary || 'inherit' }}
            {...props}
          >
            {children}
          </del>
        ),
    // 处理下划线 (HTML u 标签)
    u: ({ children, ...props }) => (
      <u 
        className="underline" 
        style={{ 
          textDecoration: 'underline !important',
          textDecorationLine: 'underline',
          textDecorationStyle: 'solid',
          textDecorationColor: 'currentColor'
        }} 
        {...props}
      >
        {children}
      </u>
    ),
    // 处理复选框
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly={!editable}
            className={`mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-transparent focus:ring-0 ${editable ? 'cursor-pointer' : 'cursor-default'}`}
            {...props}
          />
        );
      }
      return <input type={type} checked={checked} {...props} />;
    },
    // 处理引用块
    blockquote: ({ children, ...props }) => (
      <blockquote 
        className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic"
        style={{ color: textColors?.secondary || 'inherit' }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    // 处理任务列表项
    li: ({ children, ordered, ...props }) => {
      // 过滤掉ordered属性，因为它不是有效的HTML属性
      const { ordered: _, ...validProps } = { ordered, ...props };
      
      const hasCheckbox = children && children.some && children.some(child => 
        child && child.props && child.props.type === 'checkbox'
      );
      
      if (hasCheckbox) {
        return (
          <li 
            className="task-list-item" 
            style={{ color: textColors?.main || 'inherit' }}
            {...validProps}
          >
            {children}
          </li>
        );
      }
      
      return (
        <li 
          style={{ color: textColors?.main || 'inherit' }}
          {...validProps}
        >
          {children}
        </li>
      );
    },
    // 处理代码块
    code: ({ inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code
            className="bg-theme-elevated rounded px-1 py-0.5 font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      return (
        <pre className="bg-theme-elevated p-4 rounded-md overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    // 处理链接
    a: ({ href, children, ...props }) => {
      // 检查是否是HTTP笔记引用链接格式 http(s)://{host}:{port}/note/{id}
      const noteRefMatch = href && href.match(/^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(?::(\d+))?\/note\/(\d+)$/);
      if (noteRefMatch) {
            const [, host, port, noteId] = noteRefMatch;
            // 如果没有端口号，根据协议设置默认端口
            const finalPort = port || (href.startsWith('https://') ? '443' : '80');
        console.log('[引用链接] 渲染HTTP引用链接，笔记ID:', noteId, '主机:', host, '端口:', finalPort, '可用笔记:', notes?.length || 0);
        
        // 根据ID查找笔记
        const findNoteById = (id) => {
          if (!notes || !Array.isArray(notes)) return null;
          // 支持新的复杂ID格式和旧的数字ID格式
          return notes.find(note => {
            if (typeof note.id === 'string' && typeof id === 'string') {
              return note.id === id;
            }
            // 兼容旧的数字ID
            return note.id === parseInt(id) || note.id.toString() === id.toString();
          });
        };
        
        const targetNote = findNoteById(noteId);
        const noteExists = !!targetNote;
        const noteTitle = targetNote ? (targetNote.title || '无标题') : children;
        
        const handleNoteRefClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[引用点击] 点击HTTP引用链接，笔记ID:', noteId, '类型:', typeof noteId);
          console.log('[引用点击] 目标笔记:', targetNote, '是否存在:', noteExists);
          console.log('[引用点击] onNoteClick函数:', typeof onNoteClick, onNoteClick ? '存在' : '不存在');
          if (onNoteClick && noteExists) {
            console.log('[引用点击] 准备跳转到笔记:', targetNote.title, 'ID:', targetNote.id, 'ID类型:', typeof targetNote.id);
            onNoteClick(targetNote.id);
            console.log('[引用点击] 已调用onNoteClick函数');
          } else if (!noteExists) {
            console.log('[引用点击] 未找到笔记ID:', noteId, '可用笔记:', notes?.map(n => `${n.id}:${n.title}(${typeof n.id})`) || []);
          } else if (!onNoteClick) {
            console.log('[引用点击] onNoteClick函数不存在');
          }
        };
        
        // 引用链接的特殊样式 - 使用自定义引用颜色
        const linkClass = noteExists 
          ? "underline cursor-pointer transition-colors duration-200"
          : "text-gray-400 dark:text-gray-500 line-through cursor-not-allowed";
        
        const title = noteExists 
          ? `跳转到笔记: ${noteTitle}`
          : `笔记不存在 (ID: ${noteId})`;
        
        // 处理引用链接显示 - 直接显示纯文本
        const processSpecialChars = (text) => {
          if (typeof text !== 'string') return text;
          // 直接返回原始文本，无需处理特殊字符
          return text;
        };

        return (
          <a
            href="#"
            className={`${linkClass} note-reference-link px-2 py-1 rounded ${noteExists ? 'bg-theme-elevated border-l-2 border-theme-border' : ''} focus:outline-none focus:ring-0`}
            onClick={handleNoteRefClick}
            title={title}
            style={{ 
              fontFamily: 'inherit',
              textRendering: 'optimizeLegibility',
              fontFeatureSettings: '"kern" 1, "liga" 1',
              color: noteExists ? (textColors?.reference || textColors?.link || 'var(--theme-primary)') : 'var(--theme-text-secondary)',
              textDecoration: noteExists ? 'none' : 'line-through'
            }}
            {...props}
          >
            <span className="reference-text">{processSpecialChars(children)}</span>
            {!noteExists && " (不存在)"}
          </a>
        );
      }
      

      
      // 普通链接 - 确保href有效且不是javascript协议
      if (!href || href.trim() === '' || href.startsWith('javascript:')) {
        // 如果没有有效的href或者是javascript协议，返回普通文本
        return <span className="text-gray-500" {...props}>{children}</span>;
      }
      
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80 special-char focus:outline-none focus:ring-0"
          style={{ 
            color: textColors?.link || 'var(--theme-primary)',
            fontFamily: 'inherit',
            textRendering: 'optimizeLegibility',
            fontFeatureSettings: '"kern" 1, "liga" 1'
          }}
          {...props}
        >
          <span className="special-char">{children}</span>
        </a>
      );
    },
    // 处理标题
    h1: ({ children, ...props }) => (
      <h1 
        className="text-2xl font-bold mb-4" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 
        className="text-xl font-bold mb-3" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 
        className="text-lg font-bold mb-2" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 
        className="text-base font-bold mb-2" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 
        className="text-sm font-bold mb-1" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 
        className="text-xs font-bold mb-1" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </h6>
    ),
    // 处理段落 - 避免嵌套问题
    p: ({ children, ...props }) => (
      <span 
        className="block mb-4" 
        style={{ color: textColors?.main || 'inherit' }}
        {...props}
      >
        {children}
      </span>
    ),
  };

  // 渲染内容，特殊处理任务列表
  const renderContent = () => {
    if (!content) return null;
    
    // 直接使用原始内容
    const processedContent = content;
    const lines = processedContent.split('\n');
    const hasTaskList = lines.some(line => 
      line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')
    );
    
    // 如果包含任务列表且可编辑，使用自定义渲染
    if (hasTaskList && editable) {
      return (
        <div>
          {lines.map((line, index) => {
            if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
              const isChecked = line.trim().startsWith('- [x]');
              const taskText = line.trim().replace(/^- \[[ x]\] /, '');
              
              return (
                <div key={`task-${index}`} className="flex items-start mb-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCheckboxChange(index, !isChecked);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="mt-1 mr-2 h-4 w-4 rounded border-2 cursor-pointer transition-colors 
                      border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 
                      text-blue-600 dark:text-blue-400 
                      focus:outline-none focus:ring-0 focus:border-transparent 
                      checked:bg-blue-600 dark:checked:bg-blue-500 
                      checked:border-blue-600 dark:checked:border-blue-500 
                      hover:border-blue-400 dark:hover:border-blue-500"
                  />
                  <div 
                    className={isChecked ? "line-through opacity-60" : ""}
                    style={{ color: isChecked ? (textColors.secondary || 'inherit') : (textColors.main || 'inherit') }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={components}
                    >
                      {taskText}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            } else if (line.trim()) {
              // 其他非空行使用 ReactMarkdown 渲染
              return (
                <ReactMarkdown
                  key={`line-${index}`}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={components}
                >
                  {line}
                </ReactMarkdown>
              );
            } else {
              // 空行
              return <br key={`empty-${index}`} />;
            }
          })}
        </div>
      );
    }
    
    // 默认使用 ReactMarkdown 渲染
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`} style={{ fontFamily: 'inherit' }}>
      {renderContent()}
    </div>
  );
};

export default MarkdownRenderer;