'use client';

import { useState } from 'react';
import { Loader2, TrendingUp, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMenu } from '@/hooks/use-menu';
import { useCartCleanup } from '@/hooks/use-cart-cleanup';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MenuItemCard } from '@/components/menu/menu-item-card-modern';
import { PromoBanner } from '@/components/menu/christmas-promo-banner';
// DISABLED: WhatsApp ordering system
// import { WhatsAppFloat } from '@/components/shared/whatsapp-float';
import { FloatingCartBadge } from '@/components/cart/floating-cart-badge';
import { CartArrowIndicator } from '@/components/cart/cart-arrow-indicator';
import { motion, AnimatePresence } from 'framer-motion';

export default function MenuPage() {
  const { data: menu, isLoading } = useMenu();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Clean up stale cart if pending order was already paid
  useCartCleanup();

  // Filter items based on category
  const filteredCategories = menu?.categories.map((category) => ({
    ...category,
    items: category.items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory;
      return matchesCategory;
    }),
  })).filter((category) => category.items.length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Header />
      
      {/* Promo & Restaurant Info Banner */}
      <PromoBanner />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 max-w-[1400px]">
        {/* Category Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-2"
        >
          {/* Category Tabs */}
          <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="inline-flex w-auto bg-white shadow-sm rounded-lg p-1 border min-h-[40px]">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-md px-3 sm:px-4 py-2 font-semibold transition-all text-xs sm:text-sm"
                >
                  <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  All Items
                </TabsTrigger>
                {menu?.categories.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-md px-3 sm:px-4 py-2 font-semibold transition-all text-xs sm:text-sm whitespace-nowrap"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* Hidden TabsContent elements for ARIA compliance */}
              <TabsContent value="all" className="hidden" />
              {menu?.categories.map((category) => (
                <TabsContent key={category.id} value={category.id} className="hidden" />
              ))}
            </Tabs>
          </div>
        </motion.div>

        {/* Menu Items by Category */}
        {filteredCategories && filteredCategories.length > 0 ? (
          <AnimatePresence mode="wait">
            <div className="space-y-4 sm:space-y-6">
              {filteredCategories.map((category, catIndex) => (
                <motion.section
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: catIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div className="mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                        {category.name}
                      </h2>
                      {catIndex === 0 && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-muted-foreground text-base sm:text-lg">{category.description}</p>
                    )}
                  </div>

                  {/* Menu Grid - Centered with max-width */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
                    {category.items.map((item, itemIndex) => (
                      <MenuItemCard key={item.id} item={item} index={itemIndex} />
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <p className="text-base sm:text-lg text-muted-foreground">No items found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Floating Elements */}
      {/* DISABLED: WhatsApp ordering system */}
      {/* <WhatsAppFloat /> */}
      <FloatingCartBadge />
      <CartArrowIndicator />
      
      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav />
    </div>
  );
}
