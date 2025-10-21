'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Clock, Heart, ShoppingCart, Check, Loader2 } from 'lucide-react';
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
  index?: number;
}

export function MenuItemCard({ item, index = 0 }: MenuItemCardProps) {
  const [showCustomization, setShowCustomization] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const hasCustomizations = (item.variations && item.variations.length > 0) || 
                           (item.addons && item.addons.length > 0);

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.4,
        delay: index * 0.1,
      } 
    },
    hover: { y: -8, transition: { duration: 0.2 } },
  };

  const imageVariants = {
    hover: { scale: 1.05, transition: { duration: 0.3 } },
  };

  const handleQuickAdd = () => {
    if (hasCustomizations) {
      setShowCustomization(true);
    } else {
      setIsAdding(true);
      // Simulate adding to cart
      setTimeout(() => {
        setIsAdding(false);
        setShowCustomization(true);
      }, 600);
    }
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
        <Card className="overflow-hidden h-full flex flex-col group border-0 shadow-md hover:shadow-2xl transition-all duration-300 bg-white rounded-2xl">
          {/* Image Section */}
          <div className="relative h-56 bg-gradient-to-br from-orange-50 via-white to-red-50 overflow-hidden">
            {item.image_url ? (
              <motion.div variants={imageVariants} className="h-full w-full">
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full text-7xl animate-pulse">
                🍲
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Top Right Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              {/* Favorite Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFavorite(!isFavorite);
                }}
                className={cn(
                  "p-2 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300",
                  isFavorite 
                    ? "bg-red-500 text-white" 
                    : "bg-white/90 text-gray-700 hover:bg-white"
                )}
              >
                <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
              </motion.button>

              {/* Dietary Tag Badge */}
              {item.dietary_tag && item.dietary_tag !== 'none' && (
                <Badge className="backdrop-blur-sm bg-white/90 text-gray-900 border-0 shadow-lg">
                  {getDietaryTagIcon(item.dietary_tag)} {item.dietary_tag.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {/* Quick Add Button (appears on hover) */}
            {item.is_available && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileHover={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <Button
                  onClick={handleQuickAdd}
                  disabled={isAdding}
                  className="w-full bg-primary hover:bg-primary/90 text-white shadow-xl font-semibold"
                  size="lg"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Quick Add
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Sold Out Overlay */}
            {!item.is_available && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <Badge variant="destructive" className="text-lg px-6 py-2 shadow-xl">
                  Sold Out
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <CardContent className="p-5 flex-grow flex flex-col">
            {/* Item Name */}
            <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            
            {/* Description */}
            {item.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-grow">
                {item.description}
              </p>
            )}

            {/* Price Row */}
            <div className="flex items-center justify-between mt-auto">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(item.base_price)}
                  {hasCustomizations && <span className="text-sm text-muted-foreground ml-1">+</span>}
                </span>
                {hasCustomizations && (
                  <span className="text-xs text-muted-foreground">Customizable</span>
                )}
              </div>

              {/* Prep Time Badge */}
              {item.prep_time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  <span>{item.prep_time} min</span>
                </div>
              )}
            </div>
          </CardContent>

          {/* Footer with Add Button */}
          <CardFooter className="p-5 pt-0">
            <Button
              className="w-full group-hover:bg-primary group-hover:text-white transition-all duration-300"
              variant={item.is_available ? "default" : "secondary"}
              onClick={() => setShowCustomization(true)}
              disabled={!item.is_available}
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              {hasCustomizations ? 'Customize & Add' : 'Add to Cart'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      <ItemCustomizationDialog
        item={item}
        open={showCustomization}
        onClose={() => setShowCustomization(false)}
      />
    </>
  );
}
