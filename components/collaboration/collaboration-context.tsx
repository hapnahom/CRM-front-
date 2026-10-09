'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import {
  COLLABORATION_ENABLED,
  COLLABORATION_OPEN_EVENT,
  type CollaborationContext as CollabContext,
} from '@/utils/collaboration';

/**
 * A page's own collaboration target (lead / deal detail), handed to the edge
 * launcher so it acts like that page's entry point and can flag the record.
 */
export type CollaborationLauncher = {
  /** Stable per record, e.g. "deal:<id>"; keys the arrival label. */
  key: string;
  /**
   * Names the target, e.g. "Deal space" or "Set up space". Only the set-up
   * label is shown as text on the launcher; the other feeds its accessible name.
   */
  label: string;
  /** Whether the record already has a space. */
  hasSpace: boolean;
  /** The record's space, when it has one; its unread count badges the launcher. */
  spaceId: string | null;
  /** What clicking the launcher does. */
  action: () => void;
};

type CollaborationController = {
  /** Whether the collaboration feature is available in this deployment. */
  enabled: boolean;
  isOpen: boolean;
  /** Context the panel was last pointed at (drives the header + deep link). */
  context: CollabContext | null;
  open: (context?: CollabContext) => void;
  /**
   * Point the panel at a record without opening it, so the next time the user
   * opens the embed it lands there. Used by screens that have an obvious
   * collaboration target but should not take over the screen on arrival.
   */
  setContext: (context: CollabContext) => void;
  close: () => void;
  toggle: (context?: CollabContext) => void;
  /** The current page's target for the edge launcher; null on other pages. */
  launcher: CollaborationLauncher | null;
  /** Register `launcher`; returns the matching unregister. */
  registerLauncher: (launcher: CollaborationLauncher) => () => void;
};

type CollaborationStore = {
  isOpen: boolean;
  context: CollabContext | null;
  launcher: CollaborationLauncher | null;
  open: (context?: CollabContext) => void;
  setContext: (context: CollabContext) => void;
  close: () => void;
  toggle: (context?: CollabContext) => void;
  registerLauncher: (launcher: CollaborationLauncher) => () => void;
};

const LAST_CONTEXT_STORAGE_KEY = 'selamnew:collaboration:last-context';

const CollaborationCtx = createContext<CollaborationController | null>(null);

function normalizeContext(
  context?: CollabContext | null,
): CollabContext | null {
  if (!context) return null;

  const hasContent = Object.entries(context).some(([, value]) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value != null;
  });

  return hasContent ? context : null;
}

function readStoredContext(): CollabContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(LAST_CONTEXT_STORAGE_KEY);
    if (!stored) return null;
    return normalizeContext(JSON.parse(stored) as CollabContext | null);
  } catch {
    return null;
  }
}

const useCollaborationStore = create<CollaborationStore>((set, get) => ({
  isOpen: false,
  context: readStoredContext(),
  launcher: null,
  registerLauncher: (launcher) => {
    set({ launcher });
    return () => {
      // A page mounting during another's teardown must keep its registration.
      if (get().launcher === launcher) set({ launcher: null });
    };
  },
  open: (next) =>
    set((state) => {
      const resolved = normalizeContext(next) ?? state.context ?? null;
      return { context: resolved, isOpen: true };
    }),
  setContext: (next) =>
    set((state) => {
      const resolved = normalizeContext(next);
      // An empty context must not wipe the one the launcher would reopen with.
      return resolved ? { context: resolved } : state;
    }),
  close: () => set({ isOpen: false }),
  toggle: (next) =>
    set((state) => {
      if (state.isOpen) {
        return { isOpen: false };
      }
      const resolved = normalizeContext(next) ?? state.context ?? null;
      return { context: resolved, isOpen: true };
    }),
}));

/**
 * App-wide controller for the embedded collaboration drawer. Wrap the
 * authenticated shell with this so any screen can call
 * `useCollaboration().open()`. Also bridges the global
 * COLLABORATION_OPEN_EVENT so non-React callers can open it too.
 */
export function CollaborationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isOpen = useCollaborationStore((state) => state.isOpen);
  const context = useCollaborationStore((state) => state.context);
  const open = useCollaborationStore((state) => state.open);
  const setContext = useCollaborationStore((state) => state.setContext);
  const close = useCollaborationStore((state) => state.close);
  const toggle = useCollaborationStore((state) => state.toggle);
  const launcher = useCollaborationStore((state) => state.launcher);
  const registerLauncher = useCollaborationStore(
    (state) => state.registerLauncher,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (context) {
      window.localStorage.setItem(
        LAST_CONTEXT_STORAGE_KEY,
        JSON.stringify(context),
      );
      return;
    }
    window.localStorage.removeItem(LAST_CONTEXT_STORAGE_KEY);
  }, [context]);

  useEffect(() => {
    if (!COLLABORATION_ENABLED) return;
    const handler = (event: Event) => {
      open((event as CustomEvent<CollabContext>).detail);
    };
    window.addEventListener(COLLABORATION_OPEN_EVENT, handler);
    return () => window.removeEventListener(COLLABORATION_OPEN_EVENT, handler);
  }, [open]);

  const value = useMemo<CollaborationController>(
    () => ({
      enabled: COLLABORATION_ENABLED,
      isOpen,
      context,
      open,
      setContext,
      close,
      toggle,
      launcher,
      registerLauncher,
    }),
    [
      isOpen,
      context,
      open,
      setContext,
      close,
      toggle,
      launcher,
      registerLauncher,
    ],
  );

  return (
    <CollaborationCtx.Provider value={value}>
      {children}
    </CollaborationCtx.Provider>
  );
}

export function useCollaboration(): CollaborationController {
  const ctx = useContext(CollaborationCtx);
  if (!ctx) {
    // Safe no-op fallback so consumers never crash outside the provider.
    return {
      enabled: false,
      isOpen: false,
      context: null,
      open: () => {},
      setContext: () => {},
      close: () => {},
      toggle: () => {},
      launcher: null,
      registerLauncher: () => () => {},
    };
  }
  return ctx;
}
