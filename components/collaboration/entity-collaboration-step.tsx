'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Globe,
  LayoutTemplate,
  Lock,
  Megaphone,
  MessagesSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useCreateCollaborationSpace } from '@/store/server/features/collaboration/mutations';
import {
  useCollaborationActiveMemberIds,
  useCollaborationSpacesForEntity,
  useCollaborationTemplates,
} from '@/store/server/features/collaboration/queries';
import {
  currentCollaborationUserId,
  readCollaborationErrorMessage,
} from '@/store/server/features/collaboration/api';
import type { CollaborationTemplate } from '@/store/server/features/collaboration/types';
import {
  COLLABORATION_BACKEND_URL,
  collaborationUserId,
  collaborationUserIdsFor,
  type CollaborationUserIdCarrier,
} from '@/utils/collaboration';

/**
 * Collaboration indigo accent, so this step matches the dock and the embedded
 * Collaboration app. CRM keeps orange brand; `collab` maps to the indigo triples
 * in styles/tokens.css. Held as named constants because Tailwind only generates
 * classes it can see as complete strings in source.
 */
const COLLAB_TEXT = 'text-collab';
const COLLAB_TEXT_MUTED = 'text-collab/60';
const COLLAB_TEXT_HINT = 'text-collab/45';
const COLLAB_CARD_SELECTED =
  'border-collab/25 bg-white text-collab shadow-sm ring-1 ring-collab/10';
const COLLAB_CARD_IDLE =
  'border-collab/10 bg-collab-tint/40 text-collab/55 hover:border-collab/20';

/**
 * Space colours picked from collaboration's own swatch list, so a space created
 * here matches what collaboration's space settings offer.
 */
// eslint-disable-next-line no-restricted-syntax -- collaboration's palette, not a CRM token
const LEAD_SPACE_COLOR = '#0ea5e9';
// eslint-disable-next-line no-restricted-syntax -- collaboration's palette, not a CRM token
const DEAL_SPACE_COLOR = '#8b5cf6';

type EntityCollaborationStepProps = {
  /** 'lead' | 'deal' — stored verbatim by collaboration as entityType. */
  entityType: string;
  entityId: string;
  entityName: string;
  /** Human label used in copy, e.g. "lead". */
  entityLabel: string;
  /** Responsible + observer user ids, seeded into a private space. CRM ids. */
  memberUserIds?: string[];
  /**
   * Platform users, used to translate the CRM ids above into the Selamnew ids
   * collaboration knows people by. Without it nobody can be matched.
   */
  directory?: CollaborationUserIdCarrier[];
  onDone: () => void;
};

