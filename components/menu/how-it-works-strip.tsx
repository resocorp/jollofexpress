'use client';

import { motion } from 'framer-motion';
import { useOrderWindow } from '@/hooks/use-order-window';

export function HowItWorksStrip() {
  const { nextBatch, deliveryWindow, isLoading } = useOrderWindow();

  if (isLoading || !nextBatch) return null;

  const cutoffTime = nextBatch.cutoffTime || '2:00 PM';
  const windowDisplay = deliveryWindow || '4:00 PM – 6:00 PM';

  const steps = [
    {
      icon: '📱',
      heading: `Order by ${cutoffTime}`,
      subtext: 'Place your order before the daily cutoff',
    },
    {
      icon: '🔥',
      heading: 'We Cook It Fresh',
      subtext: 'Your shawarma is grilled to order in today\'s batch',
    },
    {
      icon: '🚗',
      heading: `Delivered ${windowDisplay}`,
      subtext: 'Hot shawarma arrives at your door',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-3"
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white rounded-xl shadow-sm border p-3 sm:p-4">
        {steps.map((step, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl sm:text-3xl mb-1">{step.icon}</div>
            <p className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">{step.heading}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-tight hidden sm:block">{step.subtext}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
