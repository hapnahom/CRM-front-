'use client';
import React, { FC, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { MdTitle } from 'react-icons/md';
import { classNames } from '@/utils/classNames';

const QuillEditor = dynamic(() => import('react-quill'), { ssr: false });

interface TextEditorProps {
  onChange?: (value: string) => void;
  value?: string;
  className?: string;
  placeholder?: string;
}

const TextEditor: FC<TextEditorProps> = ({
  onChange,
  value = '',
  className = '',
  placeholder = '',
}) => {
  const [toolbar, setToolbar] = useState<any>(null);

  useEffect(() => {
    setToolbar({ container: '#textEditorToolbar' });
  }, []);

  return (
    <div
      className={classNames('border rounded-2xl border-border', undefined, [
        className,
      ])}
    >
      <div
        id="textEditorToolbar"
        className="flex items-center gap-3 px-2 py-4 border-0 border-b border-border"
      >
        <button className="ql-header" value="3">
          <MdTitle size={16} />
        </button>
        <button id="buttonQlBold" type="button" className="ql-bold"></button>
        <button
          id="buttonQlItallic"
          type="button"
          className="ql-italic"
        ></button>
        <button
          id="buttonQlUnderline"
          type="button"
          className="ql-underline"
        ></button>
        <button id="buttonQlLink" type="button" className="ql-link"></button>
        <button
          id="buttonQlList"
          type="button"
          className="ql-list"
          value="bullet"
        ></button>
        <button
          id="buttonQlAlign"
          type="button"
          className="ql-align"
          value="center"
        ></button>
      </div>
      <div className="p-3 h-[250px] overflow-y-auto border-0 border-none [&_.ql-container]:border-0 [&_.ql-container]:shadow-none [&_.ql-editor]:border-0">
        {toolbar && (
          <QuillEditor
            id="quillEditorFieldId"
            modules={{
              toolbar,
            }}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};

export default TextEditor;
