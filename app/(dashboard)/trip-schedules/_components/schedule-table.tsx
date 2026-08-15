'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Clock,
  Truck,
  User,
  Calendar,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  CalendarDays,
  CheckCircle2,
  XCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScheduleDialog } from './schedule-dialog';
import {
  toggleTripScheduleStatusAction,
  deleteTripScheduleAction,
} from '../actions';
import { DAYS_OF_WEEK } from '@/lib/validations/trip-schedule';
import type { TripScheduleWithDetails } from '@/lib/db/trip-schedules';
import type { HubRow } from '@/lib/db/hubs';
import type { VehicleWithDriver } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';

interface ScheduleTableProps {
  initialSchedules: TripScheduleWithDetails[];
  hubs: HubRow[];
  vehicles: VehicleWithDriver[];
  drivers: DriverRow[];
}

export function ScheduleTable({
  initialSchedules,
  hubs,
  vehicles,
  drivers,
}: ScheduleTableProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [destFilter, setDestFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if server revalidates props
  React.useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Origin hub filter
      if (originFilter !== 'ALL' && s.from_hub_id !== originFilter) {
        return false;
      }
      // Destination hub filter
      if (destFilter !== 'ALL' && s.to_hub_id !== destFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'ACTIVE' && !s.is_active) return false;
      if (statusFilter === 'INACTIVE' && s.is_active) return false;

      // Search query (matches hub codes, hub names, vehicle number, driver name)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const originCode = s.from_hub?.hub_code?.toLowerCase() ?? '';
        const originName = s.from_hub?.name?.toLowerCase() ?? '';
        const originCity = s.from_hub?.city?.toLowerCase() ?? '';
        const destCode = s.to_hub?.hub_code?.toLowerCase() ?? '';
        const destName = s.to_hub?.name?.toLowerCase() ?? '';
        const destCity = s.to_hub?.city?.toLowerCase() ?? '';
        const vehiclePlate = s.vehicle?.registration_number?.toLowerCase() ?? '';
        const driverName = s.driver?.full_name?.toLowerCase() ?? '';

        return (
          originCode.includes(query) ||
          originName.includes(query) ||
          originCity.includes(query) ||
          destCode.includes(query) ||
          destName.includes(query) ||
          destCity.includes(query) ||
          vehiclePlate.includes(query) ||
          driverName.includes(query)
        );
      }

      return true;
    });
  }, [schedules, originFilter, destFilter, statusFilter, searchQuery]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: newStatus } : s))
    );

    const result = await toggleTripScheduleStatusAction(id, newStatus);
    if (!result.success) {
      // Revert
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: currentStatus } : s))
      );
      toast.error('Failed to update schedule status.');
    } else {
      toast.success(newStatus ? 'Schedule activated.' : 'Schedule deactivated.');
    }
  };

  const handleDelete = async () => {
    if (!deleteScheduleId) return;
    setIsDeleting(true);
    try {
      const result = await deleteTripScheduleAction(deleteScheduleId);
      if (result.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== deleteScheduleId));
        toast.success('Trip schedule deleted successfully.');
        setDeleteScheduleId(null);
      } else {
        toast.error('Failed to delete schedule.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
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
                placeholder="Search route, hub, truck, driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              {/* Origin Hub */}
              <Select value={originFilter} onValueChange={(val) => setOriginFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[130px]">
                  <SelectValue placeholder="Origin Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Origin Hubs
                  </SelectItem>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id} className="text-xs">
                      {hub.hub_code} ({hub.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Destination Hub */}
              <Select value={destFilter} onValueChange={(val) => setDestFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[130px]">
                  <SelectValue placeholder="Destination Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Destination Hubs
                  </SelectItem>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id} className="text-xs">
                      {hub.hub_code} ({hub.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[110px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Status
                  </SelectItem>
                  <SelectItem value="ACTIVE" className="text-xs text-emerald-600 font-medium">
                    Active Only
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-xs text-slate-500">
                    Inactive Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules List / Grid */}
      {filteredSchedules.length === 0 ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
              <CalendarDays className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No Trip Schedules Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchQuery || originFilter !== 'ALL' || destFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No schedules match your selected filters. Try resetting the filters.'
                : 'Create your first recurring route schedule to automate trip generation and LR slotting.'}
            </p>
            {schedules.length === 0 && (
              <div className="mt-4">
                <ScheduleDialog hubs={hubs} vehicles={vehicles} drivers={drivers} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((schedule) => {
            const daysCount = schedule.days_of_week.length;
            const isDaily = daysCount === 7;
            const isWeekdays =
              daysCount === 5 &&
              [1, 2, 3, 4, 5].every((d) => schedule.days_of_week.includes(d));

            return (
              <Card
                key={schedule.id}
                className="border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3.5">
                  {/* Route Header & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {schedule.from_hub?.city || schedule.from_hub?.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-[10px] px-1.5 py-0"
                        >
                          {schedule.from_hub?.hub_code}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900 text-sm">
                          {schedule.to_hub?.city || schedule.to_hub?.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px] px-1.5 py-0"
                        >
                          {schedule.to_hub?.hub_code}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {schedule.from_hub?.name} → {schedule.to_hub?.name}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="text-xs">
                        <ScheduleDialog
                          schedule={schedule}
                          hubs={hubs}
                          vehicles={vehicles}
                          drivers={drivers}
                          trigger={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              <span>Edit Schedule</span>
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteScheduleId(schedule.id)}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Schedule</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Operating Days */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Operating Days:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {isDaily ? 'Daily' : isWeekdays ? 'Mon - Fri' : `${daysCount} days/wk`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const active = schedule.days_of_week.includes(day.value);
                        return (
                          <span
                            key={day.value}
                            className={`flex-1 py-1 text-center rounded text-[10px] font-semibold transition-colors ${
                              active
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {day.label[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Details: Time, Vehicle, Driver */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Departure
                        </span>
                        <span className="font-mono font-medium text-slate-800">
                          {schedule.departure_time ? schedule.departure_time.slice(0, 5) : 'Flexible'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Assigned Truck
                        </span>
                        <span className="font-mono font-medium text-slate-800 truncate block">
                          {schedule.vehicle?.registration_number || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {schedule.driver && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">Driver:</span>
                      <span className="font-medium text-slate-800 truncate">
                        {schedule.driver.full_name}
                      </span>
                    </div>
                  )}

                  {/* Footer Status Switch */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {schedule.is_active ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span className="text-xs font-semibold text-slate-700">
                        {schedule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() =>
                        handleToggleStatus(schedule.id, schedule.is_active)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteScheduleId}
        onOpenChange={(open) => !open && setDeleteScheduleId(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Delete Trip Schedule?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              Are you sure you want to delete this trip schedule? Past dispatched trips will not be affected, but future recurring slots will no longer be generated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteScheduleId(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
