'use client';

import { useState } from 'react';
import { Loader2, TrendingUp, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMenu } from '@/hooks/use-menu';
import { useCartCleanup } from '@/hooks/use-cart-cleanup';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MenuItemCard } from '@/components/menu/menu-item-card-modern';
import { ChristmasPromoBanner } from '@/components/menu/christmas-promo-banner';
import { WhatsAppFloat } from '@/components/shared/whatsapp-float';
import { FloatingCartBadge } from '@/components/cart/floating-cart-badge';
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
      
      {/* Combined Christmas Promo & Restaurant Info Banner */}
      <ChristmasPromoBanner />

      {/* Main Content */}
      <div className="container mx-auto px-5 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px]">
        {/* Category Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {/* Category Tabs */}
          <div className="overflow-x-auto pb-3 -mx-5 px-5 sm:mx-0 sm:px-0 scrollbar-hide">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="inline-flex w-auto bg-white shadow-md rounded-xl p-1.5 border min-h-[48px]">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all text-sm sm:text-base"
                >
                  <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  All Items
                </TabsTrigger>
                {menu?.categories.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all text-sm sm:text-base whitespace-nowrap"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </motion.div>

        {/* Menu Items by Category */}
        {filteredCategories && filteredCategories.length > 0 ? (
          <AnimatePresence mode="wait">
            <div className="space-y-10 sm:space-y-12">
              {filteredCategories.map((category, catIndex) => (
                <motion.section
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: catIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div className="mb-8 sm:mb-10">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <h2 className="text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
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
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-fr">
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
      <WhatsAppFloat />
      <FloatingCartBadge />
      
      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav />
    </div>
  );
}
