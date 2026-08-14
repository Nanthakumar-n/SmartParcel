'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tenantRegisterSchema, type TenantRegisterInput } from '@/lib/validations/auth';
import { registerTenantAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Lock, Mail, Phone, MapPin, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

// Common Indian States list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab',
  'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ companyName: string; slug: string } | null>(null);

  const form = useForm<TenantRegisterInput>({
    resolver: zodResolver(tenantRegisterSchema),
    defaultValues: {
      companyName: '',
      slug: '',
      gstin: '',
      contactPhone: '',
      addressLine1: '',
      city: '',
      state: 'Maharashtra',
      pinCode: '',
      fullName: '',
      email: '',
      password: '',
    },
  });

  // Auto-generate slug from company name if not manually modified
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue('companyName', val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    form.setValue('slug', generatedSlug, { shouldValidate: true });
  };

  const onSubmit = (data: TenantRegisterInput) => {
    setFormErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value || '');
      });

      const result = await registerTenantAction(formData);

      if (!result.success) {
        if (result.error._form) {
          setFormErrorMsg(result.error._form.join(', '));
        } else {
          // Set field errors
          Object.entries(result.error).forEach(([field, messages]) => {
            form.setError(field as keyof TenantRegisterInput, {
              message: messages[0],
            });
          });
        }
      } else {
        setSuccessInfo({
          companyName: data.companyName,
          slug: result.data.tenantSlug,
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    });
  };

  if (successInfo) {
    return (
      <Card className="w-full max-w-lg shadow-md border-slate-200">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Welcome to SmartParcel!</h2>
          <p className="text-sm text-slate-600">
            <strong>{successInfo.companyName}</strong> has been registered successfully.
          </p>
          <div className="bg-slate-50 p-3 rounded-md text-xs text-slate-600 border">
            Your customer booking portal is active at:{' '}
            <code className="text-blue-600 font-semibold">smartparcel.in/book/{successInfo.slug}</code>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to your dashboard...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg border-slate-200 bg-white">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Register Fleet Company
          </CardTitle>
          <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-200">
            Fleet Owner Sign-Up
          </span>
        </div>
        <CardDescription className="text-sm text-slate-500">
          Create your company workspace and administrative account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {formErrorMsg && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Failed</AlertTitle>
            <AlertDescription>{formErrorMsg}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Company Profile */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b pb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>1. Logistics Company Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Company / Transport Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Sharma Roadways Logistics"
                          {...field}
                          onChange={handleCompanyNameChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Workspace URL Slug *</FormLabel>
                      <FormControl>
                        <div className="flex items-center rounded-md border border-input bg-slate-50 px-3 py-1">
                          <span className="text-xs text-slate-500 select-none mr-1">
                            smartparcel.in/book/
                          </span>
                          <input
                            type="text"
                            className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none"
                            placeholder="sharma-logistics"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px]">
                        Used for your company public customer booking page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Phone *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input className="pl-9" placeholder="9876543210" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="27ABCDE1234F1Z5" maxLength={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Head Office Address *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input className="pl-9" placeholder="Plot 42, Transport Nagar, APMC Yard" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...field}
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pinCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="400001" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Section 2: Fleet Owner Account */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b pb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>2. Fleet Owner (Admin) Account</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Your Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ramesh Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input className="pl-9" type="email" placeholder="ramesh@sharmaroadways.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Create Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input className="pl-9" type="password" placeholder="••••••••" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px]">Min. 8 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold shadow-sm mt-4"
              disabled={isPending}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Workspace...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Complete Registration & Launch Workspace
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center border-t py-4 text-xs text-slate-500">
        Already have a registered workspace?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline ml-1">
          Log in here
        </Link>
      </CardFooter>
    </Card>
  );
}
