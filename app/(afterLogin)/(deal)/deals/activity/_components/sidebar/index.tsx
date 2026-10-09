import { tokens } from '@/lib/design-tokens';
import CustomDrawerLayout from '@/components/common/customDrawer';
import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  TimePicker,
  Typography,
  Checkbox,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { formatUserName } from '@/lib/format-user-name';
import dayjs from 'dayjs';
import {
  useCreateActivity,
  useUpdateActivity,
} from '@/store/server/features/deals/activity/mutation';
import { useGetDealActivitiesTypes } from '@/store/server/features/deals/activity/query';
import { usePipelineDealOptions } from '@/store/server/features/deals/pipeline/queries';
import { useGetAllUsers } from '@/store/server/features/employees/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
const { Title, Text } = Typography;

interface SideBarProps {
  open: boolean;
  onClose: () => void;
  activity?: any;
  isEditMode?: boolean;
  activityData?: any;
  onSave?: (data: any) => void;
  createActivity?: any;
  updateActivity?: any;
  preSelectedDealId?: string; // New prop for pre-selected deal
  hideDealDropdown?: boolean; // New prop to hide deal dropdown
  dealData?: any; // New prop for deal data (name, etc.)
}

function ActivitySideBar({
  open,
  onClose,
  activity,
  isEditMode = false,
  activityData,
  preSelectedDealId,
  hideDealDropdown = false,
  dealData,
}: SideBarProps) {
  // eslint-disable-next-line
  const createDealActivity = useCreateActivity();
  // eslint-disable-next-line
  const updateDealActivity = useUpdateActivity();
  // eslint-disable-next-line
  const { data: activityTypes } = useGetDealActivitiesTypes();
  const [dealSearch, setDealSearch] = useState('');
  const [debouncedDealSearch, setDebouncedDealSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedDealSearch(dealSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [dealSearch]);

  const { dealOptions } = usePipelineDealOptions({
    search: debouncedDealSearch,
    pageSize: 25,
    enabled: open && !hideDealDropdown,
  });

  const findDealName = (id?: string) =>
    dealOptions.find((deal) => deal.id === id)?.name;

  const [form] = Form.useForm();
  const { data: users } = useGetAllUsers();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  // Get current user ID for assignee field
  const currentUserId = useAuthenticationStore((state) => state.userId);

  // Store the activity ID when it's available
  const [storedActivityId, setStoredActivityId] = useState<string | null>(null);

  // Check if we're editing an existing activity
  const isEditing = !!activity || isEditMode;

  // Data extraction helper
  const extractData = (response: any) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.data)) return response.data;
    if (response && Array.isArray(response.items)) return response.items;
    if (response && Array.isArray(response.results)) return response.results;
    return [];
  };

  // Ensure we always have arrays to work with
  const safeUsers = extractData(users);
  const safeActivityTypes = extractData(activityTypes);

  // UUID validation function
  const isValidUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const peopleOptions = safeUsers?.map((i: any) => ({
    value: i.id,
    label: formatUserName(i),
  }));

  // Initialize form with activity data when editing
  /* eslint-disable react-hooks/exhaustive-deps -- stable ids/lengths avoid re-run loops */
  React.useEffect(() => {
    const currentActivity = activity || activityData;

    // Store the activity ID when it's available
    if (currentActivity?.id) {
      setStoredActivityId(currentActivity.id);
    } else if (activityData?.id) {
      setStoredActivityId(activityData.id);
    }

    if (currentActivity && open) {
      // Handle different date/time formats
      let dateValue = null;
      let timeValue = null;

      if (currentActivity.activityDate) {
        // If activityDate is a full datetime string
        const activityDateTime = dayjs(currentActivity.activityDate);
        if (activityDateTime.isValid()) {
          dateValue = activityDateTime;
          timeValue = activityDateTime;
        }
      } else if (currentActivity.date && currentActivity.time) {
        // If date and time are separate fields
        const dateObj = dayjs(currentActivity.date);
        const timeObj = dayjs(currentActivity.time);
        if (dateObj.isValid()) dateValue = dateObj;
        if (timeObj.isValid()) timeValue = timeObj;
      } else if (currentActivity.date) {
        // If only date is available
        const dateObj = dayjs(currentActivity.date);
        if (dateObj.isValid()) {
          dateValue = dateObj;
          timeValue = dateObj;
        }
      }

      // Additional time parsing for different formats
      if (!timeValue && currentActivity.time) {
        // Try parsing time in different formats
        const timeFormats = [
          'HH:mm',
          'HH:mm:ss',
          'h:mm A',
          'h:mm:ss A',
          'YYYY-MM-DD HH:mm:ss',
          'YYYY-MM-DD HH:mm',
        ];

        for (const format of timeFormats) {
          const parsedTime = dayjs(currentActivity.time, format);
          if (parsedTime.isValid()) {
            timeValue = parsedTime;
            break;
          }
        }
      }

      // Set form values with a small delay to ensure TimePicker is ready
      setTimeout(() => {
        // Handle responsible persons structure from backend
        let responsiblePersons = [];
        if (
          currentActivity.responsiblePersons &&
          Array.isArray(currentActivity.responsiblePersons)
        ) {
          // Backend returns array of objects with userId property
          responsiblePersons = currentActivity.responsiblePersons
            .map((person: any) => {
              if (typeof person === 'string') {
                return person; // Already a string
              } else if (person && person.userId) {
                return person.userId; // Extract userId from object
              }
              return null;
            })
            .filter(Boolean); // Remove any null values
        } else if (
          currentActivity.responsiblePerson &&
          Array.isArray(currentActivity.responsiblePerson)
        ) {
          // Fallback for old structure: array of strings
          responsiblePersons = currentActivity.responsiblePerson;
        }

        // When hideDealDropdown is true, set the deal name to the actual name, not the UUID
        const dealNameToSet = hideDealDropdown
          ? dealData?.dealName ||
            findDealName(preSelectedDealId || currentActivity.dealId) ||
            'Current Deal'
          : preSelectedDealId ||
            currentActivity.dealId ||
            currentActivity.dealName;

        form.setFieldsValue({
          id: currentActivity.id, // Store the activity ID in the form
          dealName: dealNameToSet, // Use actual deal name when hideDealDropdown is true
          dealId: preSelectedDealId || currentActivity.dealId, // Store the deal ID for form submission
          activityName: currentActivity.activityName,
          responsiblePersons: responsiblePersons, // Use responsiblePerson array
          type: currentActivity.activityTypeId || currentActivity.type,
          priority: currentActivity.priority,
          description: currentActivity.description || currentActivity.task,
          date: dateValue,
          time: timeValue,
          reason: currentActivity.reason || '',
        });
      }, 100);

      setIsCompleted(currentActivity.isCompleted || false);
      setIsFailed(currentActivity.failed || false);
    } else if (!currentActivity && open) {
      // Reset form when creating new activity
      form.resetFields();
      setIsCompleted(false);
      setIsFailed(false);
      // Set pre-selected deal if provided
      if (preSelectedDealId) {
        // When hideDealDropdown is true, set the deal name to the actual name, not the UUID
        const dealNameToSet = hideDealDropdown
          ? dealData?.dealName ||
            findDealName(preSelectedDealId) ||
            'Current Deal'
          : preSelectedDealId;

        form.setFieldsValue({
          dealName: dealNameToSet,
          dealId: preSelectedDealId,
        });
      }
    }
  }, [
    activity?.id,
    activityData?.id,
    open,
    hideDealDropdown,
    preSelectedDealId,
    // Use stable references to prevent infinite loops
    dealOptions.length,
    dealData?.id,
    dealData?.dealName,
    // Include form to satisfy exhaustive-deps (form is stable from Ant Design)
    form,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleCreateDealActivity = (values: any) => {
    // Validate required fields
    if (!values.responsiblePersons || values.responsiblePersons.length === 0) {
      message.error('Please select at least one responsible person');
      return;
    }

    const dealId = values.dealId || values.dealName;
    if (!dealId) {
      message.error('Please select a deal');
      return;
    }

    // Check if values are undefined or null
    if (values.dealName === 'undefined' || values.dealName === null) {
      message.error('Please select a valid deal');
      return;
    }

    if (dealId === 'undefined' || dealId === null) {
      message.error('Please select a valid deal');
      return;
    }

    // Validate deal ID
    if (!isValidUUID(dealId)) {
      message.error('Invalid deal ID format');
      return;
    }

    // Use currentUserId as assignee (already validated)
    const assigneeId = currentUserId;

    // Validate current user ID
    if (!assigneeId || !isValidUUID(assigneeId)) {
      message.error('Invalid current user ID format');
      return;
    }

    // Validate responsible persons array
    let responsiblePersonIds = Array.isArray(values.responsiblePersons)
      ? values.responsiblePersons
      : [values.responsiblePersons];

    // Filter out any undefined values
    responsiblePersonIds = responsiblePersonIds.filter(
      (id: string) => id && id !== 'undefined',
    );

    // Validate each UUID in the array
    for (const personId of responsiblePersonIds) {
      if (!personId || !isValidUUID(personId)) {
        message.error('Invalid responsible person ID format');

        return;
      }
    }

    // Additional validation: Check if user IDs exist in the users list
    const validUserIds = safeUsers?.map((user: any) => user.id) || [];
    const invalidUserIds = responsiblePersonIds.filter(
      (id: string) => !validUserIds.includes(id),
    );

    if (invalidUserIds.length > 0) {
      message.error(
        `The following user IDs are not valid: ${invalidUserIds.join(', ')}`,
      );
      return;
    }

    // Ensure priority is a valid string value
    const validPriorities = ['low', 'medium', 'high'];
    const priorityValue = validPriorities.includes(values.priority)
      ? values.priority
      : 'medium';

    // Transform responsiblePersonIds to responsiblePersons with userId and optional role
    const responsiblePersons = responsiblePersonIds.map((userId: string) => ({
      userId: userId,
      role: null, // Make role nullable as requested
    }));

    // Filter out any undefined or 'undefined' string values
    const cleanValues = Object.fromEntries(
      Object.entries({
        dealId: dealId,
        activityName: values.activityName,
        assignee: currentUserId, // Use current user ID as assignee
        priority: priorityValue,
        description: values.description,
        isCompleted: isCompleted,
        failed: isFailed,
        reason: values.reason || '',
        activityTypeId: values.type,
        responsiblePersons: responsiblePersons,
        activityDate:
          values.date && values.time
            ? dayjs(
                values.date.format('YYYY-MM-DD') +
                  ' ' +
                  values.time.format('HH:mm:ss'),
              ).toDate()
            : values.date
              ? dayjs(values.date.format('YYYY-MM-DD')).toDate()
              : new Date(),
      }).filter(([, value]) => {
        const isValid =
          value !== undefined && value !== null && value !== 'undefined';
        return isValid;
      }),
    );

    const activityData = cleanValues;

    // Final safety check before submission
    if (
      !activityData.assignee ||
      activityData.assignee === 'undefined' ||
      activityData.assignee === null
    ) {
      message.error('Invalid assignee data. Please try again.');
      return;
    }

    if (
      !activityData.dealId ||
      activityData.dealId === 'undefined' ||
      activityData.dealId === null
    ) {
      message.error('Invalid deal data. Please try again.');
      return;
    }

    if (isEditing) {
      // Ensure we have a valid activity ID - check both activity and activityData props
      let activityId = activity?.id || activityData?.id || storedActivityId;

      // If still no ID, try to get it from the form values or other sources
      if (!activityId) {
        const formValues = form.getFieldsValue();
        activityId = formValues.id || formValues.activityId;
      }

      if (!activityId) {
        message.error('Activity ID not found. Cannot update activity.');
        return;
      }

      const updatePayload = { id: activityId, ...activityData };

      updateDealActivity
        .mutateAsync(updatePayload)
        .then(() => {
          message.success('Activity updated successfully!');
          form.resetFields();
          setTimeout(() => {
            onClose();
          }, 100);
        })
        .catch((error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to update activity',
          );
        });
    } else {
      createDealActivity
        .mutateAsync(activityData as any)
        .then(() => {
          message.success('Activity created successfully!');
          form.resetFields();
          setTimeout(() => {
            onClose();
          }, 100);
        })
        .catch((error: any) => {
          message.error(
            error?.response?.data?.message || 'Failed to create activity',
          );
        });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setIsCompleted(false);
    setIsFailed(false);
    onClose();
  };

  const handleUseTodayDateChange = (e: any) => {
    const checked = e.target.checked;
    if (checked) {
      form.setFieldsValue({
        date: dayjs(),
        time: dayjs(),
      });
    } else {
      form.setFieldsValue({
        date: null,
        time: null,
      });
    }
  };

  return (
    <CustomDrawerLayout
      modalHeader={
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Deal Activity
          </Title>
          <Text style={{ color: tokens.color.textMuted }}>
            {isEditing ? 'Edit Deal Activity' : 'Create a Deal Activity'}
          </Text>
        </div>
      }
      onClose={handleCancel}
      open={open}
      width="25%"
      footer={
        <div className="flex justify-center items-center gap-4">
          <Button
            type="primary"
            className="font-md bg-brand text-brand-foreground h-10"
            onClick={() => form.submit()}
          >
            {isEditing ? 'Update Activity' : 'Create Activity'}
          </Button>
          <Button
            type="default"
            className="font-md border-brand text-brand h-10"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateDealActivity}
        onValuesChange={(changedValues) => {
          // If responsiblePersons changed and contains non-UUID values, find the correct UUIDs
          if (changedValues.responsiblePersons) {
            const updatedValues = changedValues.responsiblePersons.map(
              (value: any) => {
                if (isValidUUID(value)) {
                  return value;
                }
                // Find the correct UUID for this label
                const selectedOption = peopleOptions?.find(
                  (option: any) => option.label === value,
                );
                return selectedOption ? selectedOption.value : value;
              },
            );

            // Only update if there are changes to avoid infinite loop
            if (
              JSON.stringify(updatedValues) !==
              JSON.stringify(changedValues.responsiblePersons)
            ) {
              setTimeout(() => {
                form.setFieldValue('responsiblePersons', updatedValues);
              }, 0);
            }
          }
        }}
        className="w-full"
        initialValues={{ isCompleted: false }}
      >
        {!hideDealDropdown ? (
          <Form.Item name="dealName" label="Deal" rules={[{ required: true }]}>
            <Select
              allowClear
              placeholder="Deal Name"
              className="h-10 mt-1"
              showSearch
              filterOption={false}
              onSearch={setDealSearch}
              options={dealOptions.map((deal) => ({
                value: deal.id,
                label: deal.name,
              }))}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item name="dealName" label="Deal">
              <Input
                value={
                  dealData?.dealName ||
                  findDealName(preSelectedDealId) ||
                  'Current Deal'
                }
                disabled
                className="h-10 mt-1"
                style={{
                  backgroundColor: tokens.color.surfaceSelected,
                  color: tokens.color.textPrimary,
                }}
                onChange={() => {}} // Prevent any changes
              />
            </Form.Item>
            {/* Hidden field to store the actual deal ID for form submission */}
            <Form.Item name="dealId" style={{ display: 'none' }}>
              <Input value={preSelectedDealId} />
            </Form.Item>
          </>
        )}
        <Form.Item
          name="activityName"
          label="Activity Name"
          rules={[{ required: true }]}
        >
          <Input placeholder="Activity Name" className="h-10 mt-1" />
        </Form.Item>
        <Form.Item
          name="responsiblePersons"
          label="Assigned To"
          rules={[
            {
              required: true,
              message: 'Please select at least one responsible person',
            },
            {
              // eslint-disable-next-line
              validator: (_, value) => {
                if (!value || value.length === 0) {
                  return Promise.reject(
                    new Error('Please select at least one responsible person'),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          getValueFromEvent={(value) => {
            // Always return the value as-is
            return value;
          }}
        >
          <Select
            mode="multiple"
            placeholder="Select responsible persons"
            className="mt-1"
            allowClear
            style={{ minHeight: '40px' }}
            filterOption={(input: any, option: any) =>
              (option?.label ?? '')?.toLowerCase().includes(input.toLowerCase())
            }
            options={peopleOptions}
          />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select
            placeholder="Activity Type"
            className="h-10 mt-1"
            showSearch
            options={safeActivityTypes?.map((i: any) => ({
              value: i.id,
              label: i.name,
            }))}
            allowClear
            filterOption={(input: string, option: any) =>
              (option?.label ?? '')?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Activity Priority"
            className="h-10 mt-1"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            allowClear
            filterOption={(input: any, option: any) =>
              (option?.label ?? '')?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="time" label="Time" rules={[{ required: true }]}>
            <TimePicker className="w-full h-10 mt-1" placeholder="Set Time" />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full h-10 mt-1" placeholder="Set Date" />
          </Form.Item>
        </div>

        <div className="flex justify-end">
          <Form.Item
            name="isCompleted"
            valuePropName="checked"
            initialValue={false}
            noStyle
          >
            <Checkbox onChange={handleUseTodayDateChange}>
              Use todays Date
            </Checkbox>
          </Form.Item>
        </div>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true }]}
        >
          <Input.TextArea
            className="w-full h-36 mt-1"
            placeholder="Description"
          />
        </Form.Item>

        {/* Conditional Reason field - only show when activity is failed */}
        {isFailed && (
          <Form.Item
            name="reason"
            label="Reason for Failure"
            rules={[
              {
                required: true,
                message: 'Please provide a reason for failure',
              },
            ]}
          >
            <Input.TextArea
              className="w-full h-24 mt-1"
              placeholder="Please explain why this activity failed..."
            />
          </Form.Item>
        )}

        {/* Only show Mark as Done button if activity is not failed, not completed, and we're in edit mode */}
        {!isFailed && !isCompleted && isEditing && (
          <div className="flex justify-center mt-2 mb-6">
            <Button
              type="primary"
              className="font-md bg-brand text-brand-foreground h-10"
              onClick={() => setIsCompleted(!isCompleted)}
            >
              Mark as Done
            </Button>
          </div>
        )}
      </Form>
    </CustomDrawerLayout>
  );
}

export default ActivitySideBar;
