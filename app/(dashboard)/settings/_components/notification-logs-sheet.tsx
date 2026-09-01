'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { NotificationLogRow } from '@/lib/db/tenant-settings';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';

interface NotificationLogsSheetProps {
  logs: NotificationLogRow[];
}

type StatusFilter = 'ALL' | 'SENT' | 'PENDING' | 'FAILED';

export function NotificationLogsSheet({ logs }: NotificationLogsSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const sentCount = useMemo(() => logs.filter((l) => l.status === 'SENT').length, [logs]);
  const failedCount = useMemo(() => logs.filter((l) => l.status === 'FAILED').length, [logs]);
  const pendingCount = useMemo(() => logs.filter((l) => l.status === 'PENDING').length, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) {
        return false;
      }

      // Search filter (phone or event type)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesPhone = (log.recipient_phone || '').toLowerCase().includes(q);
        const matchesEvent = (log.event_type || '').toLowerCase().includes(q);
        const matchesRef = (log.wati_message_id || '').toLowerCase().includes(q);
        return matchesPhone || matchesEvent || matchesRef;
      }

      return true;
    });
  }, [logs, statusFilter, searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* Top Header & KPI Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 border border-purple-200 text-purple-700 shadow-2xs">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>WhatsApp Dispatch & Delivery Logs</span>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">
                Audit Trail
              </Badge>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Immutable audit history of all automated customer notifications, waybill dispatches, and payment follow-ups.
            </p>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-1 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{sentCount} Delivered</span>
          </Badge>
          {failedCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold px-2.5 py-1 gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              <span>{failedCount} Failed</span>
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold px-2.5 py-1 gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{pendingCount} Pending</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button
            type="button"
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className={`h-8 text-xs font-medium ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white'}`}
          >
            All Logs ({logs.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'SENT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('SENT')}
            className={`h-8 text-xs font-medium ${statusFilter === 'SENT' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700'}`}
          >
            Delivered ({sentCount})
          </Button>
          {failedCount > 0 && (
            <Button
              type="button"
              variant={statusFilter === 'FAILED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('FAILED')}
              className={`h-8 text-xs font-medium ${statusFilter === 'FAILED' ? 'bg-red-700 text-white' : 'bg-white text-red-700'}`}
            >
              Failed ({failedCount})
            </Button>
          )}
          {pendingCount > 0 && (
            <Button
              type="button"
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
              className={`h-8 text-xs font-medium ${statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700'}`}
            >
              Pending ({pendingCount})
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phone, event or ref..."
            className="pl-9 bg-white text-xs h-8"
          />
        </div>
      </div>

      {/* Log Data Table */}
      {filteredLogs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
            <Send className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No Notification Logs Match Filter</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {logs.length === 0
              ? 'Automated WhatsApp alerts will appear here in real time as shipments progress through their lifecycle.'
              : 'Try clearing your search query or selecting a different status filter.'}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event Trigger</th>
                  <th className="py-3 px-4">Recipient Phone</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">WATI Message Ref</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <span className="font-semibold text-slate-800">{log.event_type}</span>
                      {log.reminder_sequence ? (
                        <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-sans font-semibold">
                          Reminder #{log.reminder_sequence}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-medium">
                      {formatPhoneDisplay(log.recipient_phone || '')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={
                          log.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                            : log.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
                            : 'bg-red-50 text-red-700 border-red-200 font-medium'
                        }
                      >
                        {log.status === 'SENT' ? 'DELIVERED' : log.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.wati_message_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {new Date(log.sent_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
