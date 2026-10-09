// components/RichTextEditor.js
'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; // Import Quill styling

// Import ReactQuill dynamically because it only works in the browser
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const RichTextEditor = ({ onChange }: any) => {
  const [value, setValue] = useState('');

  // Define the toolbar without the emoji button
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  };

  return (
    <div
      style={{
        border: '1px solid #d9d9d9', // Light gray border
        borderRadius: '4px',
        padding: '8px',
        minHeight: '150px', // Approximate height for a few rows
      }}
    >
      <ReactQuill
        value={value}
        onChange={(content) => {
          setValue(content);
          onChange(content);
        }}
        modules={modules}
        placeholder="Type something..."
      />
    </div>
  );
};

export default RichTextEditor;
