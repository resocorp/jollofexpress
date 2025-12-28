'use client';

import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRestaurantInfo } from '@/hooks/use-settings';

export function WhatsAppFloat() {
  const { data: info } = useRestaurantInfo();

  const handleWhatsAppClick = () => {
    const phone = info?.phone || '2348012345678'; // Default fallback
    const message = encodeURIComponent('Hello! I need help with my order.');
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, duration: 0.3 }}
      className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-40"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleWhatsAppClick}
        className="group flex items-center gap-2 sm:gap-3 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 p-3 sm:p-4 touch-manipulation"
        aria-label="Chat on WhatsApp"
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" fill="white" />
        </motion.div>

        {/* Text - Hidden on mobile */}
        <span className="hidden sm:inline-block font-semibold text-sm pr-1 max-w-0 sm:max-w-[200px] overflow-hidden group-hover:max-w-[200px] transition-all duration-300 whitespace-nowrap">
          Order via WhatsApp
        </span>

        {/* Pulse Ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
      </motion.button>

      {/* Tooltip for mobile */}
      <div className="sm:hidden absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Order via WhatsApp
        <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </motion.div>
  );
}
