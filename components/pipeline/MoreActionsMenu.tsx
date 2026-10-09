'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MoreActionsMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
  destructive?: boolean;
};

type MenuCoords = { top: number; left: number };

/**
 * Lightweight "…" menu that avoids Radix FocusScope (known infinite
 * update-depth loops with nested compose-refs on some detail layouts).
 * Menu is portaled so overflow-hidden parents cannot clip it.
 */
export function MoreActionsMenu({
  items,
  align = 'end',
  ariaLabel = 'More actions',
  className,
}: {
  items: MoreActionsMenuItem[];
  align?: 'start' | 'end';
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu?.offsetWidth || 160;
    const menuHeight = menu?.offsetHeight || 0;
    const gap = 4;
    const padding = 8;

    let left = align === 'end' ? rect.right - menuWidth : rect.left;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - menuWidth - padding),
    );

    let top = rect.bottom + gap;
    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - gap - menuHeight);
    }

    setCoords({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    // Remeasure after paint so menu width/height are accurate.
    const frame = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(frame);
  }, [open, items.length, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  if (!items.length) return null;

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="icon-sm"
        className="size-8 border-border"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreHorizontal size={14} />
      </Button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={
                coords
                  ? {
                      position: 'fixed',
                      top: coords.top,
                      left: coords.left,
                    }
                  : {
                      position: 'fixed',
                      top: -9999,
                      left: -9999,
                      visibility: 'hidden',
                    }
              }
              className="z-[100] min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.title}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'disabled:pointer-events-none disabled:opacity-50',
                    item.destructive &&
                      'text-destructive hover:bg-destructive/10 hover:text-destructive',
                  )}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
