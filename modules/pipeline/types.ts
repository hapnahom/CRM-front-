export type PipelineStageCategory = 'open' | 'won' | 'lost' | 'inactive';

export type ActivityType = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  isDefault?: boolean;
  order?: number;
};

export type PipelineStage = {
  id: string;
  name: string;
  category: PipelineStageCategory;
  order: number;
  color?: string | null;
  borderColor?: string | null;
  isConversion?: boolean;
  requiresApproval?: boolean;
  approvalWorkflowId?: string | null;
  expirationDays?: number | null;
  expirationAction?: 'mark_expired' | 'move_to_lost' | null;
  expirationLostStageId?: string | null;
};
