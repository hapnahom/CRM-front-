import { FC, useEffect, useState } from 'react';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { classNames } from '@/utils/classNames';
import DeletePopover from '@/components/common/actionButton/deletePopover';

export interface ActionButtonProps {
  onOpen?: (e?: any) => void;
  onEdit?: (e?: any) => void;
  onDelete?: (e?: any) => void;
  onCancelDelete?: (e?: any) => void;
  className?: string;
  id?: any;
}

const ActionButton: FC<ActionButtonProps> = ({
  onOpen,
  onEdit,
  onDelete,
  onCancelDelete,
  className = '',
  id,
}) => {
  const [open, setOpen] = useState(false);
  const items: MenuProps['items'] = [];

  useEffect(() => {
    const onCloseOpen = () => {
      if (open) {
        setOpen(false);
      }
    };

    document.addEventListener('click', onCloseOpen);

    return () => {
      document.removeEventListener('click', onCloseOpen);
    };
  }, [open]);

  if (onOpen) {
    items.push({
      key: '0',
      label: (
        <Button
          size="large"
          id={`${id}actionButtonForOpenId`}
          className="w-full justify-normal"
          type="text"
          onClick={(e) => {
            setOpen(false);
            onOpen(e);
          }}
        >
          Open
        </Button>
      ),
      className: 'p-0 hover:bg-transparent',
    });
  }

  if (onEdit) {
    items.push({
      key: '1',
      label: (
        <Button
          size="large"
          id={`${id}actionButtonForEditId`}
          className="w-full justify-normal"
          type="text"
          onClick={(e) => {
            setOpen(false);
            onEdit(e);
          }}
        >
          Edit
        </Button>
      ),
      className: 'p-0 hover:bg-transparent',
    });
  }

  if (onDelete) {
    items.push({
      key: '2',
      label: (
        <DeletePopover
          onCancel={onCancelDelete}
          onDelete={(e) => {
            setOpen(false);
            onDelete(e);
          }}
        >
          <Button
            id={`${id}deleteActionButtonId`}
            size="large"
            className="w-full justify-normal"
            type="text"
          >
            Delete
          </Button>
        </DeletePopover>
      ),
      className: 'p-0 hover:bg-transparent',
    });
  }

  return (
    <Dropdown
      menu={{ items }}
      trigger={['click']}
      open={open}
      placement="bottomRight"
      className={classNames(className)}
    >
      <Button
        icon={
          <HiOutlineDotsVertical size={20} className="text-muted-foreground" />
        }
        className="h-7 w-7"
        id={`${id}buttonDropDownActionId`}
        type="text"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      />
    </Dropdown>
  );
};

export default ActionButton;
