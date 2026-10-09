'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  StageTransitionModal,
  type StageTransitionRequest,
} from '@/components/pipeline/StageTransitionModal';
import { checkStageTransition } from '@/store/server/features/entity-fields/values';
import {
  preflightApprovalWorkflow,
  type PipelineApprovalEntityType,
} from '@/store/server/features/pipeline/approvals';
import {
  fetchPipelineRoleAssignments,
  fetchPipelineRolesForStage,
  type PipelineRoleAssignmentEntityType,
} from '@/store/server/features/pipeline-roles/queries';
import {
  hasMissingRequiredRoleAssignments,
  mapAssignmentsFromQuery,
} from '@/components/pipeline/EntityAssignmentRolesFields';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import type { StageMovementPolicy } from '@/store/server/features/pipeline/settings';
import {
  isStageMoveAllowed,
  stageMoveBlockedReason,
} from '@/lib/pipeline/stage-movement';

interface UseStageTransitionGateOptions {
  entityType: BackendEntityType;
  onTransition: (payload: {
    entityId: string;
    stageId: string;
    fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
    roleAssignments?: Array<{ roleId: string; userId: string }>;
    allowValidationException?: boolean;
    validationSummary?: string;
    validationExceptionFieldIds?: string[];
    exactValue?: number;
    solutionExactAmounts?: Array<{ solutionId: string; exactAmount: number }>;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
  getEntityName?: (entityId: string) => string | undefined;
  getStageName?: (stageId: string) => string | undefined;
  getStageMeta?: (stageId: string) => {
    requiresApproval?: boolean;
    approvalWorkflowId?: string | null;
    category?: 'open' | 'won' | 'lost' | 'inactive';
  };
  /** Current pipeline stage id for the entity being moved. */
  getEntityStageId?: (entityId: string) => string | undefined;
  /** Responsible owner used to resolve dynamic approvers. */
  getOwnerUserId?: (entityId: string) => string | null | undefined;
  movementPolicy?: StageMovementPolicy;
  getStageOrder?: (stageId: string) => number | undefined;
  isPendingApproval?: (entityId: string) => boolean;
  onBlocked?: (message: string) => void;
}

/**
 * Reusable gate for Lead/Deal stage moves (kanban, table, future workflows).
 * Checks movement policy and pending-approval locks first, then backend
 * requirements; opens a modal when cumulative stage fields are still unfilled
 * (optional or required), fail validation rules, or the destination stage
 * requires approval / role assignment / won exact values.
 */
export function useStageTransitionGate({
  entityType,
  onTransition,
  isSubmitting,
  getEntityName,
  getStageName,
  getStageMeta,
  getEntityStageId,
  getOwnerUserId,
  movementPolicy,
  getStageOrder,
  isPendingApproval,
  onBlocked,
}: UseStageTransitionGateOptions) {
  const { tenantId } = useAuthenticationStore();
  const [request, setRequest] = useState<StageTransitionRequest | null>(null);
  const [checking, setChecking] = useState(false);

  const notifyBlocked = useCallback(
    (message: string) => {
      if (onBlocked) {
        onBlocked(message);
        return;
      }
      toast.error(message);
    },
    [onBlocked],
  );

  const openModal = useCallback(
    (entityId: string, stageId: string) => {
      const meta = getStageMeta?.(stageId);
      setRequest({
        entityType,
        entityId,
        stageId,
        entityName: getEntityName?.(entityId),
        stageName: getStageName?.(stageId),
        stageCategory: meta?.category,
        requiresApproval: Boolean(meta?.requiresApproval),
        hasApprover: Boolean(meta?.approvalWorkflowId),
        approvalStepCount: meta?.approvalWorkflowId ? 1 : 0,
        approvalWorkflowId: meta?.approvalWorkflowId ?? null,
        ownerUserId: getOwnerUserId?.(entityId) ?? null,
      });
    },
    [entityType, getEntityName, getStageName, getStageMeta, getOwnerUserId],
  );

  const requestStageChange = useCallback(
    async (entityId: string, stageId: string) => {
      if (isPendingApproval?.(entityId)) {
        notifyBlocked(
          'This item is locked pending approval and cannot change stages.',
        );
        return false;
      }

      const fromStageId = getEntityStageId?.(entityId);
      if (
        movementPolicy &&
        movementPolicy !== 'any' &&
        getStageOrder &&
        fromStageId
      ) {
        const fromOrder = getStageOrder(fromStageId);
        const toOrder = getStageOrder(stageId);
        if (
          typeof fromOrder === 'number' &&
          typeof toOrder === 'number' &&
          !isStageMoveAllowed(movementPolicy, fromOrder, toOrder)
        ) {
          const fromName = getStageName?.(fromStageId) ?? 'current stage';
          const toName = getStageName?.(stageId) ?? 'selected stage';
          notifyBlocked(
            stageMoveBlockedReason(movementPolicy, fromName, toName),
          );
          return false;
        }
      }

      const meta = getStageMeta?.(stageId);
      const requiresApproval = Boolean(meta?.requiresApproval);
      const requiresWonExactValues =
        entityType === 'DEAL' && meta?.category === 'won';

      if (!tenantId) {
        if (requiresApproval || requiresWonExactValues) {
          openModal(entityId, stageId);
          return true;
        }
        await onTransition({ entityId, stageId });
        return true;
      }

      setChecking(true);
      try {
        const roleEntityType: PipelineRoleAssignmentEntityType =
          entityType === 'DEAL' ? 'DEAL' : 'LEAD';
        const [result, rolesForStage, assignmentRows] = await Promise.all([
          checkStageTransition(tenantId, {
            entityType,
            entityId,
            stageId,
          }),
          fetchPipelineRolesForStage(roleEntityType, stageId).catch(() => []),
          fetchPipelineRoleAssignments(roleEntityType, entityId).catch(
            () => [],
          ),
        ]);
        const existingAssignments = mapAssignmentsFromQuery(assignmentRows);
        const hasAssignmentRoles = hasMissingRequiredRoleAssignments(
          rolesForStage,
          existingAssignments,
        );
        const hasUnfilledFields = (result.unfilledFieldIds?.length ?? 0) > 0;

        // Prompt whenever cumulative stage fields are still empty (optional or
        // required). Once filled, later stages skip those fields.
        if (
          result.valid &&
          !hasUnfilledFields &&
          !requiresApproval &&
          !hasAssignmentRoles &&
          !requiresWonExactValues
        ) {
          await onTransition({ entityId, stageId });
          return true;
        }

        // Already-approved target stage: skip the modal unless fields / won extras remain.
        if (
          result.valid &&
          !hasUnfilledFields &&
          requiresApproval &&
          meta?.approvalWorkflowId &&
          !hasAssignmentRoles &&
          !requiresWonExactValues
        ) {
          try {
            const approvalEntityType: PipelineApprovalEntityType =
              entityType === 'DEAL' ? 'DEAL' : 'LEAD';
            const preflight = await preflightApprovalWorkflow(
              meta.approvalWorkflowId,
              {
                entityType: approvalEntityType,
                entityId,
                ownerUserId: getOwnerUserId?.(entityId) ?? null,
                triggerType: 'stage_approval',
                pendingTargetStageId: stageId,
              },
            );
            if (preflight.bypassApproval) {
              await onTransition({ entityId, stageId });
              return true;
            }
          } catch {
            // Fall through to modal; backend remains source of truth.
          }
        }

        openModal(entityId, stageId);
        return true;
      } catch {
        // If the check fails (network), still attempt the transition so the
        // backend remains the source of truth and surfaces errors — unless
        // the stage explicitly requires approval and we should confirm first.
        if (requiresApproval || requiresWonExactValues) {
          openModal(entityId, stageId);
        } else {
          await onTransition({ entityId, stageId });
        }
        return true;
      } finally {
        setChecking(false);
      }
    },
    [
      tenantId,
      entityType,
      onTransition,
      getStageMeta,
      getOwnerUserId,
      openModal,
      isPendingApproval,
      getEntityStageId,
      movementPolicy,
      getStageOrder,
      getStageName,
      notifyBlocked,
    ],
  );

  const modal = (
    <StageTransitionModal
      open={!!request}
      request={request}
      onOpenChange={(open) => {
        if (!open) setRequest(null);
      }}
      isSubmitting={isSubmitting}
      onConfirm={async (payload) => {
        await onTransition(payload);
        setRequest(null);
      }}
    />
  );

  return {
    requestStageChange,
    checking,
    stageTransitionModal: modal,
  };
}
