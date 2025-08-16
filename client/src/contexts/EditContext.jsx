import React, { createContext, useContext, useState } from 'react';

const EditContext = createContext();

export const useEdit = () => {
  const context = useContext(EditContext);
  if (!context) {
    throw new Error('useEdit must be used within an EditProvider');
  }
  return context;
};

export const EditProvider = ({ children }) => {
  const [editingNoteId, setEditingNoteId] = useState(null);

  const startEditing = (noteId) => {
    setEditingNoteId(noteId);
  };

  const stopEditing = () => {
    setEditingNoteId(null);
  };

  const isEditing = (noteId) => {
    return editingNoteId === noteId;
  };

  const value = {
    editingNoteId,
    startEditing,
    stopEditing,
    isEditing
  };

  return (
    <EditContext.Provider value={value}>
      {children}
    </EditContext.Provider>
  );
};