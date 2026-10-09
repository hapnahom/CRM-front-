'use client';

import { tokens } from '@/lib/design-tokens';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  AdditionalInformationSection,
  ContactInformationSection,
  LeadInformationSection,
  RolesSection,
} from './sections';
import { useCreateLead } from '@/store/server/features/leads/mutation';
import { useCreateLeadWithDuplicateHandling } from '@/store/server/features/leads/mutations/duplicateLeadMutations';
import { useUploadLeadDocument } from '@/store/server/features/leads/lead-documents/mutation';
import { useCreateMultipleLeadCustomFields } from '@/store/server/features/lead-custom-fields/mutation';
import { useGetCustomFields } from '@/store/server/features/custom-fields/queries';
import { leadValidation } from './options';
import DuplicateLeadModal from '@/components/common/duplicateLeadModal';
import dayjs from 'dayjs';

interface CreateLeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateLeadDrawer: React.FC<CreateLeadDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const form = useForm<any>({
    defaultValues: {
      estimatedBudgets: [''],
      currencies: [],
      leadParticipants: [],
    },
  });
  // eslint-disable-next-line
  const { mutate, isLoading } = useCreateLead();

  // Handle successful lead creation (called after duplicate confirmation)
  const handleLeadCreationSuccess = (leadData: any) => {
    const leadId =
      leadData?.id ||
      leadData?._id ||
      leadData?.leadId ||
      leadData?.data?.id ||
      leadData?.data?._id;

    if (!leadId) {
      toast.error('Lead created but could not upload files - missing lead ID');
      return;
    }

    const formValues = form.getValues();
    const customFieldsPayload: Array<{
      customFieldId: string;
      value: string;
      leadId: string;
      optionId?: string;
    }> = [];

    Object.keys(formValues).forEach((key) => {
      if (key.startsWith('customField_')) {
        const fieldId = key.replace('customField_', '');
        const value = formValues[key];

        if (value !== undefined && value !== null && value !== '') {
          const customField = allCustomFields.find(
            (field) => field.id === fieldId,
          );

          if (customField) {
            if (customField.isRequired || selectedOptionalFields.has(fieldId)) {
              let stringValue = '';
              let optionId = null;

              if (
                customField.type === 'checkbox' ||
                customField.type === 'dropdown'
              ) {
                // Handle both string array and object array formats
                const selectedOption = customField.fieldValues?.find(
                  (option) => {
                    if (typeof option === 'string') {
                      return option === value;
                    } else {
                      return option.id === value;
                    }
                  },
                );

                if (selectedOption) {
                  if (typeof selectedOption === 'string') {
                    // String array format: value is the string itself
                    stringValue = selectedOption;
                    optionId = selectedOption; // Use the string as optionId
                  } else {
                    // Object array format: value is the option.id
                    stringValue = selectedOption.value;
                    optionId = selectedOption.id;
                  }
                }
              } else if (value instanceof Date) {
                stringValue = value.toISOString();
              } else {
                stringValue = value.toString();
              }

              if (stringValue) {
                customFieldsPayload.push({
                  customFieldId: fieldId,
                  value: stringValue,
                  leadId: leadId,
                  optionId: optionId,
                });
              }
            }
          }
        }
      }
    });

    if (customFieldsPayload.length > 0) {
      createCustomFields(customFieldsPayload, {
        onSuccess: () => {
          toast.success('Lead and custom fields created successfully');
          setClearOptionalFields(true);
          setSelectedFiles([]);
        },
        onError: () => {
          toast.warning('Lead created but custom fields failed to save');
        },
      });
    }

    if (selectedFiles.length > 0) {
      // Limit the number of files to upload
      const filesToUpload = selectedFiles.slice(
        0,
        leadValidation.limits.leadDocuments,
      );
      filesToUpload.forEach((file) => {
        if (file.originFileObj) {
          uploadDocument({
            file: file.originFileObj,
            leadId: leadId,
            documentName: file.name,
          });
        } else {
          toast.error(`File ${file.name} is missing and cannot be uploaded`);
        }
      });

      onClose();
      form.reset();
      setLeadParticipants([{ id: Date.now() }]);
      setCustomFields([]);
      setSelectedFiles([]);
    } else {
      onClose();
      form.reset();
      setLeadParticipants([{ id: Date.now() }]);
      setCustomFields([]);
      setSelectedFiles([]);
    }
  };

  // Enhanced lead creation with duplicate handling
  const {
    createLeadWithDuplicateHandling,
    handleDuplicateConfirm,
    handleDuplicateCancel,
    modalState,
    isLoading: duplicateHandlingLoading,
  } = useCreateLeadWithDuplicateHandling(handleLeadCreationSuccess);

  const { mutate: uploadDocument } = useUploadLeadDocument();
  const { mutate: createCustomFields, isLoading: customFieldsLoading } =
    useCreateMultipleLeadCustomFields();
  const { data: allCustomFields = [] } = useGetCustomFields();

  const [leadParticipants, setLeadParticipants] = useState<
    Array<{ id: number }>
  >([{ id: Date.now() }]);

  const [customFields, setCustomFields] = useState<Array<{ id: number }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [clearOptionalFields, setClearOptionalFields] = useState(false);
  const [selectedOptionalFields, setSelectedOptionalFields] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    if (clearOptionalFields) {
      const timer = setTimeout(() => {
        setClearOptionalFields(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [clearOptionalFields]);

  useEffect(() => {
    if (clearOptionalFields) {
      setSelectedOptionalFields(new Set());
    }
  }, [clearOptionalFields]);

  // Removed automatic date filling - user must select date manually

  const handleCreateLead = (values: any) => {
    const cleanValues = Object.keys(values).reduce((acc, key) => {
      const value = values[key];
      if (
        value !== null &&
        value !== undefined &&
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !(value instanceof HTMLElement) &&
        !(value?.constructor?.name === 'HTMLInputElement') &&
        !(value?.constructor?.name === 'HTMLSelectElement') &&
        !(value?.constructor?.name === 'HTMLTextAreaElement')
      ) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    const {
      contactPersonFName,
      contactPersonLName,
      contactPersonPosition,
      contactPersonEmail,
      contactPersonPhoneNumber,
      companyId,
      supplierId,
      solutionId,
      leadOwner,
      sectorId,
      engagementStageId,
      estimatedBudgets,
      currencies,
      additionalInformation,
      leadRate,
      leadName,
      createdDate,
      ...rest
    } = cleanValues || {};

    const normalizedCreatedDate = createdDate
      ? createdDate?.toDate?.()
        ? createdDate.toDate().toISOString()
        : createdDate?.toISOString
          ? createdDate.toISOString()
          : createdDate
      : undefined;

    const dateFormats = {
      isoString: normalizedCreatedDate,
      dateOnly: createdDate
        ? dayjs(createdDate).format('YYYY-MM-DD')
        : undefined,
      timestamp: createdDate ? dayjs(createdDate).valueOf() : undefined,
      isoDate: createdDate ? dayjs(createdDate).toISOString() : undefined,
      formattedDate: createdDate
        ? dayjs(createdDate).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
        : undefined,
    };

    // Validate required fields
    const missingRequiredFields = leadValidation.required.filter((field) => {
      const value = cleanValues[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingRequiredFields.length > 0) {
      toast.error(
        `Missing required fields: ${missingRequiredFields.join(', ')}`,
      );
      return;
    }

    if (!leadName || typeof leadName !== 'string' || leadName.trim() === '') {
      toast.error('Lead name is required and must be a non-empty string');
      return;
    }

    const leadParticipantsData =
      form.getValues('leadParticipants') || cleanValues.leadParticipants;

    const cleanLeadParticipants = Array.isArray(leadParticipantsData)
      ? leadParticipantsData
          .slice(0, leadValidation.limits.leadParticipants)
          .flatMap((item) => {
            if (item.roleId && item.users && Array.isArray(item.users)) {
              return item.users.map((userId: string) => ({
                roleId: item.roleId,
                userId: userId,
              }));
            }
            return [];
          })
      : [];

    const hasValidLeadParticipants = cleanLeadParticipants.every(
      (item) =>
        item.roleId &&
        item.userId &&
        typeof item.roleId === 'string' &&
        typeof item.userId === 'string',
    );

    if (cleanLeadParticipants.length > 0 && !hasValidLeadParticipants) {
      toast.error(
        'Invalid lead participants data. Please check your selections.',
      );
      return;
    }

    const basePayload = {
      name: leadName.trim(),
      contactPersonFName: contactPersonFName?.toString() || '',
      contactPersonLName: contactPersonLName?.toString() || '',
      contactPersonPosition: contactPersonPosition?.toString() || '',
      contactPersonEmail: contactPersonEmail?.toString() || '',
      contactPersonPhoneNumber: contactPersonPhoneNumber?.toString() || '',
      companyId: companyId?.toString() || '',
      supplierId: supplierId?.toString() || '',
      solutionId: solutionId
        ? [solutionId.toString()].slice(0, leadValidation.limits.solutionIds)
        : [],
      leadOwner: leadOwner?.toString() || '',
      sectorId: sectorId?.toString() || '',
      engagementStageId: engagementStageId?.toString() || '',
      estimatedBudgets:
        estimatedBudgets && currencies
          ? estimatedBudgets
              .slice(0, leadValidation.limits.estimatedBudgets)
              .map((amount: any, index: number) => ({
                amount: parseFloat(amount) || 0,
                currencyId: currencies[index] || '',
              }))
          : [],
      additionalInformation: additionalInformation?.toString() || '',
      leadRate: leadRate ? parseInt(leadRate) : 0,
      createdDate: normalizedCreatedDate,
      createdAt: normalizedCreatedDate,
      dateCreated: normalizedCreatedDate,
      leadCreatedDate: normalizedCreatedDate,
      ...dateFormats,
      leadDate: normalizedCreatedDate,
      customCreatedAt: normalizedCreatedDate,
      dates: {
        createdAt: normalizedCreatedDate,
        createdDate: normalizedCreatedDate,
        customDate: normalizedCreatedDate,
      },
    };

    const payload = {
      ...basePayload,
      ...rest,
      leadParticipants: cleanLeadParticipants,
    };

    // Use enhanced lead creation with duplicate handling
    createLeadWithDuplicateHandling(payload);
  };

  const addLeadParticipantRow = () => {
    setLeadParticipants([...leadParticipants, { id: Date.now() }]);
  };

  const removeLeadParticipantRow = (id: number) => {
    if (leadParticipants.length > 1) {
      setLeadParticipants(
        leadParticipants.filter((participant) => participant.id !== id),
      );
      const currentLeadParticipants = form.getValues('leadParticipants') || [];
      const newLeadParticipants = currentLeadParticipants.filter(
        // eslint-disable-next-line
        (_: any, index: number) => leadParticipants[index]?.id !== id,
      );
      form.setValue('leadParticipants', newLeadParticipants);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Date.now() }]);
  };

  const removeCustomField = (id: number) => {
    setCustomFields(customFields.filter((field) => field.id !== id));
    const currentCustomInfo = form.getValues('customInformation') || [];
    const newCustomInfo = currentCustomInfo.filter(
      // eslint-disable-next-line
      (_: any, index: number) => customFields[index]?.id !== id,
    );
    form.setValue('customInformation', newCustomInfo);
  };

  const handleFileListChange = (fileList: any[]) => {
    setSelectedFiles(fileList);
  };

  const handleSheetClose = () => {
    setClearOptionalFields(true);
    setSelectedFiles([]);
    onClose();
  };

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleSheetClose();
        }}
      >
        <SheetContent
          side="right"
          className="w-[30%] !max-w-[30%] min-w-[420px] gap-0 p-0"
          data-cy="create-lead-drawer"
        >
          <SheetHeader data-cy="create-lead-drawer-title">
            <SheetTitle
              className="text-xl font-semibold"
              data-cy="create-lead-title"
            >
              Leads
            </SheetTitle>
            <SheetDescription
              style={{ color: tokens.color.textMuted }}
              data-cy="create-lead-subtitle"
            >
              Create a potential lead
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              id="create-lead-form"
              onSubmit={form.handleSubmit(handleCreateLead)}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-4"
              data-cy="create-lead-form"
            >
              <LeadInformationSection form={form} />

              <RolesSection
                roles={leadParticipants}
                addRoleRow={addLeadParticipantRow}
                removeRoleRow={removeLeadParticipantRow}
              />

              <ContactInformationSection />

              <AdditionalInformationSection
                customFields={customFields}
                addCustomField={addCustomField}
                removeCustomField={removeCustomField}
                onFileListChange={handleFileListChange}
                form={form}
                clearOptionalFields={clearOptionalFields}
                onOptionalFieldsChange={setSelectedOptionalFields}
              />
            </form>
          </Form>

          <SheetFooter>
            <div
              className="flex w-full justify-center items-center gap-4"
              data-cy="create-lead-drawer-footer"
            >
              <Button
                type="submit"
                form="create-lead-form"
                className="font-md bg-brand text-brand-foreground hover:bg-brand/90 h-10 px-6"
                disabled={
                  isLoading || customFieldsLoading || duplicateHandlingLoading
                }
                data-cy="create-lead-submit-btn"
              >
                Create Lead
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-md border-brand text-brand hover:text-brand h-10 px-6"
                onClick={onClose}
                data-cy="cancel-lead-btn"
              >
                Cancel
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Duplicate Lead Confirmation Modal */}
      <DuplicateLeadModal
        isOpen={modalState.isOpen}
        duplicateInfo={modalState.duplicateInfo}
        pendingLeadData={modalState.pendingLeadData}
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateCancel}
        isLoading={duplicateHandlingLoading}
      />
    </>
  );
};
