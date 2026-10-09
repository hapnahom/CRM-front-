'use client';

import { tokens } from '@/lib/design-tokens';

import React, { useState } from 'react';
import { Controller, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Briefcase, Mail, Phone, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useGetCompanies } from '@/store/server/features/leads/companies/queries';
import { useCreateCompany } from '@/store/server/features/leads/companies/mutation';
import { useQueryClient } from 'react-query';
import { leadValidation } from '../options';
import { useIsMobile } from '@/hooks/useIsMobile';
import { FormFieldRow, SearchableSelect } from './form-controls';

// Import the Company type from queries
import type { Company } from '@/store/server/features/leads/companies/queries';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PrefixedInputProps extends React.ComponentProps<typeof Input> {
  icon: React.ReactNode;
}

function PrefixedInput({ icon, className, ...props }: PrefixedInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <Input className={`pl-9 ${className ?? ''}`} {...props} />
    </div>
  );
}

export const ContactInformationSection: React.FC = () => {
  const { control } = useFormContext();
  const {
    data: companies = [],
    isLoading: companiesLoading,
    refetch: refetchCompanies,
  } = useGetCompanies();
  const { mutate: createCompany, isLoading: isCreatingCompany } =
    useCreateCompany();
  const queryClient = useQueryClient();
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const { isMobile } = useIsMobile();

  const addCompanyForm = useForm({
    defaultValues: { name: '', email: '', phone: '', website: '' },
  });

  // Handle different possible data structures from API
  let safeCompanies: Company[] = [];

  if (Array.isArray(companies)) {
    safeCompanies = companies;
  } else if (companies && typeof companies === 'object') {
    // Handle case where API returns { items: [], total: 0 } or similar
    const companiesObj = companies as any;
    if (Array.isArray(companiesObj.items)) {
      safeCompanies = companiesObj.items;
    } else if (Array.isArray(companiesObj.data)) {
      safeCompanies = companiesObj.data;
    }
  }

  // Transform companies data to match Select component format
  const companyOptions = safeCompanies.map((company: Company) => ({
    value: company.id,
    label: company.name,
  }));

  const hasCompanies = safeCompanies.length > 0;
  const shouldShowNoCompanies = !companiesLoading && !hasCompanies;

  const handleAddCompany = () => {
    setIsAddCompanyModalOpen(true);
  };

  const handleCreateCompany = async (values: any) => {
    try {
      createCompany(values, {
        onSuccess: () => {
          toast.success('Company created successfully!');
          setIsAddCompanyModalOpen(false);
          addCompanyForm.reset();

          // Force immediate refetch of companies list
          refetchCompanies();

          // Also invalidate queries as backup
          queryClient.invalidateQueries(['companies']);
        },
        onError: (error: any) => {
          toast.error(
            error.message || 'Failed to create company. Please try again.',
          );
        },
      });
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const handleCancelAddCompany = () => {
    setIsAddCompanyModalOpen(false);
    addCompanyForm.reset();
  };

  return (
    <div className="space-y-4" data-cy="contact-information-section">
      <p style={{ color: tokens.color.textMuted }} data-cy="contact-info-title">
        Contact Information
      </p>
      <div
        className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-3"
        data-cy="contact-info-grid"
      >
        <Controller
          name="contactPersonFName"
          control={control}
          rules={{
            required: 'First name is required',
            pattern: {
              value: leadValidation.patterns.firstName,
              message:
                'First name must be 2-50 characters with only letters, spaces, hyphens, and apostrophes',
            },
          }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Firstname"
              required
              error={fieldState.error?.message}
              dataCy="firstname-form-item"
            >
              <PrefixedInput
                {...field}
                value={field.value ?? ''}
                icon={<User className="size-4" />}
                placeholder="Lead Firstname"
                aria-invalid={!!fieldState.error}
                data-cy="firstname-input"
              />
            </FormFieldRow>
          )}
        />
        <Controller
          name="contactPersonLName"
          control={control}
          rules={{
            required: 'Last name is required',
            pattern: {
              value: leadValidation.patterns.lastName,
              message:
                'Last name must be 2-50 characters with only letters, spaces, hyphens, and apostrophes',
            },
          }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Lastname"
              required
              error={fieldState.error?.message}
              dataCy="lastname-form-item"
            >
              <PrefixedInput
                {...field}
                value={field.value ?? ''}
                icon={<User className="size-4" />}
                placeholder="Lead Lastname"
                aria-invalid={!!fieldState.error}
                data-cy="lastname-input"
              />
            </FormFieldRow>
          )}
        />
        <Controller
          name="companyId"
          control={control}
          rules={{ required: 'Company is required' }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Company"
              required
              error={fieldState.error?.message}
              dataCy="company-form-item"
            >
              <SearchableSelect
                value={field.value}
                onChange={field.onChange}
                options={companyOptions}
                loading={companiesLoading}
                disabled={companiesLoading}
                invalid={!!fieldState.error}
                placeholder={
                  hasCompanies
                    ? 'Lead Company'
                    : 'No companies available. Click to add one.'
                }
                dataCy="company-select"
                footer={
                  <div
                    style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleAddCompany}
                      className="w-full justify-start text-brand hover:bg-primary-muted hover:text-brand"
                      data-cy="add-company-dropdown-btn"
                    >
                      <Plus className="text-brand" />
                      Add Company
                    </Button>
                  </div>
                }
              />
              {shouldShowNoCompanies && (
                <div
                  className="text-sm text-muted-foreground mt-1"
                  data-cy="no-companies-message"
                >
                  No companies available. Please add a company first.
                </div>
              )}
            </FormFieldRow>
          )}
        />
        <Controller
          name="contactPersonPosition"
          control={control}
          rules={{
            required: 'Position is required',
            pattern: {
              value: leadValidation.patterns.position,
              message:
                'Position must be 2-100 characters with only letters, spaces, hyphens, and apostrophes',
            },
          }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Position"
              required
              error={fieldState.error?.message}
              dataCy="position-form-item"
            >
              <PrefixedInput
                {...field}
                value={field.value ?? ''}
                icon={<Briefcase className="size-4" />}
                placeholder="Lead Position"
                aria-invalid={!!fieldState.error}
                data-cy="position-input"
              />
            </FormFieldRow>
          )}
        />
      </div>

      <p
        style={{ color: tokens.color.textMuted }}
        data-cy="contact-address-title"
      >
        Contact Address Information
      </p>
      <div
        className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-3"
        data-cy="contact-address-grid"
      >
        <Controller
          name="contactPersonEmail"
          control={control}
          rules={{
            required: 'Email is required',
            pattern: {
              value: EMAIL_PATTERN,
              message: leadValidation.messages.email,
            },
          }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Email"
              required
              error={fieldState.error?.message}
              dataCy="email-form-item"
            >
              <PrefixedInput
                {...field}
                value={field.value ?? ''}
                icon={<Mail className="size-4" />}
                placeholder="Lead Email"
                aria-invalid={!!fieldState.error}
                data-cy="email-input"
              />
            </FormFieldRow>
          )}
        />
        <Controller
          name="contactPersonPhoneNumber"
          control={control}
          rules={{
            required: 'Phone number is required',
            pattern: {
              value: leadValidation.patterns.phone,
              message: leadValidation.messages.phone,
            },
          }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Phone"
              required
              error={fieldState.error?.message}
              dataCy="phone-form-item"
            >
              <PrefixedInput
                {...field}
                value={field.value ?? ''}
                icon={<Phone className="size-4" />}
                placeholder="Lead Phone"
                aria-invalid={!!fieldState.error}
                data-cy="phone-input"
              />
            </FormFieldRow>
          )}
        />
      </div>

      {/* Add Company Modal */}
      <Dialog
        open={isAddCompanyModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelAddCompany();
        }}
      >
        <DialogContent
          className={isMobile ? 'w-[90%] p-2' : 'sm:max-w-[600px] p-6'}
          data-cy="add-company-modal"
        >
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 'bold',
              }}
            >
              Company Details
            </DialogTitle>
            <DialogDescription
              style={{
                color: tokens.color.textMuted,
                fontSize: isMobile ? '12px' : '14px',
              }}
            >
              Add a new company
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={addCompanyForm.handleSubmit(handleCreateCompany)}
            className="space-y-4"
            data-cy="add-company-form"
          >
            <div className="grid grid-cols-2 gap-4" data-cy="company-form-grid">
              <Controller
                name="name"
                control={addCompanyForm.control}
                rules={{ required: 'Company name is required' }}
                render={({ field, fieldState }) => (
                  <FormFieldRow
                    label="Name"
                    required
                    error={fieldState.error?.message}
                    dataCy="company-name-form-item"
                  >
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Company Name"
                      aria-invalid={!!fieldState.error}
                      data-cy="company-name-input"
                    />
                  </FormFieldRow>
                )}
              />
              <Controller
                name="email"
                control={addCompanyForm.control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: 'Please enter a valid email',
                  },
                }}
                render={({ field, fieldState }) => (
                  <FormFieldRow
                    label="Email"
                    required
                    error={fieldState.error?.message}
                    dataCy="company-email-form-item"
                  >
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Company Email"
                      aria-invalid={!!fieldState.error}
                      data-cy="company-email-input"
                    />
                  </FormFieldRow>
                )}
              />
              <Controller
                name="phone"
                control={addCompanyForm.control}
                rules={{ required: 'Phone is required' }}
                render={({ field, fieldState }) => (
                  <FormFieldRow
                    label="Phone"
                    required
                    error={fieldState.error?.message}
                    dataCy="company-phone-form-item"
                  >
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Company Phone"
                      aria-invalid={!!fieldState.error}
                      data-cy="company-phone-input"
                    />
                  </FormFieldRow>
                )}
              />
              <Controller
                name="website"
                control={addCompanyForm.control}
                render={({ field }) => (
                  <FormFieldRow
                    label="Website"
                    dataCy="company-website-form-item"
                  >
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Company Website"
                      data-cy="company-website-input"
                    />
                  </FormFieldRow>
                )}
              />
            </div>

            <div
              className="flex justify-center items-center gap-4 pt-4"
              data-cy="company-form-actions"
            >
              <Button
                type="submit"
                className="font-md bg-brand text-brand-foreground hover:bg-brand/90 h-10 px-6"
                disabled={isCreatingCompany}
                data-cy="create-company-btn"
              >
                Create Company
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-md border-brand text-brand hover:text-brand h-10 px-6"
                onClick={handleCancelAddCompany}
                disabled={isCreatingCompany}
                data-cy="cancel-company-btn"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
