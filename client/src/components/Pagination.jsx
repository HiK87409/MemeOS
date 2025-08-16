import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  hasNext, 
  hasPrev,
  total,
  limit 
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  // 生成页码数组
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 如果总页数小于等于最大显示页数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 复杂的页码显示逻辑
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // 调整起始页，确保显示足够的页码
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // 添加第一页和省略号
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // 添加中间页码
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 添加省略号和最后一页
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mt-6 px-2 sm:px-4">
      {/* 信息显示 */}
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
        显示 {startItem}-{endItem} 条，共 {total} 条
      </div>
      
      {/* 分页控件 */}
      <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
        {/* 上一页按钮 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className={`flex items-center px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-md transition-colors ${
            hasPrev
              ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-theme-elevated'
              : 'text-gray-400 dark:text-gray-600 bg-theme-elevated border border-gray-200 dark:border-gray-700 cursor-not-allowed'
          }`}
        >
          <FiChevronLeft className="sm:mr-1" size={14} />
          <span className="hidden sm:inline">上一页</span>
        </button>
        
        {/* 页码按钮 */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page)}
                  className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-md transition-colors min-w-btn-xs sm:min-w-btn-md ${
                    page === currentPage
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-theme-elevated'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* 下一页按钮 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className={`flex items-center px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-md transition-colors ${
            hasNext
              ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-theme-elevated'
              : 'text-gray-400 dark:text-gray-600 bg-theme-elevated border border-gray-200 dark:border-gray-700 cursor-not-allowed'
          }`}
        >
          <span className="hidden sm:inline">下一页</span>
          <FiChevronRight className="sm:ml-1" size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;