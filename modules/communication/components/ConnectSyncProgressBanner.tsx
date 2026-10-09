'use client';

import React from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatCount(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n)));
}

interface ConnectSyncProgressBannerProps {
  percent: number;
  synced: number;
  total: number;
  email?: string;
  minimized?: boolean;
  stopping?: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onRequestStop: () => void;
  onConfirmStop: () => void;
  onCancelStop: () => void;
  showStopConfirm: boolean;
}

export function ConnectSyncProgressBanner({
  percent,
  synced,
  total,
  email,
  minimized = false,
  stopping = false,
  onMinimize,
  onExpand,
  onRequestStop,
  onConfirmStop,
  onCancelStop,
  showStopConfirm,
}: ConnectSyncProgressBannerProps) {
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
  const safeTotal = Math.max(total, synced, 1);

  if (minimized && !showStopConfirm) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70]">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-white py-1.5 pl-3 pr-1.5 shadow-lg">
          <button
            type="button"
            onClick={onExpand}
            className="flex items-center gap-2.5 rounded-full py-0.5 pr-1 transition-colors hover:opacity-90"
            title="Expand sync progress"
            aria-label="Expand sync progress"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
            <span className="text-[12px] font-semibold text-foreground">
              Syncing {safePercent}%
            </span>
            <Maximize2 size={13} className="text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={onRequestStop}
            disabled={stopping}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            title="Stop syncing and remove mailbox"
            aria-label="Stop syncing"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-4">
      <div className="pointer-events-auto relative w-full max-w-xl rounded-lg border border-border bg-white px-5 py-4 shadow-lg">
        <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
            title="Minimize — keep working in CRM"
            aria-label="Minimize sync progress"
          >
            <Minimize2 size={14} />
          </button>
          <button
            type="button"
            onClick={onRequestStop}
            disabled={stopping}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            title="Stop syncing and remove mailbox"
            aria-label="Stop syncing"
          >
            <X size={14} />
          </button>
        </div>

        <p className="pr-14 text-[15px] font-semibold text-foreground">
          Syncing your emails ({safePercent}%)
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">
          {formatCount(synced)} of {formatCount(safeTotal)} emails synced from
          Inbox and Sent.
          {email ? (
            <>
              {' '}
              <span className="text-muted-foreground">({email})</span>
            </>
          ) : null}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${safePercent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Minimize to keep using CRM while sync continues in the background.
        </p>
      </div>

      {showStopConfirm && (
        <div className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={stopping ? undefined : onCancelStop}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground">
              Stop syncing and remove this mailbox?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Sync is still running. If you stop now, this mailbox connection
              will be{' '}
              <span className="font-medium text-foreground">
                permanently removed
              </span>{' '}
              from CRM, including any emails already synced for{' '}
              <span className="font-medium text-foreground">
                {email || 'this account'}
              </span>
              .
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              You can connect the mailbox again later, but sync will start from
              scratch.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelStop}
                disabled={stopping}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                Continue syncing
              </button>
              <button
                type="button"
                onClick={onConfirmStop}
                disabled={stopping}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors',
                  stopping
                    ? 'cursor-not-allowed bg-red-400'
                    : 'bg-red-600 hover:bg-red-700',
                )}
              >
                {stopping ? 'Removing…' : 'Stop & remove mailbox'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
