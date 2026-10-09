'use client';

import { formatUserName } from '@/lib/format-user-name';

import { tokens } from '@/lib/design-tokens';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Lead } from '@/store/server/features/leads/interface';
import {
  useUpdateLeadMutation,
  useEstimatedBudgetMutation,
  useUpdateCompanyMutation,
} from '@/store/server/features/leads/mutation';
import TimelineInformation from '../TimelineInformation';
import AttachedFiles from '../AttachedFiles';
import {
  useCompaniesQuery,
  useEngagementStagesQuery,
  useSolutionsQuery,
  useSectorsQuery,
  useCurrenciesQuery,
  useEstimatedBudgetQuery,
} from '@/store/server/features/leads/queries';
import { useRolesQuery } from '@/store/server/features/leads/queries/referenceQueries';
import { useGetUsers } from '@/store/server/features/leads/users/queries';
import {
  useLeadParticipantsQuery,
  useUpdateLeadParticipantsMutation,
} from '@/store/server/features/leads/lead-participants/queries';
import { useQueryClient } from 'react-query';
import { safeTransformToArray, safeMap } from '@/utils/safeDataTransform';

// Import modular components
import SolutionsSelector from './components/SolutionsSelector';
import BudgetCurrency from './components/BudgetCurrency';
import ContactDetails from './components/ContactDetails';
import LeadOwner from './components/LeadOwner';
import IndustryStage from './components/IndustryStage';
import Participants from './components/Participants';
import ActionButtons from './components/ActionButtons';
import ReadOnlyView from './components/ReadOnlyView';
import { Button, Card, Space, Title, Row } from './components/shadcn-compat';

const NotificationMessage = {
  success: ({
    message,
    description,
  }: {
    message: string;
    description?: string;
  }) => toast.success(message, { description }),
  error: ({
    message,
    description,
  }: {
    message: string;
    description?: string;
  }) => toast.error(message, { description }),
  warning: ({
    message,
    description,
  }: {
    message: string;
    description?: string;
  }) => toast.warning(message, { description }),
};

interface BusinessInformationProps {
  lead: Lead;
  onLeadUpdated?: () => void;
}

