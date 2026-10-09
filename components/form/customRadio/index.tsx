import { FC, ReactNode, useEffect, useState } from 'react';
import { Radio } from 'antd';
import { classNames } from '@/utils/classNames';

export interface CustomRadioProps {
  className?: string;
  value?: string | number | boolean;
  label: ReactNode;
  onChange?: (count: boolean) => void;
  isError?: boolean;
  initialValue?: string | number | boolean;
  disabled?: boolean;
}

const CustomRadio: FC<CustomRadioProps> = ({
  className = '',
  value,
  label,
  onChange,
  isError = false,
  initialValue = false,
  disabled = false,
}) => {
  const [isChecked, setIsChecked] = useState<boolean>();

  const radioClass = classNames(
    className,
    {
      'border-border': !isError,
      'border-error': isError,
      'transition-none': disabled,
      'opacity-70': disabled,
      'hover:border-border': disabled,
    },
    [
      'font-semibold',
      'text-sm',
      'text-foreground',
      'h-[40px]',
      'rounded-lg',
      'border',
      'items-center',
      'justify-between',
      'hover:border-primary',
      'transition-colors',
      'duration-150',
      'px-[11px]',
      'cursor-pointer',
      'w-full',
      'flex-row-reverse',
      'after:content-[none]',
    ],
  );

  const handleChange = () => {
    setIsChecked((prev) => !prev);
  };

  useEffect(() => {
    setIsChecked(!!initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (onChange) {
      onChange(!!isChecked);
    }
  }, [isChecked, onChange]);

  return (
    <Radio
      className={radioClass}
      checked={isChecked}
      value={value}
      disabled={disabled}
      onClick={handleChange}
    >
      <div>{label}</div>
    </Radio>
  );
};

export default CustomRadio;
