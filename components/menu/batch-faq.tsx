'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderWindow } from '@/hooks/use-order-window';

function buildFaqItems(hasTwoBatches: boolean, batches: { windowName: string; cutoffTime: string; deliveryWindow: string }[]) {
  // Sort by cutoff for consistent display
  const sorted = [...batches].sort((a, b) => a.cutoffTime.localeCompare(b.cutoffTime));

  return [
    {
      question: 'Why batch delivery?',
      answer: hasTwoBatches
        ? `We grill every shawarma fresh to order in two daily batches — ${sorted[0].windowName} and ${sorted[1].windowName}. This means your food is never sitting around — it goes straight from the grill to your door, hot and delicious.`
        : 'We grill every shawarma fresh to order in daily batches. This means your food is never sitting around — it goes straight from the grill to your door, hot and delicious.',
    },
    {
      question: 'What happens after the order cutoff?',
      answer: hasTwoBatches
        ? `If you miss the ${sorted[0].windowName} cutoff (${sorted[0].cutoffTime}), you can still order for the ${sorted[1].windowName} (delivered ${sorted[1].deliveryWindow}). After both cutoffs, you can pre-order for the next day.`
        : 'Once the cutoff time passes, we start preparing all orders in that batch. You can still place a pre-order for the next available delivery window — your shawarma will be freshly made in the next batch.',
    },
    {
      question: 'Are delivery times exact?',
      answer: 'They\'re a guide! We\'re human, so some flexibility can be expected. We\'ll always keep you updated via WhatsApp so you know when your food is on the way.',
    },
    {
      question: 'What delivery areas do you cover?',
      answer: 'We currently deliver within Awka and surrounding areas. Delivery fees vary by location. Orders above a certain amount qualify for free delivery!',
    },
    {
      question: 'How do I track my order?',
      answer: 'After payment, you\'ll receive a WhatsApp notification with your order details. We\'ll send updates when your batch is being prepared and when your rider is on the way.',
    },
    {
      question: 'Can I cancel after ordering?',
      answer: 'You can request a cancellation before the batch cutoff time. Once preparation begins, cancellations may not be possible. Please contact us directly for assistance.',
    },
  ];
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 sm:py-4 text-left touch-manipulation"
      >
        <span className="font-semibold text-sm sm:text-base text-gray-900 pr-4">{question}</span>
        <ChevronDown
          className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-3 sm:pb-4 text-sm text-gray-600 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BatchFAQ() {
  const { allTodayBatches } = useOrderWindow();
  const hasTwoBatches = allTodayBatches.length > 1;
  const faqItems = buildFaqItems(hasTwoBatches, allTodayBatches);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="bg-white rounded-xl border shadow-sm px-4 sm:px-6">
          {faqItems.map((item, i) => (
            <FAQItem key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
