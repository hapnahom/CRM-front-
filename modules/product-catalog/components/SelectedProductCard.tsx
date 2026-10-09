'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  CatalogProduct,
  ImplementationPartner,
  OpportunityProductLine,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import {
  countMissingProductDetails,
  formatCatalogMoney,
  getProductLineCompletionState,
  isProductDetailsComplete,
  isRegistrationComplete,
  isRegistrationExpiredAttention,
} from '@/modules/product-catalog/utils';

export function SelectedProductCard({
  line,
  product,
  family,
  vendors,
  partners,
  currency = 'USD',
  readOnly,
  onConfigure,
  onRemove,
}: {
  line: OpportunityProductLine;
  product: CatalogProduct | undefined;
  family: ProductFamily | undefined;
  vendors: Vendor[];
  partners: ImplementationPartner[];
  currency?: string;
  readOnly?: boolean;
  onConfigure?: () => void;
  onRemove?: () => void;
}) {
  const state = getProductLineCompletionState(line);
  const detailsOk = isProductDetailsComplete(line);
  const registrationOk = isRegistrationComplete(line);
  const missingDetails = countMissingProductDetails(line);
  const expiredAttention = isRegistrationExpiredAttention(line);

  const vendorName = line.vendorId
    ? (vendors.find((v) => v.id === line.vendorId)?.name ?? '—')
    : null;
  const partnerName = line.implementationPartnerId
    ? (partners.find((p) => p.id === line.implementationPartnerId)?.name ?? '—')
    : null;

  return (
    <div className="px-3.5 py-3.5 sm:px-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {product?.name ?? 'Unknown product'}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {family?.name ?? '—'}
              </p>
            </div>
            <p
              className={cn(
                'shrink-0 text-sm font-semibold tabular-nums',
                line.amount > 0 ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {line.amount > 0
                ? formatCatalogMoney(line.amount, currency)
                : 'No amount'}
            </p>
          </div>

          <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
            <MetaRow label="Vendor" value={vendorName ?? 'Not specified'} />
            <MetaRow
              label="Implementor"
              value={partnerName ?? 'Not specified'}
            />
          </dl>

          <div className="flex flex-wrap gap-1.5">
            {state === 'not_configured' ? (
              <StatusBadge tone="warning">Details incomplete</StatusBadge>
            ) : null}

            {state !== 'not_configured' ? (
              detailsOk ? (
                <StatusBadge tone="success">Details complete</StatusBadge>
              ) : (
                <StatusBadge tone="warning">
                  {missingDetails} detail{missingDetails === 1 ? '' : 's'}{' '}
                  missing
                </StatusBadge>
              )
            ) : null}

            {state !== 'not_configured' ? (
              registrationOk ? (
                line.registration.status === 'not_required' ? (
                  <StatusBadge tone="muted">Registration N/A</StatusBadge>
                ) : expiredAttention ? (
                  <StatusBadge tone="warning">Registration expired</StatusBadge>
                ) : (
                  <StatusBadge tone="success">
                    Registration complete
                  </StatusBadge>
                )
              ) : (
                <StatusBadge tone="warning">
                  Registration incomplete
                </StatusBadge>
              )
            ) : null}
          </div>
        </div>

        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onConfigure ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={onConfigure}
                aria-label={
                  state === 'not_configured'
                    ? 'Configure product'
                    : 'Edit product'
                }
              >
                <Pencil size={14} />
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                aria-label="Remove product"
              >
                <Trash2 size={14} />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 truncate">
      <dt className="inline text-muted-foreground">{label}: </dt>
      <dd className="inline font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'muted';
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        tone === 'success' && 'bg-success/10 text-success dark:bg-success/15',
        tone === 'warning' &&
          'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        tone === 'muted' && 'bg-muted text-muted-foreground',
      )}
    >
      {tone === 'success' ? (
        <CheckCircle2 size={11} />
      ) : tone === 'warning' ? (
        <AlertTriangle size={11} />
      ) : null}
      {children}
    </span>
  );
}
