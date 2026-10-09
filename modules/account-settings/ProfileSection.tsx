'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Mail, Phone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useUpdatePlatformUser } from '@/store/server/features/userManagement/mutations';
import { formatUserName } from '@/lib/format-user-name';

interface ProfileSectionProps {
  onSave: () => void;
}

export function ProfileSection({ onSave }: ProfileSectionProps) {
  const { userId, userData, setUserData } = useAuthenticationStore();
  const updateUser = useUpdatePlatformUser();

  const displayName = formatUserName(userData, 'User');

  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join('') || 'U',
    [displayName],
  );

  const roleName: string =
    userData?.role?.name ||
    userData?.role?.slug ||
    userData?.roles?.[0]?.name ||
    'User';

  const profileSubtitle = [roleName, userData?.email]
    .filter(Boolean)
    .join(' · ');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setFirstName(userData?.firstName ?? '');
    setLastName(userData?.lastName ?? '');
    setEmail(userData?.email ?? '');
    setPhone(userData?.phone ?? '');
  }, [userData]);

  const handleSave = async () => {
    if (!userId) return;

    const updated = await updateUser.mutateAsync({
      id: String(userId),
      payload: {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      },
    });

    setUserData({
      ...userData,
      firstName: updated.firstName ?? firstName,
      lastName: updated.lastName ?? lastName,
      email: updated.email ?? email,
      phone: updated.phone ?? phone,
      name: formatUserName(
        {
          firstName: updated.firstName ?? firstName,
          middleName: userData?.middleName,
          lastName: updated.lastName ?? lastName,
          email: updated.email ?? email,
        },
        userData?.name,
      ),
    });
    onSave();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            Profile photo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-[18px] font-semibold text-brand-foreground">
            {userData?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userData.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:bg-surface-elevated"
              aria-label="Change photo"
            >
              <Camera size={11} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {displayName}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {profileSubtitle}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-fit border-border text-[12px] font-medium"
            >
              Change photo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            Personal information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label
                htmlFor="firstName"
                className="text-[12px] font-medium text-foreground"
              >
                First name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 border-border text-[13px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label
                htmlFor="lastName"
                className="text-[12px] font-medium text-foreground"
              >
                Last name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 border-border text-[13px]"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="email"
              className="text-[12px] font-medium text-foreground"
            >
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 border-border pl-9 text-[13px]"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="phone"
              className="text-[12px] font-medium text-foreground"
            >
              Phone
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 border-border pl-9 text-[13px]"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="role"
              className="text-[12px] font-medium text-foreground"
            >
              Role
            </Label>
            <Input
              id="role"
              value={roleName}
              disabled
              className="h-9 border-border text-[13px]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="pt-1">
        <Button
          onClick={handleSave}
          disabled={updateUser.isLoading}
          className="h-9 bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          <Save data-icon="inline-start" />
          {updateUser.isLoading ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
