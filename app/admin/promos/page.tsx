'use client';

import { useState } from 'react';
import { usePromoCodes, useDeletePromo } from '@/hooks/use-promo';
import { Plus, Search, Edit2, Trash2, Tag, AlertCircle, TrendingUp, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PromoDialog } from '@/components/admin/promo-dialog';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { PromoCode } from '@/types/database';

type StatusFilter = 'all' | 'active' | 'expired' | 'maxed';

export default function PromoCodesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromoCode | null>(null);

  const { data: promoCodes, isLoading, error } = usePromoCodes();
  const deletePromo = useDeletePromo();

  const getPromoStatus = (promo: PromoCode): 'active' | 'expired' | 'maxed' | 'expiring_soon' => {
    if (!promo.is_active) return 'expired';
    
    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return 'maxed';
    }
    
    if (promo.expiry_date) {
      const now = new Date();
      const expiryDate = new Date(promo.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (expiryDate < now) return 'expired';
      if (daysUntilExpiry <= 7) return 'expiring_soon';
    }
    
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'expiring_soon':
        return <Badge className="bg-yellow-500">Expiring Soon</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'maxed':
        return <Badge variant="secondary">Max Uses Reached</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredPromos = promoCodes?.filter((promo) => {
    const matchesSearch = promo.code.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getPromoStatus(promo);
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && (status === 'active' || status === 'expiring_soon');
    if (statusFilter === 'expired') return matchesSearch && status === 'expired';
    if (statusFilter === 'maxed') return matchesSearch && status === 'maxed';
    
    return matchesSearch;
  });

  const handleDelete = async () => {
    if (!deletingPromo) return;

    try {
      await deletePromo.mutateAsync(deletingPromo.id);
      toast.success(deletingPromo.used_count > 0 ? 'Promo code deactivated' : 'Promo code deleted');
      setDeletingPromo(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete promo code');
    }
  };

  const stats = {
    total: promoCodes?.length || 0,
    active: promoCodes?.filter(p => getPromoStatus(p) === 'active' || getPromoStatus(p) === 'expiring_soon').length || 0,
    totalUsage: promoCodes?.reduce((sum, p) => sum + p.used_count, 0) || 0,
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Promo Codes</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage promotional discount codes
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">Failed to load promo codes</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please refresh the page to try again
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage promotional discount codes
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promo Code
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promo Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promos</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Valid and available for use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Times promos have been used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Promo Codes</CardTitle>
          <CardDescription>
            View and manage all promotional discount codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('expired')}
                size="sm"
              >
                Expired
              </Button>
              <Button
                variant={statusFilter === 'maxed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('maxed')}
                size="sm"
              >
                Maxed Out
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-muted-foreground">Loading promo codes...</p>
            </div>
          ) : filteredPromos && filteredPromos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromos.map((promo) => {
                    const status = getPromoStatus(promo);
                    return (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {promo.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {promo.discount_type === 'percentage' 
                            ? `${promo.discount_value}%` 
                            : formatCurrency(promo.discount_value)}
                          {promo.max_discount && promo.discount_type === 'percentage' && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (max: {formatCurrency(promo.max_discount)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {promo.used_count}
                          {promo.usage_limit && ` / ${promo.usage_limit}`}
                        </TableCell>
                        <TableCell>
                          {promo.expiry_date 
                            ? new Date(promo.expiry_date).toLocaleDateString()
                            : 'No expiry'}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPromo(promo)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingPromo(promo)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground mb-2">No promo codes found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first promo code to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promo Code
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <PromoDialog
        open={isCreateDialogOpen || !!editingPromo}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingPromo(null);
          }
        }}
        promo={editingPromo}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPromo} onOpenChange={() => setDeletingPromo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo Code</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPromo && deletingPromo.used_count > 0 ? (
                <>
                  This promo code has been used <strong>{deletingPromo.used_count} time(s)</strong>.
                  It will be <strong>deactivated</strong> instead of deleted to preserve order history.
                </>
              ) : (
                <>
                  Are you sure you want to delete the promo code <strong>{deletingPromo?.code}</strong>?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPromo && deletingPromo.used_count > 0 ? 'Deactivate' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
