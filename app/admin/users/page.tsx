'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, KeyRound, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/api-client';
import { UserFormDialog } from '@/components/admin/users/user-form-dialog';
import { useCurrentUser } from '@/hooks/use-current-user';

interface StaffUser {
  id: string;
  email: string | null;
  phone: string;
  name: string;
  role: 'admin' | 'kitchen' | 'customer_care_agent';
  disabled: boolean;
  must_change_password: boolean;
  created_at: string;
}

const ROLE_LABEL: Record<StaffUser['role'], { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-orange-500/20 text-orange-300' },
  kitchen: { label: 'Kitchen', className: 'bg-blue-500/20 text-blue-300' },
  customer_care_agent: { label: 'Customer Care', className: 'bg-emerald-500/20 text-emerald-300' },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: me } = useCurrentUser();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await adminFetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return (await res.json()) as { users: StaffUser[] };
    },
  });

  const toggleDisabled = useMutation({
    mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
      const res = await adminFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await adminFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_password: newPassword }),
      });
      if (!res.ok) throw new Error('Failed to reset password');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Password reset. User must change it on next login.');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const handleResetPassword = (user: StaffUser) => {
    const pw = window.prompt(`New temporary password for ${user.name} (min 8 chars):`);
    if (!pw) return;
    if (pw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    resetPassword.mutate({ id: user.id, newPassword: pw });
  };

  if (me && me.role !== 'admin') {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage staff logins and roles.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.users ?? []).map((user) => {
                  const role = ROLE_LABEL[user.role];
                  const isMe = me?.id === user.id;
                  return (
                    <TableRow key={user.id} className={user.disabled ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">
                        {user.name} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                      <TableCell>
                        <Badge className={role.className}>{role.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.disabled ? (
                          <Badge className="bg-red-500/20 text-red-300">Disabled</Badge>
                        ) : user.must_change_password ? (
                          <Badge className="bg-yellow-500/20 text-yellow-300">Pending pw change</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-300">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(user)}
                          disabled={isMe}
                          title="Reset password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {user.disabled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleDisabled.mutate({ id: user.id, disabled: false })}
                            disabled={isMe}
                            title="Re-enable"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleDisabled.mutate({ id: user.id, disabled: true })}
                            disabled={isMe}
                            title="Disable"
                          >
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
      />
    </div>
  );
}
