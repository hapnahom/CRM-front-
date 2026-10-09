'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Settings, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useGetActivityTypes,
  useCreateActivityType,
  useUpdateActivityType,
  useDeleteActivityType,
} from '@/store/server/features/leads/activity-types';
import {
  activityIcons,
  defaultActivityIcon,
  getIconByKey,
} from '@/utils/activityIcons';
import { useLeadSettingsStore } from '@/store/uistate/features/leads/settings';

interface LeadActivity {
  activityTypeId?: string;
  id?: string;
  name: string;
  activityIcon?: string;
  icon?: string;
  description?: string;
  isLead: boolean;
  isDeal: boolean;
}

export const ActivitySettings: React.FC = () => {
  const pathname = usePathname();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>(defaultActivityIcon);
  const [nameError, setNameError] = useState('');

  // Zustand store
  const {
    isDrawerVisible,
    deleteModalVisible,
    editingItem,
    itemToDelete,
    isSubmitting,
    iconPickerOpen,
    openDrawer,
    closeDrawer,
    setEditingItem,
    openDeleteModal,
    closeDeleteModal,
    setSubmitting,
    toggleIconPicker,
    closeIconPicker,
  } = useLeadSettingsStore();

  // API hooks
  const {
    data: leadActivities = [],
    isLoading,
    error,
  } = useGetActivityTypes() as {
    data: LeadActivity[];
    isLoading: boolean;
    error: any;
  };
  const createActivityType = useCreateActivityType();
  const updateActivityType = useUpdateActivityType();
  const deleteActivityType = useDeleteActivityType();

  useEffect(() => {
    if (isDrawerVisible && editingItem) {
      setName(editingItem.name || '');
      setDescription((editingItem as LeadActivity).description || '');
      setIcon(
        (editingItem as LeadActivity).activityIcon ||
          (editingItem as LeadActivity).icon ||
          defaultActivityIcon,
      );
      setNameError('');
    }
  }, [isDrawerVisible, editingItem]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon(defaultActivityIcon);
    setNameError('');
  };

  const handleDrawerClose = () => {
    closeDrawer();
    resetForm();
  };

  const handleAddNew = () => {
    setEditingItem(null);
    resetForm();
    openDrawer();
  };

  const handleEdit = (activity: LeadActivity) => {
    setEditingItem(activity as any);
    openDrawer();
  };

  const handleDeleteClick = (activity: LeadActivity) => {
    openDeleteModal(activity as any);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        const activityId = getActivityId(itemToDelete as any);

        if (!activityId) {
          toast.error('Activity ID is missing');
          return;
        }

        await deleteActivityType.mutateAsync(activityId);
        toast.success('Lead activity deleted successfully');
        closeDeleteModal();
      } catch (error) {
        toast.error('Failed to delete activity');
      }
    }
  };

  const handleDeleteCancel = () => {
    closeDeleteModal();
  };

  const handleIconSelect = (iconKey: string) => {
    setIcon(iconKey);
    closeIconPicker();
  };

  const validate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please enter activity name');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 50) {
      setNameError('Name cannot exceed 50 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    try {
      setSubmitting(true);

      const isLead = pathname.startsWith('/leads');
      const isDeal = !isLead;

      if (!icon) {
        toast.error('Please select an icon');
        return;
      }

      if (editingItem) {
        // Update existing
        const activityId = getActivityId(editingItem as any);

        if (!activityId) {
          toast.error('Activity ID is missing for update');
          return;
        }

        const updateData = {
          id: activityId,
          data: {
            name,
            description,
            activityIcon: icon,
            isLead,
            isDeal,
          },
        };
        await updateActivityType.mutateAsync(updateData);
        toast.success('Lead activity updated successfully');
      } else {
        // Create new
        const createData = {
          name,
          description,
          activityIcon: icon,
          isLead,
          isDeal,
        };
        await createActivityType.mutateAsync(createData);
        toast.success('Lead activity created successfully');
      }
      handleDrawerClose();
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getIconComponent = (iconKey: string) => {
    const iconObj = getIconByKey(iconKey);
    return iconObj ? iconObj.icon : <Settings className="h-4 w-4" />;
  };

  const getActivityId = (activity: LeadActivity): string | undefined => {
    return activity.activityTypeId || activity.id;
  };

  const IconPickerContent = () => (
    <div className="p-2">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-foreground text-center">
          Select Icon For Activity
        </h3>
      </div>
      <div className="grid grid-cols-6 gap-1 w-full">
        {activityIcons.map((iconObj) => {
          const isSelected = icon === iconObj.key;
          return (
            <button
              key={iconObj.key}
              type="button"
              className={`w-8 h-8 rounded-md border-2 transition-all duration-200 flex items-center justify-center text-sm font-semibold ${
                isSelected
                  ? 'border-primary ring-1 ring-primary/20 bg-surface-card text-foreground shadow-sm'
                  : 'border-border hover:border-border hover:bg-surface-elevated text-foreground'
              }`}
              onClick={() => handleIconSelect(iconObj.key)}
              title={iconObj.label}
            >
              {iconObj.icon}
            </button>
          );
        })}
      </div>
    </div>
  );

  const submitting =
    isSubmitting ||
    createActivityType.isLoading ||
    updateActivityType.isLoading;

  return (
    <div className="space-y-4" data-cy="activity-settings-container">
      {/* Header with Create Button */}
      <div
        className="flex justify-end -mt-10"
        data-cy="activity-settings-header"
      >
        <Button
          onClick={handleAddNew}
          data-cy="create-lead-activity-btn"
          className="font-md bg-brand text-brand-foreground hover:bg-brand-hover h-10 lg:px-4 px-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden lg:inline">Create Lead Activity</span>
        </Button>
      </div>
      {isLoading && (
        <div className="text-center py-8" data-cy="activity-settings-loading">
          <div className="text-muted-foreground">Loading activities...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-8" data-cy="activity-settings-error">
          <div className="text-red-500">Failed to load activities</div>
        </div>
      )}

      <div className="grid gap-4" data-cy="activity-settings-cards">
        {leadActivities.map((activity) => (
          <Card
            key={getActivityId(activity)}
            className="shadow-sm rounded-lg ring-1 ring-black/5"
            data-cy={`activity-card-${getActivityId(activity)}`}
          >
            <div className="flex justify-between items-center px-5 py-2.5">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 text-muted-foreground text-lg"
                  data-cy={`activity-icon-${getActivityId(activity)}`}
                >
                  {getIconComponent(
                    activity.activityIcon ||
                      activity.icon ||
                      defaultActivityIcon,
                  )}
                </div>
                <div>
                  <h5
                    className="text-sm font-semibold text-foreground m-0"
                    data-cy={`activity-name-${getActivityId(activity)}`}
                  >
                    {activity.name}
                  </h5>
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                data-cy={`activity-actions-${getActivityId(activity)}`}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(activity)}
                  className="text-muted-foreground hover:text-foreground"
                  data-cy={`edit-activity-btn-${getActivityId(activity)}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteClick(activity)}
                  className="text-muted-foreground hover:text-red-600"
                  data-cy={`delete-activity-btn-${getActivityId(activity)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Drawer */}
      <Sheet
        open={isDrawerVisible}
        onOpenChange={(open) => {
          if (!open) handleDrawerClose();
        }}
      >
        <SheetContent
          className="w-full sm:max-w-md"
          data-cy="activity-settings-drawer"
        >
          <SheetHeader data-cy="activity-drawer-title">
            <SheetTitle>Lead Activity</SheetTitle>
            <SheetDescription>
              {editingItem ? 'Edit lead Activity' : 'Create a lead Activity'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex-1 overflow-y-auto px-6 py-4"
            data-cy="activity-settings-form"
          >
            <div className="space-y-6">
              {/* Name Field with Icon Picker */}
              <div className="space-y-2" data-cy="activity-name-form-item">
                <Label className="text-foreground">
                  Name <span className="text-[#ff4d4f]">*</span>
                </Label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Activity Name"
                      maxLength={50}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      data-cy="activity-name-input"
                    />
                    {nameError && (
                      <p className="mt-1 text-xs text-[#ff4d4f]">{nameError}</p>
                    )}
                  </div>
                  <Popover
                    open={iconPickerOpen}
                    onOpenChange={(open) => {
                      if (open) {
                        if (!iconPickerOpen) {
                          toggleIconPicker();
                        }
                      } else {
                        closeIconPicker();
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="border border-brand text-brand hover:bg-primary-muted"
                        data-cy="activity-icon-picker-btn"
                      >
                        <LayoutGrid className="h-5 w-5 text-brand" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-auto p-0"
                      data-cy="activity-icon-picker"
                    >
                      <IconPickerContent />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Activity Description Field */}
              <div
                className="space-y-2"
                data-cy="activity-description-form-item"
              >
                <Label className="text-foreground">Activity Description</Label>
                <Textarea
                  placeholder="Description"
                  rows={3}
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-cy="activity-description-input"
                />
              </div>
            </div>
          </form>

          <SheetFooter
            className="flex-row justify-center gap-4"
            data-cy="activity-drawer-footer"
          >
            <Button
              className="font-md bg-brand text-brand-foreground hover:bg-brand-hover h-10 px-6"
              disabled={submitting}
              onClick={handleSubmit}
              data-cy="activity-drawer-submit-btn"
            >
              {submitting && (
                <Spinner className="size-4 text-brand-foreground" />
              )}
              {editingItem ? 'Update Activity' : 'Create Activity'}
            </Button>
            <Button
              variant="outline"
              className="font-md border-brand text-brand h-10 px-6"
              onClick={handleDrawerClose}
              data-cy="activity-drawer-cancel-btn"
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalVisible}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[400px]"
          data-cy="delete-activity-modal"
        >
          <DialogHeader>
            <DialogTitle>Remove Activity</DialogTitle>
          </DialogHeader>
          <p
            className="text-foreground"
            data-cy="delete-activity-modal-message"
          >
            Are you sure you want to delete this Lead Activity?
          </p>
          <DialogFooter
            className="flex-row justify-center gap-4"
            data-cy="delete-activity-modal-footer"
          >
            <Button
              variant="outline"
              className="font-md border-brand text-brand h-10"
              onClick={handleDeleteCancel}
              data-cy="delete-activity-modal-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              className="font-md bg-brand text-brand-foreground hover:bg-brand-hover h-10"
              onClick={handleDeleteConfirm}
              data-cy="delete-activity-modal-confirm-btn"
            >
              Remove Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
