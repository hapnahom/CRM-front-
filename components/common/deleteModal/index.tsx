'use client';

import React from 'react';
import { Modal, Button } from 'antd';
import Image from 'next/image';

interface DeleteModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  open,
  onConfirm,
  onCancel,
  loading,
}) => {
  const deleteModalFooter = (
    <div className="w-full flex flex-col md:flex-row justify-center items-center gap-6 mt-6">
      <Button
        className="w-70 md:w-auto px-8 py-4 text-xs font-bold"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        id="confirmDeleteId"
        className="w-70 md:w-auto px-8 py-4 text-xs font-bold"
        type="primary"
        onClick={onConfirm}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      width={500}
      okText={'Delete'}
      loading={loading}
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
        Are you sure to Delete?
      </p>
    </Modal>
  );
};

export default DeleteModal;
