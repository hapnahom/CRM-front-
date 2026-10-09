import { dealUiLabel } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import { useUpdateStage } from '@/store/server/features/deals/settings/stage/mutation';
import { Button, Form, Input, Typography, ColorPicker, message } from 'antd';
import React, { useEffect } from 'react';
const { Title, Text } = Typography;
import { HiOutlinePaintBrush } from 'react-icons/hi2';
import dealSettingsStageStore from '@/store/uistate/features/deal/settings/stage';

interface EditSideBarProps {
  open: boolean;
  onClose: () => void;
  stage: any;
}

function EditStageSideBar({ open, onClose, stage }: EditSideBarProps) {
  const [form] = Form.useForm();
  const { selectedColor, setSelectedColor, setCurrentStage } =
    dealSettingsStageStore();
  const { mutate: updateStage } = useUpdateStage();

  useEffect(() => {
    if (stage) {
      form.setFieldsValue({
        name: stage.name,
        dealLevel: stage.level?.toString() || '',
        description: stage.description || '',
      });
      setSelectedColor(stage.colorCode || tokens.color.brand);
    }
  }, [stage, form, setSelectedColor]);

  const handleUpdateStage = (values: any) => {
    if (!stage?.id) return;

    const stageData = {
      name: values.name,
      level: parseInt(values.dealLevel) || 0,
      description: values.description,
      colorCode: selectedColor,
    };

    updateStage(
      { id: stage.id, data: stageData },
      {
        onSuccess: () => {
          handleClose();
          form.resetFields();
        },
        onError: (error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to update stage',
          );
        },
      },
    );
  };

  const handleClose = () => {
    onClose();
    // Don't reset current stage immediately to avoid UI flicker
    setTimeout(() => setCurrentStage(null), 300);
  };

  return (
    <CustomDrawerLayout
      modalHeader={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Edit {dealUiLabel()} Stage
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            Update {dealUiLabel()} Stage
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
            Update Stage
          </Button>
          <Button
            type="default"
            className="font-md border-brand text-brand h-10"
            onClick={() => {
              form.resetFields();
              handleClose();
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
        onFinish={handleUpdateStage}
        className="w-full"
      >
        <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between gap-3">
            <Form.Item
              name="name"
              label="Stage"
              rules={[{ required: true, message: 'Stage is required' }]}
              className="flex-1"
            >
              <Input placeholder="Stage Name" className="h-10" />
            </Form.Item>
            <Form.Item
              name="colorCode"
              label="Color"
              rules={[{ required: false, message: 'Color is required' }]}
            >
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
            </Form.Item>
          </div>

          <Form.Item name="dealLevel" label={`${dealUiLabel()} Level`}>
            <Input
              placeholder={`${dealUiLabel()} Level`}
              className="h-10 mt-2"
            />
          </Form.Item>

          <Form.Item name="description" label="Stage Description">
            <Input.TextArea placeholder="Description" className="h-32 mt-2" />
          </Form.Item>
        </div>
      </Form>
    </CustomDrawerLayout>
  );
}

export default EditStageSideBar;
