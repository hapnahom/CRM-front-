'use client';

import { SelectItem } from '@/components/ui/select';
import {
  commercialMemberAssignmentId,
  commercialMemberIsAssignable,
  commercialMemberLabel,
} from '@/store/server/features/orgStructure/commercialQueries';
import type { CommercialTeamMember } from '@/store/server/features/salesTargeting/types';

export const COMMERCIAL_MEMBER_SELECT_CONTENT_PROPS = {
  position: 'popper' as const,
  sideOffset: 4,
  className: 'max-h-64',
};

export function CommercialMemberSelectItems({
  members,
  emptyLabel = 'No assignable members',
}: {
  members: CommercialTeamMember[];
  emptyLabel?: string;
}) {
  const assignable = members.filter(commercialMemberIsAssignable);
  const unassignable = members.filter(
    (member) => !commercialMemberIsAssignable(member),
  );

  if (!assignable.length && !unassignable.length) {
    return (
      <SelectItem value="__empty" disabled>
        {emptyLabel}
      </SelectItem>
    );
  }

  return (
    <>
      {assignable.map((member) => {
        const id = commercialMemberAssignmentId(member);
        return (
          <SelectItem key={id} value={id}>
            {commercialMemberLabel(member)}
          </SelectItem>
        );
      })}
      {unassignable.map((member) => {
        const key = member.selamnewId ?? commercialMemberLabel(member);
        return (
          <SelectItem
            key={`unassigned-${key}`}
            value={`__unassigned-${key}`}
            disabled
          >
            {commercialMemberLabel(member)} (no workspace account)
          </SelectItem>
        );
      })}
    </>
  );
}
