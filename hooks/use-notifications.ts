// React Query hooks for notification operations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api-client';
import type { NotificationSettings, NotificationLog } from '@/lib/notifications/types';

/**
 * Fetch notification settings
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => get<NotificationSettings>('/api/notifications/settings'),
  });
}

/**
 * Update notification settings
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<NotificationSettings>) =>
      patch<{ success: boolean; message: string }>(
        '/api/notifications/settings',
        settings
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
}

/**
 * Fetch notification logs with filters
 */
export function useNotificationLogs(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  type?: string;
  event?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();

  if (params?.dateFrom) queryParams.set('date_from', params.dateFrom);
  if (params?.dateTo) queryParams.set('date_to', params.dateTo);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.type) queryParams.set('type', params.type);
  if (params?.event) queryParams.set('event', params.event);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const queryString = queryParams.toString();

  return useQuery({
    queryKey: ['notification-logs', params],
    queryFn: async () => {
      const response = await get<{
        logs: NotificationLog[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasMore: boolean;
        };
      }>(`/api/notifications/logs${queryString ? `?${queryString}` : ''}`);
      return response;
    },
  });
}

/**
 * Send test notification
 */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: (phone: string) =>
      post<{ success: boolean; message: string }>(
        '/api/notifications/send',
        { phone }
      ),
  });
}

/**
 * Test notification connection
 */
export function useTestNotificationConnection() {
  return useMutation({
    mutationFn: () =>
      get<{ success: boolean; message?: string; error?: string }>(
        '/api/notifications/test'
      ),
  });
}

/**
 * Fetch notification statistics
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: ['notification-stats'],
    queryFn: async () => {
      // Fetch recent logs for statistics
      const response = await get<{
        logs: NotificationLog[];
        pagination: any;
      }>('/api/notifications/logs?limit=100');

      const logs = response.logs;

      // Calculate stats
      const total = logs.length;
      const sent = logs.filter((log) => log.status === 'sent').length;
      const failed = logs.filter((log) => log.status === 'failed').length;
      const pending = logs.filter((log) => log.status === 'pending').length;

      const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

      // Count by type
      const customerCount = logs.filter((log) => log.notification_type === 'customer').length;
      const adminCount = logs.filter((log) => log.notification_type === 'admin').length;

      // Recent failures
      const recentFailures = logs
        .filter((log) => log.status === 'failed')
        .slice(0, 5);

      return {
        total,
        sent,
        failed,
        pending,
        successRate,
        customerCount,
        adminCount,
        recentFailures,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
