'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const OTHER_ORGANIZATION_SIZE = '__other__';

export function OrganizationSizeFields({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const presets = useMemo(
    () => new Set(options.map((option) => option.value)),
    [options],
  );
  const [other, setOther] = useState(
    () => Boolean(value) && !presets.has(value),
  );

  useEffect(() => {
    if (value && !presets.has(value)) setOther(true);
    if (presets.has(value)) setOther(false);
  }, [value, presets]);

  return (
    <div className="space-y-1.5">
      <Label>Organization size</Label>
      <Select
        value={other ? OTHER_ORGANIZATION_SIZE : value || undefined}
        onValueChange={(next) => {
          if (next === OTHER_ORGANIZATION_SIZE) {
            setOther(true);
            if (presets.has(value)) onChange('');
            return;
          }
          setOther(false);
          onChange(next);
        }}
      >
        <SelectTrigger className="h-9 border-border">
          <SelectValue placeholder="Select size" />
        </SelectTrigger>
        <SelectContent>
          {options.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_ORGANIZATION_SIZE}>Other</SelectItem>
        </SelectContent>
      </Select>
      {other ? (
        <Input
          value={presets.has(value) ? '' : value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 border-border"
          placeholder="Enter organization size"
        />
      ) : null}
    </div>
  );
}
