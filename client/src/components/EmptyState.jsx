import { FiFileText } from 'react-icons/fi';

const EmptyState = ({ message = '没有找到笔记', subMessage = '开始创建你的第一个笔记吧！' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div 
        className="p-6 rounded-full mb-4"
        style={{ backgroundColor: 'var(--theme-elevated)' }}
      >
        <FiFileText 
          className="h-12 w-12" 
          style={{ color: 'var(--theme-text-secondary)' }}
        />
      </div>
      <h3 
        className="text-xl font-medium mb-2"
        style={{ color: 'var(--theme-text)' }}
      >
        {message}
      </h3>
      <p style={{ color: 'var(--theme-text-secondary)' }}>{subMessage}</p>
    </div>
  );
};

export default EmptyState;