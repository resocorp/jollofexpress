'use client';

import { Timer, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrderWindow } from '@/hooks/use-order-window';

export function CountdownTimer() {
  const {
    isAccepting,
    isPreorder,
    secondsUntilCutoff,
    countdownFormatted,
    deliveryDate,
    deliveryWindow,
    isLoading,
  } = useOrderWindow();

  if (isLoading) return null;

  // After cutoff — show cooking/preorder message
  if (!isAccepting && !isPreorder) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-2"
      >
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
          <span className="text-sm sm:text-base font-semibold text-orange-800">
            Today&apos;s batch is cooking 🔥
          </span>
        </div>
      </motion.div>
    );
  }

  if (isPreorder) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-2"
      >
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          <span className="text-sm sm:text-base font-semibold text-blue-800">
            Pre-ordering for {deliveryDate} · Delivery {deliveryWindow}
          </span>
        </div>
      </motion.div>
    );
  }

  // Accepting orders — show countdown
  if (secondsUntilCutoff <= 0) return null;

  // Color changes as time runs out
  const isUrgent = secondsUntilCutoff < 3600; // Less than 1 hour
  const isCritical = secondsUntilCutoff < 1800; // Less than 30 min

  const bgClass = isCritical
    ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
    : isUrgent
      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
      : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';

  const textClass = isCritical
    ? 'text-red-800'
    : isUrgent
      ? 'text-amber-800'
      : 'text-green-800';

  const timerClass = isCritical
    ? 'text-red-600'
    : isUrgent
      ? 'text-amber-600'
      : 'text-green-600';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-2"
    >
      <div className={`flex items-center justify-center gap-2 sm:gap-3 py-2.5 px-4 rounded-xl border ${bgClass}`}>
        <Timer className={`h-4 w-4 sm:h-5 sm:w-5 ${timerClass}`} />
        <span className={`text-sm sm:text-base font-semibold ${textClass}`}>
          Today&apos;s order closes in:
        </span>
        <span className={`text-lg sm:text-xl font-mono font-bold ${timerClass} tabular-nums`}>
          {countdownFormatted}
        </span>
      </div>
    </motion.div>
  );
}
