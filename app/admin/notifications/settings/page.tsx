'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  useNotificationSettings, 
  useUpdateNotificationSettings,
  useTestNotificationConnection,
  useSendTestNotification 
} from '@/hooks/use-notifications';
import { toast } from 'sonner';
import { Loader2, Save, TestTube, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const testConnection = useTestNotificationConnection();
  const sendTest = useSendTestNotification();

  const [formData, setFormData] = useState({
    ultramsg: {
      instance_id: '',
      token: '',
      enabled: false,
    },
    customer_notifications: {
      order_confirmed: true,
      order_preparing: true,
      order_ready: true,
      order_out_for_delivery: true,
      order_completed: true,
      payment_failed: false,
    },
    admin_notifications: {
      enabled: true,
      phone_numbers: [] as string[],
      kitchen_capacity_alerts: true,
      payment_failures: true,
      daily_summary: true,
      summary_time: '20:00',
    },
  });

  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [testPhone, setTestPhone] = useState('');

  // Update form data when settings load
  useState(() => {
    if (settings) {
      setFormData({
        ultramsg: settings.ultramsg || formData.ultramsg,
        customer_notifications: settings.customer_notifications || formData.customer_notifications,
        admin_notifications: settings.admin_notifications || formData.admin_notifications,
      });
    }
  });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Connection test failed');
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    try {
      await sendTest.mutateAsync(testPhone);
      toast.success('Test notification sent!');
      setTestPhone('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test notification');
    }
  };

  const addAdminPhone = () => {
    if (!newAdminPhone) return;

    // Validate Nigerian phone number
    const phoneRegex = /^(\+234|234|0)[789]\d{9}$/;
    if (!phoneRegex.test(newAdminPhone)) {
      toast.error('Invalid Nigerian phone number format');
      return;
    }

    if (formData.admin_notifications.phone_numbers.includes(newAdminPhone)) {
      toast.error('Phone number already added');
      return;
    }

    setFormData({
      ...formData,
      admin_notifications: {
        ...formData.admin_notifications,
        phone_numbers: [...formData.admin_notifications.phone_numbers, newAdminPhone],
      },
    });
    setNewAdminPhone('');
  };

  const removeAdminPhone = (phone: string) => {
    setFormData({
      ...formData,
      admin_notifications: {
        ...formData.admin_notifications,
        phone_numbers: formData.admin_notifications.phone_numbers.filter(p => p !== phone),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure WhatsApp notifications for your restaurant
        </p>
      </div>

      {/* UltraMsg Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>UltraMsg Configuration</CardTitle>
          <CardDescription>
            Enter your UltraMsg API credentials. Get them from{' '}
            <a href="https://ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              ultramsg.com
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance_id">Instance ID</Label>
            <Input
              id="instance_id"
              placeholder="instance123456"
              value={formData.ultramsg.instance_id}
              onChange={(e) => setFormData({
                ...formData,
                ultramsg: { ...formData.ultramsg, instance_id: e.target.value }
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">API Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="your_ultramsg_token"
              value={formData.ultramsg.token}
              onChange={(e) => setFormData({
                ...formData,
                ultramsg: { ...formData.ultramsg, token: e.target.value }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all WhatsApp notifications
              </p>
            </div>
            <Switch
              checked={formData.ultramsg.enabled}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                ultramsg: { ...formData.ultramsg, enabled: checked }
              })}
            />
          </div>

          <Button 
            variant="outline" 
            onClick={handleTestConnection}
            disabled={testConnection.isPending}
          >
            {testConnection.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </CardContent>
      </Card>

      {/* Customer Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Notifications</CardTitle>
          <CardDescription>
            Configure which notifications customers receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(formData.customer_notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="cursor-pointer">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Label>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  customer_notifications: {
                    ...formData.customer_notifications,
                    [key]: checked
                  }
                })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Admin Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Notifications</CardTitle>
          <CardDescription>
            Configure admin alerts and phone numbers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Admin Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts for kitchen capacity and system events
              </p>
            </div>
            <Switch
              checked={formData.admin_notifications.enabled}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                admin_notifications: { ...formData.admin_notifications, enabled: checked }
              })}
            />
          </div>

          <Separator />

          {/* Admin Phone Numbers */}
          <div className="space-y-4">
            <Label>Admin Phone Numbers</Label>
            <div className="flex gap-2">
              <Input
                placeholder="+234XXXXXXXXXX"
                value={newAdminPhone}
                onChange={(e) => setNewAdminPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAdminPhone()}
              />
              <Button onClick={addAdminPhone} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            
            {formData.admin_notifications.phone_numbers.length > 0 ? (
              <div className="space-y-2">
                {formData.admin_notifications.phone_numbers.map((phone) => (
                  <div key={phone} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-mono text-sm">{phone}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdminPhone(phone)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No admin phone numbers configured
              </p>
            )}
          </div>

          <Separator />

          {/* Alert Types */}
          <div className="space-y-4">
            <Label>Alert Types</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="kitchen_alerts">Kitchen Capacity Alerts</Label>
              <Switch
                id="kitchen_alerts"
                checked={formData.admin_notifications.kitchen_capacity_alerts}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  admin_notifications: { ...formData.admin_notifications, kitchen_capacity_alerts: checked }
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="payment_failures">Payment Failure Alerts</Label>
              <Switch
                id="payment_failures"
                checked={formData.admin_notifications.payment_failures}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  admin_notifications: { ...formData.admin_notifications, payment_failures: checked }
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="daily_summary">Daily Summary Report</Label>
              <Switch
                id="daily_summary"
                checked={formData.admin_notifications.daily_summary}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  admin_notifications: { ...formData.admin_notifications, daily_summary: checked }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary_time">Daily Summary Time</Label>
              <Input
                id="summary_time"
                type="time"
                value={formData.admin_notifications.summary_time}
                onChange={(e) => setFormData({
                  ...formData,
                  admin_notifications: { ...formData.admin_notifications, summary_time: e.target.value }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Notification</CardTitle>
          <CardDescription>
            Send a test WhatsApp message to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="+234XXXXXXXXXX"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <Button 
              onClick={handleSendTest}
              disabled={sendTest.isPending}
            >
              {sendTest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
