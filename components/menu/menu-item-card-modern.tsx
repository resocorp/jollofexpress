'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Heart } from 'lucide-react';
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

  const handleCardClick = () => {
    if (item.is_available) {
      setShowCustomization(true);
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
        onClick={handleCardClick}
      >
        <Card className="overflow-hidden h-full flex flex-col group border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white rounded-xl cursor-pointer touch-manipulation">
          {/* Image Section */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-50 via-white to-red-50 overflow-hidden rounded-t-xl">
            {item.image_url ? (
              <motion.div variants={imageVariants} className="h-full w-full">
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  loading="lazy"
                />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full text-6xl sm:text-7xl animate-pulse">
                🍲
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Top Right Badges */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1.5 sm:gap-2">
              {/* Favorite Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFavorite(!isFavorite);
                }}
                className={cn(
                  "p-2 sm:p-2.5 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300 touch-manipulation",
                  isFavorite 
                    ? "bg-red-500 text-white" 
                    : "bg-white/90 text-gray-700 hover:bg-white active:bg-white"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isFavorite && "fill-white")} />
              </motion.button>

              {/* Dietary Tag Badge */}
              {item.dietary_tag && item.dietary_tag !== 'none' && (
                <Badge className="backdrop-blur-sm bg-white/90 text-gray-900 border-0 shadow-lg text-xs">
                  {getDietaryTagIcon(item.dietary_tag)} {item.dietary_tag.replace('_', ' ')}
                </Badge>
              )}
            </div>


            {/* Sold Out Overlay */}
            {!item.is_available && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <Badge variant="destructive" className="text-base sm:text-lg px-4 sm:px-6 py-1.5 sm:py-2 shadow-xl">
                  Sold Out
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <CardContent className="p-4 sm:p-5 flex-grow flex flex-col gap-3">
            {/* Item Name */}
            <h3 className="font-semibold text-lg sm:text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            
            {/* Description */}
            {item.description && (
              <p className="text-sm leading-relaxed text-[#666] line-clamp-2 flex-grow">
                {item.description}
              </p>
            )}

            {/* Price Row */}
            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex flex-col gap-1">
                <span className="text-xl sm:text-[22px] font-bold text-black">
                  {formatCurrency(item.base_price)}
                  {hasCustomizations && <span className="text-xs sm:text-sm text-muted-foreground ml-1">+</span>}
                </span>
                {hasCustomizations && (
                  <span className="text-[10px] sm:text-xs text-[#666]">Customizable</span>
                )}
              </div>
            </div>
          </CardContent>

          {/* Footer with Add Button */}
          <CardFooter className="p-4 sm:p-5 pt-0">
            <Button
              className="w-full group-hover:bg-primary group-hover:text-white transition-all duration-300 touch-manipulation text-sm sm:text-base min-h-[44px]"
              variant={item.is_available ? "default" : "secondary"}
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomization(true);
              }}
              disabled={!item.is_available}
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
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
