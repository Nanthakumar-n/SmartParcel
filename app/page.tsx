import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Truck, ShieldCheck, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-tight">
                SmartParcel
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Fleet & Logistics Automation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium text-slate-700">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold shadow-xs">
                Register Company
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-blue-200 mb-6">
          <ShieldCheck className="h-4 w-4" />
          The Modern Operating System for Indian Transport Fleets
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-tight">
          Eliminate paper waybills. <br />
          <span className="text-primary">Automate your transport network.</span>
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mt-4 leading-relaxed">
          SmartParcel gives Indian fleet operators instant digital Lorry Receipts (LR), fast thermal printing, atomic trip dispatching, and automated To-Pay collection tracking.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
          <Link href="/register">
            <Button size="lg" className="h-12 px-6 font-semibold shadow-md gap-2">
              Register Fleet Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-12 px-6 font-semibold border-slate-300">
              Sign In to Existing Fleet
            </Button>
          </Link>
        </div>

        {/* 3 Core Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full mt-16 text-left">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Keyboard-First LR Issuance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Issue digital LRs in seconds with automatic sequential numbering and 3-inch raw thermal printouts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-md flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Atomic Trip Dispatches</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consolidate multiple LRs per truck run and transition consignment statuses reliably across branches.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-md flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Proof of Delivery & To-Pay</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Capture delivery confirmation and track cash/UPI To-Pay collections with zero revenue leakage.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} SmartParcel Technologies Pvt Ltd. Built for Indian Logistics.</span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/register" className="hover:underline">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
