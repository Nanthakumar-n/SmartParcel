'use client';

import React, { createContext, useContext } from 'react';
import type { UserSession } from '@/lib/auth/session';

export interface ExtendedSession extends UserSession {
  tenantName?: string;
  tenantSlug?: string;
  fullName?: string;
}

const defaultSession: ExtendedSession = {
  id: '',
  email: '',
  role: 'fleet_owner',
  tenantId: '',
  tenantName: 'SmartParcel Logistics',
  fullName: 'Fleet User',
};

const SessionContext = createContext<ExtendedSession>(defaultSession);

export function SessionProvider({
  session,
  children,
}: {
  session?: ExtendedSession | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session || defaultSession}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): ExtendedSession {
  const context = useContext(SessionContext);
  return context || defaultSession;
}

export function useIsFleetOwner() {
  const session = useSession();
  return session.role === 'fleet_owner';
}

export function useIsHubManager() {
  const session = useSession();
  return session.role === 'hub_manager';
}
