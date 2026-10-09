import { dealUiLabel } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import { useUpdateDealSource } from '@/store/server/features/deals/settings/source/mutation';
import { Button, Form, Input, message, Typography } from 'antd';
import React, { useEffect } from 'react';
import dealSettingsSourceStore from '@/store/uistate/features/deal/settings/source';
const { Title, Text } = Typography;

interface EditSideBarProps {
  open: boolean;
  onClose: () => void;
  source: any;
}

function EditSourceSideBar({ open, onClose, source }: EditSideBarProps) {
  const [form] = Form.useForm();
  const { mutate: updateDealSource } = useUpdateDealSource();
  const { setCurrentSource } = dealSettingsSourceStore();

  // Set form values when source changes
  useEffect(() => {
    if (open && source) {
      form.setFieldsValue({
        name: source.name,
        description: source.description || '',
      });
    }
  }, [source, form, open]);

  const handleClose = () => {
    onClose();
    // Don't reset current source immediately to avoid UI flicker
    setTimeout(() => setCurrentSource(null), 300);
  };

  const handleUpdateDealSource = (values: any) => {
    if (!source?.id) return;

    // Add isDeal flag to ensure it's filtered correctly
    const sourceData = {
      ...values,
      isDeal: true,
    };

    updateDealSource(
      { id: source.id, data: sourceData },
      {
        onSuccess: () => {
          message.success(`${dealUiLabel()} source updated successfully!`);
          handleClose();
        },
        onError: (error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to update deal source',
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
            Edit {dealUiLabel()} Source
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            Update {dealUiLabel()} Source
          </Text>
        </div>
      }
      onClose={handleClose}
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
            Update Source
          </Button>
          <Button
            type="default"
            className="font-md border-brand text-brand h-10"
            onClick={handleClose}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        onFinish={handleUpdateDealSource}
        layout="vertical"
        className="w-full"
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Source name is required' }]}
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

export default EditSourceSideBar;
