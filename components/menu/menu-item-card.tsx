'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Clock, Heart, Star } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getDietaryTagIcon } from '@/lib/formatters';
import type { MenuItemWithDetails } from '@/types/database';
import { ItemCustomizationDialog } from './item-customization-dialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItemWithDetails;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const [showCustomization, setShowCustomization] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const hasCustomizations = (item.variations && item.variations.length > 0) || 
                           (item.addons && item.addons.length > 0);

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: { y: -8, transition: { duration: 0.2 } },
  };

  const buttonVariants = {
    tap: { scale: 0.95 },
  };

  return (
    <>
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="h-full"
      >
        <Card className="overflow-hidden h-full flex flex-col group border-0 shadow-md hover:shadow-2xl transition-all duration-300 bg-white">
          <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl">
              🍲
            </div>
          )}
          
          {/* Dietary Tag Badge */}
          {item.dietary_tag && item.dietary_tag !== 'none' && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              {getDietaryTagIcon(item.dietary_tag)} {item.dietary_tag.replace('_', ' ')}
            </Badge>
          )}

          {/* Sold Out Badge */}
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Sold Out
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {formatCurrency(item.base_price)}
              {hasCustomizations && <span className="text-sm text-muted-foreground">+</span>}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full"
            onClick={() => setShowCustomization(true)}
            disabled={!item.is_available}
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasCustomizations ? 'Customize & Add' : 'Add to Cart'}
          </Button>
        </CardFooter>
      </Card>

      <ItemCustomizationDialog
        item={item}
        open={showCustomization}
        onClose={() => setShowCustomization(false)}
      />
    </>
  );
}
