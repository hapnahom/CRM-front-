'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  Users,
  Edit,
  Trash2,
  Layers,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  departments as initialDepts,
  type Department,
} from '@/data/userManagementData';

const BRANCHES = [
  'Addis Ababa HQ',
  'Dire Dawa Branch',
  'Hawassa Branch',
  'Bahir Dar Branch',
];
const MANAGERS = [
  'Nahom Esrael',
  'Sara Tesfaye',
  'Meron Haile',
  'Biruk Mekonnen',
  'Daniel Bekele',
  'Tigist Alemu',
  'Hana Worku',
];

const deptIcons: Record<string, string> = {
  Sales: '💼',
  IT: '💻',
  Finance: '💰',
  Management: '🏛️',
  'Customer Support': '🎧',
};

export function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>(initialDepts);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);

  const [form, setForm] = useState({
    name: '',
    branch: 'Addis Ababa HQ',
    head: '',
    description: '',
  });

  const filtered = departments.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.head.toLowerCase().includes(q);
    const matchBranch = filterBranch === 'all' || d.branch === filterBranch;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchBranch && matchStatus;
  });

  const handleCreate = () => {
    const dept: Department = {
      id: `d${Date.now()}`,
      ...form,
      usersCount: 0,
      teamsCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setDepartments((prev) => [...prev, dept]);
    setCreateOpen(false);
    setForm({ name: '', branch: 'Addis Ababa HQ', head: '', description: '' });
  };

  const handleSaveEdit = () => {
    if (!editDept) return;
    setDepartments((prev) =>
      prev.map((d) => (d.id === editDept.id ? editDept : d)),
    );
    setEditDept(null);
  };

  const handleDelete = (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: d.status === 'Active' ? 'Inactive' : 'Active' }
          : d,
      ),
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Departments',
            value: departments.length,
            color: 'text-brand',
            bg: 'bg-brand-muted',
          },
          {
            label: 'Active',
            value: departments.filter((d) => d.status === 'Active').length,
            color: 'text-[#1a8a4a]',
            bg: 'bg-[#e6f7ee]',
          },
          {
            label: 'Total Users',
            value: departments.reduce((a, d) => a + d.usersCount, 0),
            color: 'text-[#b07d00]',
            bg: 'bg-[#fff8e6]',
          },
          {
            label: 'Total Teams',
            value: departments.reduce((a, d) => a + d.teamsCount, 0),
            color: 'text-[#9333ea]',
            bg: 'bg-[#fdf4ff]',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-surface-card rounded-lg border border-border px-4 py-3 flex items-center gap-3"
          >
            <div className={`${s.bg} rounded-md p-2`}>
              <Layers size={16} className={s.color} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`font-semibold text-lg ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search departments..."
              className="pl-9 h-9 bg-surface-card border-border text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] bg-surface-card border-border text-sm">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-full sm:w-[130px] bg-surface-card border-border text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="h-9 bg-brand hover:bg-brand-hover text-brand-foreground text-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={14} className="mr-1.5" />
          Add Department
        </Button>
      </div>

      {/* Table */}
      <div className="bg-surface-card rounded-lg border border-border flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Department
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Branch
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Head
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Users
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Teams
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Created
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((dept) => (
              <tr
                key={dept.id}
                className="border-b border-border hover:bg-surface-elevated transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f0f2f7] flex items-center justify-center text-base">
                      {deptIcons[dept.name] || '🏢'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{dept.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {dept.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-foreground text-sm">
                  {dept.branch}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-medium text-brand">
                    {dept.head}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Users size={13} className="text-muted-foreground" />
                    {dept.usersCount}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Building2 size={13} className="text-muted-foreground" />
                    {dept.teamsCount}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Badge
                    variant={dept.status === 'Active' ? 'success' : 'muted'}
                  >
                    {dept.status}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground">
                  {dept.createdAt}
                </td>
                <td className="px-4 py-3.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-[#f0f2f7]"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        className="text-sm cursor-pointer"
                        onClick={() => setEditDept({ ...dept })}
                      >
                        <Edit size={12} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-sm cursor-pointer"
                        onClick={() => handleToggleStatus(dept.id)}
                      >
                        {dept.status === 'Active' ? (
                          <>
                            <XCircle
                              size={12}
                              className="mr-2 text-[#dc2626]"
                            />{' '}
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle
                              size={12}
                              className="mr-2 text-[#1a8a4a]"
                            />{' '}
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-sm cursor-pointer text-[#dc2626]"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash2 size={12} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Layers size={18} className="text-brand" />
              Add Department
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Department Name *
              </Label>
              <Input
                placeholder="e.g. Marketing"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Description
              </Label>
              <Input
                placeholder="Brief description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Branch</Label>
                <Select
                  value={form.branch}
                  onValueChange={(v) => setForm((f) => ({ ...f, branch: v }))}
                >
                  <SelectTrigger className="h-9 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Department Head
                </Label>
                <Select
                  value={form.head}
                  onValueChange={(v) => setForm((f) => ({ ...f, head: v }))}
                >
                  <SelectTrigger className="h-9 border-border">
                    <SelectValue placeholder="Select head" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANAGERS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-hover text-brand-foreground"
              onClick={handleCreate}
              disabled={!form.name}
            >
              Add Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editDept && (
        <Dialog open={!!editDept} onOpenChange={() => setEditDept(null)}>
          <DialogContent className="max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Edit size={18} className="text-brand" />
                Edit Department
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Department Name
                </Label>
                <Input
                  value={editDept.name}
                  onChange={(e) =>
                    setEditDept((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                  className="h-9 border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Description
                </Label>
                <Input
                  value={editDept.description}
                  onChange={(e) =>
                    setEditDept((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                  className="h-9 border-border"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Branch
                  </Label>
                  <Select
                    value={editDept.branch}
                    onValueChange={(v) =>
                      setEditDept((d) => (d ? { ...d, branch: v } : d))
                    }
                  >
                    <SelectTrigger className="h-9 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Department Head
                  </Label>
                  <Select
                    value={editDept.head}
                    onValueChange={(v) =>
                      setEditDept((d) => (d ? { ...d, head: v } : d))
                    }
                  >
                    <SelectTrigger className="h-9 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MANAGERS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => setEditDept(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand-hover text-brand-foreground"
                onClick={handleSaveEdit}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
