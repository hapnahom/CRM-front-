import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
//import { Mail } from 'lucide-react';
import { Check, X, Paperclip } from 'lucide-react';
import dayjs from 'dayjs';
import React, { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGetActivityDocumentsByActivity } from '@/store/server/features/leads/activity/activity-documents/queries';
import { useUpdateActivity } from '@/store/server/features/leads/activity/mutations';
import {
  useUploadActivityDocument,
  useDeleteActivityDocument,
} from '@/store/server/features/leads/activity/activity-documents/mutations';
//import { useGetActivityById } from '@/store/server/features/leads/activity/queries';
import { getIconByKey, getDefaultIcon } from '@/utils/activityIcons';
//import { getActivityStatusColor } from '@/store/server/features/leads/activity/utils';
import { toast } from 'sonner';

interface TimelineItem {
  id: string;
  time: string;
  title: string;
  assignee: string;
  category: string;
  priority: string;
  type: string;
  date: string;
  task: string;
  isCompleted: boolean;
  failed: boolean;
  attachments: string[];
}

interface TimelineEntry {
  key: string;
  kind: 'date' | 'activity';
  date: string;
  item?: any;
}

const TIMELINE_VIRTUAL_THRESHOLD = 30;

interface TimelineProps {
  filteredActivities?: any;
  onEditActivity?: (activity: any) => void;
  timelineData?: TimelineItem[];
  onActivityClick?: (activity: TimelineItem) => void;
}

// Date pill component for timeline headers
const DatePill: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="inline-flex rounded-md bg-surface-card text-[#94dcf7] shadow-md border border-[#94dcf7] text-xs pl-2 pr-10 py-2">
    {children}
  </div>
);

