import { FC, ReactNode } from 'react';
import { classNames } from '@/utils/classNames';

export interface CustomDrawerHeaderProps {
  children?: ReactNode;
  className?: string;
}

const CustomDrawerHeader: FC<CustomDrawerHeaderProps> = ({
  className = '',
  children,
}) => {
  return (
    <div
      className={classNames(
        'text-base sm:text-xl font-bold text-foreground',
        undefined,
        [className],
      )}
    >
      {children}
    </div>
  );
};

export default CustomDrawerHeader;
