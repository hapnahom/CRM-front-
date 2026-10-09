'use client';

import { ResponsibilitySelector as BaseSelector } from '@/modules/product-catalog/components/ResponsibilitySelector';

interface ResponsibilitySelectorProps {
  userIds: string[];
  onUsersChange: (ids: string[]) => void;
  teamIds?: string[];
  onTeamsChange?: (ids: string[]) => void;
  readOnly?: boolean;
}

export function ResponsibilitySelector(props: ResponsibilitySelectorProps) {
  return <BaseSelector {...props} />;
}
