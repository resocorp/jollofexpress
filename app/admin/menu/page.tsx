'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, ImageIcon, LayoutGrid, LayoutList, Filter, ArrowUpDown, Clock, PackageX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import Image from 'next/image';
import { adminFetch } from '@/lib/api-client';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price?: number;
  base_price?: number;
  promo_price?: number | null;
  category?: string;
  category_id?: string;
  image_url?: string;
  is_available: boolean;
  is_listed: boolean;
  prep_time?: number;
  created_at: string;
}

type ViewMode = 'grid' | 'table';
type SortKey = 'name' | 'price' | 'category' | 'created_at';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'available' | 'sold_out' | 'hidden';

function getItemStatus(item: MenuItem): 'available' | 'sold_out' | 'hidden' {
  if (!item.is_listed) return 'hidden';
  if (!item.is_available) return 'sold_out';
  return 'available';
}

export default function MenuManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fetch menu items
  const { data: menuItems, isLoading, refetch } = useQuery<MenuItem[]>({
    queryKey: ['admin-menu-items'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/menu/items');
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    refetchOnWindowFocus: true, // Auto refetch when window regains focus
  });

  // Filter and sort menu items
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    return menuItems
      .filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const status = getItemStatus(item);
        const matchesStatus = statusFilter === 'all' || statusFilter === status;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortKey) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'price':
            comparison = (a.price || a.base_price || 0) - (b.price || b.base_price || 0);
            break;
          case 'category':
            comparison = (a.category || '').localeCompare(b.category || '');
            break;
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [menuItems, searchQuery, selectedCategory, statusFilter, sortKey, sortOrder]);

  // Get unique categories
  const categories = ['all', ...new Set(menuItems?.map((item) => item.category).filter(Boolean) || [])];

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      console.log('🗑️ Deleting item:', id);
      const response = await adminFetch(`/api/admin/menu/items/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete item');
      
      console.log('✅ Item deleted, refetching list');
      // Refetch data using React Query
      await refetch();
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Failed to delete item');
    }
  };

  const handleUpdateField = async (
    id: string,
    field: 'is_available' | 'is_listed',
    value: boolean,
  ) => {
    try {
      const response = await adminFetch(`/api/admin/menu/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error(`Failed to update ${field}`);

      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
      await queryClient.invalidateQueries({ queryKey: ['kitchen-menu'] });
    } catch (error) {
      console.error('❌ Toggle error:', error);
      alert(`Failed to update ${field === 'is_listed' ? 'listing' : 'availability'}`);
    }
  };

  const handleToggleAvailability = (id: string, currentStatus: boolean) =>
    handleUpdateField(id, 'is_available', !currentStatus);

  const handleToggleListed = (id: string, currentStatus: boolean) =>
    handleUpdateField(id, 'is_listed', !currentStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your restaurant menu items, categories, and availability
          </p>
        </div>
        <Link href="/admin/menu/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardDescription>Total Items</CardDescription>
              <CardTitle className="text-3xl font-bold">{menuItems?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300 border-l-4 border-l-green-600">
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {menuItems?.filter((item) => getItemStatus(item) === 'available').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300 border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardDescription>Sold Out</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">
                {menuItems?.filter((item) => getItemStatus(item) === 'sold_out').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300 border-l-4 border-l-slate-500">
            <CardHeader className="pb-2">
              <CardDescription>Hidden</CardDescription>
              <CardTitle className="text-3xl font-bold text-slate-600">
                {menuItems?.filter((item) => getItemStatus(item) === 'hidden').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
      </div>

      {/* Filters & Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Search & View Toggle */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Status Filter */}
              <div className="flex gap-1">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('available')}
                >
                  Available
                </Button>
                <Button
                  variant={statusFilter === 'sold_out' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('sold_out')}
                >
                  Sold Out
                </Button>
                <Button
                  variant={statusFilter === 'hidden' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('hidden')}
                >
                  Hidden
                </Button>
              </div>

              <div className="h-4 w-px bg-border" />

              {/* Category Filter */}
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category || 'all')}
                  className="capitalize"
                >
                  {category || 'Unknown'}
                </Button>
              ))}

              <div className="h-4 w-px bg-border" />

              {/* Sort */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sortKey === 'name') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortKey('name');
                    setSortOrder('asc');
                  }
                }}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort: {sortKey}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading menu items...</p>
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onToggleAvailability={handleToggleAvailability}
                      onToggleListed={handleToggleListed}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Prep Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image_url ? (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.category || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.promo_price ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">₦{item.promo_price.toLocaleString()}</span>
                          <span className="text-sm text-muted-foreground line-through">₦{(item.price || item.base_price || 0).toLocaleString()}</span>
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                            {Math.round(((item.base_price || item.price || 0) - item.promo_price) / (item.base_price || item.price || 1) * 100)}% OFF
                          </Badge>
                        </div>
                      ) : (
                        <span>₦{(item.price || item.base_price || 0).toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell>{item.prep_time || 15} min</TableCell>
                    <TableCell>
                      <StatusBadge item={item} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {item.is_listed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAvailability(item.id, item.is_available)}
                            title={item.is_available ? 'Mark as sold out' : 'Mark as in stock'}
                          >
                            {item.is_available ? (
                              <PackageX className="h-4 w-4" />
                            ) : (
                              <PackageX className="h-4 w-4 text-amber-600" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleListed(item.id, item.is_listed)}
                          title={item.is_listed ? 'Hide from storefront' : 'Show on storefront'}
                        >
                          {item.is_listed ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-slate-500" />
                          )}
                        </Button>
                        <Link href={`/admin/menu/${item.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No menu items found</p>
              <p className="text-muted-foreground mt-1">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first menu item'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Link href="/admin/menu/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Menu Item
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ item }: { item: MenuItem }) {
  const status = getItemStatus(item);
  if (status === 'available') {
    return <Badge className="bg-green-600 hover:bg-green-700">Available</Badge>;
  }
  if (status === 'sold_out') {
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Sold Out</Badge>;
  }
  return <Badge variant="outline" className="text-slate-500 border-slate-400">Hidden</Badge>;
}

// Menu Item Card Component for Grid View
interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  onToggleAvailability: (id: string, currentStatus: boolean) => void;
  onToggleListed: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

function MenuItemCard({ item, index, onToggleAvailability, onToggleListed, onDelete }: MenuItemCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.05,
      }
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden bg-muted">
        {item.image_url ? (
          <>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3 shadow-lg">
          <StatusBadge item={item} />
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link href={`/admin/menu/${item.id}`}>
            <Button size="sm" className="shadow-lg backdrop-blur-sm bg-card/90 hover:bg-card text-foreground border border-border">
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow p-4">
        {/* Category Badge */}
        <Badge variant="outline" className="w-fit capitalize mb-2 text-xs">
          {item.category || 'Uncategorized'}
        </Badge>

        {/* Item Name */}
        <h3 className="text-lg font-semibold leading-tight mb-2 line-clamp-2">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-grow">
          {item.description}
        </p>

        {/* Price & Prep Time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            {item.promo_price ? (
              <>
                <div className="text-xl font-bold text-primary">
                  ₦{item.promo_price.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    ₦{(item.price || item.base_price || 0).toLocaleString()}
                  </span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                    {Math.round(((item.base_price || item.price || 0) - item.promo_price) / (item.base_price || item.price || 1) * 100)}% OFF
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-xl font-bold text-primary">
                ₦{(item.price || item.base_price || 0).toLocaleString()}
              </div>
            )}
          </div>
          {item.prep_time && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{item.prep_time} min</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {item.is_listed ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onToggleAvailability(item.id, item.is_available)}
              title={item.is_available ? 'Mark this item as sold out (kitchen + customer view)' : 'Mark this item back in stock'}
            >
              <PackageX className="h-3 w-3 mr-1" />
              {item.is_available ? 'Sold out' : 'In stock'}
            </Button>
          ) : (
            <div className="flex-1 text-xs text-muted-foreground italic px-2">
              Hidden from storefront
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleListed(item.id, item.is_listed)}
            title={item.is_listed ? 'Hide from storefront entirely (e.g. discontinued)' : 'Show on storefront'}
          >
            {item.is_listed ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-slate-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
