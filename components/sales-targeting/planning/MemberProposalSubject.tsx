'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  personInitials,
  type PlanningPersonProfile,
} from '@/components/sales-targeting/planning/planningPersonProfiles';
import { cn } from '@/lib/utils';

type Props = {
  displayName: string;
  profile?: PlanningPersonProfile;
  subtitle?: string | null;
  className?: string;
};

export function MemberProposalSubject({
  displayName,
  profile,
  subtitle,
  className,
}: Props) {
  const avatarUrl = profile?.avatarUrl ?? null;
  const initials = personInitials(displayName);

  return (
    <span className={cn('flex min-w-0 items-start gap-2.5', className)}>
      <Avatar className="size-9 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-[11px] font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {displayName}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
