'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCreateCommunicationTask } from '@/store/server/features/communication/mutations';
import type { TodoTaskType } from '@/modules/communication/data/mockData';
import type { Partner, PartnerActivity } from '../types';

export interface PartnerTaskInput {
  title: string;
  description?: string;
  activityType: PartnerActivity['type'];
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm — when set the task is timed, otherwise all-day. */
  time?: string;
}

function taskTypeFor(type: PartnerActivity['type']): TodoTaskType {
  if (type === 'Call') return 'call';
  if (type === 'Meeting' || type === 'QBR') return 'meeting';
  return 'task';
}

/**
 * Creates a Productivity (Communication → Tasks) task for a partner
 * activity, so scheduled partner work shows up in the user's task list.
 */
export function usePartnerProductivityTask(partner: Partner) {
  const createTask = useCreateCommunicationTask();

  const createPartnerTask = useCallback(
    async (input: PartnerTaskInput) => {
      const day = input.date.slice(0, 10);
      const time = input.time?.trim();
      const timed = Boolean(time && /^\d{2}:\d{2}$/.test(time));
      try {
        await createTask.mutateAsync({
          title: `${input.title} — ${partner.name}`,
          description: input.description || undefined,
          taskType: taskTypeFor(input.activityType),
          priority: input.activityType === 'QBR' ? 'high' : 'medium',
          dueAt: timed ? `${day}T${time}:00` : `${day}T00:00:00.000Z`,
          dueIsAllDay: !timed,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tags: ['Partner', partner.name, input.activityType],
        });
        toast.success('Added to Productivity tasks');
      } catch {
        toast.error(
          'Activity saved, but the Productivity task could not be created',
        );
      }
    },
    [createTask, partner.name],
  );

  return { createPartnerTask, isCreatingTask: createTask.isLoading };
}
