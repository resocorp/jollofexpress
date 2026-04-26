'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  Settings,
  Tag,
  LogOut,
  BarChart3,
  Printer,
  Bell,
  Bike,
  Truck,
  Car,
  Users,
  MapPin,
  UserRound,
  Star,
  Navigation,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Batches', href: '/admin/batches', icon: Tag },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Menu Items', href: '/admin/menu', icon: UtensilsCrossed },
  { name: 'Categories', href: '/admin/menu/categories', icon: Tag },
  { name: 'Customers', href: '/admin/customers', icon: UserRound },
  { name: 'Delivery Regions', href: '/admin/delivery-regions', icon: MapPin },
  { name: 'Delivery', href: '/admin/delivery', icon: Truck },
  { name: 'In-Flight', href: '/admin/in-flight', icon: Navigation },
  { name: 'Drivers', href: '/admin/drivers', icon: Bike },
  { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
  { name: 'Influencers', href: '/admin/promos', icon: Users },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Feedback', href: '/admin/feedback', icon: Star },
  { name: 'Feature Flags', href: '/admin/feature-flags', icon: Settings },
  { name: 'Testing', href: '/admin/testing', icon: BarChart3 },
  { name: 'Printer Status', href: '/admin/printer', icon: Printer },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/admin" className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 text-white font-bold text-sm">
            MS
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">Shawarma Admin</h1>
            <p className="text-[11px] text-muted-foreground">myshawarma.express</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Kitchen & Logout */}
      <div className="p-3 border-t border-border space-y-1.5">
        <Link href="/kitchen">
          <Button variant="outline" className="w-full justify-start text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-9">
            <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
            Kitchen Display
          </Button>
        </Link>
        <Link href="/menu">
          <Button variant="outline" className="w-full justify-start text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-9">
            <UtensilsCrossed className="h-3.5 w-3.5 mr-2" />
            View Menu
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs h-9"
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = '/admin/login';
          }}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
