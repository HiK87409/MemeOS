import { useState, useEffect } from 'react';

/**
 * 用于显示加载进度的自定义钩子
 * @param {boolean} isLoading - 是否正在加载
 * @param {number} duration - 加载动画持续时间（毫秒）
 * @returns {{progress: number, isComplete: boolean}} - 进度百分比和是否完成
 */
export const useLoadingProgress = (isLoading, duration = 1500) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let progressTimer;
    let completeTimer;

    if (isLoading) {
      // 重置状态
      setProgress(0);
      setIsComplete(false);
      
      // 模拟进度增长
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 95);
        setProgress(newProgress);
        
        if (newProgress < 95) {
          progressTimer = requestAnimationFrame(updateProgress);
        }
      };
      
      progressTimer = requestAnimationFrame(updateProgress);
    } else {
      // 加载完成，快速进度到100%
      setProgress(100);
      completeTimer = setTimeout(() => {
        setIsComplete(true);
        // 延迟重置进度，以便完成动画可以显示
        setTimeout(() => {
          setProgress(0);
        }, 300);
      }, 100);
    }

    return () => {
      if (progressTimer) {
        cancelAnimationFrame(progressTimer);
      }
      if (completeTimer) {
        clearTimeout(completeTimer);
      }
    };
  }, [isLoading, duration]);

  return { progress, isComplete };
};

export default useLoadingProgress;