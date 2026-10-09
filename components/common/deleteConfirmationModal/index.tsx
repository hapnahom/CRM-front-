'use client';

import React from 'react';
import { Modal, Button } from 'antd';
import Image from 'next/image';

interface DeleteModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  customMessage?: React.ReactNode;
  deleteMessage?: React.ReactNode;
  deleteText?: React.ReactNode;
  cancelText?: React.ReactNode;
  loading?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  open,
  onConfirm,
  onCancel,
  customMessage,
  deleteMessage,
  deleteText,
  cancelText,
  loading,
}) => {
  const deleteModalFooter = (
    <div className="w-full flex flex-col md:flex-row justify-center items-center gap-6 mt-6">
      <Button
        className="w-70 md:w-auto px-8 py-4 text-xs font-bold"
        id="deleteModalCancelButtonId"
        onClick={onCancel}
      >
        {cancelText ?? 'Cancel'}
      </Button>
      <Button
        id="confirmDeleteId"
        className="w-70 md:w-auto px-8 py-4 text-xs font-bold"
        type="primary"
        loading={loading ?? false}
        onClick={onConfirm}
      >
        {deleteText ?? 'Delete'}
      </Button>
    </div>
  );
  return (
    <Modal
      open={open}
      width={500}
      okText={'Delete'}
      onOk={onConfirm}
      onCancel={onCancel}
      footer={deleteModalFooter}
    >
      <p className="flex justify-center items-center h-[200px]">
        <Image
          src="/deleteSvg.svg"
          width={300}
          height={300}
          alt="Picture of the author"
        />
      </p>

      <p className="flex justify-center items-center mt-4 text-xl text-gray-950 font-extrabold">
        {deleteMessage ?? 'you sure to Delete ? '}
      </p>
      {customMessage && <div className="mt-4 text-center">{customMessage}</div>}
    </Modal>
  );
};

export default DeleteModal;
