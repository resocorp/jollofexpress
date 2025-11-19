'use client';

import { Home, Receipt, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/menu',
      active: pathname === '/menu' || pathname === '/',
    },
    {
      icon: Receipt,
      label: 'Orders',
      href: '/orders',
      active: pathname === '/orders',
    },
    {
      icon: User,
      label: 'Account',
      href: '/orders',
      active: false,
    },
    {
      icon: ArrowLeft,
      label: 'Back',
      action: () => router.back(),
      active: false,
    },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-lg pb-safe"
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.active;

          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all duration-200 touch-manipulation active:bg-gray-100",
                  isActive ? "text-[#FF4433]" : "text-gray-600"
                )}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative"
                >
                  <Icon className="h-6 w-6" />
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#FF4433] rounded-full"
                    />
                  )}
                </motion.div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "font-semibold" : ""
                )}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200 touch-manipulation active:bg-gray-100",
                isActive ? "text-[#FF4433]" : "text-gray-600"
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <Icon className="h-6 w-6" />
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#FF4433] rounded-full"
                  />
                )}
              </motion.div>
              <span className={cn(
                "text-xs font-medium",
                isActive ? "font-semibold" : ""
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Active Bar Indicator (Alternative Style) */}
      {navItems.map((item, index) => {
        if (item.active) {
          return (
            <motion.div
              key={`bar-${item.label}`}
              layoutId="bottomNavBar"
              className="absolute top-0 h-0.5 bg-[#FF4433] rounded-full"
              style={{
                left: `${(index / navItems.length) * 100}%`,
                width: `${100 / navItems.length}%`,
              }}
            />
          );
        }
        return null;
      })}
    </motion.nav>
  );
}
