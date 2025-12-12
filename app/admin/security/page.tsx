'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';

interface SecurityStats {
  totalEvents: number;
  eventsLastHour: number;
  byType: {
    rate_limit: number;
    large_payload: number;
    suspicious_request: number;
    source_exposure_attempt: number;
  };
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  path: string;
  details: Record<string, any>;
  timestamp: string;
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch('/api/security/dashboard?action=stats'),
        fetch('/api/security/dashboard?action=events&limit=50'),
      ]);

      const statsData = await statsRes.json();
      const eventsData = await eventsRes.json();

      setStats(statsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading security data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            RSC Vulnerability Protection (CVE-2025-55184 & CVE-2025-55183)
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Hour</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.eventsLastHour || 0}</div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.bySeverity.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType.rate_limit || 0}</div>
            <p className="text-xs text-muted-foreground">Blocked requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
          <TabsTrigger value="severity">By Severity</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Last 50 security events detected</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No security events detected yet</p>
                  <p className="text-sm">Your application is secure!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {events.map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(event.severity)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(event.type)}
                          </Badge>
                          <Badge className={`text-xs ${getSeverityColor(event.severity)} text-white`}>
                            {event.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex gap-4">
                            <span className="font-medium">IP:</span>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">{event.ip}</code>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-medium">Path:</span>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded truncate">
                              {event.path}
                            </code>
                          </div>
                          {Object.keys(event.details).length > 0 && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats && Object.entries(stats.byType).map(([type, count]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-lg">{getTypeLabel(type)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{count}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {type === 'rate_limit' && 'Requests blocked due to rate limiting'}
                    {type === 'large_payload' && 'Oversized payloads detected'}
                    {type === 'suspicious_request' && 'Malformed or suspicious requests'}
                    {type === 'source_exposure_attempt' && 'Potential CVE-2025-55183 exploitation attempts'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats && Object.entries(stats.bySeverity).map(([severity, count]) => (
              <Card key={severity}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`} />
                    {severity.charAt(0).toUpperCase() + severity.slice(1)} Severity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{count}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {severity === 'critical' && '🚨 Immediate action required'}
                    {severity === 'high' && '⚠️ Should be investigated soon'}
                    {severity === 'medium' && '📊 Monitor for patterns'}
                    {severity === 'low' && '✅ Normal security events'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Protection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>✅ <strong>CVE-2025-55184</strong> (DoS): Rate limiting active (100 req/min)</p>
          <p>✅ <strong>CVE-2025-55183</strong> (Source Exposure): Request validation enabled</p>
          <p className="text-xs text-muted-foreground mt-2">
            This dashboard monitors security events in real-time. Events are logged and can be exported for analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
