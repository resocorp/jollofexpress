// Public endpoint to fetch active delivery regions
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DeliveryRegion, DeliveryRegionGroup, DeliveryRegionGroupWithRegions } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch active region groups with their regions
    const { data: groups, error: groupsError } = await supabase
      .from('delivery_region_groups')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (groupsError) {
      console.error('Error fetching region groups:', groupsError);
      return NextResponse.json(
        { error: 'Failed to fetch delivery regions' },
        { status: 500 }
      );
    }

    // Fetch active regions
    const { data: regions, error: regionsError } = await supabase
      .from('delivery_regions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (regionsError) {
      console.error('Error fetching regions:', regionsError);
      return NextResponse.json(
        { error: 'Failed to fetch delivery regions' },
        { status: 500 }
      );
    }

    // Group regions by their group_id
    const groupedRegions: DeliveryRegionGroupWithRegions[] = (groups || []).map((group: DeliveryRegionGroup) => ({
      ...group,
      regions: (regions || []).filter((region: DeliveryRegion) => region.group_id === group.id),
    }));

    // Also include ungrouped regions
    const ungroupedRegions = (regions || []).filter((region: DeliveryRegion) => !region.group_id);

    return NextResponse.json({
      groups: groupedRegions,
      ungrouped: ungroupedRegions,
      all_regions: regions || [],
    });

  } catch (error) {
    console.error('Unexpected error in /api/delivery/regions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
