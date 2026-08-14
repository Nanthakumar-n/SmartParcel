'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md border-red-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            An unexpected error occurred while loading this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-xs font-mono bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 truncate">
            {error.message || 'Unknown Application Error'}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
          <Button size="sm" onClick={() => reset()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
