'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateActivityType } from '@/store/server/features/deals/settings/activitytype/mutation';
import {
  activityIcons,
  getDefaultIcon,
  getIconByKey,
} from '@/utils/activityIcons';

interface SideBarProps {
  open: boolean;
  onClose: () => void;
}

type ActivityDraft = {
  name: string;
  description: string;
  icon: string;
};

const EMPTY_DRAFT: ActivityDraft = {
  name: '',
  description: '',
  icon: getDefaultIcon().key,
};

function ActivitySideBar({ open, onClose }: SideBarProps) {
  const { mutate: createActivityType } = useCreateActivityType();
  const [draft, setDraft] = useState<ActivityDraft>(EMPTY_DRAFT);

  const resetAndClose = () => {
    setDraft(EMPTY_DRAFT);
    onClose();
  };

  const handleCreateActivityType = () => {
    if (!draft.name.trim()) return;

    createActivityType(
      {
        data: {
          name: draft.name.trim(),
          description: draft.description,
          activityIcon: draft.icon,
          isDeal: true,
        },
      },
      {
        onSuccess: () => {
          resetAndClose();
        },
      },
    );
  };

  const selectedIcon = getIconByKey(draft.icon) ?? getDefaultIcon();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetAndClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Activity Type</DialogTitle>
          <DialogDescription>
            Define a new activity your team can log against deals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Activity Name
            </label>
            <Input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="e.g. Call, Meeting, Email"
              className="h-9 border-border bg-surface-card text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <Textarea
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Briefly describe when this activity is used"
              rows={3}
              className="resize-none border-border bg-surface-card text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Icon
            </label>
            <Select
              value={draft.icon}
              onValueChange={(value) => setDraft({ ...draft, icon: value })}
            >
              <SelectTrigger className="h-9 border-border bg-surface-card">
                <div className="flex items-center gap-2">
                  <span className="text-brand">{selectedIcon.icon}</span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {activityIcons.map((icon) => (
                  <SelectItem key={icon.key} value={icon.key}>
                    <span className="inline-flex items-center gap-2">
                      {icon.icon}
                      {icon.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={handleCreateActivityType}
          >
            Add Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ActivitySideBar;
