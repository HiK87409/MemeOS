import React from 'react';
import { useNavigate } from 'react-router-dom';
import RecycleBin from '../components/RecycleBin';
import { useTheme } from '../hooks/useTheme';

const RecycleBinPage = () => {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  
  return (
    <div className={`min-h-screen bg-theme-bg p-4`}>
      <div className="max-w-6xl mx-auto">
        <RecycleBin />
      </div>
    </div>
  );
};

export default RecycleBinPage;