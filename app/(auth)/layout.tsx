import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, FileText, Smartphone } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
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
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>Need assistance?</span>
            <span className="font-semibold text-slate-900">+91 1800-PARCEL</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left / Info column (visible on large screens) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-6 pr-4">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold w-fit border border-blue-200">
              <ShieldCheck className="h-4 w-4" />
              Built for Indian Logistics
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
              Digitize your transport fleet operations in minutes.
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Replace physical paper waybills with instant digital Lorry Receipts (LR), real-time trip tracking, and automated customer notifications.
            </p>

            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md mt-0.5">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Digital LR & 3-Inch Thermal Print</h4>
                  <p className="text-xs text-slate-500">Fast keyboard-first booking with automatic sequence numbering.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-green-100 text-green-700 rounded-md mt-0.5">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Real-Time Hub & Trip Dispatch</h4>
                  <p className="text-xs text-slate-500">Atomic trip management and destination hub receiving.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md mt-0.5">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Proof of Delivery & To-Pay Records</h4>
                  <p className="text-xs text-slate-500">Eliminate uncollected freight with transparent collection tracking.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Container Column */}
          <div className="lg:col-span-7 flex justify-center">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} SmartParcel Technologies Pvt Ltd. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span className="hover:underline cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
