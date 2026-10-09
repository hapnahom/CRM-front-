'use client';

import { formatUserName } from '@/lib/format-user-name';

import { tokens } from '@/lib/design-tokens';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { useCreateDeal } from '@/store/server/features/deals/mutations';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useQueryClient } from 'react-query';
import { useRouter } from 'next/navigation';
import { showValidationErrors } from '@/utils/showValidationErrors';
import {
  extractArrayFromResponse,
  validateLeadDataForDeal,
  safeStringExtract,
} from '@/utils/responseDataExtractor';
import {
  useGetDealTypes,
  useGetDealStages,
  useGetCurrencies,
  useGetRoles,
} from '@/store/server/features/deals/queries';
import { useGetCompanies } from '@/store/server/features/leads/companies/queries';
import { useGetSuppliers } from '@/store/server/features/leads/suppliers/queries';
import { useGetSectors } from '@/store/server/features/leads/sectors/queries';
import { useGetUsers } from '@/store/server/features/leads/users/queries';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface MakeDealModalProps {
  open: boolean;
  onClose: () => void;
  leadData: any;
  buttonRef?: React.RefObject<HTMLDivElement>;
}

interface MakeDealFormData {
  name: string;
  owner: string;
  closingDate: dayjs.Dayjs;
  dealType: string;
  stage: string;
  revenue: number;
  currency: string;
  description: string;
}

