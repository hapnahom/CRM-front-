import { dealUiLabel } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import { Button, Form, Input, Typography, Dropdown, message } from 'antd';
import React, { useEffect } from 'react';
import { HiOutlineViewGridAdd } from 'react-icons/hi';
const { Title, Text } = Typography;
import { useUpdateActivityType } from '@/store/server/features/deals/settings/activitytype/mutation';
import {
  activityIcons,
  getDefaultIcon,
  getIconByKey,
  type ActivityIcon,
} from '@/utils/activityIcons';
import dealSettingsActivityStore from '@/store/uistate/features/deal/settings/activity';

interface EditSideBarProps {
  open: boolean;
  onClose: () => void;
  activity: any;
}

function EditActivitySideBar({ open, onClose, activity }: EditSideBarProps) {
  const { mutate: updateActivityType } = useUpdateActivityType();
  const [form] = Form.useForm();

  // Use Zustand store instead of useState
  const {
    selectedIcon,
    setSelectedIcon,
    iconDropdownOpen,
    setIconDropdownOpen,
    setCurrentActivity,
  } = dealSettingsActivityStore();

  // Set form values when activity changes
  useEffect(() => {
    if (open && activity) {
      form.setFieldsValue({
        activityName: activity.name,
        description: activity.description || '',
        icon: activity.activityIcon,
      });

      // Set the selected icon
      const iconData = getIconByKey(activity.activityIcon) || getDefaultIcon();
      setSelectedIcon(iconData);
    }
  }, [activity, form, open, setSelectedIcon]);

  const handleUpdateActivityType = (values: any) => {
    if (!activity?.id) return;

    const activityTypeData = {
      name: values.activityName,
      description: values.description,
      activityIcon: selectedIcon.key,
      isDeal: true,
    };

    updateActivityType(
      { id: activity.id, data: activityTypeData },
      {
        onSuccess: () => {
          message.success('Activity type updated successfully!');
          handleClose();
        },
        onError: (error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to update activity type',
          );
        },
      },
    );
  };

  const handleIconSelect = (icon: ActivityIcon) => {
    setSelectedIcon(icon);
    setIconDropdownOpen(false);
    form.setFieldsValue({ icon: icon.key });
  };

  const handleClose = () => {
    onClose();
    // Don't reset current activity immediately to avoid UI flicker
    setTimeout(() => setCurrentActivity(null), 300);
  };

  const iconDropdownMenu = (
    <div className="bg-surface-card p-4 rounded-lg shadow-lg border w-80">
      <div className="mb-3">
        <Text className="font-medium text-foreground">
          Select Icon For Activity
        </Text>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {activityIcons.map((icon) => (
          <div
            key={icon.key}
            onClick={() => handleIconSelect(icon)}
            className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer hover:bg-primary-muted transition-colors ${
              selectedIcon.key === icon.key
                ? 'border-brand bg-primary-muted text-brand'
                : 'border-border hover:border-brand'
            }`}
            title={icon.label}
          >
            <div className="text-lg">{icon.icon}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <CustomDrawerLayout
      modalHeader={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Edit {dealUiLabel()} Activity
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            Update {dealUiLabel()} Activity
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
            Update Activity
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
        layout="vertical"
        form={form}
        onFinish={handleUpdateActivityType}
        className="w-full"
      >
        <div className="grid grid-cols-1 gap-4">
          {/* Activity Name */}
          <div className="flex justify-between gap-2">
            <Form.Item
              name="activityName"
              label="Name"
              rules={[{ required: true, message: 'Activity Name is required' }]}
              className="flex-1"
            >
              <Input placeholder="Activity Name" className="h-10 mt-2" />
            </Form.Item>
            <Form.Item name="icon" label="Icon">
              <Dropdown
                open={iconDropdownOpen}
                onOpenChange={setIconDropdownOpen}
                dropdownRender={() => iconDropdownMenu}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="default"
                  icon={<HiOutlineViewGridAdd />}
                  className="h-10 w-10 mt-2 text-brand border-brand flex items-center justify-center"
                />
              </Dropdown>
            </Form.Item>
          </div>

          {/* Hidden form field to store the selected icon */}
          <Form.Item name="icon" hidden>
            <Input />
          </Form.Item>

          {/* Activity Description */}
          <Form.Item name="description" label="Activity Description">
            <Input.TextArea placeholder="Description" className="h-32 mt-2" />
          </Form.Item>
        </div>
      </Form>
    </CustomDrawerLayout>
  );
}

export default EditActivitySideBar;
