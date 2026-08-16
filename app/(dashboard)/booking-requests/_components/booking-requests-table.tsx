'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Check, X, Loader2, Phone, Info } from 'lucide-react';
import { toast } from 'sonner';
import { rejectBookingSchema, type RejectBookingInput } from '@/lib/validations/booking-request';
import { rejectBookingRequestAction } from '../actions';
import type { BookingRequestRow } from '@/lib/db/booking-requests';
import { formatDateIST } from '@/lib/utils/format-date';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';

interface BookingRequestsTableProps {
  initialRequests: BookingRequestRow[];
}

export function BookingRequestsTable({ initialRequests }: BookingRequestsTableProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<BookingRequestRow[]>(initialRequests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Rejection Dialog states
  const [rejectingRequest, setRejectingRequest] = useState<BookingRequestRow | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RejectBookingInput>({
    resolver: zodResolver(rejectBookingSchema),
    defaultValues: {
      rejection_reason: '',
    },
  });

  const onRejectSubmit = async (data: RejectBookingInput) => {
    if (!rejectingRequest) return;
    
    startTransition(async () => {
      try {
        const res = await rejectBookingRequestAction(rejectingRequest.id, data);
        if (res.success) {
          toast.success('Booking request rejected.');
          setRejectingRequest(null);
          reset();
        } else {
          if (res.error) {
            Object.entries(res.error).forEach(([field, messages]) => {
              const errList = messages as string[];
              if (field === '_form') {
                toast.error(errList[0]);
              } else {
                setError(field as keyof RejectBookingInput, {
                  message: errList[0],
                });
              }
            });
          }
        }
      } catch {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  const handleAccept = (req: BookingRequestRow) => {
    router.push(`/lorry-receipts/new?booking_id=${req.id}`);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus =
      statusFilter === 'ALL' || req.status === statusFilter;

    const searchTerm = search.toLowerCase().trim();
    const custName = req.customer_name.toLowerCase();
    const custPhone = req.customer_phone.toLowerCase();
    const origin = req.origin_city.toLowerCase();
    const dest = req.destination_city.toLowerCase();
    const ref = req.booking_ref.toLowerCase();

    const matchesSearch =
      searchTerm === '' ||
      custName.includes(searchTerm) ||
      custPhone.includes(searchTerm) ||
      origin.includes(searchTerm) ||
      dest.includes(searchTerm) ||
      ref.includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by customer name, phone, cities, or reference..."
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
                All Requests
              </SelectItem>
              <SelectItem value="PENDING" className="text-xs">
                Pending Review
              </SelectItem>
              <SelectItem value="ACCEPTED" className="text-xs">
                Accepted
              </SelectItem>
              <SelectItem value="REJECTED" className="text-xs">
                Rejected
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Reference</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Customer Details</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Route Requested</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Goods Description</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                  No booking requests match the criteria. Share the portal link with customers.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => (
                <TableRow key={req.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="text-xs text-slate-600">
                    {formatDateIST(req.created_at)}
                  </TableCell>
                  <TableCell className="text-xs font-bold font-mono text-slate-900">
                    {req.booking_ref}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 block">{req.customer_name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {formatPhoneDisplay(req.customer_phone)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <div className="flex items-center gap-1 font-medium">
                      <span>{req.origin_city}</span>
                      <span className="text-slate-400">→</span>
                      <span>{req.destination_city}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate text-slate-600">
                    <div className="space-y-0.5">
                      <span className="block truncate">{req.goods_description}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {req.quantity} items | {req.weight_kg ? `${req.weight_kg} kg` : 'Weight N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        req.status === 'PENDING'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : req.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="xs"
                          onClick={() => handleAccept(req)}
                          className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Accept</span>
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setRejectingRequest(req)}
                          className="h-7 text-[10px] text-red-600 border-red-200 hover:bg-red-50 font-semibold flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    ) : req.status === 'ACCEPTED' ? (
                      <span className="text-[11px] text-slate-400 italic font-medium">
                        Digitized waybill issued
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400 italic group relative">
                        <span>Rejected</span>
                        {req.rejection_reason && (
                          <div className="relative cursor-pointer">
                            <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                            <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block w-48 bg-slate-900 text-white text-[10px] rounded p-2 font-sans not-italic shadow-md">
                              Reason: {req.rejection_reason}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Modal */}
      <Dialog
        open={rejectingRequest !== null}
        onOpenChange={(val) => {
          if (!val) {
            setRejectingRequest(null);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">Reject Booking Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a clear reason for rejecting the booking request from{' '}
              <span className="font-bold text-slate-900">{rejectingRequest?.customer_name}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onRejectSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rejection_reason" className="text-xs font-semibold text-slate-700">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection_reason"
                placeholder="e.g. Origin hub is closed for maintenance, or weight limit exceeded..."
                {...register('rejection_reason')}
                disabled={isPending}
                className="text-xs resize-none h-24"
              />
              {errors.rejection_reason && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.rejection_reason.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectingRequest(null);
                  reset();
                }}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Confirm Reject'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
