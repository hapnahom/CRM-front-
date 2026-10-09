import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { AiOutlineCamera } from 'react-icons/ai';
import { Button, Image, Modal, Spin } from 'antd';
import { classNames } from '@/utils/classNames';
import Webcam from 'react-webcam';
import { IoCloseCircleOutline } from 'react-icons/io5';
import { fileUpload } from '@/utils/fileUpload';
import { formatBase64ToFile } from '@/helpers/formatTo';
import { FiTrash2 } from 'react-icons/fi';

interface TakePictureProps {
  className?: string;
  onChange: (value: string | null) => void;
}
const TakePicture: FC<TakePictureProps> = ({ className = '', onChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  const onClose = useCallback(() => {
    setShowModal(false);
    setImgBase64(null);
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current?.getScreenshot({
        width: 1920,
        height: 1080,
      });
      setImgBase64(imageSrc);
      onChange(imageSrc);
    }
  }, [onChange]);

  useEffect(() => {
    if (imgBase64) {
      setIsLoading(true);
      const file = formatBase64ToFile(imgBase64, `${Date.now()}.webp`);
      onClose();
      fileUpload(file).then((res) => {
        const img = res.data['viewImage'];
        onChange(img);
        setImgSrc(img);
        setIsLoading(false);
      });
    }
  }, [imgBase64, onChange, onClose]);

  return (
    <>
      <Spin spinning={isLoading}>
        <button
          type="button"
          onClick={() => {
            setShowModal(true);
          }}
          className={classNames(
            'w-full py-3.5 px-4 flex justify-center items-center flex-col rounded-[10px] border border-border hover:border-primary transition duration-150',
            undefined,
            [className],
          )}
        >
          <AiOutlineCamera size={50} className="text-primary" />
          <div className="text-sm font-bold text-foreground mt-1">Camera</div>
          <div className="text-xs font-semibold text-muted-foreground">
            Please allow your camera
          </div>
        </button>

        {imgSrc && (
          <div className="flex items-center justify-between mt-6">
            <div className="w-[192px] h-[108px]">
              <Image
                src={imgSrc}
                width={192}
                height={108}
                alt="Captured photo"
              />
            </div>

            <Button
              onClick={() => {
                setImgBase64(null);
                onChange(null);
                setImgSrc(null);
              }}
              type="primary"
              danger
              icon={<FiTrash2 size={16} />}
              id="takePictureButtonId"
            />
          </div>
        )}
      </Spin>

      <Modal
        open={showModal}
        onCancel={onClose}
        footer={null}
        style={{ top: 20, padding: 0 }}
        closeIcon={
          <IoCloseCircleOutline size={24} className="text-brand-foreground" />
        }
        styles={{
          content: {
            height: 'calc(100dvh - 40px)',
            padding: 0,
            overflow: 'hidden',
          },
          body: { height: '100%' },
        }}
        width="100vw"
      >
        {showModal && (
          <div className="w-full h-full relative">
            <Webcam height="100%" width="100%" ref={webcamRef} />
            <Button
              className="absolute bottom-[20px] left-1/2 -translate-x-1/2"
              type="primary"
              size="large"
              icon={
                <AiOutlineCamera size={30} className="text-brand-foreground" />
              }
              onClick={capture}
            ></Button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default TakePicture;