export function EntityCollaborationStep({
  entityType,
  entityId,
  entityName,
  entityLabel,
  memberUserIds = [],
  directory = [],
  onDone,
}: EntityCollaborationStepProps) {
  const crmUserId = useAuthenticationStore((state) => state.userId);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const templatesQuery = useCollaborationTemplates();
  const activeMemberIdsQuery = useCollaborationActiveMemberIds();
  const createSpace = useCreateCollaborationSpace();

  // Guards the retry case where the POST landed but the response never did:
  // re-running the step would otherwise give the record a second space.
  const linkedSpacesQuery = useCollaborationSpacesForEntity({
    entityType,
    entityId,
  });
  const linkedSpace = linkedSpacesQuery.data?.[0] ?? null;

  const templates = useMemo(
    () => templatesQuery.data ?? [],
    [templatesQuery.data],
  );
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;

  /**
   * Everything below works in collaboration's id space, never CRM's: the ids are
   * translated through the directory first (see collaborationUserIdsFor).
   * Comparing raw CRM ids against collaboration's roster matches nobody.
   */
  const currentUserId = useMemo(() => {
    const fromDirectory = collaborationUserId(
      directory.find((user) => user?.id === crmUserId),
    );
    return fromDirectory ?? currentCollaborationUserId();
  }, [crmUserId, directory]);

  // Collaboration only accepts space members holding an ACTIVE platform
  // membership; anyone else is rejected with "User is not an active
  // collaboration platform member". Resolve that here so the step can warn and
  // carry on rather than surfacing a mid-create failure.
  const recordMemberIds = useMemo(
    () =>
      collaborationUserIdsFor(memberUserIds.filter(Boolean), directory).filter(
        (userId) => userId !== currentUserId,
      ),
    [currentUserId, directory, memberUserIds],
  );
  // An empty roster means "unknown", never "nobody is a member". A tenant with
  // zero active collaboration members is not a real state, and an empty array is
  // indistinguishable from a response we could not parse — treating it as
  // authoritative would flag every person and block creation for no reason.
  const activeMemberIds = activeMemberIdsQuery.data;
  const activeMemberIdSet =
    activeMemberIds && activeMemberIds.length > 0
      ? new Set(activeMemberIds)
      : null;

  // Until the roster loads, assume everyone is eligible — the backend filters
  // non-members out anyway, so the warning is an explanation, not a gate.
  const eligibleMemberIds = activeMemberIdSet
    ? recordMemberIds.filter((userId) => activeMemberIdSet.has(userId))
    : recordMemberIds;
  const excludedMemberIds = activeMemberIdSet
    ? recordMemberIds.filter((userId) => !activeMemberIdSet.has(userId))
    : [];

  /** The creator is added as space admin first, so this blocks creation entirely. */
  const isCreatorInactive = Boolean(
    activeMemberIdSet && currentUserId && !activeMemberIdSet.has(currentUserId),
  );

  const isCollaborationConfigured = Boolean(COLLABORATION_BACKEND_URL);
  const templatesError = !isCollaborationConfigured
    ? 'Collaboration backend URL is not configured, so templates cannot be loaded.'
    : templatesQuery.error
      ? readCollaborationErrorMessage(
          templatesQuery.error,
          'Failed to load collaboration templates.',
        )
      : null;

  const spaceColor =
    entityType === 'deal' ? DEAL_SPACE_COLOR : LEAD_SPACE_COLOR;

  const handleCreateSpace = () => {
    if (!currentUserId) {
      setSubmitError('Your user could not be resolved. Sign in again.');
      return;
    }

    setSubmitError(null);
    createSpace.mutate(
      {
        name: entityName,
        type: visibility,
        color: spaceColor,
        createdBy: String(currentUserId),
        // Public spaces get the whole platform roster from collaboration; only
        // private ones need the record's people spelled out — and only those
        // collaboration will actually accept.
        memberIds: visibility === 'private' ? eligibleMemberIds : undefined,
        templateId: selectedTemplateId ?? undefined,
        entityType,
        entityId,
      },
      {
        onSuccess: () => onDone(),
        onError: (error: unknown) =>
          setSubmitError(
            readCollaborationErrorMessage(
              error,
              'Failed to create the collaboration space.',
            ),
          ),
      },
    );
  };

  const isSubmitting = createSpace.isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-test="collab-step">
      <div className="max-h-[min(52vh,480px)] space-y-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
        <p className={cn('text-sm', COLLAB_TEXT_MUTED)}>
          <span className={cn('font-semibold', COLLAB_TEXT)}>{entityName}</span>{' '}
          was created. Pick a collaboration template to set up its space and
          channels, or skip and do it later.
        </p>

        {linkedSpace ? (
          <p
            className={cn(
              'rounded-lg border border-collab/10 bg-collab-tint/30 p-3 text-xs',
              COLLAB_TEXT_MUTED,
            )}
          >
            This {entityLabel} is already linked to the collaboration space{' '}
            <span className={cn('font-semibold', COLLAB_TEXT)}>
              {linkedSpace.name}
            </span>
            .
          </p>
        ) : null}

        {isCreatorInactive ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/70 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-900">
              You are not an active collaboration platform member, so a space
              cannot be created under your account. Ask an admin to activate
              your collaboration membership, then set the space up from
              Collaboration.
            </p>
          </div>
        ) : null}

        {visibility === 'private' && excludedMemberIds.length > 0 ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/70 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900">
                {excludedMemberIds.length === 1
                  ? '1 person on this ' +
                    entityLabel +
                    ' is not an active collaboration platform member'
                  : `${excludedMemberIds.length} people on this ${entityLabel} are not active collaboration platform members`}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                The space will be created without them
                {eligibleMemberIds.length > 0
                  ? `, with the other ${eligibleMemberIds.length}`
                  : ''}
                . An admin can invite them to Collaboration and add them to the
                space later.
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <p className={cn('mb-2 text-xs font-medium', COLLAB_TEXT_MUTED)}>
            Space visibility
          </p>
          <div className="flex gap-3">
            <OptionCard
              icon={<Lock className="mt-0.5 size-4 shrink-0 text-collab/55" />}
              label="Private"
              hint={`${entityLabel} team only`}
              selected={visibility === 'private'}
              onSelect={() => setVisibility('private')}
            />
            <OptionCard
              icon={<Globe className="mt-0.5 size-4 shrink-0 text-collab/55" />}
              label="Public"
              hint="Everyone in the workspace"
              selected={visibility === 'public'}
              onSelect={() => setVisibility('public')}
            />
          </div>
        </div>

        <div>
          <p className={cn('mb-2 text-xs font-medium', COLLAB_TEXT_MUTED)}>
            Template
          </p>

          {templatesError ? (
            <p className="text-xs text-destructive">{templatesError}</p>
          ) : templatesQuery.isLoading ? (
            <p className={cn('text-xs', COLLAB_TEXT_HINT)}>
              Loading templates...
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <TemplateCard
                name="No template"
                meta="Create an empty space"
                selected={selectedTemplateId === null}
                onSelect={() => setSelectedTemplateId(null)}
              />
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  name={template.name}
                  meta={
                    template.description ??
                    `${template.channels.length} ${
                      template.channels.length === 1 ? 'channel' : 'channels'
                    }`
                  }
                  selected={template.id === selectedTemplateId}
                  onSelect={() => setSelectedTemplateId(template.id)}
                />
              ))}
            </div>
          )}

          {templates.length === 0 &&
          !templatesQuery.isLoading &&
          !templatesError ? (
            <p className={cn('mt-2 text-xs', COLLAB_TEXT_HINT)}>
              No collaboration templates have been published yet. An admin can
              add them under Collaboration → Admin Console → Templates.
            </p>
          ) : null}
        </div>

        {selectedTemplate ? (
          <TemplateChannelPreview template={selectedTemplate} />
        ) : null}

        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onDone}
        >
          {linkedSpace ? 'Close' : 'Skip for now'}
        </Button>
        <Button
          type="button"
          className="bg-collab text-white hover:bg-collab-strong"
          disabled={
            isSubmitting ||
            !isCollaborationConfigured ||
            isCreatorInactive ||
            Boolean(linkedSpace)
          }
          onClick={handleCreateSpace}
        >
          {isSubmitting ? 'Creating space…' : 'Create space'}
        </Button>
      </div>
    </div>
  );
}

