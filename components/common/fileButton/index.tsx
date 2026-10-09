import React, { FC } from 'react';
import { TbFileDownload } from 'react-icons/tb';
import { classNames } from '@/utils/classNames';
import { IoClose } from 'react-icons/io5';
interface FileButtonProps {
  isPreview?: boolean;
  fileName: string;
  link?: string;
  className?: string;
  onRemove?: (e: any) => void;
}

const FileButton: FC<FileButtonProps> = ({
  isPreview = false,
  fileName,
  link,
  className = '',
  onRemove,
}) => {
  return isPreview ? (
    <button
      id="tnaFileButtonId"
      className={classNames(
        'flex items-center rounded-lg border border-border py-2 px-6 w-max gap-1 text-foreground',
        undefined,
        [className],
      )}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <TbFileDownload size={16} />
      <span className="text-xs">{fileName}</span>
      {onRemove && (
        <IoClose
          size={16}
          className="text-muted-foreground hover:cursor-pointer hover:text-foreground"
          onClick={onRemove}
        />
      )}
    </button>
  ) : (
    <a
      href={link}
      target="_blank"
      id="fileOpenLinkId"
      className={classNames(
        'flex items-center rounded-lg border border-border py-2 px-6 w-max gap-1 text-foreground',
        undefined,
        [className],
      )}
    >
      <TbFileDownload size={16} />
      <span className="text-xs">{fileName}</span>
    </a>
  );
};

export default FileButton;
