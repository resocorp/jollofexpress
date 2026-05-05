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
  Receipt,
  MonitorPlay,
  ExternalLink,
  QrCode,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { UserRole } from '@/types/database';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const ALL_STAFF: UserRole[] = ['admin', 'kitchen', 'customer_care_agent'];
const ADMIN_AND_AGENT: UserRole[] = ['admin', 'customer_care_agent'];
const ADMIN_ONLY: UserRole[] = ['admin'];

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ADMIN_ONLY },
  { name: 'WhatsApp Comms', href: '/admin/whatsapp', icon: MessageCircle, roles: ADMIN_AND_AGENT },
  { name: 'Quick replies', href: '/admin/whatsapp/templates', icon: Sparkles, roles: ADMIN_ONLY },
  { name: 'Batches', href: '/admin/batches', icon: Tag, roles: ADMIN_ONLY },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag, roles: ADMIN_AND_AGENT },
  { name: 'Customers', href: '/admin/customers', icon: UserRound, roles: ADMIN_AND_AGENT },
  { name: 'Expenses', href: '/admin/expenses', icon: Receipt, roles: ADMIN_ONLY },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ADMIN_ONLY },
  { name: 'Menu Items', href: '/admin/menu', icon: UtensilsCrossed, roles: ADMIN_ONLY },
  { name: 'Categories', href: '/admin/menu/categories', icon: Tag, roles: ADMIN_ONLY },
  { name: 'Delivery Regions', href: '/admin/delivery-regions', icon: MapPin, roles: ADMIN_ONLY },
  { name: 'Delivery', href: '/admin/delivery', icon: Truck, roles: ADMIN_ONLY },
  { name: 'In-Flight', href: '/admin/in-flight', icon: Navigation, roles: ADMIN_ONLY },
  { name: 'Drivers', href: '/admin/drivers', icon: Bike, roles: ADMIN_ONLY },
  { name: 'Scan Log', href: '/admin/scans', icon: QrCode, roles: ADMIN_ONLY },
  { name: 'Vehicles', href: '/admin/vehicles', icon: Car, roles: ADMIN_ONLY },
  { name: 'Influencers', href: '/admin/promos', icon: Users, roles: ADMIN_ONLY },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell, roles: ADMIN_ONLY },
  { name: 'Feedback', href: '/admin/feedback', icon: Star, roles: ADMIN_ONLY },
  { name: 'Feature Flags', href: '/admin/feature-flags', icon: Settings, roles: ADMIN_ONLY },
  { name: 'Testing', href: '/admin/testing', icon: BarChart3, roles: ADMIN_ONLY },
  { name: 'Printer Status', href: '/admin/printer', icon: Printer, roles: ADMIN_ONLY },
  { name: 'Users', href: '/admin/users', icon: ShieldCheck, roles: ADMIN_ONLY },
  { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ADMIN_ONLY },
  { name: 'Account', href: '/admin/account', icon: KeyRound, roles: ALL_STAFF },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: me } = useCurrentUser();
  const role = me?.role;

  const visibleNav = navigation.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href={role === 'customer_care_agent' ? '/admin/whatsapp' : '/admin'} className="flex items-center space-x-3">
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
        {visibleNav.map((item) => {
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

      {/* Bottom links */}
      <div className="p-3 border-t border-border space-y-1.5">
        {role === 'admin' && (
          <>
            <a href="/dispatch" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-9">
                <MonitorPlay className="h-3.5 w-3.5 mr-2" />
                Dispatch Board
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
              </Button>
            </a>
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
          </>
        )}
        {role === 'kitchen' && (
          <Link href="/kitchen">
            <Button variant="outline" className="w-full justify-start text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-9">
              <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
              Kitchen Display
            </Button>
          </Link>
        )}
        {me && (
          <div className="text-xs text-muted-foreground px-2 pt-1 truncate">
            {me.name} <span className="opacity-60">· {me.role.replace(/_/g, ' ')}</span>
          </div>
        )}
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
