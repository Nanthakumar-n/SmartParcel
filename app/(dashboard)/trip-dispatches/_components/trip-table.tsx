'use client';

import React, { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FileSpreadsheet, Eye } from 'lucide-react';
import { ManifestPanel } from './manifest-panel';
import type { TripWithRelations } from '@/lib/db/trips';
import { formatDateIST } from '@/lib/utils/format-date';

interface TripTableProps {
  initialTrips: TripWithRelations[];
}

export function TripTable({ initialTrips }: TripTableProps) {
  const [trips, setTrips] = useState<TripWithRelations[]>(initialTrips);
  const [selectedTrip, setSelectedTrip] = useState<TripWithRelations | null>(null);
  const [manifestOpen, setManifestOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dynamically update listing when props change
  React.useEffect(() => {
    setTrips(initialTrips);
  }, [initialTrips]);

  // Sync selected trip with updated data if manifest is open
  React.useEffect(() => {
    if (selectedTrip && manifestOpen) {
      const updated = trips.find((t) => t.id === selectedTrip.id);
      if (updated) {
        setSelectedTrip(updated);
      }
    }
  }, [trips, selectedTrip, manifestOpen]);

  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === 'ALL' || trip.status === statusFilter;

    const searchTerm = search.toLowerCase().trim();
    const vehicleReg = trip.vehicle?.registration_number.toLowerCase() || '';
    const driverName = trip.driver?.full_name.toLowerCase() || '';
    const originCity = trip.from_hub.city.toLowerCase() || '';
    const destCity = trip.to_hub.city.toLowerCase() || '';
    const routeStr = `${originCity} ${destCity}`;

    const matchesSearch =
      searchTerm === '' ||
      vehicleReg.includes(searchTerm) ||
      driverName.includes(searchTerm) ||
      routeStr.includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by vehicle reg, driver, or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 focus-visible:bg-white"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
            <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="SCHEDULED" className="text-xs">
                Scheduled
              </SelectItem>
              <SelectItem value="IN_TRANSIT" className="text-xs">
                In Transit
              </SelectItem>
              <SelectItem value="COMPLETED" className="text-xs">
                Completed
              </SelectItem>
              <SelectItem value="CANCELLED" className="text-xs">
                Cancelled
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trips Table */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Departure</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Route Corridor</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Vehicle</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Driver</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-center">LRs Slotted</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                  No trips matches the criteria. Create an ad-hoc run to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredTrips.map((trip) => {
                const pendingCount = trip.lorry_receipts.filter(
                  (l) => l.status === 'BOOKED'
                ).length;
                const loadedCount = trip.lorry_receipts.filter(
                  (l) => l.status === 'PICKED_UP'
                ).length;
                const transitCount = trip.lorry_receipts.filter(
                  (l) => l.status === 'IN_TRANSIT'
                ).length;

                return (
                  <TableRow key={trip.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {trip.scheduled_departure
                        ? formatDateIST(trip.scheduled_departure)
                        : 'Unscheduled'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-blue-600">[{trip.from_hub.hub_code}]</span>
                        <span className="text-slate-700">{trip.from_hub.city}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-mono font-bold text-emerald-600">[{trip.to_hub.hub_code}]</span>
                        <span className="text-slate-700">{trip.to_hub.city}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold text-slate-950">
                      {trip.vehicle?.registration_number || <span className="text-slate-400 font-sans">N/A</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {trip.driver?.full_name || <span className="text-slate-400">N/A</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          trip.status === 'SCHEDULED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : trip.status === 'IN_TRANSIT'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : trip.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {trip.lorry_receipts.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-slate-900">{trip.lorry_receipts.length}</span>
                          <span className="text-[10px] text-slate-400">
                            ({pendingCount} booked, {loadedCount} loaded, {transitCount} in transit)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTrip(trip);
                          setManifestOpen(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1"
                      >
                        {trip.status === 'SCHEDULED' ? (
                          <>
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Manifest & Dispatch</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Manifest</span>
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Manifest Sheet */}
      <ManifestPanel
        trip={selectedTrip}
        open={manifestOpen}
        onOpenChange={setManifestOpen}
      />
    </div>
  );
}
