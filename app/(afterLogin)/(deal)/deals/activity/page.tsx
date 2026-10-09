'use client';

import { formatUserName } from '@/lib/format-user-name';

import React, { useMemo, useState } from 'react';
import { Button, ConfigProvider, Dropdown } from 'antd';
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { LuSettings2 } from 'react-icons/lu';
import { RiExchange2Line } from 'react-icons/ri';
import { useSearchParams } from 'next/navigation';
import { useGetActivities } from '@/store/server/features/deals/activity/query';
import { useGetDealActivitiesTypes } from '@/store/server/features/deals/activity/query';
import { useGetAllUsers } from '@/store/server/features/employees/queries';
import { resolveActivityDealName } from '@/store/server/features/deals/activity/utils';
import {
  useCreateActivity,
  useUpdateActivity,
} from '@/store/server/features/deals/activity/mutation';
import {
  CreateActivityRequest,
  UpdateActivityRequest,
  ActivityFilters,
} from '@/store/server/features/deals/activity/types';
import ActivitySideBar from './_components/sidebar';
import { ActivityTimelineSkeleton } from '@/components/loading/skeleton-screens';
import { tokens, antdPageTheme } from '@/lib/design-tokens';
import { Timeline } from './_components/timeline';
import ActivityFilterModal from './_components/filter';
import ActionDropdown from './_components/export';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { showValidationErrors } from '@/utils/showValidationErrors';
import dayjs from 'dayjs';

