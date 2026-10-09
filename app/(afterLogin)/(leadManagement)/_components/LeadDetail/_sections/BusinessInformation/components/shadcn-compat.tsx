'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { Button as UIButton } from '@/components/ui/button';
import { Card as UICard, CardContent, CardHeader } from '@/components/ui/card';
import { Input as UIInput } from '@/components/ui/input';
import { Rate as UIRate } from '@/components/ui/rate';
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function Text({ children, type, strong, className, ...props }: any) {
  return (
    <span
      className={cn(
        type === 'secondary' && 'text-muted-foreground',
        strong && 'font-semibold text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Title({ children, style, className }: any) {
  return (
    <h3
      className={cn('text-base font-semibold text-foreground', className)}
      style={style}
    >
      {children}
    </h3>
  );
}

export function Col({ children, className }: any) {
  return <div className={cn('min-w-0', className)}>{children}</div>;
}

export function Row({ children, className }: any) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      {children}
    </div>
  );
}

export function Space({ children, className }: any) {
  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      {children}
    </div>
  );
}

export const Input = UIInput;

function Option({ value, children, disabled, label }: any) {
  return (
    <SelectItem value={value} disabled={disabled}>
      {children ?? label}
    </SelectItem>
  );
}

function SelectBase({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  children,
  options,
  ...props
}: any) {
  const normalizedOptions =
    options ??
    React.Children.toArray(children)
      .filter(React.isValidElement)
      .map((child: any) => ({
        value: child.props.value,
        label: child.props.children ?? child.props.label,
        disabled: child.props.disabled,
      }));

  return (
    <UISelect
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} data-cy={props['data-cy']}>
        <SelectValue placeholder={placeholder} />
        <ChevronDown className="size-4 opacity-0" />
      </SelectTrigger>
      <SelectContent className="z-[100000]">
        {normalizedOptions.map((option: any) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UISelect>
  );
}

export const Select = Object.assign(SelectBase, { Option });

export function Button({
  loading,
  icon,
  type,
  children,
  className,
  ...props
}: any) {
  return (
    <UIButton
      className={className}
      disabled={loading || props.disabled}
      variant={type === 'text' ? 'ghost' : 'default'}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </UIButton>
  );
}

export function Card({ title, children, className, style, bodyStyle }: any) {
  return (
    <UICard className={cn('gap-0', className)} style={style}>
      {title && <CardHeader className="pb-0">{title}</CardHeader>}
      <CardContent style={bodyStyle}>{children}</CardContent>
    </UICard>
  );
}

export const Rate = UIRate;

export function Tooltip({ title, children }: any) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </UITooltip>
  );
}

export function Dropdown({ menu, open, onOpenChange, children }: any) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[100000] max-h-[200px] w-[260px] overflow-y-auto"
      >
        {(menu?.items ?? []).map((item: any) => (
          <DropdownMenuItem key={item.key} onSelect={item.onClick}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
