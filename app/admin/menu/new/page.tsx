'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import Image from 'next/image';
import { adminFetch } from '@/lib/api-client';

interface Category {
  id: string;
  name: string;
  is_active?: boolean;
}

interface VariationOption {
  name: string;
  price_adjustment: number;
}

interface Variation {
  variation_name: string;
  options: VariationOption[];
}

interface Addon {
  name: string;
  price: number;
  is_available: boolean;
}

export default function NewMenuItemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    category_id: '',
    is_available: true,
    image_url: '',
  });

  const [variations, setVariations] = useState<Variation[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/menu/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Import upload utility dynamically
      const { uploadMenuItemImage } = await import('@/lib/image-upload');
      
      console.log('📸 Uploading image...');
      const result = await uploadMenuItemImage(file);
      
      console.log('✅ Image uploaded:', result.publicUrl);
      setFormData((prev) => ({
        ...prev,
        image_url: result.publicUrl,
      }));
      
    } catch (error) {
      console.error('❌ Image upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
      
      // Reset image on error
      setImagePreview(null);
      setFormData((prev) => ({
        ...prev,
        image_url: '',
      }));
    }
  };

  // Variation management
  const addVariation = () => {
    setVariations([...variations, { variation_name: '', options: [{ name: '', price_adjustment: 0 }] }]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariationName = (index: number, name: string) => {
    const updated = [...variations];
    updated[index].variation_name = name;
    setVariations(updated);
  };

  const addVariationOption = (variationIndex: number) => {
    const updated = [...variations];
    updated[variationIndex].options.push({ name: '', price_adjustment: 0 });
    setVariations(updated);
  };

  const removeVariationOption = (variationIndex: number, optionIndex: number) => {
    const updated = [...variations];
    updated[variationIndex].options = updated[variationIndex].options.filter((_, i) => i !== optionIndex);
    setVariations(updated);
  };

  const updateVariationOption = (variationIndex: number, optionIndex: number, field: keyof VariationOption, value: string | number) => {
    const updated = [...variations];
    updated[variationIndex].options[optionIndex] = {
      ...updated[variationIndex].options[optionIndex],
      [field]: value,
    };
    setVariations(updated);
  };

  // Add-on management
  const addAddon = () => {
    setAddons([...addons, { name: '', price: 0, is_available: true }]);
  };

  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  const updateAddon = (index: number, field: keyof Addon, value: string | number | boolean) => {
    const updated = [...addons];
    updated[index] = { ...updated[index], [field]: value };
    setAddons(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await adminFetch('/api/admin/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          base_price: parseFloat(formData.base_price),
          variations,
          addons,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu item');
      }

      router.push('/admin/menu');
    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/menu">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Menu Item</h1>
          <p className="text-muted-foreground mt-1">
            Create a new item for your restaurant menu
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Item Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g., Jollof Rice with Chicken"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    required
                    rows={4}
                    placeholder="Describe your dish, ingredients, and what makes it special"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category_id">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    required
                    value={formData.category_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.filter((cat: Category) => cat.is_active !== false).map((category: Category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!categories?.length && (
                    <p className="text-sm text-muted-foreground">No categories available. <Link href="/admin/menu/categories" className="text-primary hover:underline">Create one first</Link></p>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="base_price">
                    Base Price (₦) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, base_price: e.target.value }))
                    }
                  />
                  <p className="text-sm text-muted-foreground">Starting price before variations</p>
                </div>
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData((prev) => ({ ...prev, image_url: '' }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12">
                      <div className="text-center">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <Label
                          htmlFor="image"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          Click to upload image
                        </Label>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Variations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Variations</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Options like portion sizes, protein types, etc.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addVariation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variation
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {variations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No variations yet</p>
                    <p className="text-sm mt-1">Add variations to give customers choices</p>
                  </div>
                ) : (
                  variations.map((variation, varIndex) => (
                    <div key={varIndex} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>Variation Name (e.g., "Portion Size", "Protein")</Label>
                          <Input
                            placeholder="e.g., Portion Size"
                            value={variation.variation_name}
                            onChange={(e) => updateVariationName(varIndex, e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariation(varIndex)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Options</Label>
                        {variation.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              placeholder="Option name (e.g., Regular)"
                              value={option.name}
                              onChange={(e) =>
                                updateVariationOption(varIndex, optIndex, 'name', e.target.value)
                              }
                              className="flex-1"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">+₦</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={option.price_adjustment}
                                onChange={(e) =>
                                  updateVariationOption(
                                    varIndex,
                                    optIndex,
                                    'price_adjustment',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24"
                              />
                            </div>
                            {variation.options.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariationOption(varIndex, optIndex)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addVariationOption(varIndex)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Add-ons */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Add-ons</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optional extras customers can add
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addAddon}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Add-on
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No add-ons yet</p>
                    <p className="text-sm mt-1">Add optional extras for customization</p>
                  </div>
                ) : (
                  addons.map((addon, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Add-on name (e.g., Extra Protein)"
                        value={addon.name}
                        onChange={(e) => updateAddon(index, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">₦</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={addon.price}
                          onChange={(e) =>
                            updateAddon(index, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAddon(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Availability */}
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Available for orders</Label>
                    <p className="text-sm text-muted-foreground">
                      Customers can order this item
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_available}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_available: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Menu Item'}
                </Button>
                <Link href="/admin/menu">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium">
                    {formData.name || 'Item Name'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formData.description || 'Item description'}
                  </div>
                  <div className="text-lg font-bold">
                    ₦{formData.base_price ? parseFloat(formData.base_price).toLocaleString() : '0'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
