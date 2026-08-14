'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  UserCheck,
  Phone,
  CreditCard,
  Edit2,
  Power,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import { toggleDriverStatusAction } from '../actions';
import { DriverDialog } from './driver-dialog';
import type { DriverRow } from '@/lib/db/drivers';

interface DriverTableProps {
  initialDrivers: DriverRow[];
}

export function DriverTable({ initialDrivers }: DriverTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredDrivers = initialDrivers.filter((driver) => {
    if (statusFilter === 'ACTIVE' && !driver.is_active) return false;
    if (statusFilter === 'INACTIVE' && driver.is_active) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      driver.full_name.toLowerCase().includes(term) ||
      driver.phone.includes(term) ||
      (driver.license_number && driver.license_number.toLowerCase().includes(term))
    );
  });

  const handleToggleStatus = (driver: DriverRow) => {
    const nextStatus = !driver.is_active;
    startTransition(async () => {
      try {
        const result = await toggleDriverStatusAction(driver.id, nextStatus);
        if (result.success) {
          toast.success(
            `Driver "${driver.full_name}" is now ${nextStatus ? 'active' : 'inactive'}`
          );
        } else {
          toast.error(
            result.error._form?.join(', ') || 'Failed to update driver status'
          );
        }
      } catch {
        toast.error('Failed to update driver status');
      }
    });
  };

  const handleEdit = (driver: DriverRow) => {
    setEditingDriver(driver);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by driver name, phone, license..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className={statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'}
          >
            All ({initialDrivers.length})
          </Button>
          <Button
            variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ACTIVE')}
            className={statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-slate-600'}
          >
            Active ({initialDrivers.filter((d) => d.is_active).length})
          </Button>
          <Button
            variant={statusFilter === 'INACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('INACTIVE')}
            className={statusFilter === 'INACTIVE' ? 'bg-slate-700 text-white' : 'text-slate-600'}
          >
            Inactive ({initialDrivers.filter((d) => !d.is_active).length})
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Driver Name</TableHead>
              <TableHead className="font-bold text-slate-700">Contact Number</TableHead>
              <TableHead className="font-bold text-slate-700">License Number</TableHead>
              <TableHead className="w-[100px] font-bold text-slate-700">Status</TableHead>
              <TableHead className="w-[80px] text-right font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserCheck className="h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-700">No driver profiles found</p>
                    <p className="text-xs text-slate-400">
                      {searchTerm
                        ? 'Try refining your search query'
                        : 'Click "Add New Driver" to add drivers for truck dispatches'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers.map((driver) => (
                <TableRow key={driver.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Name */}
                  <TableCell>
                    <div className="font-semibold text-slate-900">{driver.full_name}</div>
                  </TableCell>

                  {/* Phone */}
                  <TableCell>
                    <a
                      href={`tel:${driver.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatPhoneDisplay(driver.phone)}</span>
                    </a>
                  </TableCell>

                  {/* License */}
                  <TableCell>
                    {driver.license_number ? (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{driver.license_number}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Not recorded</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {driver.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 w-fit font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1 w-fit font-medium">
                        <XCircle className="h-3 w-3" />
                        <span>Inactive</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
                          Manage Driver
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(driver)} className="cursor-pointer">
                          <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                          <span>Edit Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(driver)}
                          disabled={isPending}
                          className={`cursor-pointer ${
                            driver.is_active ? 'text-amber-600 focus:text-amber-700' : 'text-emerald-600 focus:text-emerald-700'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5 mr-2" />
                          <span>{driver.is_active ? 'Deactivate Driver' : 'Activate Driver'}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controlled Edit Dialog */}
      <DriverDialog
        driver={editingDriver}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingDriver(null);
        }}
      />
    </div>
  );
}
