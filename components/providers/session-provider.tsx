'use client';

import React, { createContext, useContext } from 'react';
import type { UserSession } from '@/lib/auth/session';

interface ExtendedSession extends UserSession {
  tenantName?: string;
  tenantSlug?: string;
  fullName?: string;
}

const SessionContext = createContext<ExtendedSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: ExtendedSession;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function useIsFleetOwner() {
  const session = useSession();
  return session.role === 'fleet_owner';
}

export function useIsHubManager() {
  const session = useSession();
  return session.role === 'hub_manager';
}
