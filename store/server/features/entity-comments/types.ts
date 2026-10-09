export type CommentEntityType = 'LEAD' | 'DEAL';

export interface CommentAuthor {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}

export interface CommentMention {
  userId: string;
  user?: CommentAuthor | null;
}

export interface EntityComment {
  id: string;
  entityType: CommentEntityType;
  entityId: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  author: CommentAuthor | null;
  parentCommentId?: string | null;
  replyCount: number;
  replies: EntityComment[];
  mentions: CommentMention[];
  attachments: unknown[];
  reactions: unknown[];
}

export interface PaginatedComments {
  data: EntityComment[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface CreateCommentPayload {
  content: string;
  mentions?: string[];
}

export interface UpdateCommentPayload {
  content: string;
  mentions?: string[];
}

export const COMMENT_CONTENT_MAX_LENGTH = 5000;
