'use client';

import { Building2, Layers, MapPin, PackageCheck, User } from 'lucide-react';
import {
  organizationProfile,
  productSubscriptions,
  users,
} from '@/data/userManagementData';
import { Badge } from '@/components/ui/badge';

export function OrganizationTab() {
  const owner = users.find(
    (user) => user.id === organizationProfile.ownerUserId,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Organization"
          value={organizationProfile.name}
          icon={<Building2 size={16} />}
        />
        <StatCard
          label="Branches"
          value={String(organizationProfile.branchesCount)}
          icon={<MapPin size={16} />}
        />
        <StatCard
          label="Departments"
          value={String(organizationProfile.departmentsCount)}
          icon={<Layers size={16} />}
        />
        <StatCard
          label="Subscribed Products"
          value={String(
            productSubscriptions.filter((p) => p.status === 'Subscribed')
              .length,
          )}
          icon={<PackageCheck size={16} />}
        />
      </div>

      <div className="bg-surface-card rounded-lg border border-border p-5">
        <h3 className="font-semibold text-foreground mb-3">
          Organization Owner
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-muted flex items-center justify-center">
            <User size={18} className="text-brand" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {owner?.name ?? 'Unknown Owner'}
            </p>
            <p className="text-xs text-muted-foreground">
              First registered user and default organization owner
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Product Subscriptions
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Organization-level subscriptions reused across products.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Product
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {productSubscriptions.map((subscription) => (
              <tr
                key={subscription.product}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3 font-medium text-foreground">
                  {subscription.product}
                </td>
                <td className="px-5 py-3">
                  <Badge
                    variant={
                      subscription.status === 'Subscribed' ? 'success' : 'muted'
                    }
                  >
                    {subscription.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface-card rounded-lg border border-border px-4 py-3 flex items-center gap-3">
      <div className="bg-brand-muted rounded-md p-2 text-brand">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
