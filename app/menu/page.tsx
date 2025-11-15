'use client';

import { useState } from 'react';
import { Search, Loader2, TrendingUp, Flame, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMenu } from '@/hooks/use-menu';
import { useCartCleanup } from '@/hooks/use-cart-cleanup';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MenuItemCard } from '@/components/menu/menu-item-card-modern';
import { EnhancedBanner } from '@/components/menu/enhanced-banner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MenuPage() {
  const { data: menu, isLoading } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Clean up stale cart if pending order was already paid
  useCartCleanup();

  // Filter items based on search and category
  const filteredCategories = menu?.categories.map((category) => ({
    ...category,
    items: category.items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory;
      return matchesSearch && matchesCategory;
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Restaurant Banner */}
      <EnhancedBanner />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search & Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for your favorite dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg rounded-2xl border-2 focus:border-primary shadow-sm"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="overflow-x-auto pb-2">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="inline-flex w-auto bg-white shadow-md rounded-xl p-1 border">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 font-semibold transition-all"
                >
                  <Flame className="h-4 w-4 mr-2" />
                  All Items
                </TabsTrigger>
                {menu?.categories.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 font-semibold transition-all"
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
            <div className="space-y-12">
              {filteredCategories.map((category, catIndex) => (
                <motion.section
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: catIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                        {category.name}
                      </h2>
                      {catIndex === 0 && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-muted-foreground text-lg">{category.description}</p>
                    )}
                  </div>

                  {/* Menu Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {category.items.map((item, itemIndex) => (
                      <MenuItemCard key={item.id} item={item} index={itemIndex} />
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No items found</p>
            {searchQuery && (
              <Button
                variant="link"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
