'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MessagesSquare } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';
import { useCollaboration } from '@/components/collaboration/collaboration-context';
import {
  buildCollaborationSrc,
  COLLABORATION_CLOSE_MESSAGE_TYPE,
  COLLABORATION_MESSAGE_TYPE,
  COLLABORATION_UNREAD_MESSAGE_TYPE,
} from '@/utils/collaboration';

const MIN_PANEL_WIDTH = 240;
/**
 * Hard ceiling on the panel, the same as Core's chat dock (CHAT_MAX_WIDTH).
 * Past this the embed stops being a companion column and starts crowding the
 * page it is meant to sit beside — and the host's own content is the reason
 * the user is here. Kept in step with Operations.
 */
const MAX_PANEL_WIDTH = 680;
const PANEL_WIDTH_STORAGE_KEY = 'collaboration-panel-width';
/** How long "Set up space" shows after arriving on a record without a space. */
const SET_UP_PEEK_MS = 3000;

/**
 * The one place a width becomes legal. Applied on write rather than only while
 * dragging, so a width stored before the ceiling existed is pulled back into
 * range on the next load instead of persisting forever.
 */
function clampPanelWidth(width: number): number {
  return Math.min(
    MAX_PANEL_WIDTH,
    Math.max(MIN_PANEL_WIDTH, Math.round(width)),
  );
}

type CollaborationPanelStore = {
  panelWidth: number;
  dragging: boolean;
  /** Launcher key whose "Set up space" label is showing on arrival, if any. */
  peekingKey: string | null;
  /** Unread messages per space, as last reported by the embedded app. */
  unreadBySpaceId: Record<string, number>;
  setPanelWidth: (width: number) => void;
  setDragging: (dragging: boolean) => void;
  setPeekingKey: (key: string | null) => void;
  setUnreadBySpaceId: (unreadBySpaceId: Record<string, number>) => void;
};

/** The embed's `bySpaceId` payload, kept to positive counts; null if malformed. */
function readUnreadBySpaceId(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object') return null;
  const unreadBySpaceId: Record<string, number> = {};
  for (const [spaceId, rawCount] of Object.entries(value)) {
    const count = Number(rawCount);
    if (Number.isFinite(count) && count > 0) unreadBySpaceId[spaceId] = count;
  }
  return unreadBySpaceId;
}

const useCollaborationPanelStore = create<CollaborationPanelStore>((set) => ({
  panelWidth: 480,
  dragging: false,
  setPanelWidth: (width) => {
    const panelWidth = clampPanelWidth(width);
    try {
      window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidth));
    } catch {
      // Resizing should still work when browser storage is unavailable.
    }
    set({ panelWidth });
  },
  setDragging: (dragging) => set({ dragging }),
  peekingKey: null,
  setPeekingKey: (peekingKey) => set({ peekingKey }),
  unreadBySpaceId: {},
  setUnreadBySpaceId: (unreadBySpaceId) => set({ unreadBySpaceId }),
}));

/**
 * Collaboration embed as an inline layout panel, not an overlay: it is a flex
 * sibling of the main content inside the app shell, so opening it narrows the
 * page rather than covering it. Mount it as the last child of the shell's flex
 * row (see components/navBar).
 *
 * The iframe stays mounted while the panel is closed (hidden via `display`, not
 * unmounted) so chat state, sockets and scroll position survive closing and
 * reopening — and so a context set by a CRM screen has already loaded by the
 * time the user opens it.
 *
 * Desktop only. The panel would leave no room for the page on a phone, so both
 * it and its launcher are hidden below `md`.
 */
