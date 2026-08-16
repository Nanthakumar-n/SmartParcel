import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantBySlug } from '@/lib/db/tenants';
import { BookingFormClient } from './_components/booking-form-client';

interface PublicBookingPageProps {
  params: {
    'tenant-slug': string;
  };
}

export async function generateMetadata({
  params,
}: PublicBookingPageProps): Promise<Metadata> {
  const slug = params['tenant-slug'];
  const supabase = createAdminClient();
  const tenant = await getTenantBySlug(supabase, slug);

  return {
    title: tenant
      ? `Book Shipment | ${tenant.name}`
      : 'Book Shipment | SmartParcel',
    description: 'Submit an online booking request for parcel shipments.',
  };
}

export default async function PublicBookingPage({
  params,
}: PublicBookingPageProps) {
  const slug = params['tenant-slug'];
  const supabase = createAdminClient();
  const tenant = await getTenantBySlug(supabase, slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[550px] space-y-4">
        {/* Branding header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-600">
            <span>Powered by SmartParcel</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {tenant.name}
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Submit your parcel shipment details below to request a digital waybill (Builty).
          </p>
        </div>

        {/* Client-side form */}
        <BookingFormClient companyName={tenant.name} tenantSlug={tenant.slug} />
      </div>
    </div>
  );
}
