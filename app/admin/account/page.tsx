'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQueryClient } from '@tanstack/react-query';

function AccountPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const isFirstLogin = params.get('firstLogin') === '1' || me?.must_change_password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (pw !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      // Update via the user's own session — issues a refreshed JWT in place,
      // unlike the admin API which would revoke all sessions.
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: pw });
      if (updateError) {
        toast.error(updateError.message || 'Failed to change password');
        return;
      }

      // Clear the must_change_password flag so the auth gate stops redirecting.
      const res = await adminFetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error || 'Failed to update profile flag');
        return;
      }

      toast.success('Password updated');
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      const home = me?.role === 'customer_care_agent' ? '/admin/whatsapp' : '/admin';
      router.push(home);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground">{me?.name} &middot; {me?.email}</p>
      </div>

      {isFirstLogin && (
        <Alert>
          <AlertDescription>
            You must set a new password before you can use the dashboard.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <AccountPageInner />
    </Suspense>
  );
}
