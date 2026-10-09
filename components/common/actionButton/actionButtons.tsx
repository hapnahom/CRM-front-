import { Button, Space } from 'antd';
import { FiTrash2 } from 'react-icons/fi';
import DeletePopover from '@/components/common/actionButton/deletePopover';
import { FC } from 'react';
import { GrFormEdit } from 'react-icons/gr';

interface ActionButtonsProps {
  disableEdit?: boolean;
  disableDelete?: boolean;
  loading?: boolean;
  onEdit?: (e?: any) => void;
  onDelete?: (e?: any) => void;
  onDetail?: (e?: any) => void;
  id?: any;
}

const ActionButtons: FC<ActionButtonsProps> = ({
  disableEdit = false,
  disableDelete = false,
  loading = false,
  onEdit,
  onDelete,
  onDetail,
  id,
}) => {
  return (
    <Space size={10}>
      {onEdit && (
        <Button
          className="w-[30px] h-[30px] bg-blue"
          icon={<GrFormEdit size={20} />}
          id={`${id}buttonPopOverActionForOnEditActionId`}
          type="primary"
          loading={loading}
          disabled={disableEdit}
          onClick={onEdit}
        />
      )}

      {onDelete && (
        <DeletePopover onDelete={onDelete} disabled={disableDelete}>
          <Button
            className="w-[30px] h-[30px]"
            danger
            disabled={disableDelete}
            loading={loading}
            id={`${id}buttonPopOverActionForOnDeleteActionId`}
            icon={<FiTrash2 size={16} />}
            type="primary"
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </DeletePopover>
      )}
      {onDetail && (
        <Button
          className="w-[60px] px-2 h-[30px]"
          icon={'Detail'}
          id={`${id}buttonPopOverActionForOnDetailActionId`}
          loading={loading}
          onClick={onDetail}
        />
      )}
    </Space>
  );
};

export default ActionButtons;
