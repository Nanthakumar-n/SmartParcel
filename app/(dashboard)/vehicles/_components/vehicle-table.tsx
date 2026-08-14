'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Truck,
  UserCheck,
  Edit2,
  Power,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  Wrench,
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
import { toggleVehicleStatusAction } from '../actions';
import { VehicleDialog } from './vehicle-dialog';
import type { VehicleWithDriver } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';

interface VehicleTableProps {
  initialVehicles: VehicleWithDriver[];
  drivers: DriverRow[];
}

export function VehicleTable({ initialVehicles, drivers }: VehicleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithDriver | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredVehicles = initialVehicles.filter((vehicle) => {
    if (statusFilter !== 'ALL' && vehicle.status !== statusFilter) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      vehicle.registration_number.toLowerCase().includes(term) ||
      vehicle.vehicle_type.toLowerCase().includes(term) ||
      (vehicle.driver?.full_name && vehicle.driver.full_name.toLowerCase().includes(term))
    );
  });

  const handleToggleStatus = (vehicle: VehicleWithDriver) => {
    const nextStatus = !vehicle.is_active;
    startTransition(async () => {
      try {
        const result = await toggleVehicleStatusAction(vehicle.id, nextStatus);
        if (result.success) {
          toast.success(
            `Vehicle "${vehicle.registration_number}" is now ${nextStatus ? 'active' : 'inactive'}`
          );
        } else {
          toast.error(
            result.error._form?.join(', ') || 'Failed to update vehicle status'
          );
        }
      } catch {
        toast.error('Failed to update vehicle status');
      }
    });
  };

  const handleEdit = (vehicle: VehicleWithDriver) => {
    setEditingVehicle(vehicle);
    setIsEditDialogOpen(true);
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case 'TRUCK':
        return 'Heavy Truck';
      case 'MINI_TRUCK':
        return 'Mini Truck';
      case 'TEMPO':
        return 'Tempo / Ace';
      default:
        return type;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 w-fit font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>Available</span>
          </Badge>
        );
      case 'IN_TRANSIT':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 flex items-center gap-1 w-fit font-medium">
            <Activity className="h-3 w-3" />
            <span>In Transit</span>
          </Badge>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 flex items-center gap-1 w-fit font-medium">
            <Wrench className="h-3 w-3" />
            <span>Maintenance</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by registration number, driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          <Button
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className={statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'}
          >
            All ({initialVehicles.length})
          </Button>
          <Button
            variant={statusFilter === 'AVAILABLE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('AVAILABLE')}
            className={statusFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-slate-600'}
          >
            Available ({initialVehicles.filter((v) => v.status === 'AVAILABLE').length})
          </Button>
          <Button
            variant={statusFilter === 'IN_TRANSIT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={statusFilter === 'IN_TRANSIT' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600'}
          >
            In Transit ({initialVehicles.filter((v) => v.status === 'IN_TRANSIT').length})
          </Button>
          <Button
            variant={statusFilter === 'UNDER_MAINTENANCE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('UNDER_MAINTENANCE')}
            className={statusFilter === 'UNDER_MAINTENANCE' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-slate-600'}
          >
            Maintenance ({initialVehicles.filter((v) => v.status === 'UNDER_MAINTENANCE').length})
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Vehicle Number</TableHead>
              <TableHead className="font-bold text-slate-700">Type & Capacity</TableHead>
              <TableHead className="font-bold text-slate-700">Assigned Driver</TableHead>
              <TableHead className="font-bold text-slate-700">Operational Status</TableHead>
              <TableHead className="w-[90px] font-bold text-slate-700">Fleet Active</TableHead>
              <TableHead className="w-[80px] text-right font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Truck className="h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-700">No vehicles found</p>
                    <p className="text-xs text-slate-400">
                      {searchTerm
                        ? 'Try refining your search query'
                        : 'Click "Add New Vehicle" to register trucks in your fleet'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Registration Number */}
                  <TableCell>
                    <div className="font-mono font-bold text-slate-900 tracking-wider">
                      {vehicle.registration_number}
                    </div>
                  </TableCell>

                  {/* Vehicle Type & Capacity */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-700 text-xs font-semibold">
                        {getVehicleTypeLabel(vehicle.vehicle_type)}
                      </Badge>
                      {vehicle.capacity_tonnes && (
                        <span className="text-xs font-medium text-slate-600">
                          {Number(vehicle.capacity_tonnes)} Tonnes
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Default Driver */}
                  <TableCell>
                    {vehicle.driver ? (
                      <div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 text-sm">
                          <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                          <span>{vehicle.driver.full_name}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {formatPhoneDisplay(vehicle.driver.phone)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </TableCell>

                  {/* Operational Status */}
                  <TableCell>{renderStatusBadge(vehicle.status)}</TableCell>

                  {/* Fleet Active */}
                  <TableCell>
                    {vehicle.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 w-fit font-medium text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1 w-fit font-medium text-[11px]">
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
                          Manage Vehicle
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(vehicle)} className="cursor-pointer">
                          <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(vehicle)}
                          disabled={isPending}
                          className={`cursor-pointer ${
                            vehicle.is_active ? 'text-amber-600 focus:text-amber-700' : 'text-emerald-600 focus:text-emerald-700'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5 mr-2" />
                          <span>{vehicle.is_active ? 'Deactivate Vehicle' : 'Activate Vehicle'}</span>
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
      <VehicleDialog
        vehicle={editingVehicle}
        drivers={drivers}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingVehicle(null);
        }}
      />
    </div>
  );
}
