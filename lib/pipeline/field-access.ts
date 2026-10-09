import { PERMISSIONS, type PermissionSlug } from '@/constants/permissions';

export type PipelineFieldEntity = 'LEAD' | 'DEAL';

export type PipelineFieldGroup =
  | 'core'
  | 'customer'
  | 'value'
  | 'solutions'
  | 'assignment'
  | 'customFields'
  | 'activities'
  | 'comments';

export type PipelineFieldAccessMap = Record<
  PipelineFieldGroup,
  { view: boolean; edit: boolean }
> & {
  createActivity: boolean;
  createComment: boolean;
};

const LEAD_VIEW: Record<PipelineFieldGroup, PermissionSlug> = {
  core: PERMISSIONS.VIEW_LEAD_CORE_FIELDS,
  customer: PERMISSIONS.VIEW_LEAD_CUSTOMER_FIELDS,
  value: PERMISSIONS.VIEW_LEAD_VALUE_FIELDS,
  solutions: PERMISSIONS.VIEW_LEAD_SOLUTIONS,
  assignment: PERMISSIONS.VIEW_LEAD_ASSIGNMENT,
  customFields: PERMISSIONS.VIEW_LEAD_CUSTOM_FIELDS,
  activities: PERMISSIONS.VIEW_LEAD_ACTIVITIES,
  comments: PERMISSIONS.VIEW_LEAD_COMMENTS,
};

const LEAD_EDIT: Record<PipelineFieldGroup, PermissionSlug> = {
  core: PERMISSIONS.EDIT_LEAD_CORE_FIELDS,
  customer: PERMISSIONS.EDIT_LEAD_CUSTOMER_FIELDS,
  value: PERMISSIONS.EDIT_LEAD_VALUE_FIELDS,
  solutions: PERMISSIONS.EDIT_LEAD_SOLUTIONS,
  assignment: PERMISSIONS.EDIT_LEAD_ASSIGNMENT,
  customFields: PERMISSIONS.EDIT_LEAD_CUSTOM_FIELDS,
  activities: PERMISSIONS.EDIT_LEAD_ACTIVITIES,
  comments: PERMISSIONS.EDIT_LEAD_COMMENTS,
};

const DEAL_VIEW: Record<PipelineFieldGroup, PermissionSlug> = {
  core: PERMISSIONS.VIEW_DEAL_CORE_FIELDS,
  customer: PERMISSIONS.VIEW_DEAL_CUSTOMER_FIELDS,
  value: PERMISSIONS.VIEW_DEAL_VALUE_FIELDS,
  solutions: PERMISSIONS.VIEW_DEAL_SOLUTIONS,
  assignment: PERMISSIONS.VIEW_DEAL_ASSIGNMENT,
  customFields: PERMISSIONS.VIEW_DEAL_CUSTOM_FIELDS,
  activities: PERMISSIONS.VIEW_DEAL_ACTIVITIES,
  comments: PERMISSIONS.VIEW_DEAL_COMMENTS,
};

const DEAL_EDIT: Record<PipelineFieldGroup, PermissionSlug> = {
  core: PERMISSIONS.EDIT_DEAL_CORE_FIELDS,
  customer: PERMISSIONS.EDIT_DEAL_CUSTOMER_FIELDS,
  value: PERMISSIONS.EDIT_DEAL_VALUE_FIELDS,
  solutions: PERMISSIONS.EDIT_DEAL_SOLUTIONS,
  assignment: PERMISSIONS.EDIT_DEAL_ASSIGNMENT,
  customFields: PERMISSIONS.EDIT_DEAL_CUSTOM_FIELDS,
  activities: PERMISSIONS.EDIT_DEAL_ACTIVITIES,
  comments: PERMISSIONS.EDIT_DEAL_COMMENTS,
};

const VIEW_UMBRELLA: Record<PipelineFieldEntity, PermissionSlug[]> = {
  LEAD: [
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.VIEW_SALES_HUB,
  ],
  DEAL: [
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.VIEW_SALES_HUB,
  ],
};

const EDIT_UMBRELLA: Record<PipelineFieldEntity, PermissionSlug[]> = {
  LEAD: [PERMISSIONS.EDIT_LEADS],
  DEAL: [PERMISSIONS.EDIT_DEALS],
};

function hasAnyPermission(
  granted: Set<string>,
  slugs: readonly PermissionSlug[],
): boolean {
  return slugs.some((slug) => granted.has(slug));
}

function hasPermission(granted: Set<string>, slug: PermissionSlug): boolean {
  return granted.has(slug);
}

export function canViewFieldGroup(
  granted: Set<string>,
  entity: PipelineFieldEntity,
  group: PipelineFieldGroup,
): boolean {
  if (hasAnyPermission(granted, VIEW_UMBRELLA[entity])) return true;
  if (
    group === 'activities' &&
    hasPermission(granted, PERMISSIONS.VIEW_ACTIVITIES)
  ) {
    return true;
  }
  const viewMap = entity === 'LEAD' ? LEAD_VIEW : DEAL_VIEW;
  const editMap = entity === 'LEAD' ? LEAD_EDIT : DEAL_EDIT;
  if (
    hasPermission(granted, viewMap[group]) ||
    hasPermission(granted, editMap[group])
  ) {
    return true;
  }
  if (group === 'customFields') {
    return (
      hasPermission(granted, PERMISSIONS.VIEW_CUSTOM_FIELDS) ||
      hasPermission(granted, PERMISSIONS.EDIT_CUSTOM_FIELDS)
    );
  }
  return false;
}

export function canEditFieldGroup(
  granted: Set<string>,
  entity: PipelineFieldEntity,
  group: PipelineFieldGroup,
): boolean {
  if (hasAnyPermission(granted, EDIT_UMBRELLA[entity])) return true;
  if (
    group === 'activities' &&
    (hasPermission(granted, PERMISSIONS.CREATE_ACTIVITIES) ||
      hasPermission(granted, PERMISSIONS.EDIT_ACTIVITIES))
  ) {
    return true;
  }
  const editMap = entity === 'LEAD' ? LEAD_EDIT : DEAL_EDIT;
  if (hasPermission(granted, editMap[group])) return true;
  if (group === 'customFields') {
    return hasPermission(granted, PERMISSIONS.EDIT_CUSTOM_FIELDS);
  }
  return false;
}

export function buildPipelineFieldAccessMap(
  granted: Set<string>,
  entity: PipelineFieldEntity,
): PipelineFieldAccessMap {
  const groups = Object.keys(LEAD_VIEW) as PipelineFieldGroup[];
  const map = {} as PipelineFieldAccessMap;

  for (const group of groups) {
    map[group] = {
      view: canViewFieldGroup(granted, entity, group),
      edit: canEditFieldGroup(granted, entity, group),
    };
  }

  map.createActivity =
    canEditFieldGroup(granted, entity, 'activities') ||
    hasPermission(
      granted,
      entity === 'LEAD'
        ? PERMISSIONS.CREATE_LEAD_ACTIVITIES
        : PERMISSIONS.CREATE_DEAL_ACTIVITIES,
    );

  map.createComment =
    canEditFieldGroup(granted, entity, 'comments') ||
    hasPermission(
      granted,
      entity === 'LEAD'
        ? PERMISSIONS.CREATE_LEAD_COMMENTS
        : PERMISSIONS.CREATE_DEAL_COMMENTS,
    );

  return map;
}
