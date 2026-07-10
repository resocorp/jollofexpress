'use client';

import { usePaymentSettings } from '@/hooks/use-settings';

const DEFAULT_MESSAGE =
  "We're not accepting orders right now. Please check back soon.";

/**
 * Site-wide scrolling announcement banner. Renders only when the owner has
 * paused ordering (payment_settings.payments_blocked). Shows the custom
 * blocked_message (or a default) as a horizontally scrolling marquee.
 */
export function AnnouncementMarquee() {
  const { data: paymentSettings } = usePaymentSettings();

  if (!paymentSettings?.payments_blocked) return null;

  const message = paymentSettings.blocked_message?.trim() || DEFAULT_MESSAGE;

  // Repeat the message so the -50% marquee translate loops seamlessly.
  const segment = `📢 ${message}`;

  return (
    <div
      className="w-full overflow-hidden bg-red-600 text-white"
      role="status"
      aria-live="polite"
    >
      <div className="marquee-track py-1.5 text-sm font-semibold">
        {[0, 1].map((copy) => (
          <span key={copy} aria-hidden={copy === 1} className="flex">
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
