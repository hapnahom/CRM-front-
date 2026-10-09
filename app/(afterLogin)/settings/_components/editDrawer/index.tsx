import React, { useEffect } from 'react';
import { Drawer, Button, Input, Form } from 'antd';

const { TextArea } = Input;

export interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  itemType: string;
  itemName: string;
  itemDescription?: string;
  isLoading?: boolean;
  existingNames?: string[]; // Array of existing names for validation
}

const EditDrawer: React.FC<EditDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  itemType,
  itemName,
  itemDescription = '',
  isLoading = false,
  existingNames = [],
}) => {
  const [form] = Form.useForm();

  // Update form values when drawer opens or data changes
  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        name: itemName,
        description: itemDescription,
      });
    }
  }, [isOpen, itemName, itemDescription, form, itemType]);

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

  return (
    <Drawer
      title={
        <div>
          <div className="text-lg lg:text-xl font-bold text-foreground">
            {itemType}
          </div>
          <div className="text-xs lg:text-sm text-muted-foreground mt-1">
            {itemType}
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
            Save {itemType}
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
      <Form
        form={form}
        layout="vertical"
        className="-mt-2"
        initialValues={{
          name: itemName,
          description: itemDescription,
        }}
      >
        <Form.Item
          label={`${itemType} Name `}
          name="name"
          rules={[
            { required: true, message: `${itemType} name is required` },
            {
              validator: (rule, value) => {
                if (
                  value &&
                  value !== itemName &&
                  existingNames.includes(value.trim())
                ) {
                  return Promise.reject(
                    new Error(
                      `A ${itemType.toLowerCase()} with this name already exists`,
                    ),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder={`${itemType} Name`}
            className="border-border focus:border-brand focus:ring-brand"
          />
        </Form.Item>

        <Form.Item
          label={`${itemType} Description`}
          name="description"
          rules={[
            // Only roles require description in backend
            ...(itemType === 'Role'
              ? [
                  {
                    required: true,
                    message: `${itemType} description is required`,
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

export default EditDrawer;