export default function DealActivityPage() {
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({});

  const handleFilter = (filterData: ActivityFilters) => {
    setFilters(filterData);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleExport = () => {
    // Add your export logic here
  };

  // Fetch all required data with filters, including dealId if provided
  const { data: activities, isLoading: activitiesLoading } = useGetActivities({
    ...filters,
    ...(dealId && { dealId }),
  });
  const { data: activityTypes, isLoading: activityTypesLoading } =
    useGetDealActivitiesTypes();
  const { data: users, isLoading: usersLoading } = useGetAllUsers();

  // Helper function to extract data from nested API responses (same as sidebar)
  const extractData = (response: any) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.data)) return response.data;
    if (response && Array.isArray(response.items)) return response.items;
    if (response && Array.isArray(response.results)) return response.results;
    return [];
  };

  // Create lookup maps for efficient data access
  const activityTypeMap = useMemo(() => {
    if (!activityTypes) return new Map();
    // Use the extractData helper function
    const typesArray = extractData(activityTypes);
    // Create map using the 'id' field as key (not activityTypeId)
    const map = new Map();
    typesArray.forEach((type: any) => {
      if (type && type.id) {
        map.set(type.id, type);
      }
    });

    return map;
  }, [activityTypes]);

  const userMap = useMemo(() => {
    if (!users) {
      return new Map();
    }

    // Use the extractData helper function
    const usersArray = extractData(users);
    const map = new Map(usersArray.map((user: any) => [user.id, user]));

    return map;
  }, [users]);

  const isLoading = activitiesLoading || activityTypesLoading || usersLoading;

  // Only process activities when all data is loaded
  const transformedActivities = useMemo(() => {
    // Don't process if any data is still loading
    if (isLoading) {
      return [];
    }

    if (!activities?.data || !activityTypeMap || !userMap) {
      return [];
    }

    return activities.data.map((activity: any) => {
      // Get the activity type using the activityTypeId from the activity
      const activityType = activityTypeMap.get(activity.activityTypeId);
      const user = userMap.get(activity.assignee);

      // Map activity type to icon key based on common patterns
      let iconKey = 'FiPhone'; // default
      if (activityType?.activityIcon) {
        // The activityType.activityIcon contains the icon name from the database
        // We need to match it with the constants in activityIcons.tsx
        const dbIconName = activityType.activityIcon;

        // Try to find a direct match first with our available icon constants
        if (dbIconName && typeof dbIconName === 'string') {
          // Check if the database icon name directly matches any of our constants
          const availableIconKeys = [
            'FiPhone',
            'FiMail',
            'FaHandHoldingHeart',
            'FiSettings',
            'FiUpload',
            'FaShare',
            'BsChatDots',
            'FiInfo',
            'FiBookOpen',
            'FiShoppingCart',
            'HiOutlineReceiptPercent',
            'FiHelpCircle',
            'IoTrendingUp',
            'FiThumbsUp',
            'FiPaperclip',
            'IoStatsChart',
            'FiSearch',
            'FiSun',
          ];

          // Try exact match first
          if (availableIconKeys.includes(dbIconName)) {
            iconKey = dbIconName;
          } else {
            // Try partial matching for common patterns
            const iconNameLower = dbIconName.toLowerCase();
            if (
              iconNameLower.includes('phone') ||
              iconNameLower.includes('call')
            ) {
              iconKey = 'FiPhone';
            } else if (
              iconNameLower.includes('email') ||
              iconNameLower.includes('mail')
            ) {
              iconKey = 'FiMail';
            } else if (
              iconNameLower.includes('support') ||
              iconNameLower.includes('heart')
            ) {
              iconKey = 'FaHandHoldingHeart';
            } else if (
              iconNameLower.includes('settings') ||
              iconNameLower.includes('gear')
            ) {
              iconKey = 'FiSettings';
            } else if (
              iconNameLower.includes('upload') ||
              iconNameLower.includes('up')
            ) {
              iconKey = 'FiUpload';
            } else if (
              iconNameLower.includes('share') ||
              iconNameLower.includes('send')
            ) {
              iconKey = 'FaShare';
            } else if (
              iconNameLower.includes('phone') ||
              iconNameLower.includes('call')
            ) {
              iconKey = 'FiPhone';
            } else if (
              iconNameLower.includes('chat') ||
              iconNameLower.includes('message')
            ) {
              iconKey = 'BsChatDots';
            } else if (
              iconNameLower.includes('info') ||
              iconNameLower.includes('information')
            ) {
              iconKey = 'FiInfo';
            } else if (
              iconNameLower.includes('book') ||
              iconNameLower.includes('learn')
            ) {
              iconKey = 'FiBookOpen';
            } else if (
              iconNameLower.includes('shopping') ||
              iconNameLower.includes('cart')
            ) {
              iconKey = 'FiShoppingCart';
            } else if (
              iconNameLower.includes('discount') ||
              iconNameLower.includes('receipt')
            ) {
              iconKey = 'HiOutlineReceiptPercent';
            } else if (
              iconNameLower.includes('help') ||
              iconNameLower.includes('question')
            ) {
              iconKey = 'FiHelpCircle';
            } else if (
              iconNameLower.includes('trend') ||
              iconNameLower.includes('growth')
            ) {
              iconKey = 'IoTrendingUp';
            } else if (
              iconNameLower.includes('like') ||
              iconNameLower.includes('thumbs')
            ) {
              iconKey = 'FiThumbsUp';
            } else if (
              iconNameLower.includes('paperclip') ||
              iconNameLower.includes('attachment')
            ) {
              iconKey = 'FiPaperclip';
            } else if (
              iconNameLower.includes('stats') ||
              iconNameLower.includes('analytics')
            ) {
              iconKey = 'IoStatsChart';
            } else if (
              iconNameLower.includes('search') ||
              iconNameLower.includes('find')
            ) {
              iconKey = 'FiSearch';
            } else if (
              iconNameLower.includes('sun') ||
              iconNameLower.includes('light')
            ) {
              iconKey = 'FiSun';
            }
          }
        }
      }

      return {
        id: activity.id,
        time: dayjs(activity.activityDate).format('HH:mm A'),
        title: activity.activityName,
        assignee: user ? formatUserName(user) : 'Unknown User',
        category: resolveActivityDealName(activity),
        priority:
          activity.priority.charAt(0).toUpperCase() +
          activity.priority.slice(1),
        type: iconKey, // Use the mapped icon key for display in timeline
        date: dayjs(activity.activityDate).format('DD MMM YYYY'),
        activityDate: activity.activityDate, // Keep original activityDate for color logic
        task: activity.task || '',
        isCompleted: activity.isCompleted,
        failed: activity.failed || false, // Use actual failed status from activity
        reason: activity.reason || '', // Add reason field
        // Additional fields for edit mode
        dealName: activity.dealId,
        dealId: activity.dealId, // Keep dealId for proper reference
        activityName: activity.activityName,
        responsiblePersons: activity.responsiblePersons || [], // Use responsiblePersons array for form field
        description: activity.description,
        activityTypeId: activity.activityTypeId, // Use activityTypeId for form field
        // Will be populated with documents in Timeline component
        attachments: [],
      };
    });
  }, [activities, activityTypeMap, userMap, isLoading]);

  const createActivityMutation = useCreateActivity();
  const updateActivityMutation = useUpdateActivity();

  const handleActivitySave = async (activityData: any) => {
    try {
      if (isEditMode && editingActivity) {
        // Update existing activity
        const updateData: UpdateActivityRequest = {
          id: editingActivity.id,
          dealId: activityData.dealName,
          activityName: activityData.activityName,
          activityDate: activityData.date
            ? activityData.date.toDate()
            : new Date(),
          description: activityData.description,
          isCompleted: activityData.isCompleted || false,
          failed: activityData.failed || false,
          assignee: activityData.assignee, // This will be set by the sidebar component
          priority: activityData.priority,
          activityTypeId: activityData.type,
          responsiblePersons: activityData.responsiblePersons || [],
          task: activityData.task || '',
          reason: activityData.reason || '',
        };

        await updateActivityMutation.mutateAsync(updateData);
        handleSuccessMessage('PATCH', 'Activity updated successfully!');
        setSidebarOpen(false);
      } else {
        // Create new activity
        const createData: CreateActivityRequest = {
          dealId: activityData.dealName,
          activityName: activityData.activityName,
          activityDate: activityData.date
            ? activityData.date.toDate()
            : new Date(),
          description: activityData.description,
          isCompleted: activityData.isCompleted || false,
          failed: activityData.failed || false,
          assignee: activityData.assignee, // This will be set by the sidebar component
          priority: activityData.priority,
          activityTypeId: activityData.type,
          responsiblePersons: activityData.responsiblePersons || [],
          task: activityData.task || '',
          reason: activityData.reason || '',
        };

        await createActivityMutation.mutateAsync(createData);
        handleSuccessMessage('POST', 'Activity created successfully!');
        setSidebarOpen(false);
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
      }
    }
  };

  const handleActivityClick = (activity: any) => {
    setEditingActivity(activity);
    setIsEditMode(true);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setIsEditMode(false);
    setEditingActivity(null);
  };
  return (
    <>
      <ConfigProvider theme={antdPageTheme}>
        <div>
          {/* Header */}
          <div className="mb-6 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  className="text-brand border-brand h-10 w-10"
                />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Deal Activity
                  </h1>
                  <p className="text-muted-foreground">
                    View and manage your deal activity
                  </p>
                </div>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="bg-brand hover:bg-brand text-brand-foreground h-10"
                onClick={() => {
                  setSidebarOpen(true);
                }}
              >
                Create Activity
              </Button>
            </div>

            <div className="flex justify-end mt-5">
              <div className="flex gap-2">
                <Dropdown
                  overlay={
                    <ActivityFilterModal
                      onFilter={handleFilter}
                      onReset={handleResetFilters}
                      onClose={() => setIsFilterOpen(false)}
                    />
                  }
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    icon={<LuSettings2 />}
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    style={{
                      color: tokens.color.blue,
                      borderColor: tokens.color.lightblue,
                      borderWidth: '1px',
                      height: '50px',
                    }}
                    className="flex items-center hover:bg-primary-muted h-10"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = tokens.color.blue;
                      e.currentTarget.style.borderColor = tokens.color.blue;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = tokens.color.blue;
                      e.currentTarget.style.borderColor =
                        tokens.color.lightblue;
                    }}
                  >
                    Filter
                  </Button>
                </Dropdown>
                <Dropdown
                  overlay={
                    <ActionDropdown onExport={handleExport} filters={filters} />
                  }
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    icon={<RiExchange2Line className="text-brand" size={20} />}
                    className="h-10 border-brand text-brand"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = tokens.color.blue;
                      e.currentTarget.style.borderColor = tokens.color.blue;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = tokens.color.blue;
                      e.currentTarget.style.borderColor =
                        tokens.color.lightblue;
                    }}
                  >
                    Action
                  </Button>
                </Dropdown>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-8">
            {isLoading ? (
              <ActivityTimelineSkeleton />
            ) : (
              <Timeline
                timelineData={transformedActivities}
                onActivityClick={handleActivityClick}
              />
            )}
          </div>
        </div>
      </ConfigProvider>
      <ActivitySideBar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        isEditMode={isEditMode}
        activityData={editingActivity}
        onSave={handleActivitySave}
        createActivity={createActivityMutation}
        updateActivity={updateActivityMutation}
      />
    </>
  );
}
