import React, { useState } from 'react';
import { DatePicker, Select } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

interface IntegratedDatePickerProps {
  value?: any;
  onChange?: (date: any) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledDate?: (current: any) => boolean;
  format?: string;
  quarterOptions?: any[];
  fiscalYearOptions: any[];
  calendarsLoading: boolean;
  selectedCalendarId: string | null;
  selectedQuarterId?: string | null;
  onFiscalYearChange: (calendarId: string) => void;
  onQuarterChange?: (sessionId: string) => void;
  className?: string;
  dataCy?: string;
}

const IntegratedDatePicker: React.FC<IntegratedDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  disabledDate,
  format = 'DD/MM/YYYY',
  quarterOptions = [],
  fiscalYearOptions,
  calendarsLoading,
  selectedCalendarId,
  selectedQuarterId,
  onFiscalYearChange,
  onQuarterChange,
  className,
  dataCy,
}) => {
  const [open, setOpen] = useState(false);

  const renderPanel = (panelNode: React.ReactNode) => (
    <div className="custom-datepicker-panel" style={{ maxWidth: '320px' }}>
      {/* Compact header with dropdowns */}
      <div className="p-2 border-b border-border bg-surface-elevated">
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">
            Fiscal Period
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Select
              placeholder="Quarter"
              options={quarterOptions}
              loading={calendarsLoading}
              disabled={!selectedCalendarId}
              onChange={onQuarterChange}
              className="w-full"
              size="small"
              dropdownStyle={{ maxHeight: '200px' }}
            />
            <Select
              placeholder="Year"
              options={fiscalYearOptions}
              loading={calendarsLoading}
              onChange={onFiscalYearChange}
              className="w-full"
              size="small"
              dropdownStyle={{ maxHeight: '200px' }}
            />
          </div>
        </div>
      </div>
      {/* Original calendar panel */}
      <div style={{ maxHeight: '300px', overflow: 'hidden' }}>{panelNode}</div>
    </div>
  );

  return (
    <DatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={false} // Always allow calendar to be opened
      disabledDate={(current) => {
        // Disable all dates if no fiscal year is selected
        if (!selectedCalendarId) {
          return true;
        }
        // Disable all dates if no quarter is selected
        if (!selectedQuarterId) {
          return true;
        }
        // Use the passed disabledDate function if both fiscal year and quarter are selected
        return disabledDate ? disabledDate(current) : false;
      }}
      format={format}
      className={className}
      suffixIcon={<CalendarOutlined />}
      open={open}
      onOpenChange={setOpen}
      panelRender={renderPanel} // Use custom panel with header at top
      getPopupContainer={(trigger) => trigger.parentElement || document.body}
      popupStyle={{ zIndex: 1000 }}
      data-cy={dataCy}
    />
  );
};

export default IntegratedDatePicker;
