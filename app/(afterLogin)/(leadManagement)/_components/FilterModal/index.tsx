'use client';

import { tokens } from '@/lib/design-tokens';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Rate } from '@/components/ui/rate';
import { FilterModalSkeleton } from '@/components/loading/skeleton-screens';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CircleAlert, CircleX, X } from 'lucide-react';
import {
  useEngagementStagesQuery,
  useCompaniesQuery,
  useCampaignsQuery,
  useSectorsQuery,
  useCurrenciesQuery,
} from '@/store/server/features/leads/queries';
import { LeadFilters } from '@/store/server/features/leads/interface';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: LeadFilters) => void;
  onClearFilters: () => void;
  currentFilters?: LeadFilters;
  buttonRef?: React.RefObject<HTMLDivElement>;
}

const SELECT_TRIGGER_CLASS =
  'border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-select-hover rounded-lg';

const INPUT_CLASS =
  'border-border bg-surface-card w-full h-11 text-base hover:border-border-focus focus:border-border-focus focus:shadow-none custom-input-hover';

export function FilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  onClearFilters,
  currentFilters,
  buttonRef,
}: FilterModalProps) {
  const [filters, setFilters] = useState<Record<string, any>>(
    currentFilters || {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 100,
    right: 20,
  });
  const filterButtonRef = useRef<HTMLDivElement>(null);

  const setField = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const {
    data: stages = [],
    isLoading: stagesLoading,
    error: stagesError,
  } = useEngagementStagesQuery();
  const {
    data: companies = [],
    isLoading: companiesLoading,
    error: companiesError,
  } = useCompaniesQuery();
  const {
    data: campaigns = [],
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useCampaignsQuery();

  const {
    data: sectors = [],
    isLoading: sectorsLoading,
    error: sectorsError,
  } = useSectorsQuery();
  const {
    data: currencies = [],
    isLoading: currenciesLoading,
    error: currenciesError,
  } = useCurrenciesQuery();

  const safeCurrencies = Array.isArray(currencies) ? currencies : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeSectors = Array.isArray(sectors) ? sectors : [];
  const safeStages = Array.isArray(stages) ? stages : [];

  const isAnyLoading =
    stagesLoading ||
    companiesLoading ||
    campaignsLoading ||
    sectorsLoading ||
    currenciesLoading;

  const hasErrors =
    stagesError ||
    companiesError ||
    campaignsError ||
    sectorsError ||
    currenciesError;

  const calculatePosition = useCallback(() => {
    const refToUse = buttonRef || filterButtonRef;
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
        setDropdownPosition({
          top: rect.top + scrollY,
          right: window.innerWidth - rect.right + scrollX,
        });
      }
    }
  }, [buttonRef]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();

      if (currentFilters && Object.keys(currentFilters).length > 0) {
        setFilters(currentFilters);
      } else {
        setFilters({});
      }
    }
  }, [isOpen, currentFilters, calculatePosition]);

  const handleRemoveAll = () => {
    setFilters({});

    onClearFilters();

    onClose();
  };

  const handleApply = async () => {
    try {
      setIsLoading(true);

      const cleanedValues = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => {
          if (value === undefined || value === null) {
            return false;
          }
          if (value === '') {
            return false;
          }
          if (typeof value === 'string' && value.trim() === '') {
            return false;
          }
          return true;
        }),
      );

      setFilters(cleanedValues);
      onApplyFilters(cleanedValues as LeadFilters);
      onClose();
    } catch (error) {
      // Filter validation failed, close dropdown
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (currentFilters && Object.keys(currentFilters).length > 0) {
      setFilters(currentFilters);
    } else {
      setFilters({});
    }
    onClose();
  };

  const handleRatingChange = (value: number) => {
    setField('leadRate', value);
  };

  const handleClearRating = () => {
    setField('leadRate', undefined);
  };

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, onClose, calculatePosition]);

  const renderErrorMessage = () => {
    if (!hasErrors) return null;

    const errorMessages = [];
    if (stagesError) errorMessages.push('Failed to load engagement stages');
    if (companiesError) errorMessages.push('Failed to load companies');
    if (campaignsError) errorMessages.push('Failed to load campaigns');
    if (sectorsError) errorMessages.push('Failed to load sectors');
    if (currenciesError) errorMessages.push('Failed to load currencies');

    return (
      <Alert variant="default" className="mb-4">
        <CircleAlert />
        <AlertTitle>Failed to load some filter options</AlertTitle>
        <AlertDescription>
          <div>
            <p>The following filter options may not be available:</p>
            <ul className="mt-2 list-disc list-inside">
              {errorMessages.map((msg, index) => (
                <li key={index} className="text-sm font-normal text-foreground">
                  {msg}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Please refresh the page or try again later.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const renderLoadingState = () => {
    if (!isAnyLoading) return null;

    return <FilterModalSkeleton />;
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg px-4 py-4 w-[400px] max-w-[calc(100vw-32px)] sm:w-[520px]">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-1 pb-0 -mb-1">
        <div className="flex flex-col gap-0">
          <span className="text-2xl font-bold text-foreground">Filter</span>
          <span className="text-sm font-medium text-muted-foreground">
            Filter your leads by
          </span>
        </div>
        <Button
          variant="outline"
          onClick={handleRemoveAll}
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
          data-cy="filter-remove-all-button"
        >
          Remove All
        </Button>
      </div>

      {renderErrorMessage()}

      {isAnyLoading ? (
        renderLoadingState()
      ) : (
        <div>
          {/* Filter by general information */}
          <div className="mb-0">
            <h3 className="block font-semibold text-foreground mb-2 text-sm">
              Filter by general information
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Company
                </label>
                <div className="relative">
                  <Select
                    value={filters.companyId || undefined}
                    onValueChange={(value) => setField('companyId', value)}
                  >
                    <SelectTrigger
                      className={SELECT_TRIGGER_CLASS}
                      data-cy="filter-company-select"
                    >
                      <SelectValue placeholder="Lead Company" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      {safeCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.companyId && (
                    <button
                      type="button"
                      onClick={() => setField('companyId', undefined)}
                      className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      aria-label="Clear company"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Sector
                </label>
                <div className="relative">
                  <Select
                    value={filters.sectorId || undefined}
                    onValueChange={(value) => setField('sectorId', value)}
                  >
                    <SelectTrigger
                      className={SELECT_TRIGGER_CLASS}
                      data-cy="filter-sector-select"
                    >
                      <SelectValue placeholder="Lead Sector" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      {safeSectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.sectorId && (
                    <button
                      type="button"
                      onClick={() => setField('sectorId', undefined)}
                      className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      aria-label="Clear sector"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-2">
              <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                Campaign
              </label>
              <div className="relative">
                <Select
                  value={filters.campaignId || undefined}
                  onValueChange={(value) => setField('campaignId', value)}
                >
                  <SelectTrigger
                    className={SELECT_TRIGGER_CLASS}
                    data-cy="filter-campaign-select"
                  >
                    <SelectValue placeholder="Marketing campaign" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {safeCampaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.campaignId && (
                  <button
                    type="button"
                    onClick={() => setField('campaignId', undefined)}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    aria-label="Clear campaign"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Revenue
                </label>
                <div className="relative">
                  <Input
                    placeholder="Revenue"
                    value={filters.revenue || ''}
                    onChange={(e) => setField('revenue', e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    style={{ fontWeight: 'normal' }}
                    data-cy="filter-revenue-input"
                  />
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="h-6"></div>
                <div className="relative">
                  <Select
                    value={filters.currency || undefined}
                    onValueChange={(value) => setField('currency', value)}
                  >
                    <SelectTrigger
                      className={SELECT_TRIGGER_CLASS}
                      data-cy="filter-currency-select"
                    >
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      {safeCurrencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.name}>
                          {currency.name} - {currency.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.currency && (
                    <button
                      type="button"
                      onClick={() => setField('currency', undefined)}
                      className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      aria-label="Clear currency"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-0 -mt-1">
            <h3 className="block font-semibold text-foreground mb-2 text-sm">
              Filter by Address Information
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Phone
                </label>
                <Input
                  placeholder="Phone"
                  value={filters.contactPersonPhoneNumber || ''}
                  onChange={(e) =>
                    setField('contactPersonPhoneNumber', e.target.value)
                  }
                  className={INPUT_CLASS}
                  style={{ fontWeight: 'normal' }}
                  data-cy="filter-phone-input"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                  Email
                </label>
                <Input
                  placeholder="Email"
                  value={filters.contactPersonEmail || ''}
                  onChange={(e) =>
                    setField('contactPersonEmail', e.target.value)
                  }
                  className={INPUT_CLASS}
                  style={{ fontWeight: 'normal' }}
                  data-cy="filter-email-input"
                />
              </div>
            </div>
          </div>

          <div className="mb-0 -mt-1">
            <h3 className="block font-semibold text-foreground mb-2 text-sm">
              Filter by Status Information
            </h3>

            <div>
              <label className="block text-sm sm:text-md font-medium text-foreground mb-1">
                Lead Stage
              </label>
              <div className="relative">
                <Select
                  value={filters.stage || undefined}
                  onValueChange={(value) => setField('stage', value)}
                >
                  <SelectTrigger
                    className={SELECT_TRIGGER_CLASS}
                    data-cy="filter-stage-select"
                  >
                    <SelectValue placeholder="Select lead stage" />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {safeStages.map((stage: any) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <span className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                stage.colorCode || tokens.color.accentBlue,
                            }}
                          />
                          {stage.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.stage && (
                  <button
                    type="button"
                    onClick={() => setField('stage', undefined)}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    aria-label="Clear stage"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-2">
            <h3 className="block font-semibold text-foreground mb-1 text-sm">
              Filter by Rating
            </h3>
            <div className="flex items-center gap-2">
              <Rate
                value={filters.leadRate || 0}
                onChange={(value) => {
                  handleRatingChange(value);
                }}
                allowHalf={false}
                className="text-yellow-500"
              />
              {filters.leadRate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRating}
                  className="text-muted-foreground hover:text-muted-foreground p-1 h-auto flex items-center justify-center"
                  style={{
                    minWidth: 'auto',
                    width: '20px',
                    height: '20px',
                  }}
                >
                  <CircleX className="text-sm" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-row items-center justify-center gap-3 pt-2 mt-2">
            <Button
              onClick={handleApply}
              disabled={isLoading}
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
              data-cy="filter-apply-button"
            >
              {isLoading ? 'Filtering…' : 'Filter'}
            </Button>
            <Button
              variant="outline"
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
              data-cy="filter-cancel-button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

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
