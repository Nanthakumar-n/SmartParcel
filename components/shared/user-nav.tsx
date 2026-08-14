'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/session-provider';
import { logoutAction } from '@/app/(dashboard)/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Building, Loader2 } from 'lucide-react';

export function UserNav() {
  const router = useRouter();
  const session = useSession();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push('/login');
      router.refresh();
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return (email?.[0] || 'U').toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-slate-100 border p-0 hover:bg-slate-200 cursor-pointer">
            <span className="font-semibold text-xs text-slate-700">
              {getInitials(session.fullName, session.email)}
            </span>
          </Button>
        }
      />

      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5 p-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 leading-none truncate">
                {session.fullName || session.email}
              </p>
              <Badge
                variant={session.role === 'fleet_owner' ? 'default' : 'secondary'}
                className="text-[10px] capitalize px-1.5 py-0"
              >
                {session.role === 'fleet_owner' ? 'Fleet Owner' : 'Hub Manager'}
              </Badge>
            </div>
            <p className="text-xs leading-none text-slate-500 truncate">
              {session.email}
            </p>
            {session.tenantName && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600 pt-1">
                <Building className="h-3 w-3 text-slate-400" />
                <span className="font-medium truncate">{session.tenantName}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer p-2"
          onClick={handleLogout}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
