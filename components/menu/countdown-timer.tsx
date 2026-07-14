'use client';

import { Timer, Flame, Moon } from 'lucide-react';
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
    message,
    restaurantClosed,
    isLoading,
    allTodayBatches,
    nextBatch,
    capacityPercent,
  } = useOrderWindow();

  // Other batches that are still upcoming (not past cutoff)
  const upcomingOtherBatches = allTodayBatches.filter(
    b => b.id !== nextBatch?.id && b.secondsUntilCutoff > 0
  );

  if (isLoading) return null;

  // Restaurant closed — show friendly closed banner + next delivery info
  if (restaurantClosed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-2 space-y-2"
      >
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 rounded-xl border border-purple-200 dark:border-purple-500/30">
          <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 dark:text-purple-400" />
          <span className="text-sm sm:text-base font-semibold text-purple-800 dark:text-purple-200">
            {message}
          </span>
        </div>
        {deliveryWindow && (
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
            <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
            <span className="text-sm sm:text-base font-semibold text-blue-800 dark:text-blue-200">
              Next delivery: {deliveryDate} between {deliveryWindow}
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  // After cutoff — show cooking/preorder message
  if (!isAccepting && !isPreorder) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-2"
      >
        <div className="flex flex-col items-center gap-1 py-2.5 px-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 rounded-xl border border-orange-200 dark:border-orange-500/30">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 dark:text-orange-400" />
            <span className="text-sm sm:text-base font-semibold text-orange-800 dark:text-orange-200">
              {allTodayBatches.length > 1
                ? "Today\u2019s batches are being prepared 🔥"
                : "Today\u2019s batch is cooking 🔥"}
            </span>
          </div>
          <span className="text-[11px] sm:text-xs text-orange-600/70 dark:text-orange-300/60">
            Times are a guide, not a stopwatch — we&apos;re human after all
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
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
          <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
          <span className="text-sm sm:text-base font-semibold text-blue-800 dark:text-blue-200">
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
    ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 border-red-200 dark:border-red-500/30'
    : isUrgent
      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border-amber-200 dark:border-amber-500/30'
      : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 border-green-200 dark:border-green-500/30';

  const textClass = isCritical
    ? 'text-red-800 dark:text-red-200'
    : isUrgent
      ? 'text-amber-800 dark:text-amber-200'
      : 'text-green-800 dark:text-green-200';

  const timerClass = isCritical
    ? 'text-red-600 dark:text-red-400'
    : isUrgent
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';

  // Capacity fill of the window a customer would order into — shown as a % bar
  // (never the raw order count). Its own color scale, independent of the
  // time-based countdown color above: a window can have plenty of time left yet
  // be nearly full.
  const showCapacity = !!nextBatch && nextBatch.maxCapacity > 0;
  const capPct = Math.max(0, Math.min(100, Math.round(capacityPercent)));
  const capCritical = capPct >= 85; // Almost full
  const capBusy = capPct >= 60 && capPct < 85; // Filling fast

  const capBarClass = capCritical
    ? 'bg-gradient-to-r from-red-400 to-red-600'
    : capBusy
      ? 'bg-gradient-to-r from-amber-400 to-orange-500'
      : 'bg-gradient-to-r from-green-400 to-emerald-500';
  const capTrackClass = capCritical
    ? 'bg-red-100 dark:bg-red-500/20'
    : capBusy
      ? 'bg-amber-100 dark:bg-amber-500/20'
      : 'bg-green-100 dark:bg-green-500/20';
  const capTextClass = capCritical
    ? 'text-red-700 dark:text-red-300'
    : capBusy
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-green-700 dark:text-green-300';
  const capLabel = capCritical
    ? `Almost full — ordering closes when full · ${capPct}% full`
    : capBusy
      ? `Filling fast · ${capPct}% full`
      : `${capPct}% full`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-2"
    >
      <div className={`flex flex-col items-center gap-1 py-2.5 px-4 rounded-xl border ${bgClass}`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <Timer className={`h-4 w-4 sm:h-5 sm:w-5 ${timerClass}`} />
          <span className={`text-sm sm:text-base font-semibold ${textClass}`}>
            Today&apos;s {nextBatch?.windowName || 'order'} closes in:
          </span>
          <span className={`text-lg sm:text-xl font-mono font-bold ${timerClass} tabular-nums`}>
            {countdownFormatted}
          </span>
        </div>
        {showCapacity && (
          <div className="w-full max-w-xs mt-1">
            <div className="mb-1 text-center">
              <span className={`text-[11px] sm:text-xs font-medium ${capTextClass}`}>
                {capLabel}
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${capTrackClass}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${capBarClass}`}
                style={{ width: `${capPct}%` }}
                role="progressbar"
                aria-valuenow={capPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Delivery window capacity"
              />
            </div>
          </div>
        )}
        {upcomingOtherBatches.length > 0 && (
          <span className={`text-[11px] sm:text-xs ${textClass} opacity-70`}>
            Also today: {upcomingOtherBatches[0].windowName} · delivered {upcomingOtherBatches[0].deliveryWindow}
          </span>
        )}
        <span className={`text-[11px] sm:text-xs ${textClass} opacity-50`}>
          Times are a guide, not a stopwatch — we&apos;re human after all
        </span>
      </div>
    </motion.div>
  );
}
