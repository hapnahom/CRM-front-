'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Paintbrush } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SettingsListTableSkeleton } from '@/components/loading/skeleton-screens';
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
  useCreateEngagementStage,
  useUpdateEngagementStage,
  useDeleteEngagementStage,
} from '@/store/server/features/leads/engagement-stage/mutation';
import { useGetEngagementStages as useGetEngagementStagesQuery } from '@/store/server/features/leads/engagement-stage/queries';
import { colorPalette, defaultLeadStatusColor } from '@/utils/colors';
import { useLeadSettingsStore } from '@/store/uistate/features/leads/settings';

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export const LeadStatusSettings: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(defaultLeadStatusColor);
  const [level, setLevel] = useState('');
  const [nameError, setNameError] = useState('');
  const [levelError, setLevelError] = useState('');

  // Zustand store
  const {
    isDrawerVisible,
    deleteModalVisible,
    editingItem,
    itemToDelete,
    isSubmitting,
    colorPickerOpen,
    openDrawer,
    closeDrawer,
    setEditingItem,
    openDeleteModal,
    closeDeleteModal,
    setSubmitting,
    toggleColorPicker,
    closeColorPicker,
  } = useLeadSettingsStore();

  // API hooks
  const {
    data: engagementStagesData,
    isLoading,
    error,
    refetch,
  } = useGetEngagementStagesQuery();
  const createMutation = useCreateEngagementStage();
  const updateMutation = useUpdateEngagementStage();
  const deleteMutation = useDeleteEngagementStage();

  // Effect to set form values when editing
  useEffect(() => {
    if (editingItem && isDrawerVisible) {
      setName(editingItem.name || '');
      setDescription((editingItem as LeadStatus).description || '');
      setColor((editingItem as LeadStatus).color || defaultLeadStatusColor);
      setNameError('');
      setLevelError('');
    }
  }, [editingItem, isDrawerVisible]);

  // Transform API data to match UI structure
  let leadStatuses: LeadStatus[] = [];

  if (engagementStagesData) {
    // Handle different possible response structures
    if (Array.isArray(engagementStagesData)) {
      leadStatuses = engagementStagesData.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        color: stage.colorCode,
        description: stage.description,
      }));
    } else if (
      typeof engagementStagesData === 'object' &&
      engagementStagesData !== null
    ) {
      const data = (engagementStagesData as any).data;
      const results = (engagementStagesData as any).results;

      if (data && Array.isArray(data)) {
        // If response is wrapped in a data property
        leadStatuses = data.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          color: stage.colorCode,
          description: stage.description,
        }));
      } else if (results && Array.isArray(results)) {
        // If response is wrapped in a results property
        leadStatuses = results.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          color: stage.colorCode,
          description: stage.description,
        }));
      }
    }
  }

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(defaultLeadStatusColor);
    setLevel('');
    setNameError('');
    setLevelError('');
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

  const handleEdit = (status: LeadStatus) => {
    setEditingItem(status);
    openDrawer();
  };

  const handleDeleteClick = (status: LeadStatus) => {
    openDeleteModal(status);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        toast.success('Lead status deleted successfully');

        // Refetch the data to show the updated list immediately
        await refetch();

        closeDeleteModal();
      } catch (error) {
        toast.error('Failed to delete lead status');
      }
    }
  };

  const handleDeleteCancel = () => {
    closeDeleteModal();
  };

  const handleColorSelect = (selectedColor: string) => {
    setColor(selectedColor);
    closeColorPicker();
  };

  const validate = () => {
    let isValid = true;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please enter status name');
      isValid = false;
    } else if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    } else if (trimmed.length > 50) {
      setNameError('Name cannot exceed 50 characters');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!editingItem) {
      if (level === undefined || level === null || level === '') {
        setLevelError('Please enter level');
        isValid = false;
      } else {
        const numValue = Number(level);
        if (isNaN(numValue)) {
          setLevelError('Level must be a number');
          isValid = false;
        } else if (numValue < 1) {
          setLevelError('Level must be at least 1');
          isValid = false;
        } else if (numValue > 10) {
          setLevelError('Level cannot exceed 10');
          isValid = false;
        } else {
          setLevelError('');
        }
      }
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    try {
      setSubmitting(true);

      if (editingItem) {
        // Update existing
        await updateMutation.mutateAsync({
          engagementStageId: editingItem.id,
          data: {
            name,
            description,
            level: 1, // Default level
            colorCode: color,
          },
        });
        toast.success('Lead status updated successfully');
      } else {
        // Create new
        await createMutation.mutateAsync({
          name,
          description,
          level: Number(level), // Convert to number
          colorCode: color,
        });
        toast.success('Lead status created successfully');
      }

      // Refetch the data to show the updated list immediately
      await refetch();
      handleDrawerClose();
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Color picker content component matching the image design exactly
  const ColorPickerContent = () => (
    <div className="p-2">
      <div className="text-xs font-semibold text-foreground mb-2 text-center">
        Color Picker
      </div>
      <div className="grid grid-cols-5 gap-1 w-full">
        {colorPalette.map((paletteColor) => (
          <button
            key={paletteColor}
            type="button"
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: paletteColor }}
            onClick={() => handleColorSelect(paletteColor)}
            title={`Select ${paletteColor}`}
          />
        ))}
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return <SettingsListTableSkeleton rows={6} />;
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error loading lead statuses</div>
        <div className="text-muted-foreground text-sm">
          Please try refreshing the page
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-cy="lead-status-settings-container">
      {/* Header with Create Button */}
      <div
        className="flex justify-end -mt-10"
        data-cy="lead-status-settings-header"
      >
        <Button
          onClick={handleAddNew}
          className="font-md bg-brand text-brand-foreground hover:bg-brand-hover h-10 lg:px-4 px-2"
          data-cy="create-lead-status-btn"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden lg:inline">Create Lead Status</span>
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4" data-cy="lead-status-settings-cards">
        {leadStatuses.map((status) => (
          <Card
            key={status.id}
            className="shadow-sm rounded-lg ring-1 ring-black/5"
            style={{ borderLeft: `6px solid ${status.color}` }}
            data-cy={`status-card-${status.id}`}
          >
            <div className="flex justify-between items-center px-5 py-2.5">
              <div className="flex items-center gap-3">
                <div>
                  <h5
                    className="text-sm font-semibold text-foreground m-0"
                    data-cy={`status-name-${status.id}`}
                  >
                    {status.name}
                  </h5>
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                data-cy={`status-actions-${status.id}`}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(status)}
                  className="text-muted-foreground hover:text-foreground"
                  data-cy={`edit-status-btn-${status.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteClick(status)}
                  className="text-muted-foreground hover:text-red-600"
                  data-cy={`delete-status-btn-${status.id}`}
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
          data-cy="lead-status-settings-drawer"
        >
          <SheetHeader data-cy="status-drawer-title">
            <SheetTitle>
              {editingItem ? 'Edit Lead Status' : 'Create Lead Status'}
            </SheetTitle>
            <SheetDescription>
              {editingItem
                ? 'Update the lead status details'
                : 'Create a new lead status'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex-1 overflow-y-auto px-6 py-4"
            data-cy="lead-status-settings-form"
          >
            <div className="space-y-6">
              {/* Name Field with Color Picker */}
              <div className="space-y-2" data-cy="status-name-form-item">
                <Label className="text-foreground">
                  Name <span className="text-[#ff4d4f]">*</span>
                </Label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Status Name"
                      maxLength={50}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      data-cy="status-name-input"
                    />
                    {nameError && (
                      <p className="mt-1 text-xs text-[#ff4d4f]">{nameError}</p>
                    )}
                  </div>
                  <Popover
                    open={colorPickerOpen}
                    onOpenChange={(open) => {
                      if (open) {
                        if (!colorPickerOpen) toggleColorPicker();
                      } else {
                        closeColorPicker();
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        style={{ borderColor: color }}
                        data-cy="status-color-picker-btn"
                      >
                        <Paintbrush className="h-4 w-4" style={{ color }} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-auto p-0"
                      data-cy="status-color-picker"
                    >
                      <ColorPickerContent />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Level Field - Only visible when creating new status */}
              {!editingItem && (
                <div className="space-y-2" data-cy="status-level-form-item">
                  <Label className="text-foreground">
                    Level <span className="text-[#ff4d4f]">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter level (1-10)"
                    min={1}
                    max={10}
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value);
                      if (levelError) setLevelError('');
                    }}
                    data-cy="status-level-input"
                  />
                  {levelError && (
                    <p className="text-xs text-[#ff4d4f]">{levelError}</p>
                  )}
                </div>
              )}

              {/* Status Description Field */}
              <div className="space-y-2" data-cy="status-description-form-item">
                <Label className="text-foreground">Status Description</Label>
                <Textarea
                  placeholder="Description"
                  rows={3}
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-cy="status-description-input"
                />
              </div>
            </div>
          </form>

          <SheetFooter
            className="flex-row justify-center gap-4"
            data-cy="status-drawer-footer"
          >
            <Button
              className="font-md bg-brand text-brand-foreground hover:bg-brand-hover h-10 px-6"
              disabled={isSubmitting}
              onClick={handleSubmit}
              data-cy="status-drawer-submit-btn"
            >
              {isSubmitting
                ? 'Saving…'
                : editingItem
                  ? 'Update Status'
                  : 'Create Status'}
            </Button>
            <Button
              variant="outline"
              className="font-md border-brand text-brand h-10 px-6"
              onClick={handleDrawerClose}
              data-cy="status-drawer-cancel-btn"
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal - Matching the image design exactly */}
      <Dialog
        open={deleteModalVisible}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[400px]"
          data-cy="delete-status-modal"
        >
          <DialogHeader>
            <DialogTitle>Remove Status</DialogTitle>
          </DialogHeader>
          <p className="text-foreground" data-cy="delete-status-modal-message">
            Are you sure you want to delete this Lead Status?
          </p>
          <DialogFooter
            className="flex-row justify-center gap-4"
            data-cy="delete-status-modal-footer"
          >
            <Button
              variant="outline"
              className="font-md border-brand text-brand h-10"
              onClick={handleDeleteCancel}
              data-cy="delete-status-modal-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              className="font-md bg-brand text-brand-foreground hover:bg-brand-hover h-10"
              onClick={handleDeleteConfirm}
              data-cy="delete-status-modal-confirm-btn"
            >
              Remove Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
