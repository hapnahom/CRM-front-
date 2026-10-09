'use client';

import { useState } from 'react';
import { Plus, GripVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListOption } from '../types';

interface OptionListEditorProps {
  options: ListOption[];
  onChange: (options: ListOption[]) => void;
  /** Existing option value slugs that cannot be removed or renamed. */
  lockedOptionValues?: string[];
}

let optionCounter = 0;

export function OptionListEditor({
  options,
  onChange,
  lockedOptionValues = [],
}: OptionListEditorProps) {
  const lockedValues = new Set(lockedOptionValues);
  const [newLabel, setNewLabel] = useState('');

  const addOption = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = `opt_${Date.now()}_${++optionCounter}`;
    onChange([
      ...options,
      {
        id,
        label,
        value: label.toLowerCase().replace(/\s+/g, '_'),
        sortOrder: options.length,
        active: true,
      },
    ]);
    setNewLabel('');
  };

  const removeOption = (id: string) => {
    const option = options.find((o) => o.id === id);
    if (option && lockedValues.has(option.value)) return;
    onChange(options.filter((o) => o.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    onChange(
      options.map((o) => {
        if (o.id !== id) return o;
        if (lockedValues.has(o.value)) {
          return { ...o, label };
        }
        return {
          ...o,
          label,
          value: label.toLowerCase().replace(/\s+/g, '_'),
        };
      }),
    );
  };

  const toggleActive = (id: string) => {
    onChange(
      options.map((o) =>
        o.id === id ? { ...o, active: !(o.active ?? true) } : o,
      ),
    );
  };

  const moveOption = (id: string, direction: 'up' | 'down') => {
    const idx = options.findIndex((o) => o.id === id);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= options.length) return;
    const next = [...options];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onChange(next.map((o, i) => ({ ...o, sortOrder: i })));
  };

  return (
    <div className="space-y-2">
      {options.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-page divide-y divide-border overflow-hidden">
          {options.map((option, idx) => (
            <div
              key={option.id}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 group hover:bg-surface-elevated transition-colors',
                option.active === false && 'opacity-50',
              )}
            >
              <div className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveOption(option.id, 'up')}
                  disabled={idx === 0}
                  className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20"
                >
                  <svg width="10" height="6" viewBox="0 0 10 6">
                    <path d="M5 0L10 6H0z" fill="currentColor" />
                  </svg>
                </button>
                <GripVertical
                  size={13}
                  className="shrink-0 cursor-grab text-muted-foreground/40"
                />
                <button
                  type="button"
                  onClick={() => moveOption(option.id, 'down')}
                  disabled={idx === options.length - 1}
                  className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20"
                >
                  <svg width="10" height="6" viewBox="0 0 10 6">
                    <path d="M5 6L0 0h10z" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <Input
                value={option.label}
                onChange={(e) => updateLabel(option.id, e.target.value)}
                className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                onClick={() => toggleActive(option.id)}
                title={
                  option.active === false
                    ? 'Activate option'
                    : 'Deactivate option'
                }
              >
                {option.active === false ? (
                  <EyeOff size={12} />
                ) : (
                  <Eye size={12} />
                )}
              </Button>
              {!lockedValues.has(option.value) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-opacity"
                  onClick={() => removeOption(option.id)}
                  aria-label="Remove option"
                >
                  <Trash2 size={12} />
                </Button>
              ) : (
                <span className="h-6 w-6 shrink-0" aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Add an option…"
          className="h-8 flex-1 border-border bg-surface-card text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 shrink-0 text-xs"
          onClick={addOption}
          disabled={!newLabel.trim()}
        >
          <Plus size={13} />
          Add
        </Button>
      </div>

      {options.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Add at least one option. Press Enter or click Add.
        </p>
      )}
    </div>
  );
}
