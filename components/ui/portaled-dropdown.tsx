'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const OVERLAY_Z_INDEX = 2147483647;
const DROPDOWN_GAP = 4;
const DROPDOWN_VIEWPORT_PAD = 8;
const DROPDOWN_PREFERRED_MAX = 280;
const DROPDOWN_MIN_DOWN_SPACE = 100;

type DropdownPanelPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  /** Absolute coords are relative to a transformed dialog container. */
  positioning: 'fixed' | 'absolute';
};

function resolvePortalContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  // Always portal to body so menus are not clipped by modal overflow-hidden
  // scroll regions; dialog dismiss handlers allow [data-entity-multiselect-panel].
  return document.body;
}

function usePortaledDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  portalContainer: HTMLElement | null,
  minWidth?: number,
  preferredMaxHeight = DROPDOWN_PREFERRED_MAX,
) {
  const [position, setPosition] = useState<DropdownPanelPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !portalContainer) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !portalContainer) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(
        Math.max(rect.width, minWidth ?? rect.width),
        window.innerWidth - DROPDOWN_VIEWPORT_PAD * 2,
      );
      const viewportLeft = Math.min(
        Math.max(DROPDOWN_VIEWPORT_PAD, rect.left),
        window.innerWidth - width - DROPDOWN_VIEWPORT_PAD,
      );

      const spaceBelow =
        window.innerHeight - rect.bottom - DROPDOWN_GAP - DROPDOWN_VIEWPORT_PAD;
      const spaceAbove = rect.top - DROPDOWN_GAP - DROPDOWN_VIEWPORT_PAD;
      const openUpward =
        spaceBelow < DROPDOWN_MIN_DOWN_SPACE && spaceAbove > spaceBelow;
      const available = Math.max(
        96,
        openUpward ? spaceAbove : Math.max(spaceBelow, 96),
      );
      const maxHeight = Math.min(preferredMaxHeight, available);

      // Dialog content uses transform, so `position:fixed` is relative to it.
      // Use absolute coords relative to the dialog box instead.
      const useAbsolute =
        portalContainer !== document.body &&
        portalContainer instanceof HTMLElement;
      const containerRect = useAbsolute
        ? portalContainer.getBoundingClientRect()
        : null;

      if (openUpward) {
        const bottomViewport = window.innerHeight - rect.top + DROPDOWN_GAP;
        setPosition({
          bottom: containerRect
            ? bottomViewport - (window.innerHeight - containerRect.bottom)
            : bottomViewport,
          left: containerRect
            ? viewportLeft - containerRect.left
            : viewportLeft,
          width,
          maxHeight,
          positioning: useAbsolute ? 'absolute' : 'fixed',
        });
      } else {
        setPosition({
          top: containerRect
            ? rect.bottom + DROPDOWN_GAP - containerRect.top
            : rect.bottom + DROPDOWN_GAP,
          left: containerRect
            ? viewportLeft - containerRect.left
            : viewportLeft,
          width,
          maxHeight,
          positioning: useAbsolute ? 'absolute' : 'fixed',
        });
      }
    };

    triggerRef.current.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });

    const frameId = window.requestAnimationFrame(() => {
      updatePosition();
    });

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, triggerRef, portalContainer, minWidth, preferredMaxHeight]);

  return position;
}

export function PortaledDropdownPanel({
  open,
  triggerRef,
  onClose,
  children,
  className,
  minWidth,
  preferredMaxHeight,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  minWidth?: number;
  preferredMaxHeight?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open) {
      setPortalContainer(null);
      return;
    }
    const container = resolvePortalContainer();
    setPortalContainer(container);

    // Dialogs often use overflow-hidden for sticky header/footer layout, which
    // clips this panel (portaled into the dialog for FocusScope). Temporarily
    // allow overflow so long lists can extend past the modal bounds.
    if (!container || container === document.body) return;
    const previousOverflow = container.style.overflow;
    container.style.overflow = 'visible';
    return () => {
      container.style.overflow = previousOverflow;
    };
  }, [open, triggerRef]);

  // Dialogs often use overflow-hidden for rounded corners / scroll layout.
  // Portaled panels are children of dialog content for FocusScope, so unlock
  // overflow while open so the menu can paint outside the modal bounds.
  useLayoutEffect(() => {
    if (!open || !portalContainer || portalContainer === document.body) {
      return;
    }
    const previousOverflow = portalContainer.style.overflow;
    portalContainer.style.overflow = 'visible';
    return () => {
      portalContainer.style.overflow = previousOverflow;
    };
  }, [open, portalContainer]);

  const position = usePortaledDropdownPosition(
    open,
    triggerRef,
    portalContainer,
    minWidth,
    preferredMaxHeight,
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const frameId = window.requestAnimationFrame(() => {
      document.addEventListener('pointerdown', handlePointerDown, true);
      document.addEventListener('keydown', handleEscape);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !position || !portalContainer) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        'pointer-events-auto flex flex-col overflow-hidden rounded-md border border-border bg-surface-card shadow-md',
        className,
      )}
      data-entity-multiselect-panel=""
      style={{
        position: position.positioning,
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        width: position.width,
        height: position.maxHeight,
        maxHeight: position.maxHeight,
        zIndex: OVERLAY_Z_INDEX,
        pointerEvents: 'auto',
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      {children}
    </div>,
    portalContainer,
  );
}
