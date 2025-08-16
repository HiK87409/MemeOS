import React, { useState, useEffect } from 'react';

const Debug = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // 收集调试信息
    const info = {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
    };
    
    setDebugInfo(info);
    
    // 监听控制台日志
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog(...args);
      setLogs(prev => [...prev.slice(-49), {
        timestamp: new Date().toISOString(),
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')
      }]);
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 调试信息面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Information</h2>
          <div className="space-y-2 text-sm">
            <div><strong>User Agent:</strong> {debugInfo.userAgent}</div>
            <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
            <div><strong>LocalStorage Keys:</strong></div>
            <ul className="ml-4 list-disc">
              {debugInfo.localStorage?.map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
            <div><strong>SessionStorage Keys:</strong></div>
            <ul className="ml-4 list-disc">
              {debugInfo.sessionStorage?.map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 控制台日志面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Console Logs</h2>
            <button 
              onClick={clearLogs}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-4 h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs captured yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2 border-b border-gray-300 dark:border-gray-700 pb-2">
                  <div className="text-blue-600 dark:text-blue-400">[{log.timestamp}]</div>
                  <div className="text-gray-800 dark:text-gray-200">{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* 测试区域 */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Test Functions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => console.log('Test log message')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Console Log
          </button>
          <button 
            onClick={() => console.warn('Test warning message')}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Test Console Warning
          </button>
          <button 
            onClick={() => console.error('Test error message')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Test Console Error
          </button>
        </div>
      </div>
    </div>
  );
};

export default Debug;