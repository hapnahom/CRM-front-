'use client';

import { useMemo, useState } from 'react';
import { Search, X, Check, Users, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TeamRef, FieldBinding } from '../types';

interface TeamBindingSelectorProps {
  availableTeams: TeamRef[];
  bindings: FieldBinding[];
  onChange: (bindings: FieldBinding[]) => void;
  preventRemoval?: boolean;
}

export function TeamBindingSelector({
  availableTeams,
  bindings,
  onChange,
  preventRemoval = false,
}: TeamBindingSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedTeamIds = useMemo(
    () => new Set(bindings.map((b) => b.bindingId)),
    [bindings],
  );

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return availableTeams;
    const q = search.toLowerCase();
    return availableTeams.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTeams, search]);

  const selectedTeams = useMemo(
    () => availableTeams.filter((t) => selectedTeamIds.has(t.id)),
    [availableTeams, selectedTeamIds],
  );

  const addTeam = (team: TeamRef) => {
    if (selectedTeamIds.has(team.id)) return;
    onChange([
      ...bindings,
      {
        bindingType: 'TEAM',
        bindingId: team.id,
        sortOrder: bindings.length,
      },
    ]);
  };

  const removeTeam = (teamId: string) => {
    if (preventRemoval) return;
    onChange(bindings.filter((b) => b.bindingId !== teamId));
  };

  const toggleTeam = (team: TeamRef) => {
    if (selectedTeamIds.has(team.id)) {
      if (!preventRemoval) removeTeam(team.id);
      return;
    }
    addTeam(team);
  };

  return (
    <div className="space-y-2">
      {selectedTeams.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTeams.map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs"
            >
              <Users size={11} className="text-muted-foreground" />
              <span className="max-w-[120px] truncate">{team.name}</span>
              {!preventRemoval ? (
                <button
                  type="button"
                  onClick={() => removeTeam(team.id)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={11} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}

      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-full justify-between border-border bg-surface-card px-3 font-normal text-foreground hover:bg-surface-card"
          >
            <span className="flex min-w-0 items-center gap-2 truncate text-xs text-muted-foreground">
              <Search size={13} className="shrink-0" />
              {availableTeams.length
                ? `Search teams… (${availableTeams.length})`
                : 'No teams available'}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="pointer-events-auto z-[2147483647] w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b border-border p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="h-8 border-border bg-surface-card text-xs"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredTeams.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {availableTeams.length === 0
                  ? 'No teams found'
                  : 'No teams match your search'}
              </p>
            ) : (
              filteredTeams.map((team) => {
                const isSelected = selectedTeamIds.has(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleTeam(team);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated',
                      isSelected && 'bg-brand-muted/30',
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-[10px] font-semibold text-brand">
                      <Users size={12} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {team.name}
                      </p>
                      {team.department && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {team.department}
                          {team.memberCount != null &&
                            ` · ${team.memberCount} members`}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={13} className="shrink-0 text-brand" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
