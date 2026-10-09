import { dealUiLabel } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import { useCreateDealSource } from '@/store/server/features/deals/settings/source/mutation';
import { Button, Form, Input, message, Typography } from 'antd';
import React from 'react';
const { Title, Text } = Typography;

interface SideBarProps {
  open: boolean;
  onClose: () => void;
}

function SourceSideBar({ open, onClose }: SideBarProps) {
  const [form] = Form.useForm();
  const { mutate: createDealSource } = useCreateDealSource();

  const handleCreateDealSource = (values: any) => {
    // Add isDeal flag to ensure it's filtered correctly
    const sourceData = {
      ...values,
      isDeal: true,
    };

    createDealSource(
      { data: sourceData },
      {
        onSuccess: () => {
          onClose();
          form.resetFields();
        },
        onError: (error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to create deal source',
          );
        },
      },
    );
  };
  return (
    <CustomDrawerLayout
      modalHeader={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {dealUiLabel()} Source
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            Create a {dealUiLabel()} Source
          </Text>
        </div>
      }
      onClose={onClose}
      open={open}
      width="30%"
      footer={
        <div className="flex justify-center items-center gap-4">
          <Button
            type="primary"
            className="font-md bg-brand text-brand-foreground h-10"
            onClick={() => {
              form.submit();
            }}
          >
            Create Source
          </Button>
          <Button
            type="default"
            className="font-md border-brand text-brand h-10"
            onClick={() => {
              form.resetFields();
              onClose();
            }}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        onFinish={handleCreateDealSource}
        layout="vertical"
        className="w-full"
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Source is required' }]}
        >
          <Input placeholder="Source Name" className="h-10 mt-2" />
        </Form.Item>

        {/* Source Description */}
        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Description" className="h-32 mt-2" />
        </Form.Item>
      </Form>
    </CustomDrawerLayout>
  );
}

export default SourceSideBar;
