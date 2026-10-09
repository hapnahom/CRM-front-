import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input, Form, Select, Radio, Switch, Tag } from 'antd';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { CustomFieldAssociation } from '@/store/server/features/custom-fields/queries';

const { TextArea } = Input;
const { Option } = Select;

interface CreateCustomFieldDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  isLoading?: boolean;
}

const CreateCustomFieldDrawer: React.FC<CreateCustomFieldDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>('');
  const [dropdownValues, setDropdownValues] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
          <div className="text-xl font-bold text-foreground">Custom Field</div>
          <div className="text-sm text-muted-foreground mt-1">
            Create a Custom Field
          </div>
        </div>
      }
      placement={isMobile ? 'bottom' : 'right'}
      onClose={handleClose}
      open={isOpen}
      width={isMobile ? '100%' : 400}
      height={isMobile ? '70%' : undefined}
      closable={false}
      styles={{
        header: { borderBottom: 'none' },
        body: { paddingTop: '16px' },
        footer: { borderTop: 'none' },
      }}
      footer={
        <div className="flex justify-center gap-3 border-t-0 p-4">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            className="bg-brand hover:bg-brand-hover border-brand hover:border-brand-hover text-brand-foreground py-5"
          >
            Create Custom Field
          </Button>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            className="text-brand border-brand hover:bg-brand-muted py-5"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="-mt-2">
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
        <div className="flex items-center justify-between mb-4">
          <Form.Item
            label="Field Association"
            name="association"
            rules={[
              { required: true, message: 'Field association is required' },
            ]}
            className="mb-0"
          >
            <Radio.Group>
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
            <Switch />
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

export default CreateCustomFieldDrawer;
