'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Edit2,
  Users as UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserDialog } from './user-dialog';
import { toggleUserStatusAction } from '../actions';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import type { UserWithHubs } from '@/lib/db/users';
import type { HubRow } from '@/lib/db/hubs';

interface UserTableProps {
  initialUsers: UserWithHubs[];
  hubs: HubRow[];
}

export function UserTable({ initialUsers, hubs }: UserTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'ALL' && u.user_role !== roleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'ACTIVE' && !u.is_active) return false;
      if (statusFilter === 'INACTIVE' && u.is_active) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = u.full_name?.toLowerCase().includes(query);
        const emailMatch = u.email?.toLowerCase().includes(query);
        const phoneMatch = u.phone?.toLowerCase().includes(query);
        const hubMatch = u.user_hub_assignments?.some(
          (a) =>
            a.hub?.hub_code?.toLowerCase().includes(query) ||
            a.hub?.name?.toLowerCase().includes(query) ||
            a.hub?.city?.toLowerCase().includes(query)
        );

        return nameMatch || emailMatch || phoneMatch || hubMatch;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: newStatus } : u))
    );

    const result = await toggleUserStatusAction(id, newStatus);
    if (!result.success) {
      // Revert
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: currentStatus } : u))
      );
      toast.error('Failed to update user status.');
    } else {
      toast.success(newStatus ? 'User activated.' : 'User deactivated.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, phone, hub..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[130px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Roles
                  </SelectItem>
                  <SelectItem value="hub_manager" className="text-xs text-blue-600 font-medium">
                    Hub Managers
                  </SelectItem>
                  <SelectItem value="fleet_owner" className="text-xs text-purple-600 font-medium">
                    Fleet Owners
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[110px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Status
                  </SelectItem>
                  <SelectItem value="ACTIVE" className="text-xs text-emerald-600 font-medium">
                    Active
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-xs text-slate-500">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Team Member
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Contact
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Role
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Branch Assignments
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-2">
                        <UsersIcon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No users found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'Try clearing or changing your search filters.'
                          : 'Invite your first Hub Manager to start managing branch operations.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const isOwner = user.user_role === 'fleet_owner';
                  const assignments = user.user_hub_assignments ?? [];

                  return (
                    <TableRow
                      key={user.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & Initials */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isOwner
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {user.full_name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {user.full_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{user.phone ? formatPhoneDisplay(user.phone) : '—'}</span>
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="py-3.5">
                        {isOwner ? (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-xs flex items-center gap-1 w-fit"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>Fleet Owner</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs flex items-center gap-1 w-fit"
                          >
                            <Building2 className="h-3 w-3" />
                            <span>Hub Manager</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Branch Assignments */}
                      <TableCell className="py-3.5 max-w-xs">
                        {isOwner ? (
                          <span className="text-xs text-slate-500 italic">
                            All Branches (Organization Admin)
                          </span>
                        ) : assignments.length === 0 ? (
                          <span className="text-xs text-amber-600 font-medium">
                            No branches assigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignments.map((assignment) => (
                              <Badge
                                key={assignment.hub_id}
                                variant="secondary"
                                className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-normal py-0"
                              >
                                <span className="font-mono font-bold text-blue-700 mr-1">
                                  [{assignment.hub?.hub_code}]
                                </span>
                                <span>{assignment.hub?.city || assignment.hub?.name}</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      {/* Active Status */}
                      <TableCell className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              user.is_active ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() =>
                              handleToggleStatus(user.id, user.is_active)
                            }
                          />
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 text-right">
                        <UserDialog
                          user={user}
                          hubs={hubs}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" />
                              <span>Edit</span>
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
