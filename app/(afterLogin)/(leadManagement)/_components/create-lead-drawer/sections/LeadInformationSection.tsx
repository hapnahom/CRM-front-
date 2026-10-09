'use client';

import { formatUserName } from '@/lib/format-user-name';

import { tokens } from '@/lib/design-tokens';

import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, DollarSign, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { leadValidation } from '../options';
import { useIsMobile } from '@/hooks/useIsMobile';
import { FormFieldRow, SearchableSelect } from './form-controls';
import { useGetEngagementStages } from '@/store/server/features/leads/engagement-stage/queries';
import { useGetSectors } from '@/store/server/features/leads/sectors/queries';
import { useGetUsers } from '@/store/server/features/leads/users/queries';
import { useGetCurrencies } from '@/store/server/features/leads/currencies/queries';
import { useGetCalendars } from '@/store/server/features/leads/calendar';

interface LeadInformationSectionProps {
  form?: any;
}

interface FiscalDatePickerProps {
  value?: any;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabledDate?: (date: Date) => boolean;
  quarterOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  fiscalYearOptions: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  calendarsLoading: boolean;
  selectedCalendarId: string | null;
  selectedQuarterId?: string | null;
  onFiscalYearChange: (calendarId: string) => void;
  onQuarterChange?: (sessionId: string) => void;
  className?: string;
  dataCy?: string;
}

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value?.toDate?.()) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function FiscalDatePicker({
  value,
  onChange,
  placeholder = 'Select created date',
  disabledDate,
  quarterOptions,
  fiscalYearOptions,
  calendarsLoading,
  selectedCalendarId,
  selectedQuarterId,
  onFiscalYearChange,
  onQuarterChange,
  className,
  dataCy,
}: FiscalDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = toDate(value);

  const isDateDisabled = (date: Date) => {
    if (!selectedCalendarId || !selectedQuarterId) return true;
    return disabledDate ? disabledDate(date) : false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-10 w-full justify-start px-3 text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
          data-cy={dataCy}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="custom-datepicker-panel" style={{ maxWidth: '320px' }}>
          <div className="border-b border-border bg-surface-elevated p-2">
            <div className="space-y-2">
              <div className="text-xs font-medium text-foreground">
                Fiscal Period
              </div>
              <div className="grid grid-cols-2 gap-1">
                <SearchableSelect
                  value={selectedQuarterId ?? undefined}
                  onChange={(sessionId) => onQuarterChange?.(sessionId)}
                  options={quarterOptions}
                  loading={calendarsLoading}
                  disabled={!selectedCalendarId}
                  placeholder="Quarter"
                  className="h-8 text-xs"
                  notFoundContent="No quarters found"
                />
                <SearchableSelect
                  value={selectedCalendarId ?? undefined}
                  onChange={onFiscalYearChange}
                  options={fiscalYearOptions}
                  loading={calendarsLoading}
                  placeholder="Year"
                  className="h-8 text-xs"
                  notFoundContent="No years found"
                />
              </div>
            </div>
          </div>
          <div style={{ maxHeight: '300px', overflow: 'hidden' }}>
            <Calendar
              mode="single"
              selected={selectedDate}
              disabled={isDateDisabled}
              onSelect={(date) => {
                onChange?.(date);
                if (date) setOpen(false);
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const LeadInformationSection: React.FC<LeadInformationSectionProps> = ({
  form,
}) => {
  const [budgetFields, setBudgetFields] = useState([0]); // Track budget field indices

  // Calendar-related state
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    null,
  );
  //eslint-disable-next-line
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  //eslint-disable-next-line
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const { isMobile } = useIsMobile();

  const { data: engagementStages = [], isLoading: stagesLoading } =
    useGetEngagementStages();
  const { data: sectors = [], isLoading: sectorsLoading } = useGetSectors();
  const { data: users = [], isLoading: usersLoading } = useGetUsers();
  const { data: currencies = [], isLoading: currenciesLoading } =
    useGetCurrencies();
  const { data: calendars = [], isLoading: calendarsLoading } =
    useGetCalendars();

  // Removed automatic date filling - user must select date manually

  // Transform users data to match Select component format for lead owners
  // Handle different possible data structures from API
  let safeUsers: any[] = [];
  if (Array.isArray(users)) {
    safeUsers = users;
  } else if (users && typeof users === 'object') {
    // Handle case where API returns { items: [], total: 0 } or similar
    const usersObj = users as any;
    if (Array.isArray(usersObj.items)) {
      safeUsers = usersObj.items;
    } else if (Array.isArray(usersObj.data)) {
      safeUsers = usersObj.data;
    }
  }

  const ownerOptions = safeUsers.map((user: any) => ({
    value: user.id,
    label: formatUserName(user),
  }));

  // Transform engagement stages data to match Select component format
  let safeStages: any[] = [];
  if (Array.isArray(engagementStages)) {
    safeStages = engagementStages;
  } else if (engagementStages && typeof engagementStages === 'object') {
    const stagesObj = engagementStages as any;
    if (Array.isArray(stagesObj.items)) safeStages = stagesObj.items;
    else if (Array.isArray(stagesObj.data)) safeStages = stagesObj.data;
  }
  const stageOptions = safeStages.map((stage: any) => ({
    value: stage.id,
    label: stage.name,
  }));

  // Transform sectors data to match Select component format
  let safeSectors: any[] = [];
  if (Array.isArray(sectors)) {
    safeSectors = sectors;
  } else if (sectors && typeof sectors === 'object') {
    const sectorsObj = sectors as any;
    if (Array.isArray(sectorsObj.items)) safeSectors = sectorsObj.items;
    else if (Array.isArray(sectorsObj.data)) safeSectors = sectorsObj.data;
  }
  const sectorOptions = safeSectors.map((sector: any) => ({
    value: sector.id,
    label: sector.name,
  }));

  // Transform currencies data to match Select component format
  let safeCurrencies: any[] = [];
  if (Array.isArray(currencies)) {
    safeCurrencies = currencies;
  } else if (currencies && typeof currencies === 'object') {
    const currenciesObj = currencies as any;
    if (Array.isArray(currenciesObj.items))
      safeCurrencies = currenciesObj.items;
    else if (Array.isArray(currenciesObj.data))
      safeCurrencies = currenciesObj.data;
  }

  // Fallback to default options if no currencies are loaded yet
  const currencyOptions =
    safeCurrencies.length > 0
      ? safeCurrencies.map((currency: any) => ({
          value: currency.id, // Use 'name' as value (e.g., "USD")
          label: `${currency.name} - ${currency.description}`, // Use 'name' and 'description'
        }))
      : [{ value: '', label: 'Select Currency' }];

  // Add new budget field
  const addBudgetField = () => {
    const newIndex = budgetFields.length;
    setBudgetFields([...budgetFields, newIndex]);

    // Set default currency for the new field
    if (form) {
      const currentCurrencies = form.getValues('currencies') || [];
      const currentBudgets = form.getValues('estimatedBudgets') || [];

      // Ensure arrays are long enough
      const newCurrencies = [...currentCurrencies];
      const newBudgets = [...currentBudgets];

      // Set default values for new field
      newCurrencies[newIndex] = '';
      newBudgets[newIndex] = '';

      form.setValue('currencies', newCurrencies);
      form.setValue('estimatedBudgets', newBudgets);
    }
  };

  // Remove budget field
  const removeBudgetField = (index: number) => {
    if (budgetFields.length > 1) {
      // eslint-disable-next-line
      setBudgetFields(budgetFields.filter((_, i) => i !== index));
    }
  };

  // Process calendars data to handle API response structure
  let safeCalendars: any[] = [];
  if (Array.isArray(calendars)) {
    safeCalendars = calendars;
  } else if (calendars && typeof calendars === 'object') {
    const calendarsObj = calendars as any;
    if (Array.isArray(calendarsObj.items)) {
      safeCalendars = calendarsObj.items;
    } else if (Array.isArray(calendarsObj.data)) {
      safeCalendars = calendarsObj.data;
    }
  }

  // Create fiscal year options from calendars - make all selectable
  const fiscalYearOptions = safeCalendars.map((calendar: any) => ({
    value: calendar.id,
    label: calendar.name,
    disabled: false, // Make all calendars selectable regardless of isActive status
  }));

  // Get sessions for selected calendar
  const getSessionsForCalendar = (calendarId: string) => {
    const calendar = safeCalendars.find((cal: any) => cal.id === calendarId);
    return calendar?.sessions || [];
  };

  // Create quarter options (single quarter field)
  const quarterOptions = selectedCalendarId
    ? getSessionsForCalendar(selectedCalendarId).map((session: any) => ({
        value: session.id,
        label: session.name,
        disabled: false, // Make all sessions selectable
        session: session,
      }))
    : [];

  // Handle fiscal year selection
  const handleFiscalYearChange = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    setSelectedSessionId(null);
    setSelectedSession(null);
    // Clear quarter selection and set year ID
    form?.setValue('quarterId', null);
    form?.setValue('yearId', calendarId);
  };

  // Handle quarter selection
  const handleQuarterChange = (sessionId: string) => {
    const sessions = getSessionsForCalendar(selectedCalendarId!);
    const session = sessions.find((s: any) => s.id === sessionId);
    setSelectedSessionId(sessionId);
    setSelectedSession(session);
    // Set quarter ID
    form?.setValue('quarterId', sessionId);
  };

  // Remove date restrictions - allow any date selection
  const disabledDate = () => {
    // Always allow all dates - no restrictions
    return false;
  };

  const leadNameField = (
    <Controller
      name="leadName"
      control={form?.control}
      rules={{
        required: leadValidation.messages.required,
        pattern: {
          value: leadValidation.patterns.leadName,
          message:
            'Lead name must be 2-100 characters with only letters, spaces, hyphens, and apostrophes',
        },
      }}
      render={({ field, fieldState }) => (
        <FormFieldRow
          label="Lead Name"
          required
          error={fieldState.error?.message}
          dataCy="lead-name-form-item"
        >
          <Input
            {...field}
            value={field.value ?? ''}
            placeholder="Enter lead name"
            className="h-10"
            data-cy="lead-name-input"
          />
        </FormFieldRow>
      )}
    />
  );

  const ownerField = (
    <Controller
      name="leadOwner"
      control={form?.control}
      rules={{ required: 'Owner is required' }}
      render={({ field, fieldState }) => (
        <FormFieldRow
          label="Owner"
          required
          error={fieldState.error?.message}
          dataCy="lead-owner-form-item"
        >
          <SearchableSelect
            value={field.value}
            onChange={field.onChange}
            options={ownerOptions}
            loading={usersLoading}
            placeholder="Select lead owner"
            dataCy="lead-owner-select"
            invalid={!!fieldState.error}
          />
        </FormFieldRow>
      )}
    />
  );

  const sectorField = (
    <Controller
      name="sectorId"
      control={form?.control}
      rules={{ required: 'Sector is required' }}
      render={({ field, fieldState }) => (
        <FormFieldRow
          label="Sector"
          required
          error={fieldState.error?.message}
          dataCy="sector-form-item"
        >
          <SearchableSelect
            value={field.value}
            onChange={field.onChange}
            options={sectorOptions}
            loading={sectorsLoading}
            placeholder="Select sector"
            dataCy="sector-select"
            invalid={!!fieldState.error}
          />
        </FormFieldRow>
      )}
    />
  );

  const stageField = (
    <Controller
      name="engagementStageId"
      control={form?.control}
      rules={{ required: 'Stage is required' }}
      render={({ field, fieldState }) => (
        <FormFieldRow
          label="Stage"
          required
          error={fieldState.error?.message}
          dataCy="engagement-stage-form-item"
        >
          <SearchableSelect
            value={field.value}
            onChange={field.onChange}
            options={stageOptions}
            loading={stagesLoading}
            placeholder="Select stage"
            dataCy="engagement-stage-select"
            invalid={!!fieldState.error}
          />
        </FormFieldRow>
      )}
    />
  );

  // Mobile Layout (2 columns)
  const mobileLayout = (
    <>
      <div className="grid grid-cols-2 gap-4 mt-3" data-cy="lead-info-grid">
        {leadNameField}
        {ownerField}
      </div>

      <div
        className="grid grid-cols-2 gap-4 mt-3"
        data-cy="lead-type-sector-grid"
      >
        {sectorField}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3" data-cy="stage-grid">
        {stageField}
      </div>
    </>
  );

  // Desktop Layout (improved)
  const desktopLayout = (
    <>
      {leadNameField}

      <div className="grid grid-cols-2 gap-4 mt-3" data-cy="lead-info-grid">
        {ownerField}
        {sectorField}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3" data-cy="stage-grid">
        {stageField}
      </div>
    </>
  );

  return (
    <div className="space-y-4" data-cy="lead-information-section">
      <p style={{ color: tokens.color.textMuted }} data-cy="lead-info-title">
        Lead Information
      </p>

      {isMobile ? mobileLayout : desktopLayout}

      <FormFieldRow
        label="Lead Amount"
        required
        className="mb-0"
        dataCy="lead-amount-section"
      >
        <div className="space-y-2" data-cy="budget-fields-container">
          {budgetFields.map((fieldIndex, index) => (
            <div
              key={fieldIndex}
              className="flex items-start gap-2"
              data-cy={`budget-field-${index}`}
            >
              <Controller
                name={`estimatedBudgets.${index}`}
                control={form?.control}
                rules={{
                  required: 'Lead amount is required',
                  pattern: {
                    value: /^[0-9]+(\.[0-9]{1,2})?$/,
                    message:
                      'Please enter a valid amount (e.g., 1000 or 1000.50)',
                  },
                }}
                render={({ field, fieldState }) => (
                  <div
                    className="flex-1"
                    data-cy={`budget-amount-form-item-${index}`}
                  >
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Lead Amount"
                        className="h-9 pl-9"
                        style={{ minWidth: '180px' }}
                        aria-invalid={!!fieldState.error}
                        data-cy={`budget-amount-input-${index}`}
                      />
                    </div>
                    {fieldState.error && (
                      <p className="mt-1 text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name={`currencies.${index}`}
                control={form?.control}
                rules={{ required: 'Currency is required' }}
                render={({ field, fieldState }) => (
                  <div data-cy={`budget-currency-form-item-${index}`}>
                    <SearchableSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={currencyOptions}
                      loading={currenciesLoading}
                      placeholder="Currency"
                      className="h-9 w-28"
                      invalid={!!fieldState.error}
                      dataCy={`budget-currency-select-${index}`}
                    />
                  </div>
                )}
              />
              {index === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={addBudgetField}
                  className="h-9 w-9 hover:bg-primary-muted"
                  data-cy="add-budget-btn"
                >
                  <Plus className="text-brand" />
                </Button>
              )}
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBudgetField(index)}
                  className="h-9 w-8 text-brand hover:bg-primary-muted hover:text-brand"
                  data-cy={`remove-budget-btn-${index}`}
                >
                  <X className="text-brand" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </FormFieldRow>

      <FormFieldRow label="Created Date" required dataCy="created-date-section">
        {/* Integrated DatePicker with Dropdowns Inside Calendar */}
        <Controller
          name="createdDate"
          control={form?.control}
          rules={{
            validate: (value) => {
              // Only require date if both year and quarter are selected
              if (selectedCalendarId && selectedSessionId && !value) {
                return 'Created date is required';
              }
              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <>
              <FiscalDatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select created date"
                className="w-full h-10"
                disabledDate={disabledDate}
                quarterOptions={quarterOptions}
                fiscalYearOptions={fiscalYearOptions}
                calendarsLoading={calendarsLoading}
                selectedCalendarId={selectedCalendarId}
                selectedQuarterId={selectedSessionId}
                onFiscalYearChange={handleFiscalYearChange}
                onQuarterChange={handleQuarterChange}
                dataCy="created-date-picker"
              />
              {fieldState.error && (
                <p className="mt-1 text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />

        {/* Hidden fields for year and quarter IDs */}
        <Controller
          name="yearId"
          control={form?.control}
          rules={{ required: 'Please select a fiscal year' }}
          render={({ field }) => (
            <input type="hidden" {...field} value={field.value ?? ''} />
          )}
        />
        <Controller
          name="quarterId"
          control={form?.control}
          rules={{ required: 'Please select a quarter' }}
          render={({ field }) => (
            <input type="hidden" {...field} value={field.value ?? ''} />
          )}
        />
      </FormFieldRow>
    </div>
  );
};

export default LeadInformationSection;
