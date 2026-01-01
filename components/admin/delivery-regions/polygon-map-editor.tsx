'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { kml } from '@tmcw/togeojson';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Trash2, Layers, Info, Upload, FileText, Pencil } from 'lucide-react';
import { toast } from 'sonner';

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// GeoJSON Polygon type
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

interface PolygonMapEditorProps {
  initialPolygon?: GeoJSONPolygon | null;
  onPolygonChange: (polygon: GeoJSONPolygon | null) => void;
  className?: string;
}

// Default center: Awka, Anambra State, Nigeria
const DEFAULT_CENTER: [number, number] = [7.0707, 6.2103];
const DEFAULT_ZOOM = 13;

// Map styles
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
};

export function PolygonMapEditor({ 
  initialPolygon,
  onPolygonChange,
  className = ''
}: PolygonMapEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets'>('satellite');
  const [hasPolygon, setHasPolygon] = useState(!!initialPolygon);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle draw events
  const updatePolygon = useCallback(() => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0].geometry as GeoJSONPolygon;
      setHasPolygon(true);
      onPolygonChange(polygon);
    } else {
      setHasPolygon(false);
      onPolygonChange(null);
    }
  }, [onPolygonChange]);

  // Clear polygon
  const clearPolygon = useCallback(() => {
    if (draw.current) {
      draw.current.deleteAll();
      setHasPolygon(false);
      onPolygonChange(null);
      toast.success('Polygon cleared');
    }
  }, [onPolygonChange]);

  // Toggle map style
  const toggleMapStyle = useCallback(() => {
    const nextStyle = mapStyle === 'satellite' ? 'streets' : 'satellite';
    setMapStyle(nextStyle);
    
    if (map.current && draw.current) {
      // Save current drawings
      const currentData = draw.current.getAll();
      
      map.current.setStyle(MAP_STYLES[nextStyle]);
      
      // Re-add drawings after style change
      map.current.once('style.load', () => {
        if (draw.current && currentData.features.length > 0) {
          draw.current.set(currentData);
        }
      });
    }
    
    toast.success(`Switched to ${nextStyle} view`);
  }, [mapStyle]);

  // Load polygon into map
  const loadPolygonToMap = useCallback((polygon: GeoJSONPolygon) => {
    if (!draw.current || !map.current) return;
    
    // Clear existing
    draw.current.deleteAll();
    
    // Add new polygon
    const feature = {
      id: 'imported-polygon',
      type: 'Feature' as const,
      properties: {},
      geometry: polygon
    };
    draw.current.add(feature);
    setHasPolygon(true);
    onPolygonChange(polygon);
    
    // Zoom to polygon bounds
    const coords = polygon.coordinates[0];
    if (coords.length > 0) {
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      const bounds = new mapboxgl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      );
      map.current.fitBounds(bounds, { padding: 50 });
    }
    
    setActiveTab('draw');
  }, [onPolygonChange]);

  // Parse KML file
  const parseKMLFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const geojson = kml(xmlDoc);
        
        // Find first polygon feature
        const polygonFeature = geojson.features.find(
          (f: any) => f.geometry?.type === 'Polygon'
        );
        
        if (polygonFeature) {
          const polygon = polygonFeature.geometry as GeoJSONPolygon;
          loadPolygonToMap(polygon);
          toast.success('KML polygon imported successfully!');
        } else {
          toast.error('No polygon found in KML file');
        }
      } catch (err) {
        console.error('KML parse error:', err);
        toast.error('Failed to parse KML file');
      }
    };
    reader.readAsText(file);
  }, [loadPolygonToMap]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.kml')) {
      parseKMLFile(file);
    } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const geojson = JSON.parse(e.target?.result as string);
          let polygon: GeoJSONPolygon | null = null;
          
          if (geojson.type === 'Polygon') {
            polygon = geojson;
          } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
            polygon = geojson.geometry;
          } else if (geojson.type === 'FeatureCollection') {
            const feature = geojson.features?.find((f: any) => f.geometry?.type === 'Polygon');
            if (feature) polygon = feature.geometry;
          }
          
          if (polygon) {
            loadPolygonToMap(polygon);
            toast.success('GeoJSON polygon imported successfully!');
          } else {
            toast.error('No polygon found in GeoJSON file');
          }
        } catch (err) {
          console.error('GeoJSON parse error:', err);
          toast.error('Failed to parse GeoJSON file');
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Unsupported file type. Use .kml or .geojson');
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [parseKMLFile, loadPolygonToMap]);

  // Parse pasted text (GeoJSON or coordinates)
  const handlePasteImport = useCallback(() => {
    if (!pasteText.trim()) {
      toast.error('Please paste some data first');
      return;
    }
    
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(pasteText);
      let polygon: GeoJSONPolygon | null = null;
      
      if (parsed.type === 'Polygon') {
        polygon = parsed;
      } else if (parsed.type === 'Feature' && parsed.geometry?.type === 'Polygon') {
        polygon = parsed.geometry;
      } else if (parsed.type === 'FeatureCollection') {
        const feature = parsed.features?.find((f: any) => f.geometry?.type === 'Polygon');
        if (feature) polygon = feature.geometry;
      } else if (Array.isArray(parsed)) {
        // Array of coordinates [[lng, lat], ...] or [[lat, lng], ...]
        // Assume it's the outer ring
        if (parsed.length >= 3 && Array.isArray(parsed[0]) && parsed[0].length === 2) {
          // Check if coordinates are in correct order (lng, lat) or need swap (lat, lng)
          // Nigeria is roughly 3-15°E longitude and 4-14°N latitude
          const firstCoord = parsed[0];
          const needsSwap = firstCoord[0] > 20; // If first value > 20, it's likely latitude
          
          const coords = needsSwap 
            ? parsed.map((c: number[]) => [c[1], c[0]]) 
            : parsed;
          
          // Ensure ring is closed
          if (coords[0][0] !== coords[coords.length - 1][0] || 
              coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push([...coords[0]]);
          }
          
          polygon = {
            type: 'Polygon',
            coordinates: [coords]
          };
        }
      }
      
      if (polygon) {
        loadPolygonToMap(polygon);
        setPasteText('');
        toast.success('Polygon imported successfully!');
      } else {
        toast.error('Could not find polygon in pasted data');
      }
    } catch {
      // Not valid JSON, try parsing as coordinate list
      try {
        // Try to parse as "lat, lng" or "lng, lat" lines
        const lines = pasteText.trim().split('\n').filter(l => l.trim());
        const coords: number[][] = [];
        
        for (const line of lines) {
          // Handle formats like "6.2103, 7.0707" or "6.2103 7.0707" or "6.2103\t7.0707"
          const parts = line.split(/[,\s\t]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
          if (parts.length >= 2) {
            coords.push([parts[1], parts[0]]); // Assume lat,lng format, convert to lng,lat
          }
        }
        
        if (coords.length >= 3) {
          // Ensure ring is closed
          if (coords[0][0] !== coords[coords.length - 1][0] || 
              coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push([...coords[0]]);
          }
          
          const polygon: GeoJSONPolygon = {
            type: 'Polygon',
            coordinates: [coords]
          };
          
          loadPolygonToMap(polygon);
          setPasteText('');
          toast.success('Coordinates imported successfully!');
        } else {
          toast.error('Could not parse coordinates. Need at least 3 points.');
        }
      } catch (err) {
        console.error('Coordinate parse error:', err);
        toast.error('Failed to parse pasted data');
      }
    }
  }, [pasteText, loadPolygonToMap]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      setMapError('Mapbox token not configured');
      setIsLoading(false);
      return;
    }

    try {
      // Calculate initial center from polygon if available
      let initialCenter = DEFAULT_CENTER;
      let initialZoom = DEFAULT_ZOOM;
      
      if (initialPolygon && initialPolygon.coordinates[0].length > 0) {
        const coords = initialPolygon.coordinates[0];
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        initialCenter = [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2
        ];
        initialZoom = 14;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: initialCenter,
        zoom: initialZoom,
      });

      // Initialize draw control
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'simple_select',
        styles: [
          // Polygon fill
          {
            id: 'gl-draw-polygon-fill',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'fill-color': '#ea580c',
              'fill-outline-color': '#ea580c',
              'fill-opacity': 0.2
            }
          },
          // Polygon outline
          {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#ea580c',
              'line-width': 3
            }
          },
          // Vertex points
          {
            id: 'gl-draw-polygon-and-line-vertex-active',
            type: 'circle',
            filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            paint: {
              'circle-radius': 6,
              'circle-color': '#ea580c'
            }
          },
          // Midpoints
          {
            id: 'gl-draw-polygon-midpoint',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
            paint: {
              'circle-radius': 4,
              'circle-color': '#ea580c'
            }
          }
        ]
      });

      map.current.addControl(draw.current);
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Set up event listeners
      map.current.on('draw.create', updatePolygon);
      map.current.on('draw.update', updatePolygon);
      map.current.on('draw.delete', updatePolygon);

      map.current.on('load', () => {
        setIsLoading(false);
        
        // Load initial polygon if provided
        if (initialPolygon && draw.current) {
          const feature = {
            id: 'initial-polygon',
            type: 'Feature' as const,
            properties: {},
            geometry: initialPolygon
          };
          draw.current.add(feature);
          setHasPolygon(true);
        }
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setMapError('Failed to initialize map');
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      draw.current = null;
    };
  }, []); // Only run once on mount

  if (mapError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64 text-destructive">
          <Info className="h-5 w-5 mr-2" />
          {mapError}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Delivery Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Draw on Map
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Click the polygon tool (top-left), then click on the map to draw the delivery zone boundary.
            </p>
            <div className="relative">
              <div 
                ref={mapContainer} 
                className="h-72 w-full rounded-lg overflow-hidden border"
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={toggleMapStyle}
                className="flex-1"
              >
                <Layers className="h-4 w-4 mr-2" />
                {mapStyle === 'satellite' ? 'Street View' : 'Satellite View'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearPolygon}
                disabled={!hasPolygon}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload KML or GeoJSON File
              </Label>
              <p className="text-xs text-muted-foreground">
                Export a polygon from Google Maps (as KML) or any GIS tool (as GeoJSON)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.geojson,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File (.kml, .geojson)
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste data</span>
              </div>
            </div>

            {/* Paste Text Area */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Paste GeoJSON or Coordinates
              </Label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Paste one of:\n• GeoJSON polygon\n• Coordinates (one per line):\n  6.2103, 7.0707\n  6.2150, 7.0750\n  6.2100, 7.0800`}
                rows={6}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
                className="w-full"
              >
                Import Polygon
              </Button>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Info className="h-4 w-4" />
                How to export from Google Maps
              </p>
              <ol className="text-xs text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Go to Google My Maps (mymaps.google.com)</li>
                <li>Create a map and draw your polygon</li>
                <li>Click the 3 dots menu → Export to KML</li>
                <li>Upload the .kml file here</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status indicator */}
        {hasPolygon ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery zone defined
            </p>
            <p className="text-xs text-green-700 mt-1">
              Customers within this zone will be auto-matched to this region
            </p>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 flex items-center gap-2">
              <Info className="h-4 w-4" />
              No zone defined
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Draw on the map or import a polygon file
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
