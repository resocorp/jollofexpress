'use client';

import { useEffect, useState } from 'react';

// Service shuts down at midnight WAT (Nigeria, UTC+1) on 1 August 2026.
// Change this single constant to adjust or remove the shutdown date.
const SHUTDOWN_DATE = new Date('2026-08-01T00:00:00+01:00');

const CLOSED_MESSAGE =
  '📢 MyShawarma.express has closed. Thank you for years of orders 🙏';

const CLOSED_SUMMARY = 'MyShawarma.express has closed. Thank you for your orders.';
const OPEN_SUMMARY = 'Today is our last day — MyShawarma.express closes at midnight tonight.';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function getRemaining(): Remaining {
  const diff = SHUTDOWN_DATE.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}

/**
 * Site-wide shutdown announcement. A thin, full-width rolling red bar shown at
 * the top of every page. Before {@link SHUTDOWN_DATE} it scrolls a live
 * countdown; after the date it switches to a static closed/thank-you message.
 *
 * Reuses the `.marquee-track` CSS (app/globals.css) — including its
 * prefers-reduced-motion handling — used by AnnouncementMarquee.
 */
export function ShutdownBanner() {
  // `mounted` guards against SSR/CSR hydration mismatch: the server can't know
  // the client clock, so we render the static message first and swap in the
  // live countdown only after mount.
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<Remaining>(() => getRemaining());

  useEffect(() => {
    setMounted(true);
    setRemaining(getRemaining());

    if (getRemaining().done) return;

    const id = setInterval(() => {
      const next = getRemaining();
      setRemaining(next);
      if (next.done) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const isClosed = mounted && remaining.done;

  let segment: string;
  if (isClosed) {
    segment = CLOSED_MESSAGE;
  } else if (mounted) {
    const { days, hours, minutes, seconds } = remaining;
    segment = `📢 Today is our LAST DAY — get your final order in! Kitchen closes in ${days}d ${hours}h ${minutes}m ${String(
      seconds
    ).padStart(2, '0')}s`;
  } else {
    // Pre-mount / SSR: no live digits, so client and server markup match.
    segment = "📢 Today is our LAST DAY — get your final order in!";
  }

  return (
    <div className="w-full overflow-hidden bg-red-600 text-white">
      {/* Non-ticking summary for screen readers (avoids per-second spam). */}
      <span className="sr-only" role="status" aria-live="polite">
        {isClosed ? CLOSED_SUMMARY : OPEN_SUMMARY}
      </span>
      <div
        className="marquee-track py-1.5 text-sm font-semibold tabular-nums"
        aria-hidden="true"
      >
        {[0, 1].map((copy) => (
          <span key={copy} className="flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="mx-8">
                {segment}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
