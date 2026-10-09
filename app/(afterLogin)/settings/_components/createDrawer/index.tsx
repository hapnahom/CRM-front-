import React from 'react';
import { Drawer, Button, Input, Form } from 'antd';

const { TextArea } = Input;

interface CreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  itemType: string;
  isLoading?: boolean;
  existingNames?: string[]; // Array of existing names for validation
}

const CreateDrawer: React.FC<CreateDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  itemType,
  isLoading = false,
  existingNames = [],
}) => {
  const [form] = Form.useForm();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      form.resetFields();
    } catch (error) {
      // Form validation failed
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const getTitle = () => {
    switch (itemType) {
      case 'Create Role':
        return 'Role';
      case 'Solutions':
        return 'Solution';
      case 'Sales Vertical':
        return 'Sales Vertical';
      default:
        return itemType;
    }
  };

  const getButtonText = () => {
    switch (itemType) {
      case 'Create Role':
        return 'Create Role';
      case 'Solutions':
        return 'Create Solution';
      case 'Sales Vertical':
        return 'Create Sales Vertical';
      default:
        return `Create ${itemType}`;
    }
  };

  return (
    <Drawer
      title={
        <div>
          <div className="text-lg lg:text-xl font-bold text-foreground">
            {getTitle()}
          </div>
          <div className="text-xs lg:text-sm text-muted-foreground mt-1">
            Create a {getTitle()}
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
            {getButtonText()}
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
      <Form form={form} layout="vertical" className="-mt-2">
        {/* Name */}
        <Form.Item
          label="Name"
          name="name"
          rules={[
            { required: true, message: `${getTitle()} name is required` },
            {
              validator: (rule, value) => {
                if (value && existingNames.includes(value.trim())) {
                  return Promise.reject(
                    new Error(
                      `A ${getTitle().toLowerCase()} with this name already exists`,
                    ),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder={`${getTitle()} Name`}
            className="border-border focus:border-brand focus:ring-brand"
          />
        </Form.Item>

        {/* Description */}
        <Form.Item
          label="Description"
          name="description"
          rules={[
            // Only roles require description in backend
            ...(getTitle() === 'Role'
              ? [
                  {
                    required: true,
                    message: `${getTitle()} description is required`,
                  },
                ]
              : []),
          ]}
        >
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

export default CreateDrawer;
