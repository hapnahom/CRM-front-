'use client';

import { useCatalogUsers } from '@/store/server/features/product-catalog/queries';

export function ResponsiblePeopleChips({
  userIds,
  empty = 'No one assigned',
}: {
  userIds: string[];
  empty?: string;
}) {
  const { users } = useCatalogUsers();
  const people = users.filter((u) => userIds.includes(u.id));

  if (people.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {people.map((person) => (
        <li
          key={person.id}
          className="inline-flex items-center rounded-md bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-foreground"
        >
          {person.name}
        </li>
      ))}
    </ul>
  );
}
