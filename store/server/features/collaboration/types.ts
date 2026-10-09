/**
 * Shapes returned by the collaboration backend, narrowed to what CRM needs when
 * linking a space to one of its records. Kept independent of the collaboration
 * app's own types — this is a cross-service contract.
 */

export type CollaborationChannelType = 'public' | 'private';
export type CollaborationChannelLayout = 'threads' | 'posts';

export type CollaborationTemplateChannel = {
  id: string;
  name: string;
  description?: string | null;
  type: CollaborationChannelType;
  layout: CollaborationChannelLayout;
  position: number;
};

export type CollaborationTemplate = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  channels: CollaborationTemplateChannel[];
};

export type CollaborationSpace = {
  id: string;
  name: string;
  type: 'public' | 'private';
  description?: string | null;
  color?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

/** Ties an already-existing space to a CRM record. */
export type LinkCollaborationSpaceInput = {
  spaceId: string;
  entityType: string;
  entityId: string;
};

export type CreateCollaborationSpaceInput = {
  name: string;
  description?: string;
  type: 'public' | 'private';
  color: string;
  createdBy: string;
  memberIds?: string[];
  /** Template whose channels collaboration creates inside the new space. */
  templateId?: string;
  entityType: string;
  entityId: string;
};
