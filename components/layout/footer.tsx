'use client';

import Link from 'next/link';
import { Facebook, Instagram, MessageCircle, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useRestaurantInfo, useRestaurantStatus } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// TikTok icon (lucide-react doesn't have it, so we'll create a simple SVG)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

export function Footer() {
  const { data: info } = useRestaurantInfo();
  const { data: status } = useRestaurantStatus();

  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: 'https://facebook.com/jollofexpress',
      color: 'hover:text-blue-600',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      href: 'https://instagram.com/jollofexpress',
      color: 'hover:text-pink-600',
    },
    {
      name: 'TikTok',
      icon: TikTokIcon,
      href: 'https://tiktok.com/@jollofexpress',
      color: 'hover:text-black dark:hover:text-white',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: 'https://wa.me/2348106828147',
      color: 'hover:text-green-600',
    },
  ];

  const quickLinks = [
    { name: 'Menu', href: '/menu' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
  ];

  return (
    <footer className="bg-gradient-to-b from-white to-gray-50 border-t mt-12 sm:mt-16">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2">
              {info?.logo_url ? (
                <img
                  src={info.logo_url}
                  alt={info.name || 'Restaurant Logo'}
                  className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-full"
                />
              ) : (
                <img
                  src="/logo.png"
                  alt="Ur' Shawarma Express Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                />
              )}
              <div>
                <h3 className="font-bold text-lg sm:text-xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {info?.name || "Ur' Shawarma Express"}
                </h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Awka's best tasting shawarma! Fresh wraps, juicy meats, and bold Nigerian flavors delivered hot in 30 minutes.
            </p>
            
            {/* Operating Status */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${status?.is_open ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`font-medium ${status?.is_open ? 'text-green-600' : 'text-red-600'}`}>
                {status?.is_open ? 'Open Now' : 'Currently Closed'}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-base sm:text-lg">Quick Links</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-sm text-muted-foreground hover:text-orange-600 transition-colors duration-200 touch-manipulation"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-base sm:text-lg">Contact Us</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0 text-orange-600" />
                <span>Awka, Anambra State, Nigeria</span>
              </li>
              <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-orange-600" />
                <a href="tel:+2348106828147" className="hover:text-orange-600 transition-colors touch-manipulation">
                  +234 810 682 8147
                </a>
              </li>
              <li className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-orange-600" />
                <a href="mailto:hello@jollofexpress.ng" className="hover:text-orange-600 transition-colors touch-manipulation">
                  hello@jollofexpress.ng
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media & Newsletter */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-base sm:text-lg">Follow Us</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Stay updated with our latest dishes and special offers!
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 sm:p-2.5 rounded-full bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-110 active:scale-95 touch-manipulation ${social.color}`}
                    aria-label={social.name}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                );
              })}
            </div>
            
            {/* Order Now CTA */}
            <Link href="/menu">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg mt-3 sm:mt-4 h-10 sm:h-11 text-sm sm:text-base touch-manipulation">
                Order Now
              </Button>
            </Link>
          </div>
        </div>

        <Separator className="my-6 sm:my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>
            © {currentYear} {info?.name || "Ur' Shawarma Express"}. All rights reserved.
          </p>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-[10px] sm:text-xs">Made with ❤️ in Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