export function Timeline({
  filteredActivities,
  onEditActivity,
  timelineData,
  onActivityClick,
}: TimelineProps) {
  const { mutate: uploadActivityDocument } = useUploadActivityDocument();
  const { mutate: updateDealActivity, isLoading: isUpdating } =
    useUpdateActivity();

  // Use filtered activities if provided, otherwise fall back to timelineData
  const activities = useMemo(
    () => filteredActivities || { data: timelineData || [] },
    [filteredActivities, timelineData],
  );
  //eslint-disable-next-line
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>(
    {},
  );
  //eslint-disable-next-line
  const [notePlaceholders] = useState<{ [key: string]: string }>({
    default: 'Note',
    email: 'Type your email notes here...',
    phone: 'Add call notes...',
    meeting: 'Meeting notes...',
    task: 'Task details...',
  });

  // State for tracking upload status
  //eslint-disable-next-line
  const [uploadingActivities, setUploadingActivities] = useState<
    Record<string, boolean>
  >({});

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: TimelineItem[] } = {};
    const dataToProcess = activities?.data || timelineData || [];

    dataToProcess.forEach((item: any) => {
      const dateKey = item.date || item.activityDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  }, [activities, timelineData]);

  const flatTimelineEntries = useMemo((): TimelineEntry[] => {
    const entries: TimelineEntry[] = [];
    for (const [date, dateActivities] of Object.entries(groupedActivities)) {
      entries.push({ key: `date-${date}`, kind: 'date', date });
      for (const item of dateActivities) {
        entries.push({
          key: `activity-${item.id}`,
          kind: 'activity',
          date,
          item,
        });
      }
    }
    return entries;
  }, [groupedActivities]);

  const activityCount = useMemo(
    () =>
      flatTimelineEntries.filter((entry) => entry.kind === 'activity').length,
    [flatTimelineEntries],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const useVirtualTimeline = activityCount > TIMELINE_VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: flatTimelineEntries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      flatTimelineEntries[index]?.kind === 'date' ? 56 : 180,
    overscan: 4,
  });

  const leftStripe = (item: any) => {
    const currentDate = dayjs();
    const activityDate = dayjs(item.activityDate || item.date);

    if (item.isCompleted === true || item.isCompleted === 'true') {
      return 'border-l-4 border-l-emerald-400';
    }

    if (item.failed === true || item.failed === 'true') {
      return 'border-l-4 border-l-rose-400';
    }

    if (activityDate.isBefore(currentDate, 'day')) {
      return 'border-l-4 border-l-yellow-400';
    }

    if (activityDate.isAfter(currentDate, 'day')) {
      return 'border-l-4 border-l-[#ed6925]';
    }
  };

  const cardBg = (item: any) => {
    const currentDate = dayjs();
    const activityDate = dayjs(item.activityDate || item.date);

    if (item.isCompleted === true || item.isCompleted === 'true') {
      return 'bg-green-100/50';
    }

    if (item.failed === true || item.failed === 'true') {
      return 'bg-rose-100/50';
    }

    if (activityDate.isBefore(currentDate, 'day')) {
      return 'bg-yellow-100/50';
    }

    if (activityDate.isAfter(currentDate, 'day')) {
      return 'bg-sky-100/50';
    }

    return 'bg-surface-card/50';
  };

  const formatActivityDate = (dateString: string) => {
    if (!dateString) return '';

    try {
      const parsed = dayjs(dateString);
      if (parsed.isValid()) {
        return parsed.format('DD MMM YYYY');
      }
    } catch (error) {}

    return dateString; // Fallback to original string
  };

  const formatActivityTime = (timeString: string) => {
    if (!timeString) return '';

    // If it's already a time string (HH:mm format), return it as is
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      return timeString;
    }

    // If it's a full date string, extract the time
    try {
      const parsed = dayjs(timeString);
      if (parsed.isValid()) {
        return parsed.format('HH:mm A');
      }
    } catch (error) {
      // Handle invalid time format silently
    }

    return timeString; // Fallback to original string
  };

  // const handleNoteChange = (activityId: string, value: string) => {
  //   setEditingNotes((prev) => ({
  //     ...prev,
  //     [activityId]: value,
  //   }));
  // };

  // const handleFileSelect = async (
  //   activityId: string,
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     try {
  //       await uploadActivityDocument({
  //         activityId,
  //         file,
  //       });

  //     // Reset input
  //     event.target.value = '';
  //   }
  // };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'border-red-300 bg-red-50 text-red-600';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50 text-yellow-700';
      case 'low':
        return 'border-green-300 bg-green-50 text-green-600';
      default:
        return 'border-green-300 bg-green-50 text-green-600';
    }
  };

  // Function to get user name from user ID
  const getUserName = (userId: string) => {
    // This would need to be implemented based on your user data structure
    return userId || 'Unknown User';
  };

  const setActivityUploading = (activityId: string, uploading: boolean) => {
    setUploadingActivities((prev) => ({
      ...prev,
      [activityId]: uploading,
    }));
  };

  // Get activity icon based on type
  const getActivityIcon = (iconType: string) => {
    // Try to get icon from activityIcons first
    const iconData = getIconByKey(iconType);
    if (iconData) {
      return React.cloneElement(iconData.icon as React.ReactElement, {
        className: 'w-[14px] h-[14px] text-brand',
      });
    }

    // If icon not found, return the default icon
    const defaultIcon = getDefaultIcon();
    return React.cloneElement(defaultIcon.icon as React.ReactElement, {
      className: 'w-[14px] h-[14px] text-brand',
    });
  };

  const TimelineItemFileInput: React.FC<{
    activityId: string;
    task: string;
  }> = ({ activityId, task }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const isActivityUploading = uploadingActivities[activityId] || false;
    const [note, setNote] = useState<string>(task || '');
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
      null,
    );
    const [isEditing, setIsEditing] = useState(false);

    // Fetch activity documents from server
    const { data: activityDocuments, refetch: refetchDocuments } =
      useGetActivityDocumentsByActivity(activityId);
    const { mutate: deleteDocument } = useDeleteActivityDocument();

    React.useEffect(() => {
      // Only reset note if user is not actively editing
      if (!isEditing) {
        setNote(task || '');
      }
    }, [task, isEditing]);

    const handleAutoSave = (noteValue: string) => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      setIsEditing(true);

      const timeout = setTimeout(() => {
        // Save regardless of whether noteValue is empty or not
        // This handles both writing and deleting content
        updateDealActivity({
          id: activityId,
          task: noteValue,
        });

        // Reset editing state after save
        setTimeout(() => {
          setIsEditing(false);
        }, 1000);
      }, 5000);

      setTypingTimeout(timeout);
    };

    React.useEffect(() => {
      return () => {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
      };
    }, [typingTimeout]);

    const handleIconClick = () => {
      if (!isActivityUploading) {
        fileInputRef.current?.click();
      }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setActivityUploading(activityId, true);

        uploadActivityDocument(
          { activityId, file },
          {
            // eslint-disable-next-line
            onSuccess: (response) => {
              // Refetch documents after successful upload
              refetchDocuments();
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            },
            onError: () => {
              toast.error('Failed to upload files', {
                description: 'Failed to upload files for activity.',
              });
            },
            onSettled: () => {
              setActivityUploading(activityId, false);
            },
          },
        );
      }
    };

    // Use server data instead of local state
    const attachments = activityDocuments || [];

    return (
      <div
        className="relative w-full rounded-2xl transition-all p-2 min-h-14 bg-surface-card shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 flex-wrap">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {attachments.map((attachment, index) => (
                <div
                  key={attachment.id || index}
                  className="flex items-center gap-1 bg-surface-card border border-slate-200 rounded-md px-2 py-1 text-xs"
                >
                  <span className="text-black">{attachment.fileName}</span>
                  <X
                    className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(attachment.id, {
                        onSuccess: () => {
                          refetchDocuments();
                        },
                        onError: () => {
                          toast.error('Failed to delete document', {
                            description:
                              'Could not delete the selected document.',
                          });
                        },
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea
          value={note}
          placeholder="Write a note..."
          rows={1}
          maxLength={500}
          onChange={(e) => {
            setNote(e.target.value);
            handleAutoSave(e.target.value);
          }}
          className="min-h-0 max-h-16 border-none shadow-none p-1 resize-none focus-visible:ring-0 focus-visible:border-none mb-0 bg-transparent"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Hidden file input */}
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Upload icon */}
        <div className="absolute top-2 right-2">
          {isActivityUploading ? (
            <Spinner className="w-4 h-4 text-slate-400" />
          ) : (
            <Paperclip
              className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              onClick={handleIconClick}
            />
          )}
        </div>
      </div>
    );
  };

  const renderActivityCard = (item: any) => (
    <div
      className={`group relative rounded-2xl ${cardBg(item)} ${leftStripe(item)} hover:shadow-lg hover:border-2 hover:border-primary/40 transition-all duration-300 cursor-pointer`}
      onClick={() => onEditActivity?.(item) || onActivityClick?.(item)}
      title="Click to edit activity"
    >
      <Card className="relative h-32 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0 gap-0 backdrop-blur-none hover:border hover:border-border">
        <CardContent className="p-6">
          <div className="flex">
            <div className="w-20 flex-shrink-0 pr-3 mt-4 col-span-1">
              <div className="text-sm font-medium text-muted-foreground">
                {formatActivityTime(
                  item.time || item.activityDate || item.date,
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 flex-1">
              <div className="-mt-4 col-span-4 w-full pl-8">
                <div className="flex items-start gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={getPriorityBadgeClass(item.priority)}
                  >
                    {item.priority}
                  </Badge>
                </div>

                <p className="font-semibold text-foreground">
                  {item.title || item.activityName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getUserName(item.assignee)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.category || item.dealName || 'Unknown Deal'}
                </p>
              </div>

              <div className="bg-transparent backdrop-blur-none rounded-lg p-3 -mt-6 col-span-8">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex-1">
                    <div className="mt-3 ">
                      <div className="relative">
                        <TimelineItemFileInput
                          activityId={item.id}
                          task={item.task || ''}
                        />
                      </div>
                    </div>
                  </div>
                  {!(
                    item.isCompleted === true ||
                    item.isCompleted === 'true' ||
                    item.failed === true ||
                    item.failed === 'true'
                  ) && (
                    <div className="opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all mt-2">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              className="rounded-md"
                              disabled={isUpdating}
                              onClick={(e) => {
                                updateDealActivity({
                                  id: item.id,
                                  isCompleted: true,
                                  failed: false,
                                });
                                e.stopPropagation();
                              }}
                            >
                              {isUpdating ? (
                                <Spinner className="text-brand-foreground" />
                              ) : (
                                <Check />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Done</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="rounded-md"
                              disabled={isUpdating}
                              onClick={(e) => {
                                updateDealActivity({
                                  id: item.id,
                                  isCompleted: false,
                                  failed: true,
                                });
                                e.stopPropagation();
                              }}
                            >
                              {isUpdating ? <Spinner /> : <X />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Failed</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimelineEntry = (entry: TimelineEntry) => {
    if (entry.kind === 'date') {
      return (
        <div className="pl-10 mb-8">
          <DatePill>{formatActivityDate(entry.date)}</DatePill>
        </div>
      );
    }

    const item = entry.item;
    return (
      <div className="relative">
        <div className="absolute left-28 top-10 transform -translate-x-1/2 z-20">
          <div className="w-6 h-6 bg-surface-card border-2 border-brand rounded-full flex items-center justify-center shadow-sm my-16">
            {getActivityIcon(item.type)}
          </div>
        </div>
        {renderActivityCard(item)}
      </div>
    );
  };

  if (!activities?.data?.length && !timelineData?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground text-6xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No activities yet
        </h3>
        <p className="text-muted-foreground">
          Create your first activity to get started
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-6 mb-6">
      <div className="absolute left-28 top-0 bottom-0 w-0.5 bg-gray-300"></div>

      {useVirtualTimeline ? (
        <div
          ref={scrollRef}
          className="relative max-h-[calc(100vh-12rem)] overflow-y-auto"
        >
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = flatTimelineEntries[virtualRow.index]!;
              return (
                <div
                  key={entry.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="pb-2"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderTimelineEntry(entry)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {flatTimelineEntries.map((entry) => (
            <div key={entry.key}>{renderTimelineEntry(entry)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
