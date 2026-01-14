'use client';

import { useState } from 'react';
import { usePromoCodes, useDeletePromo } from '@/hooks/use-promo';
import { 
  useInfluencers, 
  useDeleteInfluencer, 
  usePromoAnalytics,
  useCustomerLTV,
  usePayouts,
  useGeneratePayouts,
  useUpdatePayout,
} from '@/hooks/use-influencer';
import { 
  Plus, Search, Edit2, Trash2, Tag, AlertCircle, TrendingUp, Percent,
  Users, DollarSign, BarChart3, UserPlus, ExternalLink, Wallet, CheckCircle,
  Clock, ChevronRight, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PromoDialog } from '@/components/admin/promo-dialog';
import { InfluencerDialog } from '@/components/admin/influencer-dialog';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { PromoCode, Influencer } from '@/types/database';

type StatusFilter = 'all' | 'active' | 'expired' | 'maxed';
type MainTab = 'promos' | 'influencers' | 'analytics' | 'payouts';

export default function PromoCodesPage() {
  const [mainTab, setMainTab] = useState<MainTab>('promos');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInfluencerDialogOpen, setIsInfluencerDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromoCode | null>(null);
  const [deletingInfluencer, setDeletingInfluencer] = useState<Influencer | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
  const [payoutMonth, setPayoutMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: promoCodes, isLoading, error } = usePromoCodes();
  const deletePromo = useDeletePromo();
  
  // Influencer hooks
  const { data: influencers, isLoading: influencersLoading } = useInfluencers(true);
  const deleteInfluencer = useDeleteInfluencer();
  
  // Analytics hooks
  const { data: promoAnalytics, isLoading: analyticsLoading } = usePromoAnalytics(analyticsPeriod);
  const { data: customerLTV, isLoading: ltvLoading } = useCustomerLTV({ limit: 20 });
  
  // Payout hooks
  const { data: payoutsData, isLoading: payoutsLoading } = usePayouts({});
  const generatePayouts = useGeneratePayouts();
  const updatePayout = useUpdatePayout();

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

  const handleDeleteInfluencer = async () => {
    if (!deletingInfluencer) return;
    try {
      await deleteInfluencer.mutateAsync(deletingInfluencer.id);
      toast.success('Influencer removed');
      setDeletingInfluencer(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove influencer');
    }
  };

  const handleGeneratePayouts = async () => {
    try {
      const result = await generatePayouts.mutateAsync(payoutMonth);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate payouts');
    }
  };

  const handleMarkPaid = async (payoutId: string) => {
    try {
      await updatePayout.mutateAsync({ payout_id: payoutId, status: 'paid' });
      toast.success('Payout marked as paid');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payout');
    }
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
        <div className="flex gap-2">
          {(mainTab === 'influencers' || mainTab === 'promos') && (
            <Button onClick={() => {
              setMainTab('influencers');
              setIsInfluencerDialogOpen(true);
            }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Influencer
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="promos" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Promo Codes
          </TabsTrigger>
          <TabsTrigger value="influencers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Influencers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Payouts
          </TabsTrigger>
        </TabsList>

        {/* PROMOS TAB */}
        <TabsContent value="promos" className="space-y-6">
          {/* Warning for promos without influencers */}
          {promoCodes && promoCodes.some(p => !p.influencer_id) && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800">Some promo codes lack influencer tracking</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Promo codes without an influencer won't track commissions or customer attribution. 
                      To enable full analytics, create new promos via the <strong>Influencers</strong> tab.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {promoCodes.filter(p => !p.influencer_id).map(p => (
                        <Badge key={p.id} variant="outline" className="border-orange-300 text-orange-700">
                          {p.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  : 'Add an influencer to create a tracked promo code'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => {
                  setMainTab('influencers');
                  setIsInfluencerDialogOpen(true);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Influencer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        {/* INFLUENCERS TAB */}
        <TabsContent value="influencers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Influencers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{influencers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {influencers?.filter((i: any) => i.is_active).length || 0} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(influencers?.reduce((sum: number, i: any) => sum + (i.performance?.total_revenue || 0), 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Generated by influencers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(influencers?.reduce((sum: number, i: any) => sum + (i.performance?.total_commission || 0), 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Owed to influencers</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manage Influencers</CardTitle>
              <CardDescription>View and manage influencer partnerships</CardDescription>
            </CardHeader>
            <CardContent>
              {influencersLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                  <p className="mt-4 text-muted-foreground">Loading influencers...</p>
                </div>
              ) : influencers && influencers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Influencer</TableHead>
                      <TableHead>Promo Code</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {influencers.map((influencer: any) => (
                      <TableRow key={influencer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{influencer.name}</p>
                            <p className="text-xs text-muted-foreground">{influencer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {influencer.promo_codes?.[0]?.code || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell>
                          {influencer.commission_type === 'percentage'
                            ? `${influencer.commission_value}%`
                            : formatCurrency(influencer.commission_value)}
                        </TableCell>
                        <TableCell>{influencer.performance?.total_orders || 0}</TableCell>
                        <TableCell>{formatCurrency(influencer.performance?.total_revenue || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={influencer.is_active ? 'default' : 'secondary'}>
                            {influencer.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Copy Dashboard Link"
                              onClick={() => {
                                const dashboardUrl = `${window.location.origin}/influencer/dashboard?token=${influencer.access_token}`;
                                navigator.clipboard.writeText(dashboardUrl);
                                toast.success('Dashboard link copied to clipboard');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingInfluencer(influencer)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingInfluencer(influencer)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">No influencers yet</p>
                  <p className="text-sm text-muted-foreground mb-6">Add your first influencer to start tracking</p>
                  <Button onClick={() => setIsInfluencerDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Influencer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Promo Code Analytics</h2>
            <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {analyticsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-muted-foreground">Loading analytics...</p>
            </div>
          ) : promoAnalytics ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{promoAnalytics.totals.total_uses}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(promoAnalytics.totals.total_revenue)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Discounts Given</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(promoAnalytics.totals.total_discount)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{promoAnalytics.totals.total_new_customers}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Promo Performance</CardTitle>
                  <CardDescription>Performance breakdown by promo code</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Uses</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>New Customers</TableHead>
                        <TableHead>AOV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promoAnalytics.promos.map((promo: any) => (
                        <TableRow key={promo.promo_code_id}>
                          <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                          <TableCell>{promo.influencer_name || '-'}</TableCell>
                          <TableCell>{promo.period_uses}</TableCell>
                          <TableCell>{formatCurrency(promo.period_revenue)}</TableCell>
                          <TableCell>{formatCurrency(promo.period_discount)}</TableCell>
                          <TableCell>{promo.period_new_customers}</TableCell>
                          <TableCell>{formatCurrency(promo.period_avg_order_value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Customer LTV Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Lifetime Value</CardTitle>
                  <CardDescription>Highest value customers attributed to influencers</CardDescription>
                </CardHeader>
                <CardContent>
                  {ltvLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : customerLTV?.customers && customerLTV.customers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Lifetime Value</TableHead>
                          <TableHead>AOV</TableHead>
                          <TableHead>Attributed To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerLTV.customers.slice(0, 10).map((customer: any) => (
                          <TableRow key={customer.customer_phone}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.customer_name || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{customer.customer_phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>{customer.total_orders}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(customer.lifetime_value)}</TableCell>
                            <TableCell>{formatCurrency(customer.avg_order_value)}</TableCell>
                            <TableCell>
                              {customer.attributed_influencer_name ? (
                                <Badge variant="outline">{customer.attributed_influencer_name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No customer data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No analytics data available</p>
          )}
        </TabsContent>

        {/* PAYOUTS TAB */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Influencer Payouts</h2>
            <div className="flex gap-2">
              <Input
                type="month"
                value={payoutMonth}
                onChange={(e) => setPayoutMonth(e.target.value)}
                className="w-[180px]"
              />
              <Button onClick={handleGeneratePayouts} disabled={generatePayouts.isPending}>
                {generatePayouts.isPending ? 'Generating...' : 'Generate Payouts'}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payoutsData?.totals.total_payouts || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(payoutsData?.totals.pending_amount || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(payoutsData?.totals.paid_amount || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Monthly payouts to influencers</CardDescription>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="text-center py-12">Loading...</div>
              ) : payoutsData?.payouts && payoutsData.payouts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Influencer</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutsData.payouts.map((payout: any) => (
                      <TableRow key={payout.id}>
                        <TableCell>{payout.influencers?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          {new Date(payout.payout_month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </TableCell>
                        <TableCell>{payout.total_orders}</TableCell>
                        <TableCell>{formatCurrency(payout.total_revenue_generated)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payout.commission_earned)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={payout.status === 'paid' ? 'default' : payout.status === 'pending' ? 'secondary' : 'outline'}
                            className={payout.status === 'paid' ? 'bg-green-500' : ''}
                          >
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payout.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(payout.id)}
                              disabled={updatePayout.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">No payouts yet</p>
                  <p className="text-sm text-muted-foreground">Generate payouts for a month to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Promo Dialog */}
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

      {/* Create/Edit Influencer Dialog */}
      <InfluencerDialog
        open={isInfluencerDialogOpen || !!editingInfluencer}
        onOpenChange={(open) => {
          if (!open) {
            setIsInfluencerDialogOpen(false);
            setEditingInfluencer(null);
          }
        }}
        influencer={editingInfluencer}
      />

      {/* Delete Promo Confirmation Dialog */}
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

      {/* Delete Influencer Confirmation Dialog */}
      <AlertDialog open={!!deletingInfluencer} onOpenChange={() => setDeletingInfluencer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Influencer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deletingInfluencer?.name}</strong>?
              Their promo code will also be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInfluencer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