function OptionCard({
  icon,
  label,
  hint,
  selected,
  onSelect,
}: {
  /** Rendered element rather than a component type, so the caller owns sizing. */
  icon: React.ReactNode;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-1 items-start gap-2.5 rounded-lg border p-3 text-left text-sm font-medium transition',
        selected ? COLLAB_CARD_SELECTED : COLLAB_CARD_IDLE,
      )}
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

function TemplateCard({
  name,
  meta,
  selected,
  onSelect,
}: {
  name: string;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={meta}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition',
        selected ? COLLAB_CARD_SELECTED : COLLAB_CARD_IDLE,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-collab-tint/70 text-collab/60">
        <LayoutTemplate className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn('block truncate text-sm font-semibold', COLLAB_TEXT)}
        >
          {name}
        </span>
        <span className={cn('block truncate text-[11px]', COLLAB_TEXT_HINT)}>
          {meta}
        </span>
      </span>
      {selected ? <Check className="size-4 shrink-0 text-collab" /> : null}
    </button>
  );
}

function TemplateChannelPreview({
  template,
}: {
  template: CollaborationTemplate;
}) {
  if (template.channels.length === 0) return null;

  return (
    <div>
      <p className={cn('mb-2 text-xs font-medium', COLLAB_TEXT_MUTED)}>
        Channels that will be created
      </p>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-collab/10 bg-collab-tint/30 p-2.5">
        {template.channels.map((channel) => {
          const AccessIcon = channel.type === 'public' ? Globe : Lock;
          const LayoutIcon =
            channel.layout === 'posts' ? Megaphone : MessagesSquare;
          return (
            <span
              key={channel.id}
              title={`${channel.type} · ${channel.layout}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-collab/10 bg-white px-2 py-1 text-[11px] font-medium text-collab/70"
            >
              <AccessIcon className="size-3 text-collab/45" />#{channel.name}
              <LayoutIcon className="size-3 text-collab/35" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
