import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { formatUserName } from '@/lib/format-user-name';
import dayjs, { Dayjs } from 'dayjs';
import {
  useCreateActivity,
  useUpdateActivity,
} from '@/store/server/features/leads/activity/mutations';
import { useGetActivityTypes } from '@/store/server/features/leads/activity-types/queries';
import { usePipelineLeadOptions } from '@/store/server/features/leads/pipeline/queries';
import { useGetUsers } from '@/store/server/features/leads/users/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { toast } from 'sonner';
//import StatusIndicator from '../statusIndicator';

interface PersonOption {
  value: string;
  label: string;
}

// Multi-select for responsible persons (replaces antd Select mode="multiple")
const PersonMultiSelect: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  options: PersonOption[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = (options || []).filter((o) =>
    (o.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const selectedLabels = (options || [])
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  const toggle = (val: string, checked: boolean) => {
    if (checked) {
      onChange([...value, val]);
    } else {
      onChange(value.filter((v) => v !== val));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-surface-card py-2 pr-2 pl-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span
            className={
              selectedLabels.length ? 'line-clamp-1' : 'text-muted-foreground'
            }
          >
            {selectedLabels.length
              ? selectedLabels.join(', ')
              : placeholder || 'Select'}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-9 bg-surface-card"
          />
        </div>
        <div className="max-h-60 overflow-auto pb-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results
            </div>
          ) : (
            filtered.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-accent"
              >
                <Checkbox
                  checked={value.includes(o.value)}
                  onCheckedChange={(checked) => toggle(o.value, !!checked)}
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface SideBarProps {
  open: boolean;
  onClose: () => void;
  activity?: any;
  isEditMode?: boolean;
  activityData?: any;
  onSave?: (data: any) => void;
  createActivity?: any;
  updateActivity?: any;
  preSelectedLeadId?: string; // New prop for pre-selected lead
  hideLeadDropdown?: boolean; // New prop to hide lead dropdown
  leadData?: any; // New prop for lead data (name, etc.)
}

function ActivitySideBar({
  open,
  onClose,
  activity,
  isEditMode = false,
  activityData,
  preSelectedLeadId,
  hideLeadDropdown = false,
  leadData,
}: SideBarProps) {
  // eslint-disable-next-line
  const createLeadActivity = useCreateActivity();
  // eslint-disable-next-line
  const updateLeadActivity = useUpdateActivity();
  // eslint-disable-next-line
  const { data: activityTypes } = useGetActivityTypes();
  const [leadSearch, setLeadSearch] = useState('');
  const [debouncedLeadSearch, setDebouncedLeadSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedLeadSearch(leadSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [leadSearch]);

  const { leadOptions } = usePipelineLeadOptions({
    search: debouncedLeadSearch,
    pageSize: 25,
    enabled: open && !hideLeadDropdown,
  });
  const { data: users } = useGetUsers();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  // Form field state (replaces antd Form)
  const [leadName, setLeadName] = useState<string | undefined>(undefined);
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [activityName, setActivityName] = useState<string>('');
  const [responsiblePersons, setResponsiblePersons] = useState<string[]>([]);
  const [type, setType] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<string | undefined>(undefined);
  const [time, setTime] = useState<Dayjs | null>(null);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [description, setDescription] = useState<string>('');
  const [reason, setReason] = useState<string>('');

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

  const findLeadName = (id?: string) =>
    leadOptions.find((lead) => lead.id === id)?.name;

  // UUID validation function
  const isValidUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const peopleOptions: PersonOption[] = safeUsers?.map((i: any) => ({
    value: i.id,
    label: formatUserName(i),
  }));

  const resetFields = () => {
    setLeadName(undefined);
    setLeadId(undefined);
    setActivityName('');
    setResponsiblePersons([]);
    setType(undefined);
    setPriority(undefined);
    setTime(null);
    setDate(null);
    setDescription('');
    setReason('');
  };

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
      let dateValue: Dayjs | null = null;
      let timeValue: Dayjs | null = null;

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

      // Handle responsible persons structure from backend
      let nextResponsiblePersons: string[] = [];
      if (
        currentActivity.responsiblePersons &&
        Array.isArray(currentActivity.responsiblePersons)
      ) {
        // Backend returns array of objects with userId property
        nextResponsiblePersons = currentActivity.responsiblePersons
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
        nextResponsiblePersons = currentActivity.responsiblePerson;
      }

      // When hideLeadDropdown is true, set the lead name to the actual name, not the UUID
      const leadNameToSet = hideLeadDropdown
        ? leadData?.name ||
          findLeadName(preSelectedLeadId || currentActivity.leadId) ||
          'Current Lead'
        : preSelectedLeadId ||
          currentActivity.leadId ||
          currentActivity.leadName;

      setLeadName(leadNameToSet);
      setLeadId(preSelectedLeadId || currentActivity.leadId);
      setActivityName(currentActivity.activityName || '');
      setResponsiblePersons(nextResponsiblePersons);
      setType(currentActivity.activityTypeId || currentActivity.type);
      setPriority(currentActivity.priority);
      setDescription(currentActivity.description || currentActivity.task || '');
      setDate(dateValue);
      setTime(timeValue);
      setReason(currentActivity.reason || '');

      setIsCompleted(currentActivity.isCompleted || false);
      setIsFailed(currentActivity.failed || false);
    } else if (!currentActivity && open) {
      // Reset form when creating new activity
      resetFields();
      setIsCompleted(false);
      setIsFailed(false);
      // Set pre-selected lead if provided
      if (preSelectedLeadId) {
        // When hideLeadDropdown is true, set the lead name to the actual name, not the UUID
        const leadNameToSet = hideLeadDropdown
          ? leadData?.name || findLeadName(preSelectedLeadId) || 'Current Lead'
          : preSelectedLeadId;

        setLeadName(leadNameToSet);
        setLeadId(preSelectedLeadId);
      }
    }
  }, [
    activity?.id,
    activityData?.id,
    open,
    hideLeadDropdown,
    preSelectedLeadId,
    // Use stable references to prevent infinite loops
    leadOptions.length,
    leadData?.id,
    leadData?.name,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleCreateLeadActivity = () => {
    const values = {
      leadName,
      leadId,
      activityName,
      responsiblePersons,
      type,
      priority,
      description,
      reason,
      date,
      time,
    };

    // Validate required fields
    if (!values.responsiblePersons || values.responsiblePersons.length === 0) {
      toast.error('Please select at least one responsible person');
      return;
    }

    const resolvedLeadId = values.leadId || values.leadName;
    if (!resolvedLeadId) {
      toast.error('Please select a lead');
      return;
    }

    // Check if values are undefined or null
    if (values.leadName === 'undefined' || values.leadName === null) {
      toast.error('Please select a valid lead');
      return;
    }

    if (resolvedLeadId === 'undefined' || resolvedLeadId === null) {
      toast.error('Please select a valid lead');
      return;
    }

    // Validate lead ID
    if (!isValidUUID(resolvedLeadId)) {
      toast.error('Invalid lead ID format');
      return;
    }

    // Use currentUserId as assignee (already validated)
    const assigneeId = currentUserId;

    // Validate current user ID
    if (!assigneeId || !isValidUUID(assigneeId)) {
      toast.error('Invalid current user ID format');
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
        toast.error('Invalid responsible person ID format');

        return;
      }
    }

    // Additional validation: Check if user IDs exist in the users list
    const validUserIds = safeUsers?.map((user: any) => user.id) || [];
    const invalidUserIds = responsiblePersonIds.filter(
      (id: string) => !validUserIds.includes(id),
    );

    if (invalidUserIds.length > 0) {
      toast.error(
        `The following user IDs are not valid: ${invalidUserIds.join(', ')}`,
      );
      return;
    }

    // Ensure priority is a valid string value
    const validPriorities = ['low', 'medium', 'high'];
    const priorityValue = validPriorities.includes(values.priority as string)
      ? values.priority
      : 'medium';

    // Transform responsiblePersonIds to responsiblePersons with userId and optional role
    const responsiblePersonsPayload = responsiblePersonIds.map(
      (userId: string) => ({
        userId: userId,
        role: null, // Make role nullable as requested
      }),
    );

    // Filter out any undefined or 'undefined' string values
    const cleanValues = Object.fromEntries(
      Object.entries({
        leadId: resolvedLeadId,
        activityName: values.activityName,
        assignee: currentUserId, // Use current user ID as assignee
        priority: priorityValue,
        description: values.description,
        isCompleted: isCompleted,
        failed: isFailed,
        reason: values.reason || '',
        activityTypeId: values.type,
        responsiblePersons: responsiblePersonsPayload,
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

    const payload = cleanValues;

    // Final safety check before submission
    if (
      !payload.assignee ||
      payload.assignee === 'undefined' ||
      payload.assignee === null
    ) {
      toast.error('Invalid assignee data. Please try again.');
      return;
    }

    if (
      !payload.leadId ||
      payload.leadId === 'undefined' ||
      payload.leadId === null
    ) {
      toast.error('Invalid lead data. Please try again.');
      return;
    }

    if (isEditing) {
      // Ensure we have a valid activity ID - check both activity and activityData props
      const activityId = activity?.id || activityData?.id || storedActivityId;

      if (!activityId) {
        toast.error('Activity ID not found. Cannot update activity.');
        return;
      }

      const updatePayload = { id: activityId, ...payload };

      updateLeadActivity
        .mutateAsync(updatePayload)
        .then(() => {
          toast.success('Activity updated successfully!');
          resetFields();
          setTimeout(() => {
            onClose();
          }, 100);
        })
        .catch((error: any) => {
          toast.error(
            error?.response?.data?.message || 'Failed to update activity',
          );
        });
    } else {
      createLeadActivity
        .mutateAsync(payload as any)
        .then(() => {
          toast.success('Activity created successfully!');
          resetFields();
          setTimeout(() => {
            onClose();
          }, 100);
        })
        .catch((error: any) => {
          toast.error(
            error?.response?.data?.message || 'Failed to create activity',
          );
        });
    }
  };

  const handleCancel = () => {
    resetFields();
    setIsCompleted(false);
    setIsFailed(false);
    onClose();
  };

  const handleUseTodayDateChange = (checked: boolean) => {
    if (checked) {
      setDate(dayjs());
      setTime(dayjs());
    } else {
      setDate(null);
      setTime(null);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleCancel();
      }}
    >
      <SheetContent
        side="right"
        className="w-[25%] !max-w-[25%] min-w-[420px] gap-0 p-0"
      >
        <SheetHeader>
          <SheetTitle className="m-0 text-base font-semibold">
            Lead Activity
          </SheetTitle>
          <SheetDescription className="text-[#8c8c8c]">
            {isEditing ? 'Edit Lead Activity' : 'Create a Lead Activity'}
          </SheetDescription>
        </SheetHeader>

        <div className="w-full flex-1 overflow-y-auto px-6 py-4">
          {!hideLeadDropdown ? (
            <div className="mb-4">
              <Label className="mb-1">Lead</Label>
              <Select
                value={leadId}
                onValueChange={(val) => {
                  setLeadId(val);
                  setLeadName(val);
                }}
              >
                <SelectTrigger className="h-10 mt-1">
                  <SelectValue placeholder="Lead Name" />
                </SelectTrigger>
                <SelectContent>
                  <div className="border-b border-border p-2">
                    <Input
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Search leads…"
                      className="h-8"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {leadOptions.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mb-4">
              <Label className="mb-1">Lead</Label>
              <Input
                value={
                  leadData?.name ||
                  findLeadName(preSelectedLeadId) ||
                  'Current Lead'
                }
                disabled
                className="h-10 mt-1"
                style={{
                  backgroundColor: tokens.color.surfaceSelected,
                  color: tokens.color.textPrimary,
                }}
                onChange={() => {}} // Prevent any changes
              />
            </div>
          )}

          <div className="mb-4">
            <Label className="mb-1">Activity Name</Label>
            <Input
              placeholder="Activity Name"
              className="h-10 mt-1"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <Label className="mb-1">Assigned To</Label>
            <div className="mt-1">
              <PersonMultiSelect
                value={responsiblePersons}
                onChange={setResponsiblePersons}
                options={peopleOptions}
                placeholder="Select responsible persons"
              />
            </div>
          </div>

          <div className="mb-4">
            <Label className="mb-1">Type</Label>
            <Select value={type} onValueChange={(val) => setType(val)}>
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                {safeActivityTypes?.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <Label className="mb-1">Priority</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val)}>
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Activity Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <Label className="mb-1">Time</Label>
              <Input
                type="time"
                step={1}
                placeholder="Set Time"
                className="w-full h-10 mt-1"
                value={time ? time.format('HH:mm:ss') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setTime(null);
                    return;
                  }
                  const base = date || dayjs();
                  const [h, m, s] = val.split(':');
                  setTime(
                    base
                      .hour(Number(h))
                      .minute(Number(m))
                      .second(Number(s || 0)),
                  );
                }}
              />
            </div>
            <div className="mb-4">
              <Label className="mb-1">Date</Label>
              <DatePicker
                className="w-full h-10 mt-1"
                placeholder="Set Date"
                value={date ? date.toDate() : undefined}
                onChange={(d) => setDate(d ? dayjs(d) : null)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                onCheckedChange={(checked) =>
                  handleUseTodayDateChange(!!checked)
                }
              />
              <span className="text-sm">Use todays Date</span>
            </label>
          </div>

          <div className="mb-4 mt-4">
            <Label className="mb-1">Description</Label>
            <Textarea
              className="w-full h-36 mt-1"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Conditional Reason field - only show when activity is failed */}
          {isFailed && (
            <div className="mb-4">
              <Label className="mb-1">Reason for Failure</Label>
              <Textarea
                className="w-full h-24 mt-1"
                placeholder="Please explain why this activity failed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {/* Only show Mark as Done button if activity is not failed, not completed, and we're in edit mode */}
          {!isFailed && !isCompleted && isEditing && (
            <div className="flex justify-center mt-2 mb-6">
              <Button
                className="font-md bg-brand text-brand-foreground h-10"
                onClick={() => setIsCompleted(!isCompleted)}
              >
                Mark as Done
              </Button>
            </div>
          )}
        </div>

        <SheetFooter>
          <div className="flex w-full justify-center items-center gap-4">
            <Button
              className="font-md bg-brand text-brand-foreground h-10"
              onClick={handleCreateLeadActivity}
            >
              {isEditing ? 'Update Activity' : 'Create Activity'}
            </Button>
            <Button
              variant="outline"
              className="font-md border-brand text-brand h-10"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ActivitySideBar;
