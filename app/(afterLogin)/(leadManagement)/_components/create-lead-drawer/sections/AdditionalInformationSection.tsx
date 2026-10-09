'use client';

import { tokens } from '@/lib/design-tokens';

import React, { useState, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { MdUploadFile } from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Rate } from '@/components/ui/rate';
import { useGetSuppliers } from '@/store/server/features/leads/suppliers/queries';
import { useGetSolutions } from '@/store/server/features/leads/solution/queries';
import {
  useGetCustomFields,
  separateCustomFields,
  CustomField,
} from '@/store/server/features/custom-fields/queries';
import { leadValidation } from '../options';
import { FormFieldRow, SearchableSelect } from './form-controls';

export type DynamicItem = { id: number };

interface AdditionalInformationSectionProps {
  customFields: DynamicItem[];
  addCustomField: () => void;
  removeCustomField: (id: number) => void;
  onFileListChange: (fileList: any[]) => void;
  form?: any; // Form instance for debugging custom field values
  clearOptionalFields?: boolean; // Flag to clear optional fields state
  onOptionalFieldsChange?: (selectedFields: Set<string>) => void; // Callback for selected optional fields
}

export const AdditionalInformationSection: React.FC<
  AdditionalInformationSectionProps
> = ({
  //customFields,
  //addCustomField,
  //removeCustomField,
  onFileListChange,
  clearOptionalFields,
  onOptionalFieldsChange,
}) => {
  const { control } = useFormContext();
  const { data: suppliers = [], isLoading: suppliersLoading } =
    useGetSuppliers();
  const { data: solutions = [], isLoading: solutionsLoading } =
    useGetSolutions();
  // eslint-disable-next-line
  const { data: allCustomFields = [], isLoading: customFieldsLoading } =
    useGetCustomFields();

  // File upload state - files will be uploaded after lead creation
  const [fileList, setFileList] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Custom fields state
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [selectedOptionalFields, setSelectedOptionalFields] = useState<
    Set<string>
  >(new Set());

  // Separate required and optional custom fields
  const { required, optional } = separateCustomFields(allCustomFields);

  // Transform suppliers data to match Select component format
  let safeSuppliers: any[] = [];
  if (Array.isArray(suppliers)) {
    safeSuppliers = suppliers;
  } else if (suppliers && typeof suppliers === 'object') {
    const suppliersObj = suppliers as any;
    if (Array.isArray(suppliersObj.items)) {
      safeSuppliers = suppliersObj.items;
    } else if (Array.isArray(suppliersObj.data)) {
      safeSuppliers = suppliersObj.data;
    }
  }

  const supplierOptions = safeSuppliers.map((supplier: any) => ({
    value: supplier.id,
    label: supplier.name,
  }));

  // Transform solutions data to match Select component format
  let safeSolutions: any[] = [];
  if (Array.isArray(solutions)) {
    safeSolutions = solutions;
  } else if (solutions && typeof solutions === 'object') {
    const solutionsObj = solutions as any;
    if (Array.isArray(solutionsObj.items)) {
      safeSolutions = solutionsObj.items;
    } else if (Array.isArray(solutionsObj.data)) {
      safeSolutions = solutionsObj.data;
    }
  }

  const solutionOptions = safeSolutions.map((solution: any) => ({
    value: solution.id,
    label: solution.name,
  }));

  // File upload handlers - preserve antd-compatible file shape
  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files).map((file, index) => ({
      uid: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      originFileObj: file,
    }));
    setFileList((prev) => [...prev, ...incoming]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleFileRemove = (file: any) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
  };

  // Notify parent component when fileList changes
  useEffect(() => {
    onFileListChange(fileList);
  }, [fileList, onFileListChange]);

  // Custom fields handlers
  const clearOptionalFieldsState = () => {
    setShowOptionalFields(false);
    setSelectedOptionalFields(new Set());
  };

  const toggleOptionalFields = () => {
    setShowOptionalFields(!showOptionalFields);
  };

  const handleFieldSelection = (fieldId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedOptionalFields);
    if (isSelected) {
      newSelected.add(fieldId);
    } else {
      newSelected.delete(fieldId);
    }
    setSelectedOptionalFields(newSelected);
  };

  const clearAllOptionalFields = () => {
    setSelectedOptionalFields(new Set());
  };

  // Clear optional fields when clearOptionalFields prop is true
  useEffect(() => {
    if (clearOptionalFields) {
      clearOptionalFieldsState();
      // Also clear file list for fresh start
      setFileList([]);
    }
  }, [clearOptionalFields]);

  // Notify parent when selected optional fields change
  useEffect(() => {
    if (onOptionalFieldsChange) {
      onOptionalFieldsChange(selectedOptionalFields);
    }
  }, [selectedOptionalFields, onOptionalFieldsChange]);

  // Render custom field input based on type
  const renderCustomFieldInput = (
    field: CustomField,
    isRequired: boolean = false,
  ) => {
    const fieldName = `customField_${field.id}`;

    const fieldOptions = (field.fieldValues ?? []).map((option, index) => {
      const optionValue = typeof option === 'string' ? option : option.value;
      const optionId = typeof option === 'string' ? option : option.id;
      return {
        value: (optionId || optionValue) as string,
        label: optionValue as string,
        key: (optionId || optionValue || index) as string,
      };
    });

    switch (field.type) {
      case 'checkbox':
      case 'dropdown':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={
              isRequired ? { required: `${field.name} is required` } : undefined
            }
            render={({ field: rhfField, fieldState }) => (
              <FormFieldRow
                label={field.name}
                required={isRequired}
                error={fieldState.error?.message}
                className="mb-4"
              >
                <SearchableSelect
                  value={rhfField.value}
                  onChange={rhfField.onChange}
                  options={fieldOptions}
                  placeholder={`Select ${field.name}`}
                  invalid={!!fieldState.error}
                  dataCy={`custom-field-${field.id}-select`}
                />
              </FormFieldRow>
            )}
          />
        );

      case 'inputfield':
      default:
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={
              isRequired ? { required: `${field.name} is required` } : undefined
            }
            render={({ field: rhfField, fieldState }) => (
              <FormFieldRow
                label={field.name}
                required={isRequired}
                error={fieldState.error?.message}
                className="mb-4"
              >
                <Input
                  {...rhfField}
                  value={rhfField.value ?? ''}
                  placeholder={`Enter ${field.name}`}
                  aria-invalid={!!fieldState.error}
                  data-cy={`custom-field-${field.id}-input`}
                />
              </FormFieldRow>
            )}
          />
        );
    }
  };

  return (
    <div className="space-y-4" data-cy="additional-information-section">
      {/* Lead Additional Information */}
      <div data-cy="lead-additional-info">
        <p
          style={{ color: tokens.color.textMuted }}
          data-cy="additional-info-title"
        >
          Lead Additional Information
        </p>
        <Controller
          name="additionalInformation"
          control={control}
          rules={{
            maxLength: {
              value: leadValidation.limits.additionalInfo,
              message: `Additional information cannot exceed ${leadValidation.limits.additionalInfo} characters`,
            },
          }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              className="mt-3"
              error={fieldState.error?.message}
              dataCy="additional-info-textarea"
            >
              <Textarea
                {...field}
                value={field.value ?? ''}
                placeholder="Description"
                rows={4}
                aria-invalid={!!fieldState.error}
              />
            </FormFieldRow>
          )}
        />
      </div>

      {/* Supplier and Solution */}
      <div
        className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-3"
        data-cy="supplier-solution-section"
      >
        <Controller
          name="solutionId"
          control={control}
          rules={{ required: 'Solution is required' }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Solution"
              required
              error={fieldState.error?.message}
              dataCy="solution-form-item"
            >
              <SearchableSelect
                value={field.value}
                onChange={field.onChange}
                options={solutionOptions}
                loading={solutionsLoading}
                placeholder="Select Solution"
                invalid={!!fieldState.error}
                dataCy="solution-select"
              />
            </FormFieldRow>
          )}
        />
        <Controller
          name="supplierId"
          control={control}
          rules={{ required: 'Supplier is required' }}
          render={({ field, fieldState }) => (
            <FormFieldRow
              label="Supplier"
              required
              error={fieldState.error?.message}
              dataCy="supplier-form-item"
            >
              <SearchableSelect
                value={field.value}
                onChange={field.onChange}
                options={supplierOptions}
                loading={suppliersLoading}
                placeholder="Select Supplier"
                invalid={!!fieldState.error}
                dataCy="supplier-select"
              />
            </FormFieldRow>
          )}
        />
      </div>

      {/* File Upload */}
      <div data-cy="file-upload-section">
        <div className="space-y-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                addFiles(e.dataTransfer.files);
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-brand bg-surface-card px-4 py-6 text-center transition-colors ${
              isDragging ? 'bg-primary-muted' : 'hover:bg-primary-muted/50'
            }`}
            data-cy="file-upload-dragger"
          >
            <input
              type="file"
              multiple
              accept="*/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <p className="text-brand font-medium text-lg">Upload File</p>
            <div className="flex justify-center">
              <MdUploadFile className="text-brand text-2xl my-2" />
            </div>
            <p className="text-brand">Drag File or Upload from computer</p>
          </label>

          {fileList.length > 0 && (
            <>
              <ul className="space-y-1" data-cy="file-upload-list">
                {fileList.map((file) => (
                  <li
                    key={file.uid}
                    className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-sm text-foreground"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleFileRemove(file)}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div
                className="text-sm text-muted-foreground text-center"
                data-cy="file-count-display"
              >
                {fileList.length} file(s) selected for upload
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lead Rating */}
      <Controller
        name="leadRate"
        control={control}
        rules={{
          validate: (value) => {
            if (
              value &&
              (value < leadValidation.limits.leadRate.min ||
                value > leadValidation.limits.leadRate.max)
            ) {
              return `Lead rating must be between ${leadValidation.limits.leadRate.min} and ${leadValidation.limits.leadRate.max}`;
            }
            return true;
          },
        }}
        render={({ field, fieldState }) => (
          <FormFieldRow
            label="Lead Rating"
            error={fieldState.error?.message}
            dataCy="lead-rating-section"
          >
            <div data-cy="lead-rating-stars">
              <Rate value={field.value ?? 0} onChange={field.onChange} />
            </div>
          </FormFieldRow>
        )}
      />

      {/* Required Custom Fields - Auto Display with Form Inputs */}
      {required && required.length > 0 && (
        <div
          className="pt-0 text-brand"
          data-cy="required-custom-fields-section "
        >
          <h3
            className="text-lg font-medium text-foreground mb-4 text-brand"
            data-cy="required-fields-title"
          >
            Required Custom Fields
          </h3>
          <div className="space-y-4" data-cy="required-fields-container">
            {required.map((field) => (
              <div
                key={field.id}
                className="p-4 border border-border rounded-lg bg-surface-card"
                data-cy={`required-field-${field.id}-container`}
              >
                {renderCustomFieldInput(field, true)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Custom Fields - Hidden by Default, Show on Button Click */}
      {optional && optional.length > 0 && (
        <div
          className="pt-0 text-brand"
          data-cy="optional-custom-fields-section"
        >
          {/* Toggle Button for Optional Fields */}
          <Button
            type="button"
            onClick={toggleOptionalFields}
            className="mb-4 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            data-cy="toggle-optional-fields-btn"
          >
            <Plus />
            {showOptionalFields ? 'Hide Custom Fields' : 'Custom Fields'}
          </Button>

          {/* Optional Fields Section - Only Show When Button is Clicked */}
          {showOptionalFields && (
            <>
              <div
                className="flex items-center justify-between mb-4 text-brand "
                data-cy="optional-fields-header"
              >
                <h3
                  className="text-lg font-medium text-foreground "
                  data-cy="optional-fields-title"
                >
                  Optional Custom Fields
                </h3>
                {selectedOptionalFields.size > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllOptionalFields}
                    className="text-red-600 hover:text-red-700"
                    data-cy="clear-all-optional-fields-btn"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Field Selection Checkboxes */}
              <div
                className="mb-4 p-3 bg-surface-elevated rounded-lg border"
                data-cy="field-selection-checkboxes"
              >
                <p
                  className="text-sm text-muted-foreground mb-2 text-brand"
                  data-cy="field-selection-instruction"
                >
                  Select which fields to include:
                </p>
                <div className="space-y-2" data-cy="field-checkboxes-container">
                  {optional.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center space-x-2 cursor-pointer"
                      data-cy={`field-checkbox-${field.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOptionalFields.has(field.id)}
                        onChange={(e) =>
                          handleFieldSelection(field.id, e.target.checked)
                        }
                        className="rounded"
                        data-cy={`field-checkbox-input-${field.id}`}
                      />
                      <span
                        className="text-sm text-foreground text-brand"
                        data-cy={`field-checkbox-label-${field.id}`}
                      >
                        {field.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selected Fields Forms */}
              {selectedOptionalFields.size > 0 && (
                <div
                  className="space-y-4 text-brand"
                  data-cy="selected-optional-fields-container"
                >
                  {optional
                    .filter((field) => selectedOptionalFields.has(field.id))
                    .map((field) => (
                      <div
                        key={field.id}
                        className="p-4 border border-border rounded-lg bg-surface-card"
                        data-cy={`optional-field-${field.id}-container`}
                      >
                        {renderCustomFieldInput(field, false)}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
