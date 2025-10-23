'use client';

import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Clock, Settings, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KanbanBoard } from '@/components/kitchen/kanban-board';
import { KitchenControls } from '@/components/kitchen/kitchen-controls';
import { AutoPrintHandler } from '@/components/print/auto-print-handler';
import { useKitchenOrders } from '@/hooks/use-orders';
import { useRestaurantStatus } from '@/hooks/use-settings';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function KitchenPage() {
  const { data: orders, isLoading } = useKitchenOrders();
  const { data: status } = useRestaurantStatus();
  const [showControls, setShowControls] = useState(false);

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
