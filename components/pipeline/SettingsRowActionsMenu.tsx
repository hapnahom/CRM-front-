'use client';

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function SettingsRowActionsMenu({
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="More actions"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="z-[200] w-40">
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onEdit()}>
          <Pencil size={14} className="mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={deleteDisabled}
          title={deleteDisabled ? deleteDisabledReason : undefined}
          className={cn('cursor-pointer', deleteDisabled && 'opacity-50')}
          onSelect={() => {
            if (!deleteDisabled) onDelete();
          }}
        >
          <Trash2 size={14} className="mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
