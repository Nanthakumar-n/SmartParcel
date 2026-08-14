'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Phone,
  MapPin,
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
import { toggleHubStatusAction } from '../actions';
import { HubDialog } from './hub-dialog';
import type { HubRow } from '@/lib/db/hubs';

interface HubTableProps {
  initialHubs: HubRow[];
}

export function HubTable({ initialHubs }: HubTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingHub, setEditingHub] = useState<HubRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredHubs = initialHubs.filter((hub) => {
    // Status filter
    if (statusFilter === 'ACTIVE' && !hub.is_active) return false;
    if (statusFilter === 'INACTIVE' && hub.is_active) return false;

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      hub.hub_code.toLowerCase().includes(term) ||
      hub.name.toLowerCase().includes(term) ||
      (hub.city && hub.city.toLowerCase().includes(term)) ||
      (hub.state && hub.state.toLowerCase().includes(term)) ||
      (hub.pin_code && hub.pin_code.includes(term)) ||
      (hub.contact_phone && hub.contact_phone.includes(term))
    );
  });

  const handleToggleStatus = (hub: HubRow) => {
    const nextStatus = !hub.is_active;
    startTransition(async () => {
      try {
        const result = await toggleHubStatusAction(hub.id, nextStatus);
        if (result.success) {
          toast.success(
            `Hub "${hub.name}" is now ${nextStatus ? 'active' : 'inactive'}`
          );
        } else {
          toast.error(
            result.error._form?.join(', ') || 'Failed to update hub status'
          );
        }
      } catch {
        toast.error('Failed to update hub status');
      }
    });
  };

  const handleEdit = (hub: HubRow) => {
    setEditingHub(hub);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by code, hub name, city, PIN..."
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
            All ({initialHubs.length})
          </Button>
          <Button
            variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ACTIVE')}
            className={statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-slate-600'}
          >
            Active ({initialHubs.filter((h) => h.is_active).length})
          </Button>
          <Button
            variant={statusFilter === 'INACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('INACTIVE')}
            className={statusFilter === 'INACTIVE' ? 'bg-slate-700 text-white' : 'text-slate-600'}
          >
            Inactive ({initialHubs.filter((h) => !h.is_active).length})
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[120px] font-bold text-slate-700">Hub Code</TableHead>
              <TableHead className="font-bold text-slate-700">Branch Name</TableHead>
              <TableHead className="font-bold text-slate-700">Location</TableHead>
              <TableHead className="font-bold text-slate-700">Contact</TableHead>
              <TableHead className="w-[100px] font-bold text-slate-700">Status</TableHead>
              <TableHead className="w-[80px] text-right font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-700">No hub branches found</p>
                    <p className="text-xs text-slate-400">
                      {searchTerm
                        ? 'Try refining your search query'
                        : 'Click "Add New Hub" to set up your first logistics branch'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredHubs.map((hub) => (
                <TableRow key={hub.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Hub Code */}
                  <TableCell className="font-mono font-bold text-blue-700">
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 font-mono font-bold tracking-wider">
                      {hub.hub_code}
                    </Badge>
                  </TableCell>

                  {/* Hub Name */}
                  <TableCell>
                    <div className="font-semibold text-slate-900">{hub.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[260px]">
                      {hub.address_line1 || 'No street address'}
                    </div>
                  </TableCell>

                  {/* Location */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {hub.city || '—'}, {hub.state || '—'}
                      </span>
                    </div>
                    {hub.pin_code && (
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        PIN: {hub.pin_code}
                      </div>
                    )}
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    {hub.contact_phone ? (
                      <a
                        href={`tel:${hub.contact_phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatPhoneDisplay(hub.contact_phone)}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {hub.is_active ? (
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
                          Manage Branch
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(hub)} className="cursor-pointer">
                          <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(hub)}
                          disabled={isPending}
                          className={`cursor-pointer ${
                            hub.is_active ? 'text-amber-600 focus:text-amber-700' : 'text-emerald-600 focus:text-emerald-700'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5 mr-2" />
                          <span>{hub.is_active ? 'Deactivate Hub' : 'Activate Hub'}</span>
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
      <HubDialog
        hub={editingHub}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingHub(null);
        }}
      />
    </div>
  );
}
