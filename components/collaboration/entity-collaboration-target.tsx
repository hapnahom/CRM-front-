'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCollaboration } from '@/components/collaboration/collaboration-context';
import { LinkCollaborationSpaceDialog } from '@/components/collaboration/link-collaboration-space-dialog';
import { useCollaborationSpacesForEntity } from '@/store/server/features/collaboration/queries';
import {
  collaborationSpacePath,
  type CollaborationContext,
  type CollaborationEntityType,
} from '@/utils/collaboration';

type EntityCollaborationTargetProps = {
  /** 'lead' | 'deal' — the pair collaboration stored the space under. */
  entityType: CollaborationEntityType;
  entityId: string;
  /** Record name, used as the panel header title. */
  entityName?: string;
  /** CRM area the context came from, e.g. "leads". */
  module: string;
  /** Line under the title in the panel header, e.g. "Deal space". */
  subtitle: string;
  /** Human label used in the setup dialog's copy, e.g. "deal". */
  entityLabel: string;
  /** Responsible + observer user ids, seeded into a space created from here. */
  memberUserIds?: string[];
};

/**
 * Detail-page entry point into the collaboration space linked to a lead or deal
 * (the space collaboration stored with this entityType + id). Renders no button
 * of its own: while mounted it takes over the floating launcher, which reads
 * "Set up space" for a record without one and badges a record that has one
 * with its unread count (see CollaborationDock).
 *
 * Two things happen here:
 *  - the embed is silently *pointed* at the record's space, so whenever the user
 *    opens it it is already on the right space rather than the collaboration
 *    home;
 *  - the launcher opens it on demand. Arriving on a detail page deliberately
 *    does not open the panel itself: it is an inline panel that narrows the
 *    page, and taking half the screen on every record visit is not something
 *    the user asked for by navigating.
 *
 * While the panel is open the target is left alone — retargeting would navigate
 * the iframe out from under whatever the user is reading. It is applied on the
 * next close instead. Clicking the launcher is the exception: that is an
 * explicit request for this record's space, so it retargets immediately.
 *
 * When the record has no space yet the stored context is left untouched (so the
 * embed keeps whatever the user was last looking at) and the launcher opens a
 * dialog to link an existing space or create one.
 */
export function EntityCollaborationTarget({
  entityType,
  entityId,
  entityName,
  module,
  subtitle,
  entityLabel,
  memberUserIds = [],
}: EntityCollaborationTargetProps) {
  const { enabled, isOpen, open, setContext, registerLauncher } =
    useCollaboration();
  const targetedSpaceIdRef = useRef<string | null>(null);
  // Set when the user has just linked or created a space from the dialog, so
  // the embed opens on it as soon as the linked-space query catches up — the
  // space id is not known until then.
  const openWhenLinkedRef = useRef(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const linkedSpacesQuery = useCollaborationSpacesForEntity({
    entityType,
    entityId,
    enabled,
  });
  const linkedSpace = linkedSpacesQuery.data?.[0] ?? null;
  const linkedSpaceResolved = linkedSpacesQuery.isFetched;

  const context = useMemo<CollaborationContext | null>(() => {
    if (!linkedSpace) return null;
    return {
      title: entityName?.trim() || linkedSpace.name,
      subtitle,
      module,
      entityType,
      entityId,
      path: collaborationSpacePath(linkedSpace.id),
    };
  }, [entityId, entityName, entityType, linkedSpace, module, subtitle]);

  useEffect(() => {
    if (!enabled || !linkedSpace || !context) return;

    // The user asked for this space moments ago, so take over the screen with
    // it rather than waiting for another click.
    if (openWhenLinkedRef.current) {
      openWhenLinkedRef.current = false;
      targetedSpaceIdRef.current = linkedSpace.id;
      open(context);
      return;
    }

    // Panel open: leave it where the user put it. The ref is deliberately not
    // marked, so closing the panel re-runs this and applies the target then.
    if (isOpen) return;
    if (targetedSpaceIdRef.current === linkedSpace.id) return;

    targetedSpaceIdRef.current = linkedSpace.id;
    setContext(context);
  }, [context, enabled, isOpen, linkedSpace, open, setContext]);

  const handleOpen = useCallback(() => {
    if (context) open(context);
    else setIsSetupOpen(true);
  }, [context, open]);

  // Registered once the lookup settles, so the launcher never flashes "Set up
  // space" for a record whose space is still loading.
  useEffect(() => {
    if (!enabled || !linkedSpaceResolved) return;
    return registerLauncher({
      key: `${entityType}:${entityId}`,
      label: context ? subtitle : 'Set up space',
      hasSpace: Boolean(context),
      spaceId: linkedSpace?.id ?? null,
      action: handleOpen,
    });
  }, [
    context,
    enabled,
    entityId,
    entityType,
    handleOpen,
    linkedSpace?.id,
    linkedSpaceResolved,
    registerLauncher,
    subtitle,
  ]);

  if (!enabled) return null;

  return (
    <LinkCollaborationSpaceDialog
      open={isSetupOpen}
      onOpenChange={setIsSetupOpen}
      entityType={entityType}
      entityId={entityId}
      entityName={entityName?.trim() || `This ${entityLabel}`}
      entityLabel={entityLabel}
      memberUserIds={memberUserIds}
      onLinked={() => {
        openWhenLinkedRef.current = true;
      }}
    />
  );
}
