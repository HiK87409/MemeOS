import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('应用错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">应用发生错误</h2>
          <p className="text-sm text-red-600 dark:text-red-300 mb-2">请刷新页面或联系开发人员</p>
          <details className="text-xs text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-800 rounded">
            <summary>错误详情</summary>
            <pre className="mt-2 overflow-auto">{this.state.error?.toString()}</pre>
          </details>
          <button 
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
