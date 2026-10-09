'use client';

import { invitations } from '@/data/userManagementData';
import { Badge } from '@/components/ui/badge';

export function InvitationsTab() {
  return (
    <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">
          Invitations & Onboarding
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Invitations capture product access, role assignment, and approval
          responsibility.
        </p>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Invitee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Products
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Roles
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Approvals
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invite) => (
              <tr
                key={invite.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">
                    {invite.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invite.email}
                  </p>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {invite.assignedProducts.join(', ')}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {invite.assignedRoles
                    .map((role) => `${role.product}: ${role.role}`)
                    .join(', ')}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {invite.approvalResponsibilities.join(', ')}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      invite.status === 'Accepted'
                        ? 'success'
                        : invite.status === 'Pending'
                          ? 'warning'
                          : 'muted'
                    }
                  >
                    {invite.status}
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
