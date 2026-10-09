import React, { useEffect, useState } from 'react';
import { Drawer, Button, Input, Form, Select, Radio, Switch, Tag } from 'antd';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { CustomFieldAssociation } from '@/store/server/features/custom-fields/queries';

const { TextArea } = Input;
const { Option } = Select;

interface CustomFieldDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  itemData?: any;
  isLoading?: boolean;
}

const CustomFieldDrawer: React.FC<CustomFieldDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  itemData = {},
  isLoading = false,
}) => {
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>('');
  const [dropdownValues, setDropdownValues] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');

  // Update form values when drawer opens or data changes
  useEffect(() => {
    if (isOpen && itemData) {
      // Reset form first to clear any previous values
      form.resetFields();

      const formValues = {
        name: itemData.name || '',
        type: itemData.type || '',
        association:
          itemData.association ||
          (isLeadsEnabled()
            ? CustomFieldAssociation.LEAD
            : CustomFieldAssociation.DEAL),
        isRequired: itemData.isRequired || false,
        description: itemData.description || '',
        fieldValues: itemData.fieldValues || [],
      };

      // Set values with a small delay to ensure form is ready after reset
      setTimeout(() => {
        form.setFieldsValue(formValues);
      }, 50);

      // Set the selected type for conditional rendering
      setSelectedType(itemData.type || '');

      // Set dropdown values if the field type is dropdown
      if (itemData.type === 'dropdown' && itemData.fieldValues) {
        // Handle both string arrays and object arrays with value property
        const values = itemData.fieldValues.map((item: any) =>
          typeof item === 'string' ? item : item.value || item,
        );
        setDropdownValues(values);
      } else {
        setDropdownValues([]);
      }
    }
  }, [isOpen, itemData, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // Validate dropdown has options
      if (values.type === 'dropdown' && dropdownValues.length === 0) {
        form.setFields([
          {
            name: 'type',
            errors: ['Dropdown fields must have at least one option'],
          },
        ]);
        return;
      }

      // Set fieldValues based on field type
      if (values.type === 'dropdown') {
        values.fieldValues = dropdownValues;
      } else {
        // For non-dropdown fields, fieldValues should be an empty array
        values.fieldValues = [];
      }

      await onSave(values);
      form.resetFields();
      setDropdownValues([]);
      setSelectedType('');
    } catch (error) {
      // Form validation failed
    }
  };

  const handleClose = () => {
    form.resetFields();
    setDropdownValues([]);
    setSelectedType('');
    setInputValue('');
    onClose();
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    if (value !== 'dropdown') {
      setDropdownValues([]);
    }
  };

  const addDropdownValue = () => {
    if (inputValue.trim() && !dropdownValues.includes(inputValue.trim())) {
      setDropdownValues([...dropdownValues, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeDropdownValue = (value: string) => {
    setDropdownValues(dropdownValues.filter((v) => v !== value));
  };

  return (
    <Drawer
      title={
        <div>
          <div className="text-lg lg:text-xl font-bold text-foreground">
            Custom Field
          </div>
          <div className="text-xs lg:text-sm text-muted-foreground mt-1">
            Edit Custom Field
          </div>
        </div>
      }
      placement={window.innerWidth < 768 ? 'bottom' : 'right'}
      onClose={handleClose}
      open={isOpen}
      width={window.innerWidth < 768 ? '100%' : 400}
      height={window.innerWidth < 768 ? '70%' : undefined}
      closable={false}
      styles={{
        header: { borderBottom: 'none', padding: '16px 20px' },
        body: { paddingTop: '16px', padding: '16px 20px' },
        footer: { borderTop: 'none', padding: '16px 20px' },
      }}
      footer={
        <div className="flex flex-row justify-center gap-3 border-t-0 p-2 sm:p-4">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            className="bg-brand hover:bg-brand-hover border-brand hover:border-brand-hover text-brand-foreground py-3 sm:py-5 flex-1"
          >
            Save Custom Field
          </Button>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            className="text-brand border-brand hover:bg-brand-muted py-3 sm:py-5 flex-1"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        {/* Name */}
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Field name is required' }]}
        >
          <Input
            placeholder="Field Name"
            className="border-border focus:border-brand focus:ring-brand"
          />
        </Form.Item>

        {/* Type */}
        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: 'Field type is required' }]}
        >
          <Select
            placeholder="Field Type"
            className="border-border focus:border-brand focus:ring-brand"
            onChange={handleTypeChange}
          >
            <Option value="inputfield">Input Field</Option>
            <Option value="dropdown">Dropdown</Option>
            <Option value="checkbox">Checkbox</Option>
          </Select>
        </Form.Item>

        {/* Dropdown Values - Only show when type is dropdown */}
        {selectedType === 'dropdown' && (
          <Form.Item label="Dropdown Options" className="mb-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter option value"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={addDropdownValue}
                  className="flex-1"
                />
                <Button onClick={addDropdownValue} type="primary">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded border-border">
                {dropdownValues.map((value, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => removeDropdownValue(value)}
                    className="mb-1"
                  >
                    {value}
                  </Tag>
                ))}
                {dropdownValues.length === 0 && (
                  <span className="text-muted-foreground text-sm">
                    No options added yet
                  </span>
                )}
              </div>
            </div>
          </Form.Item>
        )}

        {/* Field Association and Required Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <Form.Item
            label="Field Association"
            name="association"
            rules={[
              { required: true, message: 'Field association is required' },
            ]}
            className="mb-0"
          >
            <Radio.Group className="flex flex-col sm:flex-row gap-2">
              <Radio value={CustomFieldAssociation.DEAL}>{dealUiLabel()}</Radio>
              {isLeadsEnabled() ? (
                <>
                  <Radio value={CustomFieldAssociation.LEAD}>Lead</Radio>
                  <Radio value={CustomFieldAssociation.BOTH}>Both</Radio>
                </>
              ) : null}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Is required"
            name="isRequired"
            valuePropName="checked"
            className="mb-0"
          >
            <Switch className="bg-gray-300" />
          </Form.Item>
        </div>

        {/* Description */}
        <Form.Item label="Field Description" name="description">
          <TextArea
            placeholder="Description"
            rows={4}
            className="border-border focus:border-brand focus:ring-brand"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CustomFieldDrawer;
