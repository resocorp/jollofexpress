'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMenu } from '@/hooks/use-menu';
import { Header } from '@/components/layout/header';
import { MenuItemCard } from '@/components/menu/menu-item-card';
import { RestaurantBanner } from '@/components/menu/restaurant-banner';

export default function MenuPage() {
  const { data: menu, isLoading } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      <RestaurantBanner />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 overflow-x-auto">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              {menu?.categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Menu Items by Category */}
        {filteredCategories && filteredCategories.length > 0 ? (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <section key={category.id}>
                <h2 className="text-2xl font-bold mb-4">{category.name}</h2>
                {category.description && (
                  <p className="text-muted-foreground mb-4">{category.description}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
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
    </div>
  );
}
