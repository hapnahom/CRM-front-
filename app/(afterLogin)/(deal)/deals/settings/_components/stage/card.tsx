'use client';

import { Check, Edit2, GripVertical, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useGetDealStages } from '@/store/server/features/deals/settings/stage/query';
import {
  useDeleteStage,
  useUpdateStage,
} from '@/store/server/features/deals/settings/stage/mutation';
import dealSettingsStageStore from '@/store/uistate/features/deal/settings/stage';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NotificationMessage from '@/components/common/notification/notificationMessage';

import { DEALS_STAGE_COLOR_PRESETS } from '@/lib/stage-presets';
import { SettingsSplitPanelSkeleton } from '@/components/loading/skeleton-screens';

const colorPresets = DEALS_STAGE_COLOR_PRESETS.map((preset) => ({
  dot: preset.color,
  bg: preset.color,
  border: preset.borderColor,
}));

interface StageCardProps {
  onAddStage: () => void;
}

const StageCard = ({ onAddStage }: StageCardProps) => {
  const { data: stages, isLoading: isLoadingStages } = useGetDealStages();
  const { mutate: deleteStage } = useDeleteStage();
  const { mutate: updateStage } = useUpdateStage();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [agingDraftValue, setAgingDraftValue] = useState('4');
  const [agingSaved, setAgingSaved] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState<string>(colorPresets[0].dot);

  const {
    confirmDeleteModal,
    setConfirmDeleteModal,
    stageToDelete,
    setStageToDelete,
  } = dealSettingsStageStore();

  const orderedStages = useMemo(
    () =>
      Array.isArray(stages)
        ? [...stages].sort((a: any, b: any) => {
            const aLevel = Number(a.level ?? 0);
            const bLevel = Number(b.level ?? 0);
            return aLevel - bLevel;
          })
        : [],
    [stages],
  );

  const selectedStage =
    orderedStages.find((stage: any) => stage.id === selectedStageId) ??
    orderedStages[0];
  const selectedIndex = Math.max(
    0,
    orderedStages.findIndex((stage: any) => stage.id === selectedStage?.id),
  );
  const selectedPreset = colorPresets[selectedIndex % colorPresets.length];

  useEffect(() => {
    if (!selectedStageId && orderedStages[0]?.id) {
      setSelectedStageId(orderedStages[0].id);
    }
  }, [orderedStages, selectedStageId]);

  // Reset inline editing whenever the active stage changes.
  useEffect(() => {
    setIsEditing(false);
  }, [selectedStage?.id]);

  const handleEditToggle = () => {
    if (!selectedStage) return;
    if (!isEditing) {
      setDraftName(selectedStage.name ?? '');
      setDraftColor(
        selectedStage.colorCode ?? selectedPreset?.dot ?? colorPresets[0].dot,
      );
      setIsEditing(true);
      return;
    }

    const nextName = draftName.trim() || selectedStage.name;
    updateStage(
      {
        id: selectedStage.id,
        data: {
          name: nextName,
          level: Number(selectedStage.level ?? selectedIndex),
          description: selectedStage.description ?? '',
          colorCode: draftColor,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const handleDeleteStage = (stageId: string) => {
    setStageToDelete(stageId);
    setConfirmDeleteModal(true);
  };

  const confirmDelete = () => {
    if (stageToDelete) {
      deleteStage(stageToDelete, {
        onSuccess: () => {
          NotificationMessage.success({
            message: 'Stage deleted successfully',
          });
          setConfirmDeleteModal(false);
        },
        onError: (error: any) => {
          if (error?.message?.includes('Stage is being used by deals')) {
            setConfirmDeleteModal(false);
          }
        },
      });
    }
  };

  const saveAgingThreshold = () => {
    setAgingSaved(true);
    setTimeout(() => setAgingSaved(false), 2000);
  };

  const positionValue = `${selectedIndex + 1} - ${
    selectedIndex === 0
      ? 'Beginning'
      : `After ${orderedStages[selectedIndex - 1]?.name ?? 'previous stage'}`
  }`;

  if (isLoadingStages) {
    return <SettingsSplitPanelSkeleton />;
  }

  if (!selectedStage) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border-strong bg-surface-card text-sm text-muted-foreground">
        No stages found. Create your first stage.
      </div>
    );
  }

  return (
    <div className="flex items-start gap-5">
      <div className="flex w-[326px] shrink-0 flex-col gap-1.5">
        {orderedStages.map((stage: any, index: number) => {
          const preset = colorPresets[index % colorPresets.length];
          const isSelected = selectedStage.id === stage.id;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setSelectedStageId(stage.id)}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                isSelected
                  ? 'border-brand bg-brand-muted'
                  : 'border-border bg-surface-card hover:border-border-strong hover:bg-surface-elevated',
              )}
            >
              <GripVertical
                size={13}
                className="shrink-0 text-muted-foreground"
              />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                style={{ borderColor: preset.dot }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                {stage.name}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {stage.dealsCount ?? stage.dealCount ?? stage.count ?? 0}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddStage}
          className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border-strong py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated hover:text-foreground"
        >
          <Plus size={13} />
          Add Stage
        </button>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <span
            className={cn(
              'h-3 w-3 shrink-0 rounded-full border-2',
              selectedPreset?.bg,
              selectedPreset?.border,
            )}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold text-foreground">
              {selectedStage.name}
            </h3>
            <p className="m-0 mt-0.5 text-xs text-muted-foreground">
              Open Stage
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-[13px]',
                isEditing
                  ? 'border-success/40 text-success hover:bg-success/10 hover:text-success'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              onClick={handleEditToggle}
            >
              {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
              {isEditing ? 'Confirm' : 'Edit'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDeleteStage(selectedStage.id)}
              title="Delete stage"
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stage Name
            </label>
            <Input
              value={isEditing ? draftName : selectedStage.name}
              onChange={(event) => setDraftName(event.target.value)}
              readOnly={!isEditing}
              className={cn(
                'h-10 border-border bg-surface-card text-sm',
                !isEditing && 'text-muted-foreground',
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Color
            </label>
            <div className="flex items-center gap-2">
              {colorPresets.map((preset, index) => {
                const isActive = isEditing
                  ? draftColor === preset.dot
                  : index === selectedIndex % colorPresets.length;
                return (
                  <button
                    key={preset.dot}
                    type="button"
                    disabled={!isEditing}
                    onClick={() => setDraftColor(preset.dot)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform',
                      isActive ? 'border-foreground' : 'border-transparent',
                      isEditing
                        ? 'cursor-pointer hover:scale-110'
                        : 'cursor-default',
                    )}
                    style={{ backgroundColor: preset.dot }}
                    aria-label={`Select color ${preset.dot}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Position In Pipeline
            </label>
            <Select value={positionValue} disabled>
              <SelectTrigger className="h-10 w-full border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={positionValue}>{positionValue}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-border pt-5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pipeline Behaviour
            </label>
            <div className="mt-4">
              <div className="text-sm font-medium text-foreground">
                Aging alert threshold
              </div>
              <p className="m-0 mt-1 text-xs text-muted-foreground">
                Flag deals as &quot;stuck&quot; when they remain in the same
                stage longer than this many days.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={agingDraftValue}
                  onChange={(event) => setAgingDraftValue(event.target.value)}
                  className="h-10 w-[88px] border-border"
                />
                <span className="text-sm text-foreground">days</span>
                <Button
                  type="button"
                  onClick={saveAgingThreshold}
                  className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Save
                </Button>
                <span className="text-xs text-muted-foreground">
                  Current:{' '}
                  <strong className="text-foreground">
                    {agingDraftValue}d
                  </strong>
                </span>
                {agingSaved && (
                  <span className="text-xs font-medium text-success">
                    Saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={confirmDeleteModal} onOpenChange={setConfirmDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stage?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={confirmDelete}
            >
              Remove Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StageCard;
