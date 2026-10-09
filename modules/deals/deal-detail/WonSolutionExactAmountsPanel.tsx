'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatEntityMoney } from '@/components/entity-detail';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { OpportunitySolution } from '@/modules/product-catalog/types';
import { useReplaceOpportunitySolutions } from '@/store/server/features/product-catalog/mutations';
import { toast } from 'sonner';

export function WonSolutionExactAmountsPanel({
  entityId,
  currency,
  solutions,
}: {
  entityId: string;
  currency: string;
  solutions: OpportunitySolution[];
}) {
  const replaceSolutions = useReplaceOpportunitySolutions('deal', entityId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const solution of solutions) {
      const value = solution.exactAmount ?? solution.amount ?? 0;
      next[solution.id] = String(value);
    }
    setDrafts((current) => {
      const currentJson = JSON.stringify(current);
      const nextJson = JSON.stringify(next);
      return currentJson === nextJson ? current : next;
    });
  }, [solutions]);

  if (!solutions.length) return null;

  const save = async () => {
    for (const solution of solutions) {
      const amount = Number(drafts[solution.id]);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error('Each solution exact amount must be greater than zero');
        return;
      }
    }

    const next = solutions.map((solution) => ({
      ...solution,
      exactAmount: Number(drafts[solution.id]),
    }));

    replaceSolutions.mutate(next, {
      onSuccess: () => {
        toast.success('Solution exact amounts updated');
        setConfirmOpen(false);
      },
      onError: (error) => {
        toast.error(
          (error as { message?: string })?.message ||
            'Could not update solution exact amounts',
        );
      },
    });
  };

  return (
    <div className="mt-4 space-y-3 rounded-md border border-border bg-surface-elevated p-3">
      <div>
        <p className="m-0 text-sm font-semibold text-foreground">
          Solution exact amounts
        </p>
        <p className="m-0 mt-1 text-xs text-muted-foreground">
          Used for product-source target achievement on this won deal. Estimated
          solution amounts stay unchanged.
        </p>
      </div>

      {solutions.map((solution) => {
        const label =
          solution.familyName ??
          solution.productFamilyName ??
          solution.productFamilyId;
        return (
          <div key={solution.id} className="space-y-1.5">
            <Label htmlFor={`exact-solution-${solution.id}`}>{label}</Label>
            <p className="m-0 text-xs text-muted-foreground">
              Estimated:{' '}
              {formatEntityMoney(
                solution.amount,
                solution.currency || currency,
              )}
            </p>
            <Input
              id={`exact-solution-${solution.id}`}
              type="number"
              min={0.01}
              step="0.01"
              value={drafts[solution.id] ?? ''}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [solution.id]: e.target.value,
                }))
              }
            />
          </div>
        );
      })}

      <Button
        type="button"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={replaceSolutions.isLoading}
      >
        Save solution exact amounts
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update solution exact amounts?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing exact amounts will recalculate target achievement for
              product contributors, their teams, and departments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void save()}>
              Save and recalculate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
