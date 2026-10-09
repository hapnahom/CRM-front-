'use client';

import React from 'react';
import { Modal, Button } from 'antd';
import Image from 'next/image';

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  imageSrc?: string;
  description?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
  loading,
  imageSrc = '/confirmSvg.svg',
  description,
}) => {
  const confirmModalFooter = (
    <div className="w-full flex flex-col md:flex-row justify-center items-center gap-6 mt-6">
      <Button
        className="w-70 md:w-auto px-8 py-4 text-xs font-bold"
        onClick={onCancel}
      >
        No
      </Button>
      <Button
        id="confirmId"
        className="w-70 md:w-auto px-8 py-4 text-xs font-bold"
        type="primary"
        onClick={onConfirm}
      >
        Yes
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      width={500}
      okText={'Confirm'}
      loading={loading}
      onOk={onConfirm}
      onCancel={onCancel}
      footer={confirmModalFooter}
      closeIcon={false}
    >
      <p className="flex justify-center items-center h-[200px] m-6">
        <Image
          src={imageSrc}
          width={300}
          height={300}
          alt="Picture of the author"
          className=""
        />
      </p>
      <p className="flex justify-center items-center mt-4 text-2xl text-gray-950 font-extrabold">
        Are you sure?
      </p>
      <p className="flex justify-center items-center mt-4 text-lg text-gray-950 font-medium">
        {description}
      </p>
    </Modal>
  );
};

export default ConfirmModal;
