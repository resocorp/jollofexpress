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
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Menu Items', href: '/admin/menu', icon: UtensilsCrossed },
  { name: 'Categories', href: '/admin/menu/categories', icon: Tag },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Delivery', href: '/admin/delivery', icon: Truck },
  { name: 'Drivers', href: '/admin/drivers', icon: Bike },
  { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
  { name: 'Promo Codes', href: '/admin/promos', icon: Tag },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Printer Status', href: '/admin/printer', icon: Printer },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-500 text-white font-bold">
            JE
          </div>
          <div>
            <h1 className="font-bold text-lg">JollofExpress</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Kitchen & Logout */}
      <div className="p-4 border-t space-y-2">
        <Link href="/kitchen">
          <Button variant="outline" className="w-full justify-start">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Kitchen Display
          </Button>
        </Link>
        <Link href="/driver">
          <Button variant="outline" className="w-full justify-start">
            <Bike className="h-4 w-4 mr-2" />
            Driver App
          </Button>
        </Link>
        <Link href="/menu">
          <Button variant="outline" className="w-full justify-start">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            View Menu
          </Button>
        </Link>
        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
