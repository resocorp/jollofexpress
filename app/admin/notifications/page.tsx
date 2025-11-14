'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Settings,
  History,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useNotificationStats } from '@/hooks/use-notifications';

export default function NotificationCenterPage() {
  const { data: stats, isLoading } = useNotificationStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const successRate = stats?.successRate || 0;
  const getSuccessRateColor = () => {
    if (successRate >= 90) return 'text-green-600';
    if (successRate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Center</h1>
          <p className="text-muted-foreground mt-2">
            Manage WhatsApp notifications for customers and admins
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/notifications/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Link href="/admin/notifications/logs">
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              View Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 100 notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.sent || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.failed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Delivery failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor()}`}>
              {successRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Delivery success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Customer Notifications</span>
                </div>
                <Badge variant="secondary">{stats?.customerCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Admin Notifications</span>
                </div>
                <Badge variant="secondary">{stats?.adminCount || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Failures */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Failures</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentFailures && stats.recentFailures.length > 0 ? (
              <div className="space-y-3">
                {stats.recentFailures.map((failure: any) => (
                  <div key={failure.id} className="text-sm border-l-2 border-red-500 pl-3">
                    <p className="font-medium">{failure.event_type}</p>
                    <p className="text-muted-foreground text-xs">
                      {failure.recipient_phone}
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      {failure.error_message || 'Send failed'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No recent failures</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/notifications/settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Configure Settings
              </Button>
            </Link>
            <Link href="/admin/notifications/logs">
              <Button variant="outline" className="w-full justify-start">
                <History className="h-4 w-4 mr-2" />
                View All Logs
              </Button>
            </Link>
            <Link href="/admin/notifications/settings">
              <Button variant="outline" className="w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About WhatsApp Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Customer Notifications:</strong> Automatically sent when orders are confirmed,
              prepared, ready, out for delivery, and completed.
            </p>
            <p>
              <strong>Admin Notifications:</strong> Sent to configured admin phone numbers for
              kitchen capacity alerts, payment failures, and daily summaries.
            </p>
            <p>
              <strong>Powered by UltraMsg:</strong> Enterprise WhatsApp API with unlimited messages
              at $39/month.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
