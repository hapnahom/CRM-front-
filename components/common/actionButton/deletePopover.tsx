import { FC, ReactNode } from 'react';
import { Button, Col, Popover, Row } from 'antd';

interface DeletePopoverProps {
  titleText?: string;
  onCancel?: () => void;
  onDelete?: (e?: any) => void;
  children: ReactNode;
  disabled?: boolean;
}

const DeletePopover: FC<DeletePopoverProps> = ({
  titleText = 'Are you sure you want to delete?',
  onCancel,
  onDelete,
  children,
  disabled = false,
}) => {
  const buttonClass = 'text-xs font-bold w-full h-[29px] min-w-[125px]';
  if (disabled) {
    return children;
  }
  return (
    <Popover
      trigger="hover"
      placement="bottomRight"
      title={
        <div className="text-base text-foreground font-bold">{titleText}</div>
      }
      content={
        <div className="pt-4">
          <Row gutter={20}>
            {onCancel && (
              <Col span={12}>
                <Button
                  id={`buttonPopOverActionFor${titleText}Id`}
                  size="small"
                  className={buttonClass}
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </Col>
            )}
            {onDelete && (
              <Col span={12}>
                <Button
                  size="small"
                  className={buttonClass}
                  type="primary"
                  id={`buttonPopOverActionDeleteFor${titleText}Id`}
                  onClick={onDelete}
                >
                  Delete
                </Button>
              </Col>
            )}
          </Row>
        </div>
      }
    >
      {children}
    </Popover>
  );
};

export default DeletePopover;
