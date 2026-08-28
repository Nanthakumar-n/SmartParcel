'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Edit2, Loader2, ShieldCheck, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  inviteUserSchema,
} from '@/lib/validations/user';
import { inviteUserAction, updateUserAction } from '../actions';
import type { UserWithHubs } from '@/lib/db/users';
import type { HubRow } from '@/lib/db/hubs';

interface UserDialogProps {
  user?: UserWithHubs;
  hubs: HubRow[];
  trigger?: React.ReactElement;
}

interface UserFormData {
  full_name: string;
  email: string;
  phone: string;
  user_role: 'hub_manager' | 'fleet_owner';
  password?: string;
  assigned_hub_ids: string[];
  is_active: boolean;
}

export function UserDialog({ user, hubs, trigger }: UserDialogProps) {
  const isEditing = !!user;
  const [open, setOpen] = useState(false);

  const initialAssignedHubs =
    user?.user_hub_assignments?.map((a) => a.hub_id) ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '+91',
      user_role: (user?.user_role as 'hub_manager' | 'fleet_owner') ?? 'hub_manager',
      password: 'SmartParcel@123',
      assigned_hub_ids: initialAssignedHubs,
      is_active: user?.is_active ?? true,
    },
  });

  const selectedRole = watch('user_role');
  const assignedHubIds = watch('assigned_hub_ids') || [];

  const handleToggleHub = (
    hubId: string,
    currentHubs: string[],
    onChange: (hubs: string[]) => void
  ) => {
    if (currentHubs.includes(hubId)) {
      onChange(currentHubs.filter((id) => id !== hubId));
    } else {
      onChange([...currentHubs, hubId]);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      const result = isEditing
        ? await updateUserAction(user.id, {
            full_name: data.full_name,
            phone: data.phone,
            user_role: data.user_role,
            assigned_hub_ids: data.assigned_hub_ids,
            is_active: data.is_active,
          })
        : await inviteUserAction({
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
            user_role: data.user_role,
            password: data.password || 'SmartParcel@123',
            assigned_hub_ids: data.assigned_hub_ids,
            is_active: data.is_active,
          });

      if (result.success) {
        toast.success(
          isEditing
            ? 'User profile updated successfully.'
            : 'User invited and registered successfully.'
        );
        setOpen(false);
        if (!isEditing) {
          reset();
        }
      } else {
        if (result.error) {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (field === '_form') {
              toast.error(messages[0]);
            } else {
              setError(field as keyof UserFormData, {
                message: messages[0],
              });
            }
          });
        }
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
              <UserPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </Button>
          }
        />
      )}

      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              {isEditing ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Team Member' : 'Invite Team Member'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? 'Update user roles and branch access permissions.'
                  : 'Add a new Hub Manager or Fleet Owner to your organization.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-xs font-semibold text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="e.g. Ramesh Patil"
              {...register('full_name')}
              disabled={isSubmitting}
              className="text-xs"
            />
            {errors.full_name && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email Address {!isEditing && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@fleet.in"
                {...register('email')}
                disabled={isEditing || isSubmitting}
                className="text-xs"
              />
              {errors.email && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.email.message}
                </p>
              )}
              {isEditing && (
                <p className="text-[10px] text-slate-400">
                  Email is the user&apos;s unique login identifier
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                {...register('phone')}
                disabled={isSubmitting}
                className="text-xs"
              />
              {errors.phone && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              User Role <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="user_role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => field.onChange(val as 'hub_manager' | 'fleet_owner')}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full text-xs">
                    {field.value === 'hub_manager' ? (
                      'Hub Manager'
                    ) : field.value === 'fleet_owner' ? (
                      'Fleet Owner'
                    ) : (
                      <SelectValue placeholder="Select user role" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hub_manager" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <div>
                          <span className="font-semibold block">Hub Manager</span>
                          <span className="text-[10px] text-slate-400">
                            Manages LRs and dispatches at assigned branches
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="fleet_owner" className="text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                        <div>
                          <span className="font-semibold block">Fleet Owner</span>
                          <span className="text-[10px] text-slate-400">
                            Full administrative access across all hubs & settings
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.user_role && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.user_role.message}
              </p>
            )}
          </div>

          {/* Hub Branch Assignment (Only for Hub Managers) */}
          {selectedRole === 'hub_manager' && (
            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Assigned Hub Branches</span>
                  <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  {assignedHubIds.length} selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select which branches this manager can create LRs and receive dispatches for:
              </p>

              <Controller
                control={control}
                name="assigned_hub_ids"
                render={({ field }) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
                    {hubs.map((hub) => {
                      const isChecked = field.value?.includes(hub.id) ?? false;
                      return (
                        <div
                          key={hub.id}
                          onClick={() =>
                            handleToggleHub(hub.id, field.value ?? [], field.onChange)
                          }
                          className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleToggleHub(hub.id, field.value ?? [], field.onChange)
                            }
                            className="mt-0.5"
                          />
                          <div className="truncate">
                            <div className="font-semibold flex items-center gap-1 truncate">
                              <span className="font-mono text-blue-700">[{hub.hub_code}]</span>
                              <span className="truncate">{hub.city}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {hub.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
              {errors.assigned_hub_ids && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.assigned_hub_ids.message}
                </p>
              )}
            </div>
          )}

          {/* Initial Password Notice for new users */}
          {!isEditing && (
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900 space-y-1">
              <span className="font-semibold block">Default Initial Password</span>
              <p className="text-[11px] text-blue-700">
                A default password (<code className="font-mono bg-blue-100 px-1 py-0.5 rounded font-bold">SmartParcel@123</code>) will be set. The user can sign in immediately.
              </p>
            </div>
          )}

          {/* Status Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-slate-800">
                Account Status
              </Label>
              <p className="text-[11px] text-slate-500">
                Active users can log in and perform actions for your fleet
              </p>
            </div>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : isEditing ? (
                'Update User'
              ) : (
                'Invite User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
