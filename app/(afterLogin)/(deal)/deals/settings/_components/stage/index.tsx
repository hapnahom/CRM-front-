import { dealUiLabel } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import { useCreateStage } from '@/store/server/features/deals/queries';
import { Button, Form, Input, Typography, ColorPicker, message } from 'antd';
import React, { useState } from 'react';
const { Title, Text } = Typography;
import { HiOutlinePaintBrush } from 'react-icons/hi2';

interface SideBarProps {
  open: boolean;
  onClose: () => void;
}

function StageSideBar({ open, onClose }: SideBarProps) {
  const [form] = Form.useForm();
  const [selectedColor, setSelectedColor] = useState<string>(
    tokens.color.brand,
  );
  const { mutate: createStage } = useCreateStage();

  const handleCreateStage = (values: any) => {
    createStage(
      {
        name: values.stage,
        colorCode: selectedColor,
        level: parseInt(values.dealLevel) || 0,
      },
      {
        onSuccess: () => {
          onClose();
          form.resetFields();
        },
        onError: (error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to create stage',
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
            {dealUiLabel()} Stage
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            Create a {dealUiLabel()} Stage
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
            Create Stage
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
        layout="vertical"
        form={form}
        onFinish={handleCreateStage}
        className="w-full"
      >
        <div className="grid grid-cols-1 gap-4">
          <Form.Item
            name="stage"
            label="Stage"
            rules={[{ required: true, message: 'Stage is required' }]}
          >
            <div className="flex items-center gap-2 mt-2">
              <Input placeholder="Stage Name" className="h-10" />
              <ColorPicker
                value={selectedColor}
                onChange={(color) => setSelectedColor(color.toHexString())}
                showText
                size="large"
                className="h-10"
              >
                <Button
                  type="default"
                  icon={<HiOutlinePaintBrush size={20} />}
                  className="p-2 flex items-center justify-center w-14 h-10"
                />
              </ColorPicker>
            </div>
          </Form.Item>

          <Form.Item name="dealLevel" label={`${dealUiLabel()} Level`}>
            <Input
              placeholder={`${dealUiLabel()} Level`}
              className="h-10 mt-2"
            />
          </Form.Item>
          {/* Stage Description */}
          <Form.Item name="description" label="Stage Description">
            <Input.TextArea placeholder="Description" className="h-32 mt-2" />
          </Form.Item>
        </div>
      </Form>
    </CustomDrawerLayout>
  );
}

export default StageSideBar;