export default function BusinessInformation({
  lead,
  onLeadUpdated,
}: BusinessInformationProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<
    string | undefined
  >(undefined);

  const [editData, setEditData] = useState({
    estimatedBudget: 0, // Will be populated from React Query
    contactPersonPosition: '',
    website: '',
    contactPersonPhoneNumber: '',
    companyName: '',
    sectorId: '' as string | undefined,
    stage: '' as string | undefined,
    owner: undefined as string | undefined,
    currency: '' as string | undefined,
    solutionId: [] as string[],
    leadRate: 0,
    leadParticipants: [] as Array<{
      roleId: string;
      userId: string;
      isVisible?: boolean;
    }>,
  });

  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  // React Query handles estimated budget state automatically

  const { data: companies = [], isLoading: companiesLoading } =
    useCompaniesQuery();

  const { data: engagementStages = [] } = useEngagementStagesQuery();
  const { data: solutions = [] } = useSolutionsQuery();
  const { data: sectors = [], isLoading: sectorsLoading } = useSectorsQuery();
  const { data: currencies = [] } = useCurrenciesQuery();
  const { data: roles = [], isLoading: rolesLoading } = useRolesQuery();
  const { data: usersData, isLoading: usersLoading } = useGetUsers();

  // Ensure users is always an array
  const users = useMemo(() => {
    return Array.isArray(usersData) ? usersData : [];
  }, [usersData]);

  // Get lead participants from dedicated API endpoint
  const { data: leadParticipants = [], isLoading: participantsLoading } =
    useLeadParticipantsQuery(lead.id);

  // Fallback: Use lead.leadParticipants if query data is empty but lead has participants
  const effectiveLeadParticipants = useMemo(() => {
    return leadParticipants.length > 0
      ? leadParticipants
      : (lead as any).leadParticipants || [];
  }, [leadParticipants, lead]);
  const updateLeadParticipantsMutation = useUpdateLeadParticipantsMutation();
  const updateLeadMutation = useUpdateLeadMutation();
  const estimatedBudgetMutation = useEstimatedBudgetMutation();
  const updateCompanyMutation = useUpdateCompanyMutation();
  const queryClient = useQueryClient();

  // Get estimated budget data using React Query
  const { data: estimatedBudgetData, isLoading: isBudgetLoading } =
    useEstimatedBudgetQuery(lead.id);

  // Fallback: Check if budget exists in lead's estimatedBudgets array
  const fallbackBudgetData = useMemo(() => {
    return (lead as any).estimatedBudgets &&
      (lead as any).estimatedBudgets.length > 0
      ? (lead as any).estimatedBudgets[0] // Use the first budget if available
      : null;
  }, [lead]);

  // Use the separate query result if available, otherwise fallback to lead's budget
  const effectiveBudgetData = useMemo(() => {
    return estimatedBudgetData || fallbackBudgetData;
  }, [estimatedBudgetData, fallbackBudgetData]);

  // Helper functions - wrapped in useCallback to prevent re-renders
  const getCompanyName = useCallback(() => {
    if (companiesLoading) return '';
    if (!lead.companyId) return '';

    const company = companies.find((c) => c.id === lead.companyId);
    return company?.name || '';
  }, [companiesLoading, lead.companyId, companies]);

  const getCompanyWebsite = useCallback(() => {
    if (companiesLoading) return '';
    if (!lead.companyId) return '';

    const company = companies.find((c) => c.id === lead.companyId);
    return company?.website || '';
  }, [companiesLoading, lead.companyId, companies]);

  const getCurrentOwnerId = useCallback(() => {
    if (usersLoading) return '';
    if (!lead.leadOwner) return '';

    // Ensure users is an array before using find
    if (!Array.isArray(users) || users.length === 0) return '';

    const owner = users.find((u) => u.id === lead.leadOwner);
    return owner?.id || '';
  }, [usersLoading, lead.leadOwner, users]);

  const getCurrencyName = useCallback(
    (currencyId: string): string | undefined => {
      if (!currencyId) return undefined;

      const currency = currencies.find((c) => c.id === currencyId);
      return currency?.name || undefined;
    },
    [currencies],
  );

  // Update local state when lead prop changes - split into separate effects to prevent infinite loops
  useEffect(() => {
    // Don't update if we're in edit mode to prevent overriding user changes
    if (isEditMode) {
      return;
    }

    // Update leadParticipants in local state when effectiveLeadParticipants changes
    if (effectiveLeadParticipants.length > 0) {
      setEditData((prev) => ({
        ...prev,
        leadParticipants: effectiveLeadParticipants.map((participant: any) => ({
          roleId: participant.roleId || '',
          userId: participant.userId || '',
          isVisible: true,
        })),
      }));
    } else {
      // If no participants, clear the local state
      setEditData((prev) => ({
        ...prev,
        leadParticipants: [],
      }));
    }
  }, [effectiveLeadParticipants, isEditMode]);

  // Separate effect for lead data updates to prevent infinite loops
  /* eslint-disable react-hooks/exhaustive-deps -- field-level deps avoid object reference loops */
  useEffect(() => {
    // Don't update if we're in edit mode to prevent overriding user changes
    if (isEditMode) {
      return;
    }

    if (
      sectors.length > 0 &&
      engagementStages.length > 0 &&
      solutions.length > 0 &&
      currencies.length > 0 &&
      !companiesLoading &&
      !usersLoading
    ) {
      const autoFixedStageId = (() => {
        if (engagementStages.length === 0) return undefined;

        if (!lead.engagementStageId) return undefined;

        const stageExists = engagementStages.some(
          (s) => s.id === lead.engagementStageId,
        );
        if (stageExists) {
          return lead.engagementStageId;
        } else {
          return engagementStages[0].id;
        }
      })();

      const autoFixedSectorId = (() => {
        if (sectors.length === 0) return undefined;

        if (lead.sectorId) {
          const sectorExists = sectors.some((s) => s.id === lead.sectorId);
          if (sectorExists) {
            return lead.sectorId;
          } else {
            return sectors[0].id;
          }
        } else {
          return sectors[0].id;
        }
      })();

      // Helper function to get currency name safely
      const getCurrencyNameFromBudget = (): string | undefined => {
        // Get currency name from currencyId in the budget data
        const savedCurrencyName = effectiveBudgetData?.currencyId
          ? getCurrencyName(effectiveBudgetData.currencyId)
          : undefined;

        const currencyValue =
          savedCurrencyName ||
          userSelectedCurrency ||
          (currencies.length > 0 ? currencies[0].name : undefined);
        return typeof currencyValue === 'string' ? currencyValue : undefined;
      };

      const newEditData = {
        estimatedBudget: effectiveBudgetData?.amount ?? 0,
        contactPersonPosition: lead.contactPersonPosition ?? '',
        website: getCompanyWebsite() || '',
        contactPersonPhoneNumber: lead.contactPersonPhoneNumber ?? '',
        companyName: getCompanyName() || '',
        sectorId: autoFixedSectorId,
        stage: autoFixedStageId,
        owner: getCurrentOwnerId(),
        // Prioritize saved currency from backend data, then user selection, then default
        currency: getCurrencyNameFromBudget(),
        solutionId:
          lead.solutionId && Array.isArray(lead.solutionId)
            ? lead.solutionId
            : [],
        leadRate: lead.leadRate ?? 0,
        leadParticipants: editData.leadParticipants, // Keep existing participants
      };

      // Only update if the data has actually changed to prevent infinite loops
      setEditData((prevData) => {
        const hasChanged = Object.keys(newEditData).some(
          (key) =>
            prevData[key as keyof typeof prevData] !==
            newEditData[key as keyof typeof newEditData],
        );

        return hasChanged ? newEditData : prevData;
      });
    }
  }, [
    lead.id,
    lead.engagementStageId,
    lead.sectorId,
    lead.contactPersonPosition,
    lead.contactPersonPhoneNumber,
    lead.solutionId,
    lead.additionalInformation,
    lead.companyId,
    lead.leadOwner,
    effectiveBudgetData?.amount,
    effectiveBudgetData?.currencyId,
    userSelectedCurrency,
    isEditMode,
    companiesLoading,
    usersLoading,
    // Use stable references to prevent infinite loops
    sectors.length,
    engagementStages.length,
    solutions.length,
    currencies.length,
    users.length,
    // Include memoized functions to satisfy exhaustive-deps
    getCompanyName,
    getCompanyWebsite,
    getCurrencyName,
    getCurrentOwnerId,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // React Query automatically handles fetching and refetching estimated budget
  // when lead.id changes, so we don't need manual useEffect hooks anymore

  const getSolutionName = () => {
    // Check if we have solutionId array and convert to solution name
    if (
      lead.solutionId &&
      Array.isArray(lead.solutionId) &&
      lead.solutionId.length > 0 &&
      solutions.length > 0
    ) {
      // Get the first solution from the array
      const solution = solutions.find((s) => s.id === lead.solutionId![0]);
      if (solution) {
        return solution.name;
      }
    }

    return 'No solution interest specified';
  };

  const getSectorDisplayName = () => {
    if (sectorsLoading) return 'Loading sectors...';
    if (!lead.sectorId) return 'No sector assigned';

    const sector = sectors.find((s) => s.id === lead.sectorId);
    if (!sector) {
      return 'Sector not found';
    }

    return sector.name;
  };

  const getLeadOwnerDisplay = () => {
    if (!lead.leadOwner) return 'Unassigned';

    // If users are still loading, show loading state
    if (usersLoading) return 'Loading...';

    // If no users available yet, show loading
    if (!Array.isArray(users) || users.length === 0) return 'Loading...';

    // Find the user by ID
    const user = users.find((u) => u.id === lead.leadOwner);
    if (user) {
      return formatUserName(user);
    }

    // If user not found in the list, show a clean message
    return 'User not found';
  };

  // Process lead participants data - return role-user pairs
  const processLeadParticipants = () => {
    // If roles, users, or participants are still loading, return empty array
    if (rolesLoading || usersLoading || participantsLoading) {
      return [];
    }

    // If no roles, users, or participants available yet, return empty array
    if (
      !Array.isArray(roles) ||
      roles.length === 0 ||
      !Array.isArray(users) ||
      users.length === 0
    ) {
      return [];
    }

    // Use local state if in edit mode and has participants, otherwise use effectiveLeadParticipants
    const participantsToUse =
      isEditMode && editData.leadParticipants.length > 0
        ? editData.leadParticipants
        : effectiveLeadParticipants;

    if (!Array.isArray(participantsToUse) || participantsToUse.length === 0) {
      return [];
    }

    const safeParticipants = safeTransformToArray(participantsToUse);

    // Create role-user pairs
    const roleUserPairs: Array<{ role: any; user: any }> = [];

    safeParticipants.forEach(
      (participant: { roleId: string; userId: string }) => {
        if (participant.roleId && participant.userId) {
          // Look up role data from the roles array
          const roleData = roles.find((r: any) => r.id === participant.roleId);
          // Look up user data from the users array - ensure users is an array
          const userData = Array.isArray(users)
            ? users.find((u: any) => u.id === participant.userId)
            : null;

          if (roleData && userData) {
            roleUserPairs.push({
              role: roleData,
              user: {
                id: userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
              },
            });
          }
        }
      },
    );

    return roleUserPairs;
  };

  // Get participants loading state
  const getParticipantsLoadingState = () => {
    return rolesLoading || usersLoading || participantsLoading;
  };

  // Get role options for dropdowns - using the backend structure you provided
  const getRoleOptions = () => {
    // If roles are still loading or not available, return empty array
    if (rolesLoading || !Array.isArray(roles) || roles.length === 0) {
      return [];
    }

    const safeRoles = safeTransformToArray(roles);
    return safeMap(safeRoles, (role: any) => ({
      value: role.id,
      label: role.name,
    }));
  };

  // Get user options for dropdowns
  const getUserOptions = () => {
    // If users are still loading or not available, return empty array
    if (usersLoading || !Array.isArray(users) || users.length === 0) {
      return [];
    }

    const safeUsers = safeTransformToArray(users);
    return safeMap(safeUsers, (user: any) => ({
      value: user.id,
      label: formatUserName(user),
    }));
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      const stageValue =
        engagementStages.length > 0
          ? lead.engagementStageId || undefined
          : undefined;

      // Helper function to get currency name safely
      const getCurrencyNameFromBudget = (): string | undefined => {
        // Get currency name from currencyId in the budget data
        const savedCurrencyName = effectiveBudgetData?.currencyId
          ? getCurrencyName(effectiveBudgetData.currencyId)
          : undefined;

        const currencyValue =
          savedCurrencyName ||
          userSelectedCurrency ||
          (currencies.length > 0 ? currencies[0].name : undefined);
        return typeof currencyValue === 'string' ? currencyValue : undefined;
      };

      const editDataToSet = {
        estimatedBudget: effectiveBudgetData?.amount ?? 0,
        contactPersonPosition: lead.contactPersonPosition ?? '',
        website: getCompanyWebsite() || '',
        contactPersonPhoneNumber: lead.contactPersonPhoneNumber ?? '',
        companyName: getCompanyName() || '',
        sectorId: sectors.length > 0 ? lead.sectorId || undefined : undefined,
        stage: stageValue,
        owner: getCurrentOwnerId(),
        currency: getCurrencyNameFromBudget(),
        solutionId:
          lead.solutionId && Array.isArray(lead.solutionId)
            ? lead.solutionId
            : [],
        leadRate: lead.leadRate ?? 0,
        leadParticipants: [],
      };

      setEditData({
        ...editDataToSet,
        contactPersonPosition: editDataToSet.contactPersonPosition ?? '',
        contactPersonPhoneNumber: editDataToSet.contactPersonPhoneNumber ?? '',
        companyName: editDataToSet.companyName ?? '',
        website: editDataToSet.website ?? '',
        leadRate: editDataToSet.leadRate,
        leadParticipants: editDataToSet.leadParticipants,
        currency:
          typeof editDataToSet.currency === 'string'
            ? editDataToSet.currency
            : undefined,
      });
    } else {
      const autoFixedStageId = (() => {
        if (engagementStages.length === 0) return undefined;

        if (!lead.engagementStageId) return undefined;

        const stageExists = engagementStages.some(
          (s) => s.id === lead.engagementStageId,
        );
        if (stageExists) {
          return lead.engagementStageId;
        } else {
          return engagementStages[0].id;
        }
      })();

      const autoFixedSectorId = (() => {
        if (sectors.length === 0) return undefined;

        if (lead.sectorId) {
          const sectorExists = sectors.some((s) => s.id === lead.sectorId);
          if (sectorExists) {
            return lead.sectorId;
          } else {
            return sectors[0].id;
          }
        } else {
          return sectors[0].id;
        }
      })();

      // Helper function to get currency name safely
      const getCurrencyNameFromBudget = (): string | undefined => {
        // Get currency name from currencyId in the budget data
        const savedCurrencyName = effectiveBudgetData?.currencyId
          ? getCurrencyName(effectiveBudgetData.currencyId)
          : undefined;

        const currencyValue =
          savedCurrencyName ||
          userSelectedCurrency ||
          (currencies.length > 0 ? currencies[0].name : undefined);
        return typeof currencyValue === 'string' ? currencyValue : undefined;
      };

      // Initialize with existing participants when entering edit mode
      const participantsForEdit =
        effectiveLeadParticipants.length > 0
          ? effectiveLeadParticipants.map((participant: any) => ({
              roleId: participant.roleId || '',
              userId: participant.userId || '',
              isVisible: true,
            }))
          : [];

      const editDataToSet = {
        estimatedBudget: effectiveBudgetData?.amount ?? 0,
        contactPersonPosition: lead.contactPersonPosition,
        website: getCompanyWebsite() || '',
        contactPersonPhoneNumber: lead.contactPersonPhoneNumber,
        companyName: getCompanyName() || '',
        sectorId: autoFixedSectorId,
        stage: autoFixedStageId,
        owner: getCurrentOwnerId(),
        currency: getCurrencyNameFromBudget(),
        solutionId:
          lead.solutionId && Array.isArray(lead.solutionId)
            ? lead.solutionId
            : [],
        leadRate: lead.leadRate ?? 0,
        leadParticipants: participantsForEdit,
      };

      setEditData({
        estimatedBudget: editDataToSet.estimatedBudget,
        contactPersonPosition: editDataToSet.contactPersonPosition ?? '',
        website: editDataToSet.website,
        contactPersonPhoneNumber: editDataToSet.contactPersonPhoneNumber ?? '',
        companyName: editDataToSet.companyName,
        sectorId: editDataToSet.sectorId,
        stage: editDataToSet.stage,
        owner: editDataToSet.owner,
        currency:
          typeof editDataToSet.currency === 'string'
            ? editDataToSet.currency
            : undefined,
        solutionId: editDataToSet.solutionId,
        leadRate: editDataToSet.leadRate,
        leadParticipants: editDataToSet.leadParticipants,
      });
    }
    setIsEditMode(!isEditMode);
  };

  const validateUpdateData = (data: any) => {
    const errors: string[] = [];

    // Validate phone number format
    if (
      data.contactPersonPhoneNumber &&
      typeof data.contactPersonPhoneNumber === 'string'
    ) {
      const phoneRegex = /^[\d+\-\(\)\s]+$/;
      if (!phoneRegex.test(data.contactPersonPhoneNumber)) {
        errors.push('Phone number contains invalid characters');
      }
    }

    // Note: website validation removed - field not available on Lead entity
    // Website should be updated through Company entity instead

    // Validate estimated budget (must be non-negative number)
    if (
      data.estimatedBudget !== undefined &&
      (typeof data.estimatedBudget !== 'number' || data.estimatedBudget < 0)
    ) {
      errors.push('Estimated budget must be a non-negative number');
    }

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (data.sectorId && !uuidRegex.test(data.sectorId)) {
      errors.push('Sector ID format is invalid');
    }

    if (data.engagementStageId && !uuidRegex.test(data.engagementStageId)) {
      errors.push('Engagement Stage ID format is invalid');
    }

    // Validate solutionId array format
    if (data.solutionId && Array.isArray(data.solutionId)) {
      for (const solutionId of data.solutionId) {
        if (typeof solutionId !== 'string' || !uuidRegex.test(solutionId)) {
          errors.push('Solution ID format is invalid');
          break;
        }
      }
    }

    // Validate owner ID format
    if (data.leadOwner && !uuidRegex.test(data.leadOwner)) {
      errors.push('Lead Owner ID format is invalid');
    }

    return errors;
  };

  // Validate lead participants for duplicates
  const validateLeadParticipants = (participants: any[]) => {
    const errors: string[] = [];
    const validParticipants = participants.filter(
      (participant) =>
        participant.roleId &&
        participant.roleId.trim() !== '' &&
        participant.userId &&
        participant.userId.trim() !== '' &&
        (participant.isVisible === undefined ||
          participant.isVisible !== false),
    );

    // Check for duplicate user-role combinations (same user assigned to same role multiple times)
    const userRoleCombinations = validParticipants.map(
      (p) => `${p.userId}-${p.roleId}`,
    );
    const duplicateUserRoleCombinations = userRoleCombinations.filter(
      (combination, index) =>
        userRoleCombinations.indexOf(combination) !== index,
    );

    if (duplicateUserRoleCombinations.length > 0) {
      const duplicatePairs = [...new Set(duplicateUserRoleCombinations)].map(
        (combination) => {
          const [userId, roleId] = combination.split('-');
          const user = users.find((u) => u.id === userId);
          const role = roles.find((r) => r.id === roleId);
          return `${user ? formatUserName(user) : 'Unknown User'} - ${role ? role.name : 'Unknown Role'}`;
        },
      );

      errors.push(
        `Duplicate user-role assignments found: ${duplicatePairs.join(', ')}`,
      );
    }

    return errors;
  };

  // Estimated budget functions are now handled by React Query hooks
  // useEstimatedBudgetQuery for fetching
  // useEstimatedBudgetMutation for create/update operations

  const handleSave = async () => {
    try {
      // Build update data with proper validation
      const updateData: any = {};

      // Only add fields that have valid values

      // Note: estimatedBudget is updated separately via /estimated-budget endpoint
      // if (editData.estimatedBudget !== undefined && editData.estimatedBudget > 0) {
      //   updateData.estimatedBudget = editData.estimatedBudget;
      // }

      if (
        editData.contactPersonPosition !== undefined &&
        editData.contactPersonPosition !== ''
      ) {
        updateData.contactPersonPosition = editData.contactPersonPosition;
      }

      if (editData.owner !== undefined && editData.owner !== '') {
        updateData.leadOwner = editData.owner;
      }

      // Website updates are handled separately through Company entity
      // This will be processed after the lead update

      if (
        editData.contactPersonPhoneNumber !== undefined &&
        editData.contactPersonPhoneNumber !== ''
      ) {
        updateData.contactPersonPhoneNumber = editData.contactPersonPhoneNumber;
      }

      if (
        editData.sectorId &&
        typeof editData.sectorId === 'string' &&
        editData.sectorId.length > 0
      ) {
        updateData.sectorId = editData.sectorId;
      }

      // Add solutionId if it has been changed
      if (
        editData.solutionId &&
        Array.isArray(editData.solutionId) &&
        editData.solutionId.length > 0
      ) {
        updateData.solutionId = editData.solutionId;
      } else if (
        editData.solutionId &&
        Array.isArray(editData.solutionId) &&
        editData.solutionId.length === 0
      ) {
        // Handle case where solution is explicitly cleared
        updateData.solutionId = [];
      }

      // Add stage field if it has been changed
      if (
        editData.stage &&
        typeof editData.stage === 'string' &&
        editData.stage.length > 0
      ) {
        updateData.engagementStageId = editData.stage;
      } else if (editData.stage === '') {
        // Handle case where stage is explicitly cleared
        updateData.engagementStageId = null;
      }

      if (lead.engagementStageId && engagementStages.length > 0) {
        const stageExists = engagementStages.some(
          (s) => s.id === lead.engagementStageId,
        );

        if (!stageExists && !editData.stage && engagementStages[0]?.id) {
          updateData.engagementStageId = engagementStages[0].id;
        }
      }

      if (
        !lead.sectorId &&
        sectors.length > 0 &&
        !editData.sectorId &&
        sectors[0]?.id
      ) {
        updateData.sectorId = sectors[0].id;
      }

      // Add leadRate if it has been changed
      if (
        editData.leadRate !== undefined &&
        editData.leadRate !== lead.leadRate
      ) {
        updateData.leadRate = editData.leadRate;
      }

      // Note: leadParticipants are now handled separately via dedicated endpoints
      // The main lead update no longer includes leadParticipants as it's ignored by the backend

      // Don't send empty update
      if (Object.keys(updateData).length === 0) {
        NotificationMessage.warning({
          message: 'No changes to save',
        });
        setIsEditMode(false);
        return;
      }

      // Validate the data before sending
      const validationErrors = validateUpdateData(updateData);
      if (validationErrors.length > 0) {
        NotificationMessage.error({
          message: 'Validation errors',
          description: validationErrors.join(', '),
        });
        return;
      }

      // Validate lead participants for duplicates
      const participantErrors = validateLeadParticipants(
        editData.leadParticipants,
      );
      if (participantErrors.length > 0) {
        NotificationMessage.error({
          message: 'Role assignment errors',
          description: participantErrors.join(', '),
        });
        return;
      }

      // Only switch to view mode after all validations pass
      setIsEditMode(false);

      // Update local state immediately for better UX
      setEditData({
        estimatedBudget: editData.estimatedBudget,
        contactPersonPosition: editData.contactPersonPosition,
        website: editData.website,
        contactPersonPhoneNumber: editData.contactPersonPhoneNumber,
        companyName: editData.companyName,
        sectorId: editData.sectorId,
        stage: editData.stage,
        owner: editData.owner,
        currency: editData.currency,
        solutionId: editData.solutionId,
        leadRate: editData.leadRate,
        leadParticipants: editData.leadParticipants, // Keep the participants in local state
      });

      // Notify parent component to refresh lead data immediately
      if (onLeadUpdated) {
        onLeadUpdated();
      }

      // Show success message immediately
      NotificationMessage.success({
        message: 'Success',
        description: 'Changes saved successfully',
      });

      // Handle backend updates in parallel (non-blocking)
      const backendUpdates = [];

      // Lead update
      if (Object.keys(updateData).length > 0) {
        backendUpdates.push(
          updateLeadMutation
            .mutateAsync({
              leadId: lead.id,
              data: updateData,
            })
            .catch(() => {
              NotificationMessage.error({
                message: 'Error',
                description: 'Failed to update lead information',
              });
            }),
        );
      }

      // Update company information if it has changed
      if (lead.companyId) {
        const currentWebsite = getCompanyWebsite();
        const currentCompanyName = getCompanyName();

        // Prepare company update data
        const companyUpdateData: any = {};
        let hasCompanyChanges = false;

        // Check website changes
        if (editData.website !== undefined) {
          const normalizedCurrentWebsite = currentWebsite || '';
          const normalizedEditWebsite = editData.website || '';

          if (normalizedEditWebsite !== normalizedCurrentWebsite) {
            companyUpdateData.website = normalizedEditWebsite || undefined;
            hasCompanyChanges = true;
          }
        }

        // Check company name changes
        if (editData.companyName !== undefined) {
          const normalizedCurrentName = currentCompanyName || '';
          const normalizedEditName = editData.companyName || '';

          if (normalizedEditName !== normalizedCurrentName) {
            companyUpdateData.name = normalizedEditName || undefined;
            hasCompanyChanges = true;
          }
        }

        // Update company if there are changes
        if (hasCompanyChanges) {
          backendUpdates.push(
            updateCompanyMutation
              .mutateAsync({
                companyId: lead.companyId,
                data: companyUpdateData,
              })
              .catch(() => {
                NotificationMessage.error({
                  message: 'Error',
                  description: 'Failed to update company information',
                });
              }),
          );
        }
      }

      // Update lead participants separately via dedicated endpoint
      if (editData.leadParticipants && editData.leadParticipants.length > 0) {
        // Filter out participants that are not visible and don't have both roleId and userId
        const validParticipants = editData.leadParticipants.filter(
          (participant: any) =>
            participant.roleId &&
            participant.roleId.trim() !== '' &&
            participant.userId &&
            participant.userId.trim() !== '' &&
            (participant.isVisible === undefined ||
              participant.isVisible !== false),
        );

        if (validParticipants.length > 0) {
          // Create participants with the specific user assigned to each role
          const participantsToUpdate = validParticipants.map(
            (participant: any) => ({
              roleId: participant.roleId,
              userId: participant.userId || '', // Use the specific user assigned to this role
            }),
          );

          backendUpdates.push(
            updateLeadParticipantsMutation
              .mutateAsync({
                leadId: lead.id,
                participants: participantsToUpdate,
              })
              .then(() => {
                // Update the React Query cache immediately with the new data
                queryClient.setQueryData(
                  ['lead-participants', lead.id],
                  participantsToUpdate,
                );
                // Also refresh queries to ensure consistency
                queryClient.invalidateQueries(['lead-participants', lead.id]);
                queryClient.invalidateQueries(['lead-detail', lead.id]);
              })
              .catch(() => {
                NotificationMessage.error({
                  message: 'Error',
                  description: 'Failed to update role assignments',
                });
              }),
          );
        }
      }

      // Update estimated budget separately via dedicated endpoint
      if (editData.estimatedBudget !== undefined) {
        // Only update if the budget has actually changed
        const currentCurrencyName = effectiveBudgetData?.currencyId
          ? getCurrencyName(effectiveBudgetData.currencyId)
          : undefined;

        const hasBudgetChanged =
          editData.estimatedBudget !== (effectiveBudgetData?.amount ?? 0) ||
          editData.currency !== currentCurrencyName;

        if (hasBudgetChanged) {
          // Ensure we have a valid amount (at least 0) before sending
          const budgetAmount = Math.max(0, editData.estimatedBudget);

          // Get currency ID from currency name
          const currencyId = getCurrencyId(editData.currency || '');

          backendUpdates.push(
            estimatedBudgetMutation
              .mutateAsync({
                leadId: lead.id,
                amount: budgetAmount,
                currency: editData.currency,
                currencyId: currencyId,
              })
              .catch(() => {
                NotificationMessage.error({
                  message: 'Error',
                  description: 'Failed to update estimated budget',
                });
              }),
          );
        }
      }

      // Execute all backend updates in parallel (non-blocking)
      if (backendUpdates.length > 0) {
        Promise.allSettled(backendUpdates).then((results) => {
          const failedUpdates = results.filter(
            (result) => result.status === 'rejected',
          );
          if (failedUpdates.length > 0) {
            // Some backend updates failed - errors already shown to user
          }
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        'Failed to update business information';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | string[],
  ) => {
    // Basic validation for specific fields
    let validatedValue = value;

    if (field === 'contactPersonPhoneNumber' && typeof value === 'string') {
      // Remove any non-digit characters except +, -, (, ), and space
      validatedValue = value.replace(/[^\d+\-\(\)\s]/g, '');
    }

    if (field === 'website' && typeof value === 'string') {
      // Basic URL validation - allow empty or valid URL format
      if (
        value &&
        !value.startsWith('http://') &&
        !value.startsWith('https://')
      ) {
        // Don't auto-add protocol, just store as is
        validatedValue = value;
      }
    }

    if (field === 'estimatedBudget' && typeof value === 'number') {
      // Ensure estimated budget is a non-negative number
      validatedValue = Math.max(0, value);
    }

    // Track user currency selection
    if (field === 'currency') {
      setUserSelectedCurrency(value as string);
    }

    setEditData((prev) => ({
      ...prev,
      [field]: validatedValue,
    }));
  };

  // Lead participants management functions
  const addParticipantRow = () => {
    setEditData((prev) => {
      // Simply add a new empty row for new participants
      return {
        ...prev,
        leadParticipants: [
          ...prev.leadParticipants,
          { roleId: '', userId: '', isVisible: true },
        ],
      };
    });
  };

  const updateParticipantRole = (index: number, roleId: string) => {
    setEditData((prev) => {
      // Safety check for valid index
      if (index < 0 || index >= prev.leadParticipants.length) {
        return prev;
      }

      // If roleId is empty, just clear the role without duplicate check
      if (!roleId || roleId.trim() === '') {
        const updated = {
          ...prev,
          leadParticipants: prev.leadParticipants.map((participant, i) =>
            i === index ? { ...participant, roleId: '' } : participant,
          ),
        };
        return updated;
      }

      // Get the current participant to check user-role combination
      const currentParticipant = prev.leadParticipants[index];
      const currentUserId = currentParticipant.userId;

      // Only check for duplicate if both userId and roleId are set
      if (currentUserId && currentUserId.trim() !== '') {
        // Create a simulated state with the new roleId to check for duplicates
        const simulatedParticipants = prev.leadParticipants.map(
          (participant, i) =>
            i === index ? { ...participant, roleId } : participant,
        );

        // Check if this exact user-role combination already exists in another row
        const isDuplicateUserRole = simulatedParticipants.some(
          (participant, i) =>
            i !== index &&
            participant.roleId === roleId &&
            participant.userId === currentUserId &&
            participant.userId.trim() !== '' &&
            (participant.isVisible === undefined ||
              participant.isVisible !== false),
        );

        if (isDuplicateUserRole) {
          const user = users.find((u) => u.id === currentUserId);
          const role = roles.find((r) => r.id === roleId);
          const errorMessage = `Cannot assign: ${user ? formatUserName(user) : 'Unknown User'} is already assigned to ${role ? role.name : 'Unknown Role'}`;

          NotificationMessage.error({
            message: 'Cannot assign',
            description: errorMessage,
          });
          setValidationErrors((prev) => ({
            ...prev,
            [`role-${index}`]: errorMessage,
          }));
          return prev;
        }
      }

      const updated = {
        ...prev,
        leadParticipants: prev.leadParticipants.map((participant, i) =>
          i === index ? { ...participant, roleId } : participant,
        ),
      };

      // Clear validation error for this field when a valid selection is made
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`role-${index}`];
        return newErrors;
      });

      return updated;
    });
  };

  const updateParticipantUser = (index: number, userId: string) => {
    setEditData((prev) => {
      // Safety check for valid index
      if (index < 0 || index >= prev.leadParticipants.length) {
        return prev;
      }

      // If userId is empty, just clear the user without duplicate check
      if (!userId || userId.trim() === '') {
        const updated = {
          ...prev,
          leadParticipants: prev.leadParticipants.map((participant, i) =>
            i === index ? { ...participant, userId: '' } : participant,
          ),
        };
        return updated;
      }

      // Get the current participant to check user-role combination
      const currentParticipant = prev.leadParticipants[index];
      const currentRoleId = currentParticipant.roleId;

      // Only check for duplicate if both userId and roleId are set
      if (currentRoleId && currentRoleId.trim() !== '') {
        // Create a simulated state with the new userId to check for duplicates
        const simulatedParticipants = prev.leadParticipants.map(
          (participant, i) =>
            i === index ? { ...participant, userId } : participant,
        );

        // Check if this exact user-role combination already exists in another row
        const isDuplicateUserRole = simulatedParticipants.some(
          (participant, i) =>
            i !== index &&
            participant.userId === userId &&
            participant.roleId === currentRoleId &&
            userId.trim() !== '' &&
            (participant.isVisible === undefined ||
              participant.isVisible !== false),
        );

        if (isDuplicateUserRole) {
          const user = users.find((u) => u.id === userId);
          const role = roles.find((r) => r.id === currentRoleId);
          const errorMessage = `Cannot assign: ${user ? formatUserName(user) : 'Unknown User'} is already assigned to ${role ? role.name : 'Unknown Role'}`;

          NotificationMessage.error({
            message: 'Cannot assign',
            description: errorMessage,
          });
          setValidationErrors((prev) => ({
            ...prev,
            [`user-${index}`]: errorMessage,
          }));
          return prev;
        }
      }

      const updated = {
        ...prev,
        leadParticipants: prev.leadParticipants.map((participant, i) =>
          i === index ? { ...participant, userId } : participant,
        ),
      };

      // Clear validation error for this field when a valid selection is made
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`user-${index}`];
        return newErrors;
      });

      return updated;
    });
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    try {
      // Try to format as proper currency
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

      return formatted;
    } catch (error) {
      // Fallback: just show amount with currency code
      return `${amount.toLocaleString()} ${currencyCode}`;
    }
  };

  // Helper function to get currency ID from currency name
  const getCurrencyId = (currencyName: string): string | undefined => {
    if (!currencyName || !currencies.length) return undefined;
    const currency = currencies.find((c) => c.name === currencyName);
    return currency?.id;
  };

  // Helper function to get currency name from currency ID

  return (
    <Card
      title={
        <div className="flex items-center justify-between ml-2 mr-2">
          <Title level={5} style={{ margin: 0 }}>
            Business Information
          </Title>
          <Button
            type="text"
            size="small"
            icon={
              <Icon
                icon="fluent:edit-16-regular"
                className="text-lg sm:text-2xl"
                style={{
                  color: isEditMode
                    ? tokens.color.blue
                    : tokens.color.textPrimary,
                }}
              />
            }
            onClick={handleEditToggle}
            loading={
              updateLeadMutation.isLoading ||
              estimatedBudgetMutation.isLoading ||
              updateCompanyMutation.isLoading ||
              updateLeadParticipantsMutation.isLoading
            }
            data-cy="business-info-edit-button"
          />
        </div>
      }
      className="h-fit"
      style={{ border: '2px solid rgba(229, 231, 235, 0.7)' }}
      headStyle={{ borderBottom: 'none' }}
      bodyStyle={{ paddingTop: '4px', paddingBottom: '48px' }}
    >
      {isEditMode ? (
        <Space direction="vertical" size={[24, 24]} style={{ width: '100%' }}>
          <Row gutter={[20, 16]}>
            <SolutionsSelector
              solutionId={editData.solutionId}
              solutions={solutions}
              onSolutionChange={(value) =>
                handleInputChange('solutionId', value)
              }
            />
            <BudgetCurrency
              estimatedBudget={editData.estimatedBudget}
              currency={editData.currency}
              currencies={currencies}
              isBudgetLoading={isBudgetLoading}
              onBudgetChange={(value) =>
                handleInputChange('estimatedBudget', value)
              }
              onCurrencyChange={(value) => handleInputChange('currency', value)}
            />
          </Row>

          <Row gutter={[20, 16]}>
            <ContactDetails
              website={editData.website}
              contactPersonPhoneNumber={editData.contactPersonPhoneNumber}
              companyName={editData.companyName}
              onWebsiteChange={(value) => handleInputChange('website', value)}
              onPhoneChange={(value) =>
                handleInputChange('contactPersonPhoneNumber', value)
              }
              onCompanyNameChange={(value) =>
                handleInputChange('companyName', value)
              }
              getCompanyWebsite={getCompanyWebsite}
            />
            <LeadOwner
              owner={editData.owner}
              users={users}
              usersLoading={usersLoading}
              onOwnerChange={(value) => handleInputChange('owner', value)}
            />
          </Row>

          <Row gutter={[20, 16]}>
            <IndustryStage
              sectorId={editData.sectorId}
              stage={editData.stage}
              sectors={sectors}
              engagementStages={engagementStages}
              leadRate={editData.leadRate}
              onSectorChange={(value) => handleInputChange('sectorId', value)}
              onStageChange={(value) => handleInputChange('stage', value)}
              onRateChange={(value) => handleInputChange('leadRate', value)}
            />
          </Row>

          <Row gutter={[20, 16]}>
            <Participants
              leadParticipants={editData.leadParticipants}
              users={users}
              getRoleOptions={getRoleOptions}
              getUserOptions={getUserOptions}
              updateParticipantRole={updateParticipantRole}
              updateParticipantUser={updateParticipantUser}
              addParticipantRow={addParticipantRow}
              validationErrors={validationErrors}
            />
            <ActionButtons
              onSave={handleSave}
              isLoading={
                updateLeadMutation.isLoading ||
                estimatedBudgetMutation.isLoading ||
                updateCompanyMutation.isLoading ||
                updateLeadParticipantsMutation.isLoading
              }
            />
          </Row>
        </Space>
      ) : (
        <ReadOnlyView
          lead={lead}
          getSolutionName={getSolutionName}
          getCompanyWebsite={getCompanyWebsite}
          getCompanyName={getCompanyName}
          getLeadOwnerDisplay={getLeadOwnerDisplay}
          getSectorDisplayName={getSectorDisplayName}
          engagementStages={engagementStages}
          effectiveBudgetData={effectiveBudgetData}
          currencies={currencies}
          editData={editData}
          isBudgetLoading={isBudgetLoading}
          formatCurrency={formatCurrency}
          getCurrencyName={getCurrencyName}
          processLeadParticipants={processLeadParticipants}
          isParticipantsLoading={getParticipantsLoadingState()}
        />
      )}

      {/* Timeline and Files sections - always visible */}
      <TimelineInformation lead={lead} onLeadUpdated={onLeadUpdated} />
      <AttachedFiles leadId={lead.id} />
    </Card>
  );
}
