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
  UserRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Batches', href: '/admin/batches', icon: Tag },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Menu Items', href: '/admin/menu', icon: UtensilsCrossed },
  { name: 'Categories', href: '/admin/menu/categories', icon: Tag },
  { name: 'Customers', href: '/admin/customers', icon: UserRound },
  { name: 'Delivery Regions', href: '/admin/delivery-regions', icon: MapPin },
  { name: 'Delivery', href: '/admin/delivery', icon: Truck },
  { name: 'Drivers', href: '/admin/drivers', icon: Bike },
  { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
  { name: 'Influencers', href: '/admin/promos', icon: Users },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Feature Flags', href: '/admin/feature-flags', icon: Settings },
  { name: 'Testing', href: '/admin/testing', icon: BarChart3 },
  { name: 'Printer Status', href: '/admin/printer', icon: Printer },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#161822] border-r border-[#1F2233] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#1F2233]">
        <Link href="/admin" className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 text-white font-bold text-sm">
            MS
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Shawarma Admin</h1>
            <p className="text-[11px] text-gray-500">myshawarma.express</p>
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
                  ? 'bg-[#1F2233] text-white'
                  : 'text-gray-500 hover:bg-[#1F2233]/50 hover:text-gray-300'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Kitchen & Logout */}
      <div className="p-3 border-t border-[#1F2233] space-y-1.5">
        <Link href="/kitchen">
          <Button variant="outline" className="w-full justify-start text-gray-400 border-[#1F2233] hover:bg-[#1F2233] hover:text-white bg-transparent text-xs h-9">
            <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
            Kitchen Display
          </Button>
        </Link>
        <Link href="/menu">
          <Button variant="outline" className="w-full justify-start text-gray-400 border-[#1F2233] hover:bg-[#1F2233] hover:text-white bg-transparent text-xs h-9">
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
