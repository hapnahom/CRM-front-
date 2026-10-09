import { ButtonProps } from 'antd/lib/button';
import { FC, ReactNode } from 'react';
import { Button, Flex } from 'antd';
import { classNames } from '@/utils/classNames';

interface CustomDrawerFooterButtonsProps {
  buttons: CustomDrawerFooterButtonProps[];
  className?: string;
}

export interface CustomDrawerFooterButtonProps extends ButtonProps {
  label?: ReactNode;
  key: string;
}

const CustomDrawerFooterButton: FC<CustomDrawerFooterButtonsProps> = ({
  buttons,
  className = '',
}) => {
  return (
    <div className={classNames('', undefined, [className])}>
      <Flex gap={20} className="w-full py-2">
        {buttons.map(({ key, label, className = '', ...otherProps }) => (
          <Button
            key={key}
            id={`${label}${key}ButtonId`}
            className={classNames('flex-1 text-base', undefined, [className])}
            {...otherProps}
          >
            {label}
          </Button>
        ))}
      </Flex>
    </div>
  );
};

export default CustomDrawerFooterButton;
