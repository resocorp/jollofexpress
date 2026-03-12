'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface FeatureFlag {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  updated_at: string;
}

async function fetchFlags(): Promise<{ flags: FeatureFlag[] }> {
  const res = await adminFetch('/api/admin/feature-flags');
  if (!res.ok) throw new Error('Failed to fetch feature flags');
  return res.json();
}

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['feature-flags'], queryFn: fetchFlags });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await adminFetch(`/api/admin/feature-flags/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle flag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });

  const handleToggle = (key: string, currentEnabled: boolean) => {
    toggleMutation.mutate({ key, enabled: !currentEnabled }, {
      onSuccess: () => toast.success(`Flag "${key}" ${!currentEnabled ? 'enabled' : 'disabled'}`),
      onError: () => toast.error('Failed to toggle flag'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
        <p className="text-gray-500 mt-1 text-sm">Toggle features on and off instantly. Changes take effect immediately.</p>
      </div>

      <div className="space-y-3">
        {data?.flags.map((flag) => (
          <div
            key={flag.key}
            className="flex items-center justify-between p-4 bg-[#161822] rounded-xl border border-[#1F2233]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200">{flag.label}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{flag.key}</p>
              {flag.description && (
                <p className="text-xs text-gray-500 mt-1">{flag.description}</p>
              )}
            </div>
            <button
              onClick={() => handleToggle(flag.key, flag.enabled)}
              disabled={toggleMutation.isPending}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ml-4 ${
                flag.enabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                  flag.enabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
