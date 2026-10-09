/**
 * Apply design-token Tailwind classes to files that kept develop logic
 * during the CRM-37 merge. Run once after resolving conflicts with --theirs.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();

const replacements = [
  [/text-\[#1c1e21\]/gi, 'text-foreground'],
  [/text-\[#111827\]/gi, 'text-foreground'],
  [/text-\[#1f2937\]/gi, 'text-foreground'],
  [/text-\[#374151\]/gi, 'text-foreground'],
  [/text-\[#4b5563\]/gi, 'text-foreground'],
  [/text-\[#6b7280\]/gi, 'text-muted-foreground'],
  [/text-\[#9ca3af\]/gi, 'text-muted-foreground'],
  [/text-\[#718096\]/gi, 'text-muted-foreground'],
  [/text-\[#8c8c8c\]/gi, 'text-muted-foreground'],
  [/text-\[#ed6925\]/gi, 'text-brand'],
  [/text-\[#b84d1a\]/gi, 'text-brand-hover'],
  [/text-\[#d45e1f\]/gi, 'text-brand-hover'],
  [/text-\[#dc2626\]/gi, 'text-error'],
  [/text-\[#ef4444\]/gi, 'text-error'],
  [/text-\[#e03137\]/gi, 'text-error'],
  [/text-\[#1d4ed8\]/gi, 'text-blue'],
  [/text-\[#2563eb\]/gi, 'text-blue'],
  [/text-\[#059669\]/gi, 'text-success'],
  [/text-\[#10b981\]/gi, 'text-success'],
  [/text-\[#6d28d9\]/gi, 'text-purple'],
  [/text-\[#92400e\]/gi, 'text-warning'],
  [/text-\[#78350f\]/gi, 'text-foreground'],
  [/text-\[#d1d5db\]/gi, 'text-muted-foreground'],

  [/border-\[#e5e7eb\]/gi, 'border-border'],
  [/border-\[#e9eaec\]/gi, 'border-border'],
  [/border-\[#d1d5db\]/gi, 'border-border-strong'],
  [/border-\[#ed6925\]/gi, 'border-brand'],
  [/border-\[#f0c4a8\]/gi, 'border-brand-border'],
  [/border-\[#f5d4c0\]/gi, 'border-brand-border'],
  [/border-\[#fde68a\]/gi, 'border-warning/40'],
  [/border-\[#a7f3d0\]/gi, 'border-success/30'],
  [/border-\[#ddd6fe\]/gi, 'border-purple/30'],
  [/hover:border-\[#e5e7eb\]/gi, 'hover:border-border'],
  [/hover:border-\[#ed6925\]/gi, 'hover:border-brand'],
  [/hover:border-\[#f0c4a8\]/gi, 'hover:border-brand-border'],

  [/bg-\[#ed6925\]/gi, 'bg-brand'],
  [/hover:bg-\[#d45e1f\]/gi, 'hover:bg-brand-hover'],
  [/hover:bg-\[#ed6925\]/gi, 'hover:bg-brand'],
  [/bg-\[#fef6f1\]/gi, 'bg-brand-muted'],
  [/bg-\[#fdf0e9\]/gi, 'bg-brand-muted'],
  [/bg-\[#fef3eb\]/gi, 'bg-brand-muted'],
  [/hover:bg-\[#fdf0e9\]/gi, 'hover:bg-brand-muted'],
  [/bg-\[#f9fafb\]/gi, 'bg-surface-elevated'],
  [/bg-\[#fafafa\]/gi, 'bg-surface-elevated'],
  [/bg-\[#f3f4f6\]/gi, 'bg-muted'],
  [/bg-\[#f5f5f5\]/gi, 'bg-muted'],
  [/bg-\[#e5e7eb\]/gi, 'bg-muted'],
  [/bg-\[#f5f6fa\]/gi, 'bg-surface-page'],
  [/bg-\[#fafbff\]/gi, 'bg-surface-elevated'],
  [/bg-\[#f2f4f7\]/gi, 'bg-surface-page'],
  [/bg-\[#fffbeb\]/gi, 'bg-warning/10'],
  [/bg-\[#ecfdf5\]/gi, 'bg-success/10'],
  [/bg-\[#f5f3ff\]/gi, 'bg-purple/10'],
  [/hover:bg-\[#f9fafb\]/gi, 'hover:bg-surface-elevated'],
  [/hover:bg-\[#f3f4f6\]/gi, 'hover:bg-muted'],
  [/hover:bg-\[#fcfcfd\]/gi, 'hover:bg-surface-elevated'],
  [/hover:bg-\[#f0f2f7\]/gi, 'hover:bg-muted'],

  [/text-gray-900/g, 'text-foreground'],
  [/text-gray-800/g, 'text-foreground'],
  [/text-gray-700/g, 'text-foreground'],
  [/text-gray-600/g, 'text-muted-foreground'],
  [/text-gray-500/g, 'text-muted-foreground'],
  [/text-gray-400/g, 'text-muted-foreground'],
  [/bg-gray-50/g, 'bg-surface-elevated'],
  [/bg-gray-100/g, 'bg-muted'],
  [/border-gray-300/g, 'border-border'],
  [/border-gray-200/g, 'border-border'],
  [/hover:bg-gray-50/g, 'hover:bg-surface-elevated'],
  [/hover:bg-gray-100/g, 'hover:bg-muted'],

  [/\bbg-white\b/g, 'bg-surface-card'],
  [/\bhover:bg-white\b/g, 'hover:bg-surface-card'],
  [/text-\[#16a34a\]/gi, 'text-success'],
  [/text-\[#ef4444\]/gi, 'text-error'],
  [/text-\[#dc2626\]/gi, 'text-error'],
  [/text-\[#fca5a5\]/gi, 'text-error-muted'],
  [/bg-\[#fca5a5\]/gi, 'bg-error-muted'],
  [/bg-\[#f0f0f5\]/gi, 'bg-muted'],
  [/ring-\[#f5d4c0\]/gi, 'ring-brand-border'],
  [/divide-\[#f3f4f6\]/gi, 'divide-border'],
  [/divide-\[#e5e7eb\]/gi, 'divide-border'],
  [/hover:text-\[#ef4444\]/gi, 'hover:text-error'],
  [/hover:text-\[#1c1e21\]/gi, 'hover:text-foreground'],
  [/text-red-600/g, 'text-error'],
  [/\btext-white\b/g, 'text-brand-foreground'],
];

const targetFiles = [
  'components/user-management/PermissionsTable.tsx',
  'components/user-management/RolesTab.tsx',
  'components/user-management/TeamsTab.tsx',
  'components/user-management/UserDetailView.tsx',
  'components/user-management/UsersTab.tsx',
  'components/user-management/CustomPermissionsTable.tsx',
  'components/user-management/OrgStructureChart.tsx',
  'modules/UserManagementPage.tsx',
  'modules/account-settings/FiscalYearSectionView.tsx',
  'components/loading/skeleton-screens.tsx',
  'components/sales-targeting/DepartmentDistributionSection.tsx',
  'components/sales-targeting/PersonDistributionSection.tsx',
  'components/sales-targeting/PipelineSalesTargetKpiCards.tsx',
  'components/sales-targeting/SalesForecastSection.tsx',
  'components/sales-targeting/SalesTargetingCurrencyToolbar.tsx',
  'components/sales-targeting/SalesTargetingShell.tsx',
  'components/sales-targeting/shared.tsx',
  'components/sales-targeting/TargetDefinitionSection.tsx',
];

let changed = 0;
for (const rel of targetFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn('skip (missing):', rel);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;
  for (const [re, rep] of replacements) content = content.replace(re, rep);
  if (content !== orig) {
    fs.writeFileSync(file, content);
    changed++;
    console.log('updated', rel);
  }
}
console.log('Done. Updated', changed, 'files.');
