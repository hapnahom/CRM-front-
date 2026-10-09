import { FC } from 'react';
import { Button } from 'antd';
import { IoCloseCircle } from 'react-icons/io5';

interface RemoveFormFieldButtonProps {
  onClick: () => void;
}

const RemoveFormFieldButton: FC<RemoveFormFieldButtonProps> = ({ onClick }) => {
  return (
    <Button
      id="tnaRemoveFormFieldButton"
      onClick={onClick}
      icon={<IoCloseCircle size={16} />}
      htmlType="button"
      type="primary"
      className="w-10 h-10 rounded-full"
    />
  );
};

export default RemoveFormFieldButton;
