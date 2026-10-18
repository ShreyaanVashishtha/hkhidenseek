"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MTR_LINES, MTR_STATIONS, MTRStation, MTRLine } from '@/lib/mtrData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Crosshair, Navigation, Shield, Compass, MapPin, ZoomIn, ZoomOut, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MTRGeographicMapProps {
  onSelectStation?: (station: MTRStation) => void;
  selectedStationId?: string;
  role?: 'hider' | 'seeker' | 'admin' | 'spectator';
  highlightStationIds?: string[];
}

export function MTRGeographicMap({
  onSelectStation,
  selectedStationId,
  role = 'spectator',
  highlightStationIds = [],
}: MTRGeographicMapProps) {
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const circlesRef = useRef<Record<string, any>>({});
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);

  const [showZones, setShowZones] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceToTargetMeters, setDistanceToTargetMeters] = useState<number | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'streets'>('dark');

  const selectedStation = selectedStationId ? MTR_STATIONS[selectedStationId] : null;

  // Haversine distance calculation in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically load leaflet
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Prevent re-initialization
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default center: Hong Kong (Victoria Harbour / Kowloon center)
      const map = L.map(mapContainerRef.current, {
        center: [22.3193, 114.1694],
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false,
      });
      mapInstanceRef.current = map;

      // Add CartoDB Tile Layer
      const tileUrl = mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Render MTR Track Polylines
      Object.values(MTR_LINES).forEach((line) => {
        const latLngs = line.stationIds
          .map((id) => MTR_STATIONS[id])
          .filter(Boolean)
          .map((st) => [st.lat, st.lng] as [number, number]);

        if (latLngs.length > 1) {
          // Track casing (dark underlay)
          L.polyline(latLngs, {
            color: '#020617',
            weight: 7,
            opacity: 0.9,
            lineJoin: 'round',
          }).addTo(map);

          // Core line
          L.polyline(latLngs, {
            color: line.color,
            weight: 4.5,
            opacity: 0.9,
            lineJoin: 'round',
          }).addTo(map);
        }
      });

      // Render Stations & 500m Circles
      markersRef.current = {};
      circlesRef.current = {};

      Object.values(MTR_STATIONS).forEach((station) => {
        const isSelected = selectedStationId === station.id;
        const primaryLine = MTR_LINES[station.lines[0]];

        // 500m Metric Radius Circle on real map coordinates
        const circle = L.circle([station.lat, station.lng], {
          radius: 500,
          color: isSelected ? '#38bdf8' : '#64748b',
          weight: isSelected ? 2.5 : 1,
          dashArray: isSelected ? undefined : '4, 4',
          fillColor: isSelected ? '#0284c7' : '#334155',
          fillOpacity: isSelected ? 0.25 : 0.08,
        }).addTo(map);
        circlesRef.current[station.id] = circle;

        // Custom Station Marker
        const marker = L.circleMarker([station.lat, station.lng], {
          radius: station.isInterchange ? 7 : 5,
          color: station.isInterchange ? '#ffffff' : primaryLine?.color || '#ffffff',
          weight: 2.5,
          fillColor: station.isInterchange ? '#0f172a' : '#ffffff',
          fillOpacity: 1,
        }).addTo(map);

        // Tooltip showing station name
        marker.bindTooltip(`<b>${station.name}</b> ${station.nameZh}`, {
          permanent: false,
          direction: 'top',
          className: 'bg-slate-900 text-white border-slate-700 text-xs px-2 py-1 rounded shadow-lg',
        });

        marker.on('click', () => {
          onSelectStation?.(station);
        });

        markersRef.current[station.id] = marker;
      });
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapTheme]);

  // Update selection styling on station change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    Object.entries(circlesRef.current).forEach(([id, circle]) => {
      const isSelected = selectedStationId === id;
      circle.setStyle({
        color: isSelected ? '#38bdf8' : '#64748b',
        weight: isSelected ? 2.5 : 1,
        dashArray: isSelected ? undefined : '4, 4',
        fillColor: isSelected ? '#0284c7' : '#334155',
        fillOpacity: isSelected ? 0.28 : 0.08,
      });

      if (isSelected) {
        circle.bringToFront();
      }
    });

    // Pan map to selected station
    if (selectedStation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedStation.lat, selectedStation.lng], 14, { duration: 1.2 });
    }
  }, [selectedStationId, selectedStation]);

  // Handle Live GPS Tracking
  const toggleGPS = () => {
    if (isLocating) {
      setIsLocating(false);
      setUserLocation(null);
      if (userMarkerRef.current) userMarkerRef.current.remove();
      if (userAccuracyCircleRef.current) userAccuracyCircleRef.current.remove();
      toast({ title: "GPS Tracking Off", description: "Real-time location disabled." });
      return;
    }

    if (!('geolocation' in navigator)) {
      toast({ title: "GPS Unavailable", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    toast({ title: "Locating...", description: "Acquiring live GPS satellite fix across Hong Kong." });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });

        import('leaflet').then((L) => {
          if (!mapInstanceRef.current) return;
          const map = mapInstanceRef.current;

          if (userMarkerRef.current) userMarkerRef.current.remove();
          if (userAccuracyCircleRef.current) userAccuracyCircleRef.current.remove();

          // User live GPS marker
          userMarkerRef.current = L.circleMarker([latitude, longitude], {
            radius: 8,
            color: '#ffffff',
            weight: 3,
            fillColor: '#3b82f6',
            fillOpacity: 1,
          }).addTo(map);

          userAccuracyCircleRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#3b82f6',
            weight: 1,
            fillOpacity: 0.1,
          }).addTo(map);

          map.flyTo([latitude, longitude], 15);
          toast({ title: "GPS Position Locked", description: `Accuracy within ±${Math.round(accuracy)}m.` });
        });
      },
      (err) => {
        setIsLocating(false);
        toast({ title: "GPS Error", description: `Could not get position: ${err.message}`, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Calculate distance between user GPS and selected station
  useEffect(() => {
    if (userLocation && selectedStation) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, selectedStation.lat, selectedStation.lng);
      setDistanceToTargetMeters(dist);
    } else {
      setDistanceToTargetMeters(null);
    }
  }, [userLocation, selectedStation]);

  return (
    <div className="relative w-full h-full bg-[#070b14] overflow-hidden select-none">
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Controls */}
      <div className="absolute top-14 left-3 sm:top-3 sm:left-[340px] right-3 sm:right-auto z-20 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={toggleGPS}
          className={`h-9 px-3 text-xs font-semibold rounded-lg shadow-xl backdrop-blur-md border transition-all ${
            isLocating 
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 animate-pulse' 
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
          }`}
        >
          <Crosshair className="h-4 w-4 mr-1.5" />
          {isLocating ? 'Live GPS Active' : 'Locate My Position'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setMapTheme(mapTheme === 'dark' ? 'streets' : 'dark')}
          className="h-9 px-3 text-xs font-medium bg-slate-900/90 text-slate-300 border-slate-700 rounded-lg shadow-xl backdrop-blur-md hover:bg-slate-800 hover:text-white"
        >
          {mapTheme === 'dark' ? 'Street Tiles' : 'Dark Matter Tiles'}
        </Button>
      </div>

      {/* Floating GPS Target Distance Banner */}
      {distanceToTargetMeters !== null && selectedStation && (
        <div className="absolute top-28 sm:top-14 left-3 z-20 bg-slate-900/95 border border-sky-500/50 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs text-white">
          <Navigation className="h-4 w-4 text-sky-400 animate-bounce" />
          <div>
            <span className="text-slate-400">Distance to {selectedStation.name}:</span>{' '}
            <strong className="text-sky-300 font-mono text-sm">{distanceToTargetMeters}m</strong>
            {distanceToTargetMeters <= 500 ? (
              <Badge className="ml-2 bg-emerald-600/90 text-white text-[10px] py-0">
                Inside 500m Zone ✅
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 border-amber-500 text-amber-400 text-[10px] py-0">
                Outside Zone ({distanceToTargetMeters - 500}m away)
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Floating Zoom & Map Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 shadow-xl backdrop-blur-md">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Real-World 500m Geographic Legend */}
      <div className="absolute bottom-3 right-3 z-20 bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md shadow-xl flex items-center gap-2">
        <span className="w-3 h-3 rounded-full border border-dashed border-sky-400 inline-block bg-sky-500/20" />
        <span>True 500m Metric Radius (Haversine Projection)</span>
      </div>
    </div>
  );
}
