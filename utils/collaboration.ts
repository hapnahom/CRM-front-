/**
 * Configuration + helpers for the Selamnew Collaboration integration.
 *
 * Two separate endpoints are involved and they are easy to confuse:
 *  - COLLABORATION_EMBED_URL is the collaboration *web app*, embedded here as an
 *    <iframe>. On the shared Selamnew origin both apps sit behind the same
 *    reverse proxy (CRM under `/business`, collaboration under `/collaboration`)
 *    and therefore share the Firebase `token` cookie Core sets at login, so the
 *    embedded app boots its own session with no second sign-in.
 *  - COLLABORATION_BACKEND_URL is the collaboration *REST API*, called directly
 *    from CRM the same way the CRM/tenant backends are, to read space templates
 *    and create a space for a lead or deal.
 */

const IS_CORE =
  (process.env.NEXT_PUBLIC_IS_CORE ?? process.env.IS_CORE ?? '')
    .trim()
    .toLowerCase() === 'true';

/**
 * Origin-absolute path (or full URL) the collaboration app is served from.
 * Defaults to `/collaboration` — the reverse-proxy prefix on the shared origin.
 * A cross-origin value cannot read the shared `token` cookie, so SSO bootstrap
 * only works same-origin.
 */
export const COLLABORATION_EMBED_URL = (
  process.env.NEXT_PUBLIC_COLLABORATION_EMBED_URL?.trim() || '/collaboration'
).replace(/\/+$/, '');

/**
 * REST base URL of the collaboration backend, e.g.
 * "http://localhost:5000/api/v1". Empty disables template/space features; the
 * embedded iframe keeps working either way.
 */
export const COLLABORATION_BACKEND_URL = (
  process.env.NEXT_PUBLIC_COLLABORATION_BACKEND_URL ?? ''
)
  .trim()
  .replace(/\/+$/, '');

/**
 * Whether to surface the collaboration launcher/drawer at all. Defaults on when
 * this app runs in Core mode (shared origin → SSO available). Force with
 * NEXT_PUBLIC_COLLABORATION_ENABLED=true|false.
 */
export const COLLABORATION_ENABLED =
  (process.env.NEXT_PUBLIC_COLLABORATION_ENABLED ?? (IS_CORE ? 'true' : ''))
    .trim()
    .toLowerCase() === 'true';

/**
 * `entityType` values CRM sends when linking a collaboration space to one of its
 * records. Collaboration stores the pair verbatim, so these strings are the
 * contract between the two modules.
 */
export const COLLABORATION_LEAD_ENTITY_TYPE = 'lead';
export const COLLABORATION_DEAL_ENTITY_TYPE = 'deal';

export type CollaborationEntityType =
  | typeof COLLABORATION_LEAD_ENTITY_TYPE
  | typeof COLLABORATION_DEAL_ENTITY_TYPE;

/**
 * Context handed to the embedded app when the drawer is opened from a specific
 * CRM record, so it can deep-link to the matching space.
 */
export type CollaborationContext = {
  /** Header title shown above the embed, e.g. "Acme Corp renewal". */
  title?: string;
  /** Short label under the title, e.g. "Deal space". */
  subtitle?: string;
  /** CRM area the context came from, e.g. "leads" | "deals". */
  module?: string;
  /** Stable entity type + id so collaboration can map it to a space. */
  entityType?: string;
  entityId?: string;
  /**
   * Explicit in-app path within the collaboration app to open, e.g.
   * "/spaces?space=123". When set it overrides the default landing route.
   */
  path?: string;
};

/**
 * Any CRM record carrying both ids for one person.
 *
 * CRM and collaboration do NOT share a user id space. A CRM `PlatformUser` has
 * `id` (the CRM's own user row) and `selamnewId` (the Selamnew/org-emp platform
 * id). Collaboration resolves its users from org/emp, so its platform roster —
 * and therefore `createdBy`, `memberIds` and the `userId` header it expects —
 * are keyed on the Selamnew id. Sending the CRM `id` makes every person look
 * like a non-member.
 */
export type CollaborationUserIdCarrier = {
  id?: string | null;
  selamnewId?: string | null;
};

/** The id collaboration knows this person by, or null when CRM has no mapping. */
export function collaborationUserId(
  user?: CollaborationUserIdCarrier | null,
): string | null {
  const selamnewId = user?.selamnewId?.trim();
  return selamnewId ? selamnewId : null;
}

/**
 * Translate CRM user ids into the ids collaboration knows, dropping anyone the
 * directory has no Selamnew id for — collaboration could not match them anyway.
 */
export function collaborationUserIdsFor(
  crmUserIds: string[],
  directory: CollaborationUserIdCarrier[],
): string[] {
  const selamnewIdByCrmId = new Map<string, string>();
  for (const user of directory) {
    const crmId = user?.id?.trim();
    const selamnewId = collaborationUserId(user);
    if (crmId && selamnewId) {
      selamnewIdByCrmId.set(crmId, selamnewId);
    }
  }

  const resolved = crmUserIds
    .map((crmUserId) => selamnewIdByCrmId.get(crmUserId.trim()))
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(resolved));
}

/** postMessage channel name used to hand context to the embedded app. */
export const COLLABORATION_MESSAGE_TYPE = 'selamnew:collaboration:context';

/** postMessage the embedded app sends from its own close button. */
export const COLLABORATION_CLOSE_MESSAGE_TYPE = 'selamnew:embed-close';

/** postMessage carrying the user's unread count per space (`bySpaceId`). */
export const COLLABORATION_UNREAD_MESSAGE_TYPE = 'selamnew:embed-unread';

/** Custom DOM event any CRM component can dispatch to open the drawer. */
export const COLLABORATION_OPEN_EVENT = 'selamnew:collaboration:open';

/**
 * Build the iframe src. Adds `embed=crm` as a host hint, plus lightweight
 * context hints on the query string. The CRM basePath is NOT applied — the
 * embed URL resolves against the origin root.
 */
export function buildCollaborationSrc(context?: CollaborationContext): string {
  const base = COLLABORATION_EMBED_URL;
  const path = context?.path?.trim();
  const target = path && path.startsWith('/') ? `${base}${path}` : base;

  const params = new URLSearchParams({ embed: 'crm' });
  if (context?.entityType) params.set('ctxType', context.entityType);
  if (context?.entityId) params.set('ctxId', context.entityId);
  if (context?.module) params.set('ctxModule', context.module);

  const sep = target.includes('?') ? '&' : '?';
  return `${target}${sep}${params.toString()}`;
}

/** Deep link into the collaboration app for a given space id. */
export function collaborationSpacePath(spaceId: string): string {
  return `/spaces?space=${spaceId}`;
}

/**
 * Fire-and-forget opener usable from anywhere (even non-React code).
 * The dock listens for COLLABORATION_OPEN_EVENT.
 */
export function openCollaboration(context?: CollaborationContext): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CollaborationContext>(COLLABORATION_OPEN_EVENT, {
      detail: context ?? {},
    }),
  );
}