export default function MakeDealModal({
  open,
  onClose,
  leadData,
  buttonRef,
}: MakeDealModalProps) {
  const [form] = Form.useForm<MakeDealFormData>();
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 100,
    right: 20,
  });
  const makeDealButtonRef = useRef<HTMLDivElement>(null);
  const { userId } = useAuthenticationStore();
  const createDealMutation = useCreateDeal();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Data queries - using deal queries for dropdowns since we're creating a deal
  // Only fetch data when modal is open to improve performance
  const { data: dealTypesData, isLoading: dealTypesLoading } =
    useGetDealTypes();
  const { data: dealStagesData, isLoading: dealStagesLoading } =
    useGetDealStages();
  const { data: currenciesData, isLoading: currenciesLoading } =
    useGetCurrencies();
  const { data: rolesData, isLoading: rolesLoading } = useGetRoles();
  const { data: usersData, isLoading: usersLoading } = useGetUsers();

  // Reference data queries for validation - using LEAD endpoints to match lead data
  const { data: companiesData, isLoading: companiesLoading } =
    useGetCompanies();
  const { data: suppliersData, isLoading: suppliersLoading } =
    useGetSuppliers();
  const { data: sectorsData, isLoading: sectorsLoading } = useGetSectors();

  // Deal queries for pre-population (to get deal-specific data)
  // Note: We're using dealStagesData which is already fetched above

  // Extract items from responses using utility function
  const dealTypes: any[] = useMemo(
    () => extractArrayFromResponse(dealTypesData),
    [dealTypesData],
  );
  const dealStages: any[] = useMemo(
    () => extractArrayFromResponse(dealStagesData),
    [dealStagesData],
  );
  const currencies: any[] = useMemo(
    () => extractArrayFromResponse(currenciesData),
    [currenciesData],
  );
  const roles: any[] = useMemo(
    () => extractArrayFromResponse(rolesData),
    [rolesData],
  );
  const users: any[] = useMemo(
    () => extractArrayFromResponse(usersData),
    [usersData],
  );

  // Extract reference data for validation - handle lead endpoint response formats
  const companies: any[] = useMemo(
    () => extractArrayFromResponse(companiesData),
    [companiesData],
  );
  const suppliers: any[] = useMemo(
    () => extractArrayFromResponse(suppliersData),
    [suppliersData],
  );
  const sectors: any[] = useMemo(
    () => extractArrayFromResponse(sectorsData),
    [sectorsData],
  );

  const isAnyLoading =
    dealTypesLoading ||
    dealStagesLoading ||
    currenciesLoading ||
    rolesLoading ||
    usersLoading ||
    companiesLoading ||
    suppliersLoading ||
    sectorsLoading;

  // Get role ID for a user (assuming users have a roleId field or we need to find it)
  const getRoleIdForUser = (userId: string) => {
    if (!userId || !Array.isArray(users) || users.length === 0) {
      return undefined;
    }

    const user = users.find((u) => u.id === userId);
    if (!user) {
      return undefined;
    }

    // If user has a roleId field, use it
    if (user.roleId) {
      return user.roleId;
    }

    // If user has a role field with id, use it
    if (user.role && user.role.id) {
      return user.role.id;
    }

    // Fallback: try to find a default role (e.g., "Deal Owner" or first available role)
    const defaultRole = roles.find(
      (role) =>
        role.name?.toLowerCase().includes('deal') ||
        role.name?.toLowerCase().includes('owner') ||
        role.name?.toLowerCase().includes('manager'),
    );

    if (defaultRole) {
      return defaultRole.id;
    }

    // Last resort: use first available role
    if (roles.length > 0) {
      return roles[0].id;
    }

    return undefined;
  };

  // Fix orphaned references by finding valid alternatives
  const getValidReferencesFromLead = (leadData: any) => {
    const result = {
      companyId: leadData.companyId,
      supplierId: leadData.supplierId,
      sectorId: leadData.sectorId,
      hasOrphanedRefs: false,
      fixedRefs: [] as string[],
    };

    // Fix company reference if orphaned
    if (
      leadData.companyId &&
      !companies.find((c) => c.id === leadData.companyId)
    ) {
      result.companyId =
        companies.length > 0 ? companies[0].id : leadData.companyId;
      result.hasOrphanedRefs = true;
      result.fixedRefs.push('Company');
    }

    // Fix supplier reference if orphaned
    if (
      leadData.supplierId &&
      !suppliers.find((s) => s.id === leadData.supplierId)
    ) {
      result.supplierId =
        suppliers.length > 0 ? suppliers[0].id : leadData.supplierId;
      result.hasOrphanedRefs = true;
      result.fixedRefs.push('Supplier');
    }

    // Fix sector reference if orphaned
    if (leadData.sectorId && !sectors.find((s) => s.id === leadData.sectorId)) {
      result.sectorId = sectors.length > 0 ? sectors[0].id : leadData.sectorId;
      result.hasOrphanedRefs = true;
      result.fixedRefs.push('Sector');
    }

    return result;
  };

  const calculatePosition = useCallback(() => {
    const refToUse = buttonRef || makeDealButtonRef;
    if (refToUse?.current) {
      const rect = refToUse.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (window.innerWidth <= 500) {
        // Mobile positioning - center the modal and ensure it fits
        const modalWidth = Math.min(400, window.innerWidth - 32); // Ensure modal fits with 16px margins
        const buttonCenter = rect.left + rect.width / 2;
        const leftPosition = Math.max(
          16,
          Math.min(
            buttonCenter - modalWidth / 2,
            window.innerWidth - modalWidth - 16,
          ),
        );

        setDropdownPosition({
          top: rect.bottom + scrollY + 8,
          right: window.innerWidth - leftPosition - modalWidth + scrollX,
        });
      } else {
        // Desktop positioning - original logic
        const buttonMiddle = rect.left + rect.width / 2;
        const offsetFromMiddle = 60; // Move right edge 60px from the middle towards the right
        const rightEdgePosition = buttonMiddle + offsetFromMiddle;

        setDropdownPosition({
          top: rect.bottom + scrollY + 8, // Position below the button with 8px gap
          right: window.innerWidth - rightEdgePosition + scrollX,
        });
      }
    }
  }, [buttonRef]);

  // Pre-populate form with lead data when modal opens
  useEffect(() => {
    if (open && leadData) {
      calculatePosition();

      // Map lead currency to deal currency with proper fallback logic
      // Find currency by name/code from lead data, then get its ID
      let leadCurrencyId = undefined;
      if (leadData.currency && currencies.length > 0) {
        const foundCurrency = currencies.find(
          (curr) =>
            curr.name === leadData.currency ||
            curr.description === leadData.currency,
        );
        leadCurrencyId = foundCurrency ? foundCurrency.id : undefined;
      }
      // If no match found, use first available currency
      if (!leadCurrencyId && currencies.length > 0) {
        leadCurrencyId = currencies[0].id;
      }

      // Map lead stage to deal stage (if possible)
      let mappedStage = undefined;
      if (leadData.engagementStageId && dealStages.length > 0) {
        // Try to find a matching deal stage by name from lead stage
        // Since we don't have lead stages data, we'll use the first available deal stage
        // or try to match by a common naming pattern
        const leadStageName =
          leadData.engagementStageName || leadData.stageName;

        if (leadStageName) {
          // Try to find a matching deal stage by name
          const matchingDealStage = dealStages.find(
            (stage) => stage.name.toLowerCase() === leadStageName.toLowerCase(),
          );
          if (matchingDealStage) {
            mappedStage = matchingDealStage.id;
          } else {
            // Fallback to first available deal stage
            if (dealStages.length > 0) {
              mappedStage = dealStages[0].id;
            }
          }
        } else {
          // If no lead stage name available, use first available deal stage
          if (dealStages.length > 0) {
            mappedStage = dealStages[0].id;
          }
        }
      } else {
        // If no lead stage mapping possible, use first available deal stage
        if (dealStages.length > 0) {
          mappedStage = dealStages[0].id;
        }
      }

      // Validate if lead owner exists in current users list
      let validOwner = undefined;
      if (leadData.leadOwner && users.length > 0) {
        const ownerExists = users.find((u) => u.id === leadData.leadOwner);
        if (ownerExists) {
          validOwner = leadData.leadOwner;
        }
      }

      // Only set owner if we can validate it exists in users list
      // Don't fallback to userId unless we can confirm it exists
      let finalOwner = undefined;
      if (validOwner) {
        finalOwner = validOwner;
      } else if (users.length > 0) {
        // Check if current user exists in the users list before using as fallback
        const currentUserExists = users.find((u) => u.id === userId);
        if (currentUserExists) {
          finalOwner = userId;
        }
      }

      form.setFieldsValue({
        name: leadData.name || '',
        owner: finalOwner,
        // Deal description should be written specifically for the deal, not copied from lead interest
        description: '',
        currency: leadCurrencyId,
        dealType: undefined, // Let user select deal type (no direct mapping from lead)
        stage: mappedStage, // Mapped from lead stage if possible
        revenue: undefined, // Empty by default, let user input their own value
        // closingDate: Let user select their own date
      });
    }
  }, [
    open,
    leadData,
    form,
    userId,
    dealStages,
    users,
    currencies,
    calculatePosition,
  ]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    const handleScroll = () => {
      if (open) {
        calculatePosition();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscapeKey);
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [open, onClose, calculatePosition]);

  const handleSubmit = async (values: MakeDealFormData) => {
    try {
      setLoading(true);

      // Ensure reference data is loaded before validation
      if (isAnyLoading) {
        message.warning(
          'Please wait for data to load completely before creating the deal.',
        );
        return;
      }

      // Validate lead data before proceeding
      const validation = validateLeadDataForDeal(leadData);
      if (!validation.isValid) {
        message.error(
          `Cannot create deal: Missing required lead data (${validation.missingFields.join(', ')})`,
        );
        return;
      }

      // Fix any orphaned references automatically
      const validRefs = getValidReferencesFromLead(leadData);

      if (validRefs.hasOrphanedRefs) {
        message.warning(
          `Fixed orphaned references for ${validRefs.fixedRefs.join(', ')}. ` +
            'Using available alternatives to create the deal.',
          5, // Show for 5 seconds
        );
      }

      // Create deal data - all fields included from the start
      // Use fixed valid references
      const dealData = {
        dealName: values.name,
        companyId: safeStringExtract(validRefs.companyId),
        supplierId: safeStringExtract(validRefs.supplierId),
        contactPersonName: safeStringExtract(
          `${leadData.contactPersonFName || ''} ${leadData.contactPersonLName || ''}`.trim(),
        ),
        contactPersonPosition: safeStringExtract(
          leadData.contactPersonPosition,
        ),
        contactPersonEmail: safeStringExtract(leadData.contactPersonEmail),
        contactPersonPhoneNumber: safeStringExtract(
          leadData.contactPersonPhoneNumber,
        ),
        // Only include solutionIds if they exist and are valid
        solutionIds:
          Array.isArray(leadData.solutionId) && leadData.solutionId.length > 0
            ? leadData.solutionId
            : Array.isArray(leadData.solutionIds) &&
                leadData.solutionIds.length > 0
              ? leadData.solutionIds
              : undefined,
        sectorId: safeStringExtract(validRefs.sectorId),
        leadId: leadData.id, // Link to the original lead
        dealTypeId: values.dealType,
        submissionDate: values.closingDate.format('YYYY-MM-DD'),
        engagementStageId: values.stage,
        additionalInformation: values.description,
        createdBy: userId,
        createdAt: new Date().toISOString().split('T')[0],
        amount: values.revenue,
        currency: values.currency, // Currency ID (UUID) from form
        roleId:
          leadData.leadParticipants?.[0]?.roleId ||
          getRoleIdForUser(values.owner), // Use lead's role or fallback
        employees: [values.owner], // Add employee to participants
        tenantId: leadData.tenantId, // Add tenantId from lead
      };

      // Additional validation for form-selected fields

      // Validate that form-selected values exist in available options
      const validationErrors: string[] = [];

      if (!dealTypes.find((dt) => dt.id === values.dealType)) {
        validationErrors.push('Selected deal type is not available');
      }

      if (!currencies.find((c) => c.id === values.currency)) {
        validationErrors.push('Selected currency is not available');
      }

      if (!dealStages.find((ds) => ds.id === values.stage)) {
        validationErrors.push('Selected engagement stage is not available');
      }

      if (!users.find((u) => u.id === values.owner)) {
        validationErrors.push('Selected owner is not available');
      }

      if (!getRoleIdForUser(values.owner)) {
        validationErrors.push('No valid role found for selected owner');
      }

      if (validationErrors.length > 0) {
        message.error(
          `Validation failed: ${validationErrors.join(', ')}. Please refresh the page and try again.`,
        );
        return;
      }

      // Validate foreign key fields are proper UUIDs
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const foreignKeyFields = [
        { name: 'companyId', value: dealData.companyId },
        { name: 'supplierId', value: dealData.supplierId },
        { name: 'sectorId', value: dealData.sectorId },
        { name: 'dealTypeId', value: dealData.dealTypeId },
        { name: 'engagementStageId', value: dealData.engagementStageId },
        { name: 'currency', value: dealData.currency },
        // { name: 'roleId', value: dealData.roleId }, // Removed
      ];

      const invalidFields = foreignKeyFields.filter(
        (field) => field.value && !uuidRegex.test(field.value),
      );

      if (invalidFields.length > 0) {
        message.error(
          `Invalid field values: ${invalidFields.map((f) => f.name).join(', ')}. Please check the data.`,
        );
        return;
      }

      // Validate engagement stage exists in available options
      if (dealData.engagementStageId && dealStages.length > 0) {
        const stageExists = dealStages.find(
          (stage) => stage.id === dealData.engagementStageId,
        );
        if (!stageExists) {
          message.error(
            'The selected engagement stage is not available in your current tenant. Please refresh the page and try again.',
          );
          return;
        }
      }

      // Check deal type
      if (dealData.dealTypeId && dealTypes.length > 0) {
        const typeExists = dealTypes.find(
          (type) => type.id === dealData.dealTypeId,
        );
        if (!typeExists) {
          message.error(
            'The selected deal type is not available in your current tenant. Please refresh the page and try again.',
          );
          return;
        }
      }

      // Check currency
      if (dealData.currency && currencies.length > 0) {
        const currencyExists = currencies.find(
          (curr) => curr.id === dealData.currency,
        );
        if (!currencyExists) {
          message.error(
            'The selected currency is not available in your current tenant. Please refresh the page and try again.',
          );
          return;
        }
      }

      // Note: roleId validation removed since we no longer send roleId

      try {
        // Create deal with complete data including all necessary fields
        const createdDeal = await createDealMutation.mutateAsync(dealData);

        // Store lead and form data in sessionStorage for display in deal detail page
        const dealContextData = {
          leadData: leadData,
          formData: values,
          dealId: createdDeal.id,
          timestamp: new Date().toISOString(),
        };
        sessionStorage.setItem(
          `dealContext_${createdDeal.id}`,
          JSON.stringify(dealContextData),
        );

        // Store specific context data for missing fields
        const leadContext = {
          id: leadData.id,
          name: leadData.name,
          solutionIds: leadData.solutionId || leadData.solutionIds || [],
          leadRate: leadData.leadRate || 0,
          currency: leadData.currency || '',
          contactPersonPosition: leadData.contactPersonPosition || '',
          // Use lead's role data instead of generating new role
          leadRole: leadData.leadParticipants?.[0]?.role || null,
          leadRoleId: leadData.leadParticipants?.[0]?.roleId || null,
          dealOwner: values.owner,
        };

        const formContext = {
          revenue: values.revenue,
          currency: values.currency,
          currencyName:
            currencies.find((c) => c.id === values.currency)?.name || '',
        };

        sessionStorage.setItem(
          'leadContextForDeal',
          JSON.stringify(leadContext),
        );
        sessionStorage.setItem('dealFormContext', JSON.stringify(formContext));

        // Invalidate relevant queries
        queryClient.invalidateQueries(['dealsWithDetails']);
        queryClient.invalidateQueries(['leads']);
        queryClient.invalidateQueries(['dealTypes']);
        queryClient.invalidateQueries(['dealStages']);
        queryClient.invalidateQueries(['companies']);
        queryClient.invalidateQueries(['dealSources']);
        queryClient.invalidateQueries(['sectors']);
        queryClient.invalidateQueries(['currencies']);
        queryClient.invalidateQueries(['roles']);
        queryClient.invalidateQueries(['employees']);

        // Close modal and redirect to leads page immediately
        onClose();

        // Store success message data for display on leads page
        sessionStorage.setItem(
          'dealCreationSuccess',
          JSON.stringify({
            message: 'Successfully Created a deal',
            timestamp: new Date().toISOString(),
          }),
        );

        // Redirect to leads page immediately
        router.push('/leads');
      } catch (dealError: any) {
        // Enhanced error handling for foreign key constraints
        if (
          dealError?.response?.data?.message?.includes('foreign key constraint')
        ) {
          const errorMessage = dealError.response.data.message;

          // Try to identify the problematic field from the error message
          let fieldHint = '';
          if (errorMessage.includes('company'))
            fieldHint = ' (Company may not exist in current tenant)';
          else if (errorMessage.includes('supplier'))
            fieldHint = ' (Supplier may not exist in current tenant)';
          else if (errorMessage.includes('source'))
            fieldHint = ' (Source may not exist in current tenant)';
          else if (errorMessage.includes('sector'))
            fieldHint = ' (Sector may not exist in current tenant)';
          else if (errorMessage.includes('deal_type'))
            fieldHint = ' (Deal Type may not exist in current tenant)';
          else if (errorMessage.includes('engagement_stage'))
            fieldHint = ' (Engagement Stage may not exist in current tenant)';
          else if (errorMessage.includes('role'))
            fieldHint = ' (Role may not exist in current tenant)';

          message.error(
            `Cannot create deal: Referenced data not found${fieldHint}. Please check if all required data exists in your current tenant.`,
          );
        } else {
          // Handle other types of errors
          if (dealError.response?.data?.errors) {
            showValidationErrors(dealError.response.data.errors);
          } else {
            message.error('Failed to create deal. Please try again.');
          }
        }
        return;
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        message.error('Failed to create deal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const renderLoadingState = () => {
    if (!isAnyLoading) return null;

    return (
      <div className="flex justify-center items-center py-8">
        <Spin size="large" />
        <span className="ml-3 text-sm font-medium text-muted-foreground">
          Loading options...
        </span>
      </div>
    );
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg px-4 py-4 w-[400px] max-w-[calc(100vw-32px)] sm:w-[520px]">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-1 pb-0 -mb-1">
        <div className="flex flex-col gap-0">
          <span className="text-2xl font-bold text-foreground">
            Make a Deal
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            Move your lead to a deal
          </span>
        </div>
      </div>

      {isAnyLoading ? (
        renderLoadingState()
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-6"
        >
          {/* Add missing information */}
          <div className="mb-0">
            <h3 className="block font-semibold text-foreground mb-2 text-sm">
              Add missing information
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-2 gap-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Name<span className="text-red-500 ml-1">*</span>
                </label>
                <Form.Item
                  name="name"
                  className="mb-0"
                  rules={[
                    { required: true, message: 'Please enter account name' },
                  ]}
                >
                  <Input
                    placeholder="Account Name"
                    prefix={
                      <FileTextOutlined className="text-muted-foreground" />
                    }
                    allowClear
                    onClear={() => form.setFieldValue('name', '')}
                    className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-input-hover"
                    style={{ fontWeight: 'normal' }}
                  />
                </Form.Item>
              </div>

              {/* Owner Field */}
              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Owner<span className="text-red-500 ml-1">*</span>
                </label>
                <Form.Item
                  name="owner"
                  className="mb-0"
                  rules={[
                    { required: true, message: 'Please select account owner' },
                  ]}
                >
                  <Select
                    placeholder={
                      usersLoading ? 'Loading users...' : 'Account Owner'
                    }
                    allowClear
                    showSearch
                    notFoundContent="No owners found"
                    className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-select-hover"
                    dropdownStyle={{ zIndex: 100000 }}
                    getPopupContainer={(trigger) =>
                      trigger.parentElement || document.body
                    }
                    suffixIcon={<DownOutlined className="text-lg" />}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                    }}
                    loading={usersLoading}
                    disabled={usersLoading}
                    filterOption={(input: string, option: any) => {
                      const children = option?.children;
                      if (typeof children === 'string') {
                        return (
                          children.toLowerCase().indexOf(input.toLowerCase()) >=
                          0
                        );
                      }
                      return false;
                    }}
                  >
                    {usersLoading ? (
                      <Option value="" disabled>
                        Loading users...
                      </Option>
                    ) : !Array.isArray(users) || users.length === 0 ? (
                      <Option value="" disabled>
                        No users available
                      </Option>
                    ) : (
                      users.map((user) => (
                        <Option key={user.id} value={user.id}>
                          {formatUserName(user)}
                        </Option>
                      ))
                    )}
                  </Select>
                </Form.Item>
                {/* Show warning if original lead owner is not found in current users */}
                {leadData?.leadOwner &&
                  !usersLoading &&
                  Array.isArray(users) &&
                  users.length > 0 &&
                  !users.find((u) => u.id === leadData.leadOwner) && (
                    <div className="text-xs text-orange-600 mt-1">
                      ⚠️ Original lead owner not found in current tenant
                    </div>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2 gap-4">
              {/* Closing Date Field */}
              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Closing Date<span className="text-red-500 ml-1">*</span>
                </label>
                <Form.Item
                  name="closingDate"
                  className="mb-0"
                  rules={[
                    { required: true, message: 'Please select closing date' },
                    {
                      //eslint-disable-next-line
                      validator: (_, value) => {
                        if (!value) {
                          return Promise.resolve();
                        }
                        const today = dayjs().startOf('day');
                        if (value.isBefore(today, 'day')) {
                          return Promise.reject(
                            new Error('Closing date must be after today'),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <DatePicker
                    placeholder="Closing Date"
                    className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-input-hover"
                    suffixIcon={
                      <CalendarOutlined className="text-muted-foreground" />
                    }
                    format="DD/MM/YYYY"
                    allowClear
                    getPopupContainer={() => document.body}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                    }}
                    popupStyle={{ zIndex: 100001 }}
                  />
                </Form.Item>
              </div>

              {/* Deal Type Field */}
              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Type<span className="text-red-500 ml-1">*</span>
                </label>
                <Form.Item
                  name="dealType"
                  className="mb-0"
                  rules={[{ required: true, message: 'Please select type' }]}
                >
                  <Select
                    placeholder="Type"
                    allowClear
                    showSearch
                    notFoundContent="No types found"
                    className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-select-hover"
                    dropdownStyle={{ zIndex: 100000 }}
                    getPopupContainer={(trigger) =>
                      trigger.parentElement || document.body
                    }
                    filterOption={(input: string, option: any) => {
                      const children = option?.children;
                      if (typeof children === 'string') {
                        return (
                          children.toLowerCase().indexOf(input.toLowerCase()) >=
                          0
                        );
                      }
                      return false;
                    }}
                    suffixIcon={<DownOutlined className="text-lg" />}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                    }}
                    options={
                      dealTypes?.map((type) => ({
                        value: type.id,
                        label: type.name,
                      })) || []
                    }
                  />
                </Form.Item>
              </div>
            </div>

            {/* Stage Field - Full Width */}
            <div className="mb-2">
              <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                Stage<span className="text-red-500 ml-1">*</span>
              </label>
              <Form.Item
                name="stage"
                className="mb-0"
                rules={[
                  { required: true, message: 'Please select deal stage' },
                ]}
              >
                <Select
                  placeholder="Deal Stage"
                  allowClear
                  showSearch
                  notFoundContent="No stages found"
                  className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-select-hover"
                  loading={dealStagesLoading}
                  dropdownStyle={{ zIndex: 100000 }}
                  getPopupContainer={(trigger) =>
                    trigger.parentElement || document.body
                  }
                  filterOption={(input: string, option: any) => {
                    const children = option?.children;
                    if (typeof children === 'string') {
                      return (
                        children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      );
                    }
                    return false;
                  }}
                  suffixIcon={<DownOutlined className="text-lg" />}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                  }}
                  optionLabelProp="label"
                >
                  {dealStagesLoading ? (
                    <Option value="" disabled>
                      Loading stages...
                    </Option>
                  ) : !Array.isArray(dealStages) || dealStages.length === 0 ? (
                    <Option value="" disabled>
                      No stages available
                    </Option>
                  ) : (
                    dealStages.map((stage: any) => {
                      const isSelected =
                        stage.id === form.getFieldValue('stage');

                      return (
                        <Option
                          key={stage.id}
                          value={stage.id}
                          label={
                            <div className="flex items-center gap-2">
                              {stage.colorCode && (
                                <div
                                  className="w-3 h-3 rounded-full border border-border flex-shrink-0"
                                  style={{ backgroundColor: stage.colorCode }}
                                />
                              )}
                              <span>{stage.name}</span>
                            </div>
                          }
                        >
                          <div className="flex items-center gap-3 w-full">
                            {stage.colorCode && (
                              <div
                                className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0"
                                style={{ backgroundColor: stage.colorCode }}
                              />
                            )}
                            <span
                              className={`flex-1 ${isSelected ? 'font-semibold' : ''}`}
                            >
                              {stage.name}
                            </span>
                          </div>
                        </Option>
                      );
                    })
                  )}
                </Select>
              </Form.Item>
            </div>

            {/* Revenue Field with Currency */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Revenue<span className="text-red-500 ml-1">*</span>
                </label>
                <Form.Item
                  name="revenue"
                  className="mb-0"
                  rules={[
                    { required: true, message: 'Please enter deal revenue' },
                  ]}
                >
                  <InputNumber
                    placeholder="Deal Revenue"
                    className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-input-hover"
                    suffix={
                      <DollarOutlined className="text-muted-foreground text-xl" />
                    }
                    min={0}
                    step={0.01}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      fontWeight: 'normal',
                    }}
                  />
                </Form.Item>
              </div>

              <div>
                <div className="h-6"></div>
                <Form.Item
                  name="currency"
                  className="mb-0"
                  rules={[
                    { required: true, message: 'Please select currency' },
                  ]}
                >
                  <Select
                    placeholder="Select Currency"
                    allowClear
                    showSearch
                    loading={currenciesLoading}
                    dropdownStyle={{ zIndex: 100000 }}
                    getPopupContainer={(trigger) =>
                      trigger.parentElement || document.body
                    }
                    disabled={false}
                    notFoundContent={
                      currencies.length === 0
                        ? 'No currencies available'
                        : 'No currencies found'
                    }
                    className="border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-select-hover"
                    suffixIcon={<DownOutlined className="text-lg" />}
                    filterOption={(input: string, option: any) => {
                      const children = option?.children;
                      if (typeof children === 'string') {
                        return (
                          children.toLowerCase().indexOf(input.toLowerCase()) >=
                          0
                        );
                      }
                      return false;
                    }}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      backgroundColor: tokens.color.surfaceCard,
                    }}
                    options={
                      currencies?.map((currency) => ({
                        value: currency.id, // Store the UUID instead of name
                        label: `${currency.name} - ${currency.description}`,
                      })) || []
                    }
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          {/* Deal Additional Information */}
          <div className="mb-0 -mt-1">
            <h3 className="block font-semibold text-foreground mb-2 text-sm">
              Deal Additional Information
            </h3>

            <div>
              <Form.Item name="description" className="mb-0">
                <TextArea
                  rows={4}
                  className="border-border bg-surface-card w-full text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-input-hover"
                  style={{ fontWeight: 'normal' }}
                />
              </Form.Item>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row items-center justify-center gap-3 pt-2 mt-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-auto h-11 focus:outline-none focus:ring-0 focus:shadow-none active:shadow-none rounded-lg px-4 py-3"
              style={{
                minWidth: 0,
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: tokens.color.blue,
                borderColor: tokens.color.blue,
                color: tokens.color.surfaceCard,
                transition: 'background-color 0.2s ease',
                transform: 'none',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.color.blue;
                e.currentTarget.style.borderColor = tokens.color.blue;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.color.blue;
                e.currentTarget.style.borderColor = tokens.color.blue;
              }}
            >
              Make a Deal
            </Button>
            <Button
              onClick={handleCancel}
              className="py-3 px-4 rounded-lg w-auto h-11"
              style={{
                borderColor: tokens.color.blue,
                color: tokens.color.blue,
                backgroundColor: 'transparent',
                transition: 'all 0.2s ease',
                transform: 'none',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.color.lightblue;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </Button>
          </div>
        </Form>
      )}
    </div>
  );

  if (!open) return null;

  return (
    <>
      {/* Background Overlay */}
      {createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.3)', // Light dark overlay - same as action button
            zIndex: 9999,
            pointerEvents: 'auto', // Allow clicks to close
          }}
          onClick={onClose}
        />,
        document.body,
      )}

      {dropdownPosition.top > 0 &&
        createPortal(
          <div
            className="absolute z-[10000] transition-all duration-100 ease-out"
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              position: 'absolute',
            }}
          >
            {dropdownContent}
          </div>,
          document.body,
        )}
    </>
  );
}
