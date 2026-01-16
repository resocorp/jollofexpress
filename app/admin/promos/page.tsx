'use client';

import { useState } from 'react';
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
  Edit2, Trash2,
  Users, DollarSign, BarChart3, UserPlus, Wallet, CheckCircle,
  Copy,
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
import { InfluencerDialog } from '@/components/admin/influencer-dialog';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Influencer } from '@/types/database';

type MainTab = 'influencers' | 'analytics' | 'payouts';

export default function InfluencersPage() {
  const [mainTab, setMainTab] = useState<MainTab>('influencers');
  const [isInfluencerDialogOpen, setIsInfluencerDialogOpen] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);
  const [deletingInfluencer, setDeletingInfluencer] = useState<Influencer | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
  const [payoutMonth, setPayoutMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Influencers</h1>
          <p className="text-muted-foreground mt-2">
            Manage influencer partnerships and track promo code performance
          </p>
        </div>
        <div className="flex gap-2">
          {mainTab === 'influencers' && (
            <Button onClick={() => setIsInfluencerDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Influencer
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-3">
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
