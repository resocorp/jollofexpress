'use client';

import { useState } from 'react';
import { useAllSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestaurantInfoForm } from '@/components/admin/settings/restaurant-info-form';
import { OperatingHoursForm } from '@/components/admin/settings/operating-hours-form';
import { DeliverySettingsForm } from '@/components/admin/settings/delivery-settings-form';
import { PaymentSettingsForm } from '@/components/admin/settings/payment-settings-form';
import { OrderSettingsForm } from '@/components/admin/settings/order-settings-form';
import { Loader2, Store, Clock, Truck, CreditCard, Settings } from 'lucide-react';

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useAllSettings();
  const [activeTab, setActiveTab] = useState('restaurant');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your restaurant settings and preferences
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your restaurant settings and preferences
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-600">
              <p className="font-medium">Failed to load settings</p>
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
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your restaurant settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="restaurant" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Restaurant
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>
                Update your restaurant's basic information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantInfoForm data={settings?.restaurant_info} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>
                Set your restaurant's operating hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperatingHoursForm data={settings?.operating_hours} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Settings</CardTitle>
              <CardDescription>
                Configure delivery options, fees, and service areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeliverySettingsForm data={settings?.delivery_settings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure tax rates and accepted payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSettingsForm data={settings?.payment_settings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Settings</CardTitle>
              <CardDescription>
                Configure order timing and operational preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderSettingsForm data={settings?.order_settings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
