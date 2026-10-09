'use client';

import React from 'react';
import { Modal, DatePicker, Button } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilter: (dateRange: any) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onFilter,
}) => {
  const [dateRange, setDateRange] = React.useState<any>(null);
  const [modalWidth, setModalWidth] = React.useState<number>(400);

  const computeModalWidth = () => {
    if (typeof window === 'undefined') return 400;
    const horizontalPadding = 32; // 16px margins on both sides
    const minWidth = 280; // ensure usability on very small screens
    return Math.min(
      400,
      Math.max(minWidth, window.innerWidth - horizontalPadding),
    );
  };

  React.useEffect(() => {
    const updateWidth = () => setModalWidth(computeModalWidth());
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleFilter = () => {
    onFilter(dateRange);
    onClose();
  };

  const handleCancel = () => {
    setDateRange(null);
    onClose();
  };

  return (
    <Modal
      title="Filter"
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={modalWidth}
      centered
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground mb-2">
            Filter your activities by
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Date
          </label>
          <RangePicker
            className="w-full"
            placeholder={['Start Date', 'End Date']}
            value={dateRange}
            onChange={setDateRange}
            suffixIcon={<CalendarOutlined />}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="primary"
            onClick={handleFilter}
            className="w-full sm:flex-1 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover"
          >
            Filter
          </Button>
          <Button
            onClick={handleCancel}
            className="w-full sm:flex-1 text-primary border-primary hover:text-primary-hover hover:border-primary-hover hover:bg-primary-muted"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FilterModal;
