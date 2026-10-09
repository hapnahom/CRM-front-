'use client';

import { approvalRequests, approvalWorkflows } from '@/data/userManagementData';
import { Badge } from '@/components/ui/badge';

export function ApprovalsTab() {
  return (
    <div className="space-y-4">
      <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Approval Workflows</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Reusable approval configurations at organization and product level.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Workflow
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mode
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Assignee Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Reusable
              </th>
            </tr>
          </thead>
          <tbody>
            {approvalWorkflows.map((workflow) => (
              <tr
                key={workflow.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{workflow.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {workflow.scope}
                    {workflow.product ? ` · ${workflow.product}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 text-foreground">{workflow.mode}</td>
                <td className="px-4 py-3 text-foreground">
                  {workflow.assigneeType}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {workflow.isReusableAcrossProducts ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Approval Requests</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Unified approval statuses used across products.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Requester
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Approver
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {approvalRequests.map((request) => (
              <tr
                key={request.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3 text-foreground">{request.subject}</td>
                <td className="px-4 py-3 text-foreground">
                  {request.requester}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {request.currentApprover}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      request.status === 'Approved'
                        ? 'success'
                        : request.status === 'Pending'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {request.status}
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