export function CollaborationDock({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { enabled, isOpen, context, close, launcher } = useCollaboration();
  const panelRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const panelWidth = useCollaborationPanelStore((state) => state.panelWidth);
  const dragging = useCollaborationPanelStore((state) => state.dragging);
  const setPanelWidth = useCollaborationPanelStore(
    (state) => state.setPanelWidth,
  );
  const setDragging = useCollaborationPanelStore((state) => state.setDragging);
  const peekingKey = useCollaborationPanelStore((state) => state.peekingKey);
  const setPeekingKey = useCollaborationPanelStore(
    (state) => state.setPeekingKey,
  );
  const unreadBySpaceId = useCollaborationPanelStore(
    (state) => state.unreadBySpaceId,
  );
  const setUnreadBySpaceId = useCollaborationPanelStore(
    (state) => state.setUnreadBySpaceId,
  );
  const setUpKey = launcher && !launcher.hasSpace ? launcher.key : null;

  // Arriving on a record without a space shows "Set up space" for a few
  // seconds; after that the label only comes back on hover / focus.
  useEffect(() => {
    if (!setUpKey) return;
    setPeekingKey(setUpKey);
    const timer = window.setTimeout(() => setPeekingKey(null), SET_UP_PEEK_MS);
    return () => {
      window.clearTimeout(timer);
      setPeekingKey(null);
    };
  }, [setUpKey, setPeekingKey]);

  useEffect(() => {
    try {
      const savedWidth = Number(
        window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY),
      );
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_PANEL_WIDTH) {
        setPanelWidth(savedWidth);
      }
    } catch {
      // Keep the default width when browser storage is unavailable.
    }
  }, [setPanelWidth]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Messages from the embedded app — only our iframe is listened to. Its header
  // has a close button that asks to close the panel, and it reports unread
  // counts per space whenever they change (the frame stays loaded while the
  // panel is closed, so the launcher badge stays live).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === COLLABORATION_CLOSE_MESSAGE_TYPE) {
        close();
        return;
      }
      if (event.data?.type === COLLABORATION_UNREAD_MESSAGE_TYPE) {
        const next = readUnreadBySpaceId(event.data.bySpaceId);
        if (next) setUnreadBySpaceId(next);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [close, setUnreadBySpaceId]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: PointerEvent) => {
      const container = panelRef.current?.parentElement;
      if (!container) return;

      const bounds = container.getBoundingClientRect();
      // `bounds.width` still caps separately: on a narrow window the container
      // is the tighter limit, and the panel must not outgrow it.
      setPanelWidth(Math.min(bounds.width, bounds.right - event.clientX));
    };

    const handleUp = () => setDragging(false);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragging, setDragging, setPanelWidth]);

  // Only needs rebuilding when the context path/entity changes.
  const src = useMemo(
    () => buildCollaborationSrc(context ?? undefined),
    [context],
  );

  // Hand the current context to the embedded app once it has loaded, so it can
  // deep-link. Harmless if the app does not consume it.
  const postContext = () => {
    if (!context) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: COLLABORATION_MESSAGE_TYPE, payload: context },
      '*',
    );
  };

  if (!enabled) return null;

  // A record with no space yet: "Set up space" shows for a few seconds on
  // arrival and then on hover / focus. A record with one: icon only, badged
  // with the space's unread count when there is any.
  const showSetUp = setUpKey !== null;
  const peekingSetUp = showSetUp && peekingKey === setUpKey && !isOpen;
  const unreadCount = launcher?.spaceId
    ? (unreadBySpaceId[launcher.spaceId] ?? 0)
    : 0;
  const launcherLabel = isOpen
    ? 'Close collaboration'
    : !launcher
      ? 'Open collaboration'
      : showSetUp
        ? launcher.label
        : `Open ${launcher.label.toLowerCase()}`;
  const launcherAccessibleName =
    unreadCount > 0 ? `${launcherLabel}, ${unreadCount} unread` : launcherLabel;

  return (
    <>
      {/* Floating button in the product's primary colour, bottom-right, shown
          only on a page with a collaboration target (lead / deal detail). It
          runs that page's action: open the record's space, or set one up. */}
      {launcher ? (
        <button
          type="button"
          onClick={() => (isOpen ? close() : launcher.action())}
          aria-label={launcherAccessibleName}
          aria-expanded={isOpen}
          data-test="collaboration-launcher"
          className={cn(
            'group fixed bottom-6 right-6 z-40 hidden h-12 min-w-12 items-center rounded-full bg-primary px-3.5 text-primary-foreground shadow-lg md:inline-flex',
            'transition hover:bg-primary-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none',
            isOpen && 'pointer-events-none opacity-0',
          )}
        >
          <MessagesSquare
            data-test="collaboration-launcher-icon"
            className="size-5 shrink-0"
            strokeWidth={2}
          />
          {showSetUp ? (
            // Collapsed to zero width rather than unmounted, so it can slide.
            <span
              data-test="collaboration-launcher-label"
              className={cn(
                'overflow-hidden whitespace-nowrap text-sm font-semibold',
                'transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
                peekingSetUp
                  ? 'max-w-40 opacity-100'
                  : 'max-w-0 opacity-0 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:max-w-40 group-focus-visible:opacity-100',
              )}
            >
              <span className="block pl-2 pr-1.5">{launcherLabel}</span>
            </span>
          ) : null}
          {unreadCount > 0 ? (
            <span
              data-test="collaboration-launcher-unread-badge"
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none tabular-nums text-white ring-2 ring-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {!embedded ? null : (
        <aside
          ref={panelRef}
          role="dialog"
          aria-label="Collaboration"
          aria-hidden={!isOpen}
          data-test="collaboration-panel"
          className={cn(
            'relative h-full shrink-0 flex-col border-l border-border bg-surface-card',
            isOpen ? 'hidden md:flex' : 'hidden',
            !dragging &&
              'transition-[width] duration-300 ease-out motion-reduce:transition-none',
          )}
          style={{ width: panelWidth, maxWidth: '100%' }}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize collaboration panel"
            data-test="collaboration-panel-resizer"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
            }}
            className="absolute inset-y-0 left-0 z-30 w-3 cursor-ew-resize touch-none bg-transparent transition hover:bg-slate-300/70 active:bg-slate-400/80"
          />

          {/* No host bar: the embedded app's own header carries the title, the
              ⋯ menu and the close button (it posts COLLABORATION_CLOSE_MESSAGE_TYPE). */}
          <div
            className="relative min-h-0 flex-1 bg-surface-page p-2"
            data-test="collaboration-panel-body"
          >
            {/* Swallows pointer events mid-drag so the iframe cannot capture them. */}
            <div
              className={cn(
                'absolute inset-0 z-20',
                !dragging && 'pointer-events-none',
              )}
              data-test="collaboration-panel-overlay"
            />
            <iframe
              ref={iframeRef}
              src={src}
              title="Selamnew Collaboration"
              onLoad={postContext}
              data-test="collaboration-panel-iframe"
              className="absolute inset-0 size-full border-0"
              allow="camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay"
            />
          </div>
        </aside>
      )}
    </>
  );
}
