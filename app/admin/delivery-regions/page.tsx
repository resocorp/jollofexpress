'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  MapPin, 
  Loader2, 
  GripVertical,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Layers,
  DollarSign,
  Gift
} from 'lucide-react';
import { useAdminDeliveryRegions } from '@/hooks/use-delivery-regions';
import { formatCurrency } from '@/lib/formatters';
import { RegionDialog } from '@/components/admin/delivery-regions/region-dialog';
import { GroupDialog } from '@/components/admin/delivery-regions/group-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delivery-regions/delete-confirm-dialog';
import type { DeliveryRegion, DeliveryRegionGroup } from '@/types/database';

export default function DeliveryRegionsPage() {
  const { data, isLoading, error } = useAdminDeliveryRegions();
  const [activeTab, setActiveTab] = useState('regions');
  
  // Dialog states
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<DeliveryRegion | null>(null);
  const [editingGroup, setEditingGroup] = useState<DeliveryRegionGroup | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'region' | 'group'; id: string; name: string } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Delivery Regions</h1>
          <p className="text-muted-foreground mt-2">
            Manage delivery zones and pricing
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Delivery Regions</h1>
          <p className="text-muted-foreground mt-2">
            Manage delivery zones and pricing
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-600">
              <p className="font-medium">Failed to load delivery regions</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please refresh the page to try again
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEditRegion = (region: DeliveryRegion) => {
    setEditingRegion(region);
    setRegionDialogOpen(true);
  };

  const handleEditGroup = (group: DeliveryRegionGroup) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleDeleteRegion = (region: DeliveryRegion) => {
    setDeletingItem({ type: 'region', id: region.id, name: region.name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteGroup = (group: DeliveryRegionGroup) => {
    setDeletingItem({ type: 'group', id: group.id, name: group.name });
    setDeleteDialogOpen(true);
  };

  const handleCloseRegionDialog = () => {
    setRegionDialogOpen(false);
    setEditingRegion(null);
  };

  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
    setEditingGroup(null);
  };

  const totalRegions = data?.all_regions?.length || 0;
  const activeRegions = data?.all_regions?.filter(r => r.is_active).length || 0;
  const totalGroups = data?.all_groups?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Delivery Regions</h1>
          <p className="text-muted-foreground mt-2">
            Manage delivery zones, pricing, and free delivery thresholds
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setEditingGroup(null);
              setGroupDialogOpen(true);
            }}
          >
            <Layers className="h-4 w-4 mr-2" />
            Add Group
          </Button>
          <Button 
            onClick={() => {
              setEditingRegion(null);
              setRegionDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRegions}</p>
                <p className="text-sm text-muted-foreground">Total Regions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ToggleRight className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeRegions}</p>
                <p className="text-sm text-muted-foreground">Active Regions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalGroups}</p>
                <p className="text-sm text-muted-foreground">Region Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Regions
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Groups
          </TabsTrigger>
        </TabsList>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-4">
          {data?.groups?.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant={group.is_active ? 'default' : 'secondary'}>
                      {group.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {group.regions?.length || 0} regions
                  </span>
                </div>
                {group.description && (
                  <CardDescription>{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {group.regions && group.regions.length > 0 ? (
                  <div className="space-y-2">
                    {group.regions.map((region) => (
                      <div 
                        key={region.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          region.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <div>
                            <p className="font-medium">{region.name}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(region.delivery_fee)}
                              </span>
                              {region.free_delivery_threshold && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Gift className="h-3 w-3" />
                                  Free above {formatCurrency(region.free_delivery_threshold)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={region.is_active ? 'outline' : 'secondary'} className="text-xs">
                            {region.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditRegion(region)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRegion(region)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No regions in this group
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Ungrouped Regions */}
          {data?.ungrouped && data.ungrouped.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ungrouped Regions</CardTitle>
                <CardDescription>Regions not assigned to any group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.ungrouped.map((region) => (
                    <div 
                      key={region.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        region.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div>
                          <p className="font-medium">{region.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(region.delivery_fee)}
                            </span>
                            {region.free_delivery_threshold && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Gift className="h-3 w-3" />
                                Free above {formatCurrency(region.free_delivery_threshold)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={region.is_active ? 'outline' : 'secondary'} className="text-xs">
                          {region.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditRegion(region)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRegion(region)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {(!data?.all_regions || data.all_regions.length === 0) && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No regions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first delivery region to get started
                  </p>
                  <Button onClick={() => setRegionDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Region
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          {data?.all_groups && data.all_groups.length > 0 ? (
            <div className="space-y-2">
              {data.all_groups.map((group) => (
                <Card key={group.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{group.name}</p>
                            <Badge variant={group.is_active ? 'default' : 'secondary'}>
                              {group.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteGroup(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Layers className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No groups yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create groups to organize your delivery regions
                  </p>
                  <Button onClick={() => setGroupDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Group
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RegionDialog
        open={regionDialogOpen}
        onClose={handleCloseRegionDialog}
        region={editingRegion}
        groups={data?.all_groups || []}
      />

      <GroupDialog
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        group={editingGroup}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingItem(null);
        }}
        item={deletingItem}
      />
    </div>
  );
}
