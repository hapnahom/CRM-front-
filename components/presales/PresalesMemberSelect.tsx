'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  COMMERCIAL_MEMBER_SELECT_CONTENT_PROPS,
  CommercialMemberSelectItems,
} from '@/components/commercial/CommercialMemberSelectItems';
import {
  useGetCommercialPresalesTeamMembers,
  useGetCommercialPresalesTeams,
} from '@/store/server/features/orgStructure/commercialQueries';

export function PresalesMemberSelect({
  teamId,
  memberId,
  onTeamChange,
  onMemberChange,
  triggerClassName = 'h-9 border-border',
  disabled = false,
}: {
  teamId: string;
  memberId: string;
  onTeamChange: (teamId: string) => void;
  onMemberChange: (memberId: string) => void;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const { data: teams = [], isLoading: teamsLoading } =
    useGetCommercialPresalesTeams();
  const { data: members = [], isLoading: membersLoading } =
    useGetCommercialPresalesTeamMembers(teamId || undefined);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === teamId) ?? null,
    [teams, teamId],
  );

  const handleClearTeam = () => {
    onTeamChange('');
    onMemberChange('');
  };

  return (
    <div
      className={cn(
        'flex min-h-9 items-center gap-2',
        !selectedTeam && 'w-full',
      )}
    >
      {selectedTeam ? (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={handleClearTeam}
            className={cn(
              'inline-flex h-9 max-w-[46%] shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-muted px-2.5 text-[11px] font-medium text-brand transition-colors',
              'hover:bg-brand-muted/80 disabled:cursor-not-allowed disabled:opacity-50',
            )}
            aria-label={`Remove ${selectedTeam.name}`}
          >
            <span className="truncate">{selectedTeam.name}</span>
            <X className="size-3 shrink-0 opacity-70" />
          </button>

          <Select
            value={memberId || undefined}
            onValueChange={onMemberChange}
            disabled={disabled || membersLoading}
          >
            <SelectTrigger className={cn(triggerClassName, 'min-w-0 flex-1')}>
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent {...COMMERCIAL_MEMBER_SELECT_CONTENT_PROPS}>
              <CommercialMemberSelectItems members={members} />
            </SelectContent>
          </Select>
        </>
      ) : (
        <Select
          value={teamId || undefined}
          onValueChange={onTeamChange}
          disabled={disabled || teamsLoading}
        >
          <SelectTrigger className={cn(triggerClassName, 'w-full')}>
            <SelectValue placeholder="Select pre-sales team" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="max-h-64">
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
