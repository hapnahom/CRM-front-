'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Globe, Link2, Lock, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useCollaborationSpaces } from '@/store/server/features/collaboration/queries';
import { useLinkCollaborationSpace } from '@/store/server/features/collaboration/mutations';
import { readCollaborationErrorMessage } from '@/store/server/features/collaboration/api';
import type { CollaborationSpace } from '@/store/server/features/collaboration/types';
import { EntityCollaborationStep } from '@/components/collaboration/entity-collaboration-step';

/**
 * CRM's brand accent, so this dialog reads as part of this product — same
 * values as entity-collaboration-step.
 */
const COLLAB_TEXT = 'text-collab';
const COLLAB_TEXT_MUTED = 'text-collab/60';
const COLLAB_TEXT_HINT = 'text-collab/45';
const COLLAB_CARD_SELECTED =
  'border-collab/25 bg-white text-collab shadow-sm ring-1 ring-collab/10';
const COLLAB_CARD_IDLE =
  'border-collab/10 bg-collab-tint/40 text-collab/55 hover:border-collab/20';

type LinkCollaborationSpaceDialogMode = 'choose' | 'link' | 'create';

type LinkCollaborationSpaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'lead' | 'deal' — stored verbatim by collaboration as entityType. */
  entityType: string;
  entityId: string;
  entityName: string;
  /** Human label used in copy, e.g. "lead". */
  entityLabel: string;
  /** Responsible + observer user ids, seeded into a private space. CRM ids. */
  memberUserIds?: string[];
  /** Called once the record has a space, so the caller can open the embed. */
  onLinked: () => void;
};

/**
 * Shown when a lead or deal has no collaboration space yet and the user asks
 * for one. Offers the two ways out of that state: adopt a space that already
 * exists (a team space the record should just live in), or create a fresh one
 * from a template — the same step the create dialogs use.
 */
export function LinkCollaborationSpaceDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  entityLabel,
  memberUserIds = [],
  onLinked,
}: LinkCollaborationSpaceDialogProps) {
  const [mode, setMode] = useState<LinkCollaborationSpaceDialogMode>('choose');
  const [search, setSearch] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Reopening starts at the fork rather than where the last visit left off —
  // the two paths are unrelated choices, not a wizard.
  useEffect(() => {
    if (!open) return;
    setMode('choose');
    setSearch('');
    setSelectedSpaceId(null);
    setLinkError(null);
  }, [open]);

  const spacesQuery = useCollaborationSpaces(open && mode === 'link');
  const linkSpaceMutation = useLinkCollaborationSpace();
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const users = useMemo(
    () => platformUsersData?.data ?? [],
    [platformUsersData?.data],
  );

  // A space already tied to another record is not offered: collaboration
  // refuses to move it, and both records would otherwise claim the same space.
  const linkableSpaces = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (spacesQuery.data ?? [])
      .filter((space) => !space.entityType && !space.entityId)
      .filter((space) =>
        term ? space.name.toLowerCase().includes(term) : true,
      );
  }, [search, spacesQuery.data]);

  const selectedSpace =
    linkableSpaces.find((space) => space.id === selectedSpaceId) ?? null;

  async function handleLinkSpace() {
    if (!selectedSpace) return;
    setLinkError(null);
    try {
      await linkSpaceMutation.mutateAsync({
        spaceId: selectedSpace.id,
        entityType,
        entityId,
      });
      onLinked();
      onOpenChange(false);
    } catch (error) {
      setLinkError(
        readCollaborationErrorMessage(
          error,
          'Failed to link the collaboration space.',
        ),
      );
    }
  }

  const isLinking = linkSpaceMutation.isLoading;
  const spacesError = spacesQuery.error
    ? readCollaborationErrorMessage(
        spacesQuery.error,
        'Failed to load collaboration spaces.',
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        data-test="link-collaboration-space-dialog"
      >
        <DialogHeader>
          <DialogTitle className={COLLAB_TEXT}>
            {mode === 'create'
              ? 'Create a collaboration space'
              : mode === 'link'
                ? 'Link an existing space'
                : 'Set up collaboration'}
          </DialogTitle>
          <DialogDescription className={COLLAB_TEXT_MUTED}>
            {entityName}
          </DialogDescription>
        </DialogHeader>

        {mode === 'choose' ? (
          <div className="space-y-4" data-test="link-collaboration-choose">
            <p className={cn('text-sm', COLLAB_TEXT_MUTED)}>
              This {entityLabel} has no collaboration space yet. Pick a space it
              should use, or create one for it.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ChoiceCard
                icon={
                  <Link2 className="mt-0.5 size-4 shrink-0 text-collab/55" />
                }
                label="Link an existing space"
                hint="Use a space your team already has"
                onSelect={() => setMode('link')}
                dataTest="link-collaboration-choose-link"
              />
              <ChoiceCard
                icon={
                  <Plus className="mt-0.5 size-4 shrink-0 text-collab/55" />
                }
                label="Create a new space"
                hint="Start from a collaboration template"
                onSelect={() => setMode('create')}
                dataTest="link-collaboration-choose-create"
              />
            </div>
          </div>
        ) : null}

        {mode === 'link' ? (
          <div className="space-y-3" data-test="link-collaboration-link">
            <div className="relative">
              <Search
                className={cn(
                  'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2',
                  COLLAB_TEXT_HINT,
                )}
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search spaces"
                aria-label="Search collaboration spaces"
                className="h-10 pl-9"
                data-test="link-collaboration-search"
              />
            </div>

            <div
              className="max-h-[min(46vh,360px)] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
              data-test="link-collaboration-space-list"
            >
              {spacesError ? (
                <p className="text-xs text-destructive">{spacesError}</p>
              ) : spacesQuery.isLoading ? (
                <p className={cn('text-xs', COLLAB_TEXT_HINT)}>
                  Loading spaces...
                </p>
              ) : linkableSpaces.length === 0 ? (
                <p className={cn('text-xs', COLLAB_TEXT_HINT)}>
                  {search.trim()
                    ? 'No space matches that search.'
                    : 'You have no space that is free to link. Create a new one instead.'}
                </p>
              ) : (
                linkableSpaces.map((space) => (
                  <SpaceRow
                    key={space.id}
                    space={space}
                    selected={space.id === selectedSpaceId}
                    onSelect={() => {
                      setSelectedSpaceId(space.id);
                      setLinkError(null);
                    }}
                  />
                ))
              )}
            </div>

            {linkError ? (
              <p className="text-sm text-destructive">{linkError}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={isLinking}
                onClick={() => setMode('choose')}
                data-test="link-collaboration-back"
              >
                Back
              </Button>
              <Button
                type="button"
                className="bg-collab text-white hover:bg-collab-strong"
                disabled={isLinking || !selectedSpace}
                onClick={() => void handleLinkSpace()}
                data-test="link-collaboration-submit"
              >
                {isLinking ? 'Linking space...' : 'Link space'}
              </Button>
            </div>
          </div>
        ) : null}

        {mode === 'create' ? (
          <EntityCollaborationStep
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            entityLabel={entityLabel}
            memberUserIds={memberUserIds}
            directory={users}
            onDone={() => {
              onLinked();
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({
  icon,
  label,
  hint,
  onSelect,
  dataTest,
}: {
  /** Rendered element rather than a component type, so the caller owns sizing. */
  icon: React.ReactNode;
  label: string;
  hint: string;
  onSelect: () => void;
  dataTest: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition',
        COLLAB_CARD_IDLE,
      )}
      data-test={dataTest}
    >
      {icon}
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', COLLAB_TEXT)}>
          {label}
        </span>
        <span className={cn('block text-[11px]', COLLAB_TEXT_HINT)}>
          {hint}
        </span>
      </span>
    </button>
  );
}

function SpaceRow({
  space,
  selected,
  onSelect,
}: {
  space: CollaborationSpace;
  selected: boolean;
  onSelect: () => void;
}) {
  const VisibilityIcon = space.type === 'private' ? Lock : Globe;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition',
        selected ? COLLAB_CARD_SELECTED : COLLAB_CARD_IDLE,
      )}
      data-test={`link-collaboration-space-${space.id}`}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-collab-tint/70"
        style={
          space.color ? { backgroundColor: `${space.color}22` } : undefined
        }
      >
        <VisibilityIcon className="size-4 text-collab/60" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn('block truncate text-sm font-semibold', COLLAB_TEXT)}
        >
          {space.name}
        </span>
        <span className={cn('block truncate text-[11px]', COLLAB_TEXT_HINT)}>
          {space.description?.trim()
            ? space.description
            : `${space.type === 'private' ? 'Private' : 'Public'} space`}
        </span>
      </span>
      {selected ? <Check className="size-4 shrink-0 text-collab" /> : null}
    </button>
  );
}
