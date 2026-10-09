import { dealUiLabel } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import { Button, DatePicker, Form, Input, Select, Typography } from 'antd';
import React from 'react';
const { Title, Text } = Typography;

interface SideBarProps {
  open: boolean;
  onClose: () => void;
}

function TargetSideBar({ open, onClose }: SideBarProps) {
  return (
    <CustomDrawerLayout
      modalHeader={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {dealUiLabel()} Target
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            Create a {dealUiLabel()} Target
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
            onClick={() => {}}
          >
            Create Target
          </Button>
          <Button
            type="default"
            className="font-md border-brand text-brand h-10"
            onClick={() => {}}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form layout="vertical" onValuesChange={() => {}} className="w-full">
        <Form.Item
          name="target"
          label="Name"
          rules={[{ required: true, message: 'Target is required' }]}
        >
          <Input placeholder="Target Name" className="h-10 mt-2" />
        </Form.Item>
        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <DatePicker placeholder="Date" className="h-10 mt-2 w-full" />{' '}
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="team" label="Team">
            <Select placeholder="team" className="h-10 mt-2" />
          </Form.Item>
          <Form.Item name="sector" label="Sector">
            <Select placeholder="Sector" className="h-10 mt-2" />
          </Form.Item>
        </div>

        <Form.Item name="amount" label="Amount">
          <Input placeholder="Amount" className="h-10 mt-2" />
        </Form.Item>
        {/* Target Description */}
        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Description" className="h-32 mt-2" />
        </Form.Item>
      </Form>
    </CustomDrawerLayout>
  );
}

export default TargetSideBar;
