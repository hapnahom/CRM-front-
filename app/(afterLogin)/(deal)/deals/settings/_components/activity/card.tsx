import { Button, Modal, message } from 'antd';
import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useGetDealActivitiesTypes } from '@/store/server/features/deals/activity/query';
import { useDeleteActivityType } from '@/store/server/features/deals/settings/activitytype/mutation';
import { getIconByKey } from '@/utils/activityIcons';
import dealSettingsActivityStore from '@/store/uistate/features/deal/settings/activity';
import EditActivitySideBar from './editSideBar';

function ActivityTypeCard() {
  const { data: activityTypes, isLoading: isLoadingActivityTypes } =
    useGetDealActivitiesTypes();
  const { mutate: deleteActivityType } = useDeleteActivityType();

  const {
    editModalOpen,
    setEditModalOpen,
    currentActivity,
    setCurrentActivity,
    confirmDeleteModal,
    setConfirmDeleteModal,
    activityToDelete,
    setActivityToDelete,
  } = dealSettingsActivityStore();

  const handleEditActivity = (activity: any) => {
    setCurrentActivity(activity);
    setEditModalOpen(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    setActivityToDelete(activityId);
    setConfirmDeleteModal(true);
  };

  const confirmDelete = () => {
    if (activityToDelete) {
      deleteActivityType(
        { id: activityToDelete },
        {
          onSuccess: () => {
            message.success('Activity type deleted successfully');
            setConfirmDeleteModal(false);
          },
        },
      );
    }
  };

  if (isLoadingActivityTypes) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading activity types...
      </div>
    );
  }

  const activityCount = activityTypes?.length ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Activity Types
          </div>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            Define interactions your team can log against deals.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-brand-border bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand">
          {activityCount} activit{activityCount === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {!activityTypes || activityTypes.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border-strong bg-surface-card text-sm text-muted-foreground">
          No activity types found
        </div>
      ) : (
        <div className="-mx-4 -mb-4 divide-y divide-[#e5e7eb] border-t border-border">
          {activityTypes.map((activity: any, index: number) => {
            const iconData = getIconByKey(activity.activityIcon);
            const iconPalette = [
              'bg-brand-muted text-brand',
              'bg-success/10 text-success',
              'bg-[#fef3c7] text-[#d97706]',
              'bg-[#fce7f3] text-[#db2777]',
              'bg-[#ede9fe] text-[#7c3aed]',
              'bg-[#e0f2fe] text-[#0284c7]',
            ][index % 6];

            return (
              <div
                key={activity.id}
                className="group flex items-center gap-4 bg-surface-card px-4 py-3 transition-colors hover:bg-surface-elevated"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${iconPalette}`}
                >
                  {iconData?.icon || 'Activity'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {activity.name}
                  </div>
                  <p className="m-0 mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {activity.description || 'No description'}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    type="text"
                    icon={<Pencil size={14} />}
                    onClick={() => handleEditActivity(activity)}
                    className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-[#1f2937]"
                  />
                  <Button
                    type="text"
                    icon={<Trash2 size={14} />}
                    onClick={() => handleDeleteActivity(activity.id)}
                    className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditActivitySideBar
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTimeout(() => setCurrentActivity(null), 300);
        }}
        activity={currentActivity}
      />

      <Modal
        title="Confirm Delete"
        open={confirmDeleteModal}
        onOk={confirmDelete}
        onCancel={() => setConfirmDeleteModal(false)}
        cancelText="Cancel"
        okText="Remove Activity"
        okButtonProps={{
          className: 'bg-brand border-brand text-brand-foreground',
        }}
      >
        <p>Are you sure you want to delete this activity type?</p>
      </Modal>
    </div>
  );
}

export default ActivityTypeCard;
