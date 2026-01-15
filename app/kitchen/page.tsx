'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Clock, Settings, Power, PowerOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/kitchen/kanban-board';
import { KitchenControls } from '@/components/kitchen/kitchen-controls';
import { AutoPrintHandler } from '@/components/print/auto-print-handler';
import { useKitchenOrders } from '@/hooks/use-orders';
import { useRestaurantStatus } from '@/hooks/use-settings';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

export default function KitchenPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showControls, setShowControls] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/kitchen/login');
        return;
      }

      // Verify user has kitchen or admin role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'kitchen')) {
        router.push('/kitchen/login');
        return;
      }

      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  // Only fetch data after authentication is confirmed
  const { data: orders, isLoading } = useKitchenOrders(isAuthenticated === true);
  const { data: status } = useRestaurantStatus();

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Auto-print handler - monitors print queue and triggers printing */}
        <AutoPrintHandler />
        
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Kitchen Display System</h1>
              <p className="text-sm text-gray-400 mt-1">
                {orders?.length || 0} active {orders?.length === 1 ? 'order' : 'orders'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Restaurant Status */}
              <div className="flex items-center gap-2">
                {status?.is_open ? (
                  <>
                    <Power className="h-5 w-5 text-green-400" />
                    <span className="text-green-400 font-medium">OPEN</span>
                  </>
                ) : (
                  <>
                    <PowerOff className="h-5 w-5 text-red-400" />
                    <span className="text-red-400 font-medium">CLOSED</span>
                  </>
                )}
              </div>

              {/* Prep Time */}
              {status?.is_open && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-5 w-5" />
                  <span>{status.estimated_prep_time} min</span>
                </div>
              )}

              {/* Controls Button */}
              <Dialog open={showControls} onOpenChange={setShowControls}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Controls
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <KitchenControls onClose={() => setShowControls(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Kanban Board */}
        <main className="p-6">
          <KanbanBoard orders={orders || []} isLoading={isLoading} />
        </main>
      </div>
    </DndProvider>
  );
}
