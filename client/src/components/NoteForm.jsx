import { useState, useRef, useEffect } from 'react';
import { FiSend, FiImage, FiEye, FiEyeOff, FiCheckSquare, FiCode, FiList, FiX } from 'react-icons/fi';
import { uploadImage } from '../api/notesApi';
import TagSelector from './TagSelector';
import NoteEditor from './NoteEditor';

const NoteForm = ({ onSubmit }) => {
  const handleSubmit = (noteData) => {
    onSubmit(noteData);
  };

  return (
    <div className="mb-8">
      <NoteEditor 
        onSubmit={handleSubmit}
        submitText="发布"
        showCancel={false}
        isEditMode={false}
        initialTags={[]}
      />
    </div>
  );
};

export default NoteForm;