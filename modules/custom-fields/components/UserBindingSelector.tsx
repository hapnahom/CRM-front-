'use client';

import { useMemo, useState } from 'react';
import { Search, X, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { UserRef, FieldBinding } from '../types';

interface UserBindingSelectorProps {
  availableUsers: UserRef[];
  bindings: FieldBinding[];
  onChange: (bindings: FieldBinding[]) => void;
  preventRemoval?: boolean;
}

export function UserBindingSelector({
  availableUsers,
  bindings,
  onChange,
  preventRemoval = false,
}: UserBindingSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedUserIds = useMemo(
    () => new Set(bindings.map((b) => b.bindingId)),
    [bindings],
  );

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

  const selectedUsers = useMemo(
    () => availableUsers.filter((u) => selectedUserIds.has(u.id)),
    [availableUsers, selectedUserIds],
  );

  const addUser = (user: UserRef) => {
    if (selectedUserIds.has(user.id)) return;
    onChange([
      ...bindings,
      {
        bindingType: 'USER',
        bindingId: user.id,
        sortOrder: bindings.length,
      },
    ]);
  };

  const removeUser = (userId: string) => {
    if (preventRemoval) return;
    onChange(bindings.filter((b) => b.bindingId !== userId));
  };

  const toggleUser = (user: UserRef) => {
    if (selectedUserIds.has(user.id)) {
      if (!preventRemoval) removeUser(user.id);
      return;
    }
    addUser(user);
  };

  return (
    <div className="space-y-2">
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-4 w-4 rounded-full"
                />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-muted text-[9px] font-semibold text-brand">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="max-w-[120px] truncate">{user.name}</span>
              {!preventRemoval ? (
                <button
                  type="button"
                  onClick={() => removeUser(user.id)}
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
              {availableUsers.length
                ? `Search users… (${availableUsers.length})`
                : 'No users available'}
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
              placeholder="Search users…"
              className="h-8 border-border bg-surface-card text-xs"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {availableUsers.length === 0
                  ? 'No users found'
                  : 'No users match your search'}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleUser(user);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated',
                      isSelected && 'bg-brand-muted/30',
                    )}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {user.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {user.email}
                      </p>
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
