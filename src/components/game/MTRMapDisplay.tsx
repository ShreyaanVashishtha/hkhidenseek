"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MTR_LINES, 
  MTR_STATIONS, 
  MTRStation, 
  MTRLine,
  INTERCHANGE_CAPSULES 
} from '@/lib/mtrData';
import { 
  Map, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Layers, 
  Shield, 
  Compass, 
  MapPin, 
  Check, 
  X, 
  Eye,
  Globe,
  Target,
  Filter,
  Flame,
  Trophy,
  Star,
  Sun,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGameContext } from '@/hooks/useGameContext';
import { MTRGeographicMap } from './MTRGeographicMap';
import { triggerHaptic } from '@/lib/haptics';
import { soundEffects } from '@/lib/soundEffects';

interface MTRMapDisplayProps {
  onSelectStation?: (station: MTRStation) => void;
  onTargetForQuestion?: (station: MTRStation) => void;
  selectedStationId?: string;
  role?: 'hider' | 'seeker' | 'admin' | 'spectator';
  highlightStationIds?: string[];
  hideTitleBar?: boolean;
}

export function MTRMapDisplay({
  onSelectStation,
  onTargetForQuestion,
  selectedStationId: externalSelectedStationId,
  role = 'spectator',
  highlightStationIds = [],
  hideTitleBar = false,
}: MTRMapDisplayProps) {
  const { toast } = useToast();

  // Dual-mode: Official Schematic vs Real Geographic HK map
  const [displayMode, setDisplayMode] = useState<'schematic' | 'geographic'>('schematic');

  // Theme: Official MTR Clean (as in user reference image) vs Dark Obsidian Broadcast
  const [mapTheme, setMapTheme] = useState<'official' | 'dark'>('official');

  const { 
    currentRound, 
    eliminatedStationIds = [], 
    suspectStationIds = [],
    toggleEliminateStation, 
    toggleSuspectStation,
    eliminateStationsBulk, 
    resetEliminations,
    lockHiderStation,
  } = useGameContext();

  const totalStations = Object.keys(MTR_STATIONS).length;
  const remainingCandidatesCount = Math.max(0, totalStations - eliminatedStationIds.length);

  // Region helpers for bulk deductions
  const hkIslandStationIds = useMemo(() => {
    return Object.values(MTR_STATIONS)
      .filter(s => ['Central & Western', 'Wan Chai', 'Eastern', 'Southern'].includes(s.district) || s.lines.includes('ISL') || s.lines.includes('SIL'))
      .map(s => s.id);
  }, []);

  const kowloonStationIds = useMemo(() => {
    return Object.values(MTR_STATIONS)
      .filter(s => ['Yau Tsim Mong', 'Sham Shui Po', 'Kowloon City', 'Wong Tai Sin', 'Kwun Tong'].includes(s.district))
      .map(s => s.id);
  }, []);

  const ntStationIds = useMemo(() => {
    return Object.values(MTR_STATIONS)
      .filter(s => ['Kwai Tsing', 'Tsuen Wan', 'Tuen Mun', 'Yuen Long', 'North', 'Tai Po', 'Sha Tin', 'Sai Kung', 'Islands'].includes(s.district))
      .map(s => s.id);
  }, []);

  const [internalSelectedStationId, setInternalSelectedStationId] = useState<string | null>(null);
  const activeStationId = externalSelectedStationId ?? internalSelectedStationId;

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Toggles
  const [showZones, setShowZones] = useState(true);
  const [showChineseLabels, setShowChineseLabels] = useState(true);
  const [onlyInterchanges, setOnlyInterchanges] = useState(false);

  // Default Spacious ViewBox (1500 x 980)
  const DEFAULT_VIEWBOX = useMemo(() => ({ x: 10, y: 10, width: 1460, height: 950 }), []);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Auto-focus selected station
  useEffect(() => {
    if (externalSelectedStationId && MTR_STATIONS[externalSelectedStationId]) {
      const st = MTR_STATIONS[externalSelectedStationId];
      setViewBox({
        x: Math.max(0, st.x - 300),
        y: Math.max(0, st.y - 200),
        width: 600,
        height: 400,
      });
    }
  }, [externalSelectedStationId]);

  // Autocomplete search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return Object.values(MTR_STATIONS).filter(station => 
      station.name.toLowerCase().includes(q) ||
      station.nameZh.includes(q) ||
      station.district.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  const handleSelectStation = useCallback((station: MTRStation) => {
    setInternalSelectedStationId(station.id);
    onSelectStation?.(station);

    // Smoothly pan towards the station
    setViewBox(prev => {
      const targetWidth = Math.min(prev.width, 700);
      const targetHeight = Math.min(prev.height, 460);
      return {
        x: Math.max(0, Math.min(1500 - targetWidth, station.x - targetWidth / 2)),
        y: Math.max(0, Math.min(980 - targetHeight, station.y - targetHeight / 2)),
        width: targetWidth,
        height: targetHeight,
      };
    });
  }, [onSelectStation]);

  const handleZoom = (factor: number) => {
    setViewBox(prev => {
      const newWidth = Math.max(380, Math.min(1600, prev.width * factor));
      const newHeight = Math.max(260, Math.min(1050, prev.height * factor));
      const dx = (newWidth - prev.width) / 2;
      const dy = (newHeight - prev.height) / 2;
      return {
        x: Math.max(-40, prev.x - dx),
        y: Math.max(-40, prev.y - dy),
        width: newWidth,
        height: newHeight,
      };
    });
  };

  const handleResetView = () => {
    setViewBox(DEFAULT_VIEWBOX);
    setActiveLineId(null);
    setSearchQuery("");
  };

  // Unified Pointer Drag Panning (Mobile touchscreen finger drag + Desktop mouse)
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setIsDragging(true);
    dragDistanceRef.current = 0;
    setDragStart({ x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    dragDistanceRef.current += Math.hypot(dx, dy);

    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.width / svgRect.width;
    const scaleY = viewBox.height / svgRect.height;

    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx * scaleX,
      y: prev.y - dy * scaleY,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    try {
      (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    handleZoom(zoomFactor);
  };

  const selectedStation = activeStationId ? MTR_STATIONS[activeStationId] : null;

  // Generate SVG path for an MTR line with parallel track offsets where lines share corridors
  const getLinePath = (line: MTRLine) => {
    const points = line.stationIds
      .map(id => MTR_STATIONS[id])
      .filter(Boolean);

    if (points.length < 2) return "";

    return points.reduce((path, pt, index) => {
      let px = pt.x;
      let py = pt.y;

      // Slight parallel track offsets for multi-line corridors
      if (line.id === 'TWL') {
        if (['prince-edward', 'mong-kok', 'yau-ma-tei'].includes(pt.id)) {
          px -= 4;
        }
      } else if (line.id === 'KTL') {
        if (['prince-edward', 'mong-kok', 'yau-ma-tei'].includes(pt.id)) {
          px += 4;
        }
      } else if (line.id === 'TCL') {
        if (['hong-kong', 'kowloon', 'nam-cheong', 'lai-king', 'tsing-yi'].includes(pt.id)) {
          px -= 3;
          py -= 3;
        }
      } else if (line.id === 'AEL') {
        if (['hong-kong', 'kowloon', 'tsing-yi'].includes(pt.id)) {
          px += 3;
          py += 3;
        }
      }

      return index === 0 ? `M ${px} ${py}` : `${path} L ${px} ${py}`;
    }, "");
  };

  // Color scheme tokens
  const isOfficial = mapTheme === 'official';
  const seaBg = isOfficial ? '#d2edf8' : '#070b14';
  const landFill = isOfficial ? '#ffffff' : '#0c1527';
  const landStroke = isOfficial ? '#9ecbe0' : '#1e293b';
  const trackCasing = isOfficial ? '#ffffff' : '#030712';
  const nodeFill = isOfficial ? '#ffffff' : '#0f172a';
  const nodeStroke = isOfficial ? '#1e293b' : '#38bdf8';
  const haloColor = isOfficial ? '#ffffff' : '#070b14';

  return (
    <Card className={`w-full border-border shadow-2xl overflow-hidden relative ${isOfficial ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#070b14] text-slate-100'}`}>
      {!hideTitleBar && (
        <CardHeader className={`p-4 border-b ${isOfficial ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-[#0c1324]/90 border-slate-800 text-white'} backdrop-blur-md`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${isOfficial ? 'bg-sky-50 text-sky-600 border-sky-200' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                <Compass className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                  <span>港鐵路綫網絡圖</span>
                  <span className="font-normal text-xs text-muted-foreground font-mono">MTR Official Schematic</span>
                  <Badge variant="outline" className={`text-[10px] font-mono ${isOfficial ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-950/60 text-sky-300 border-sky-700/50'}`}>
                    Verified Network
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {role === 'hider' ? 'Pick your 500m station zone • Authentic bilingual MTR layout' :
                   role === 'seeker' ? 'Tap stations to inspect, eliminate, or click Target for Clues' :
                   'Clean, spacious official transit layout with stacked bilingual Chinese/English labels'}
                </CardDescription>
              </div>
            </div>

            {/* Mode & Theme Controls */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Theme Toggle: Official MTR Clean vs Dark Obsidian */}
              <div className={`flex items-center p-0.5 rounded-lg border shadow-xs ${isOfficial ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'}`}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setMapTheme('official');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    isOfficial
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Official MTR Clean (White land, cyan sea as in reference)"
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  MTR Clean
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setMapTheme('dark');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    !isOfficial
                      ? 'bg-slate-800 text-sky-300 shadow-sm border border-slate-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Broadcast Obsidian Dark Theme"
                >
                  <Moon className="h-3.5 w-3.5 text-sky-400" />
                  Obsidian
                </button>
              </div>

              {/* Dual-Mode Switch: Official Schematic vs Geographic HK Map */}
              <div className={`flex items-center p-0.5 rounded-lg border shadow-xs ${isOfficial ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'}`}>
                <button
                  type="button"
                  onClick={() => setDisplayMode('schematic')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    displayMode === 'schematic'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : isOfficial ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5" />
                  Schematic
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('geographic')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    displayMode === 'geographic'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : isOfficial ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Real HK Map
                </button>
              </div>

              {/* Bulk Deductions Dropdown */}
              {role === 'seeker' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Bulk Eliminate
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuItem onClick={() => eliminateStationsBulk(hkIslandStationIds, 'eliminate')} className="cursor-pointer">
                      Eliminate HK Island ({hkIslandStationIds.length} stns)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => eliminateStationsBulk(kowloonStationIds, 'eliminate')} className="cursor-pointer">
                      Eliminate Kowloon ({kowloonStationIds.length} stns)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => eliminateStationsBulk(ntStationIds, 'eliminate')} className="cursor-pointer">
                      Eliminate New Territories ({ntStationIds.length} stns)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={resetEliminations} className="text-rose-600 dark:text-rose-400 cursor-pointer">
                      Reset All Eliminations
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Line Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 scrollbar-thin">
            <Button
              size="sm"
              variant={activeLineId === null ? "default" : "outline"}
              onClick={() => setActiveLineId(null)}
              className={`h-7 px-2.5 text-xs rounded-full border transition-all ${
                activeLineId === null 
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-xs' 
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              All Lines 全部路綫
            </Button>
            {Object.values(MTR_LINES).map(line => {
              const isActive = activeLineId === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => setActiveLineId(isActive ? null : line.id)}
                  className={`h-7 px-2.5 text-xs rounded-full font-medium flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                    isActive 
                      ? 'text-white shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground bg-transparent'
                  }`}
                  style={{
                    borderColor: isActive ? line.color : undefined,
                    backgroundColor: isActive ? line.color : undefined,
                  }}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-white/30" 
                    style={{ backgroundColor: isActive ? '#ffffff' : line.color }} 
                  />
                  <span>{line.nameZh} {line.name}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
      )}

      {/* Main Interactive Map Canvas */}
      <CardContent className="p-0 relative h-[650px] sm:h-[720px] select-none overflow-hidden">
        {/* Floating Quick Search Bar */}
        <div className="absolute top-3 left-3 z-20 w-64 sm:w-80">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search station (e.g. Central, 中環)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="pl-9 pr-8 h-9 text-xs bg-background/95 border-border shadow-lg backdrop-blur-md rounded-xl"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 bg-background/95 border border-border rounded-xl shadow-2xl p-1.5 backdrop-blur-lg z-30 max-h-60 overflow-y-auto">
              {searchResults.map(station => (
                <div
                  key={station.id}
                  onClick={() => {
                    handleSelectStation(station);
                    setIsSearchOpen(false);
                    setSearchQuery(station.name);
                  }}
                  className="px-3 py-2 hover:bg-sky-500/15 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{station.nameZh}</span>
                      <span className="text-muted-foreground font-normal">{station.name}</span>
                      {station.isInterchange && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          Interchange
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{station.district}</div>
                  </div>
                  <div className="flex gap-1">
                    {station.lines.map(lineId => (
                      <span
                        key={lineId}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: MTR_LINES[lineId]?.color || '#888' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {displayMode === 'geographic' ? (
          <MTRGeographicMap
            onSelectStation={handleSelectStation}
            selectedStationId={activeStationId ?? undefined}
            role={role}
            highlightStationIds={highlightStationIds}
            eliminatedStationIds={eliminatedStationIds}
          />
        ) : (
          <>
            {/* Floating Zoom & Controls Tool Palette */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-background/90 p-1.5 rounded-xl border border-border shadow-xl backdrop-blur-md">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleZoom(0.8)}
                className="h-8 w-8 text-foreground hover:bg-muted"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleZoom(1.25)}
                className="h-8 w-8 text-foreground hover:bg-muted"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Separator />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleResetView}
                className="h-8 w-8 text-foreground hover:bg-muted"
                title="Reset View"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* SVG Interactive Canvas */}
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              className={`w-full h-full cursor-${isDragging ? 'grabbing' : 'grab'}`}
              style={{ 
                touchAction: 'none',
                backgroundColor: seaBg,
                transition: 'background-color 0.3s ease'
              }}
            >
              <defs>
                <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <radialGradient id="hidingZonePulse">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* 1. AUTHENTIC VECTOR LANDMASSES (White landmasses with subtle maritime borders) */}
              <g id="landmasses" className="transition-all duration-300">
                {/* New Territories & Kowloon (North Mainland) */}
                <path
                  d="M 380 15 
                     L 1420 15 
                     L 1420 460 
                     Q 1360 460 1300 520 
                     Q 1260 620 1190 660 
                     L 1170 710 
                     Q 1090 710 1050 650 
                     Q 1010 610 970 610 
                     Q 930 610 890 650 
                     Q 820 670 740 650 
                     L 630 650 
                     Q 560 650 520 590 
                     L 460 470 
                     Q 420 370 380 310 
                     L 310 270 
                     Q 240 280 190 310 
                     L 130 310 
                     Q 60 310 50 250 
                     L 50 150 
                     Q 50 70 130 30 
                     L 380 15 Z"
                  fill={landFill}
                  stroke={landStroke}
                  strokeWidth="1.5"
                />

                {/* Hong Kong Island (South Island) */}
                <path
                  d="M 200 730 
                     L 1260 730 
                     Q 1360 730 1400 790 
                     L 1400 930 
                     Q 1380 970 1310 970 
                     L 1140 970 
                     Q 940 970 810 940 
                     L 670 940 
                     Q 570 960 470 960 
                     Q 350 960 350 890 
                     Q 350 820 430 800 
                     L 430 780 
                     Q 250 780 200 730 Z"
                  fill={landFill}
                  stroke={landStroke}
                  strokeWidth="1.5"
                />

                {/* Lantau Island (大嶼山 - Southwest Island) */}
                <path
                  d="M 30 430 
                     L 260 430 
                     Q 300 430 300 480 
                     L 300 580 
                     Q 280 630 190 630 
                     L 90 630 
                     Q 30 630 30 560 
                     L 30 430 Z"
                  fill={landFill}
                  stroke={landStroke}
                  strokeWidth="1.5"
                />

                {/* Tsing Yi Island (青衣) */}
                <path
                  d="M 280 320 
                     L 370 320 
                     Q 390 350 370 410 
                     L 300 410 
                     Q 270 380 280 320 Z"
                  fill={landFill}
                  stroke={landStroke}
                  strokeWidth="1.5"
                />
              </g>

              {/* 2. REGION WATERMARKS & GEOGRAPHY LABELS (As in official map) */}
              <g id="region-labels" opacity={isOfficial ? "0.35" : "0.22"} pointerEvents="none" className="select-none font-bold">
                <text x="750" y="45" fill={isOfficial ? "#475569" : "#64748b"} fontSize="18" letterSpacing="6" textAnchor="middle">
                  深圳 SHENZHEN
                </text>
                <text x="750" y="220" fill={isOfficial ? "#475569" : "#64748b"} fontSize="24" letterSpacing="10" textAnchor="middle">
                  新界 NEW TERRITORIES
                </text>
                <text x="960" y="450" fill={isOfficial ? "#475569" : "#64748b"} fontSize="22" letterSpacing="10" textAnchor="middle">
                  九龍 KOWLOON
                </text>
                <text x="850" y="690" fill="#0284c7" fontSize="16" letterSpacing="8" textAnchor="middle">
                  維多利亞港 VICTORIA HARBOUR
                </text>
                <text x="850" y="870" fill={isOfficial ? "#475569" : "#64748b"} fontSize="22" letterSpacing="10" textAnchor="middle">
                  香港島 HONG KONG ISLAND
                </text>
                <text x="170" y="600" fill={isOfficial ? "#475569" : "#64748b"} fontSize="18" letterSpacing="6" textAnchor="middle">
                  大嶼山 LANTAU ISLAND
                </text>
              </g>

              {/* 3. 500m HIDING TERRITORY RINGS */}
              {showZones && (
                <g id="hiding-zones" opacity="0.8">
                  {Object.values(MTR_STATIONS).map(st => {
                    const isSelected = activeStationId === st.id;
                    const isLineActive = !activeLineId || st.lines.includes(activeLineId);
                    const isHighlighted = highlightStationIds.includes(st.id);

                    if (!isLineActive && !isSelected && !isHighlighted) return null;

                    return (
                      <g key={`zone-${st.id}`} className="transition-all">
                        <circle
                          cx={st.x}
                          cy={st.y}
                          r={isSelected ? 42 : 28}
                          fill={isSelected ? "url(#hidingZonePulse)" : "none"}
                          stroke={isSelected ? "#0284c7" : isHighlighted ? "#f59e0b" : (isOfficial ? "#cbd5e1" : "#1e293b")}
                          strokeWidth={isSelected ? "2.5" : "1"}
                          strokeDasharray={isSelected ? "none" : "3,3"}
                          opacity={isSelected ? 1 : isHighlighted ? 0.9 : 0.6}
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 4. DOUBLE-CASED MTR RAIL TRACKS (Clean, thick, rounded geometry) */}
              <g id="tracks">
                {Object.values(MTR_LINES).map(line => {
                  const isActive = !activeLineId || activeLineId === line.id;
                  const pathD = getLinePath(line);

                  return (
                    <g key={`track-${line.id}`} opacity={isActive ? 1 : 0.15} className="transition-opacity duration-300">
                      {/* Track Outer Casing (Clean white outline for crisp contrast) */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={trackCasing}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Vibrant Line Track Core */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={line.color}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
              </g>

              {/* Central <-> Hong Kong Pedestrian Walking Connector */}
              <g id="walking-connectors">
                <line
                  x1="505"
                  y1="750"
                  x2="505"
                  y2="690"
                  stroke={isOfficial ? "#475569" : "#94a3b8"}
                  strokeWidth="4"
                  strokeDasharray="3,3"
                />
              </g>

              {/* 5. AUTHENTIC INTERCHANGE CAPSULES (Stadium Pills as in reference image) */}
              <g id="interchange-capsules">
                {INTERCHANGE_CAPSULES.map(cap => (
                  <rect
                    key={cap.id}
                    x={cap.x}
                    y={cap.y}
                    width={cap.width}
                    height={cap.height}
                    rx={cap.rx}
                    ry={cap.rx}
                    fill={nodeFill}
                    stroke={isOfficial ? "#0f172a" : "#f8fafc"}
                    strokeWidth="2.5"
                    className="shadow-sm"
                  />
                ))}
              </g>

              {/* 6. REGULAR STATION NODES */}
              <g id="station-nodes">
                {Object.values(MTR_STATIONS).map(st => {
                  const isSelected = activeStationId === st.id;
                  const isHighlighted = highlightStationIds.includes(st.id);
                  const isLineActive = !activeLineId || st.lines.includes(activeLineId);
                  const isEliminated = eliminatedStationIds.includes(st.id);
                  const isSuspect = suspectStationIds.includes(st.id);
                  const primaryLine = MTR_LINES[st.lines[0]];

                  const opacity = isEliminated ? 0.25 : (isLineActive ? 1 : 0.15);

                  return (
                    <g
                      key={`node-${st.id}`}
                      onClick={() => {
                        if (dragDistanceRef.current > 8) return;
                        handleSelectStation(st);
                      }}
                      className="cursor-pointer group"
                      opacity={opacity}
                    >
                      {/* Hit Area */}
                      <circle cx={st.x} cy={st.y} r="16" fill="transparent" />

                      {/* Selection Radiant Ring */}
                      {(isSelected || isHighlighted) && (
                        <circle
                          cx={st.x}
                          cy={st.y}
                          r="16"
                          fill={isSelected ? "#38bdf8" : "#f59e0b"}
                          opacity="0.45"
                          className="animate-ping"
                          style={{ transformOrigin: `${st.x}px ${st.y}px`, animationDuration: '2s' }}
                        />
                      )}

                      {/* Suspect Ring */}
                      {isSuspect && !isEliminated && (
                        <circle
                          cx={st.x}
                          cy={st.y}
                          r="12"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeDasharray="4,2"
                        />
                      )}

                      {/* Regular Station Circle (Interchanges are covered by capsules) */}
                      {!st.isInterchange && (
                        <circle
                          cx={st.x}
                          cy={st.y}
                          r={isSelected ? "6.5" : "4.5"}
                          fill={isEliminated ? "#94a3b8" : "#ffffff"}
                          stroke={isEliminated ? "#64748b" : (isSuspect ? "#f59e0b" : "#0f172a")}
                          strokeWidth={isSelected ? "2.5" : "2"}
                          className="transition-transform duration-200 group-hover:scale-125"
                        />
                      )}

                      {/* Elimination Red Cross */}
                      {isEliminated && (
                        <g stroke="#ef4444" strokeWidth="2.5">
                          <line x1={st.x - 5} y1={st.y - 5} x2={st.x + 5} y2={st.y + 5} />
                          <line x1={st.x - 5} y1={st.y + 5} x2={st.x + 5} y2={st.y - 5} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* 7. CLEAN BILINGUAL STACKED LABELS (Chinese on top, English below) */}
              <g id="station-labels">
                {Object.values(MTR_STATIONS).map(st => {
                  const isSelected = activeStationId === st.id;
                  const isHighlighted = highlightStationIds.includes(st.id);
                  const isLineActive = !activeLineId || st.lines.includes(activeLineId);
                  const isEliminated = eliminatedStationIds.includes(st.id);

                  if (onlyInterchanges && !st.isInterchange && !isSelected && !isHighlighted) {
                    return null;
                  }

                  const { labelPlacement, labelDx = 0, labelDy = 0 } = st;
                  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                  let tx = st.x + labelDx;
                  let ty = st.y + labelDy;

                  switch (labelPlacement) {
                    case 'top':
                      textAnchor = 'middle';
                      ty = st.y - 12 + labelDy;
                      break;
                    case 'bottom':
                      textAnchor = 'middle';
                      ty = st.y + 18 + labelDy;
                      break;
                    case 'left':
                      textAnchor = 'end';
                      tx = st.x - 14 + labelDx;
                      ty = st.y + 3 + labelDy;
                      break;
                    case 'right':
                      textAnchor = 'start';
                      tx = st.x + 14 + labelDx;
                      ty = st.y + 3 + labelDy;
                      break;
                    default:
                      textAnchor = 'start';
                      tx = st.x + 12 + labelDx;
                      ty = st.y + 3 + labelDy;
                      break;
                  }

                  const primaryTextColor = isEliminated 
                    ? (isOfficial ? '#94a3b8' : '#475569') 
                    : isSelected 
                      ? '#0284c7' 
                      : isHighlighted 
                        ? '#d97706' 
                        : (isOfficial ? '#0f172a' : '#f8fafc');

                  const secondaryTextColor = isEliminated
                    ? (isOfficial ? '#cbd5e1' : '#334155')
                    : isSelected
                      ? '#0369a1'
                      : isHighlighted
                        ? '#b45309'
                        : (isOfficial ? '#475569' : '#94a3b8');

                  return (
                    <g
                      key={`label-${st.id}`}
                      transform={`translate(${tx}, ${ty})`}
                      opacity={isEliminated ? 0.35 : (isLineActive ? 1 : 0.15)}
                      pointerEvents="none"
                      className="select-none transition-all duration-200"
                    >
                      <text
                        textAnchor={textAnchor}
                        stroke={haloColor}
                        strokeWidth="3.5"
                        paintOrder="stroke"
                        strokeLinejoin="round"
                      >
                        {showChineseLabels && (
                          <tspan
                            x="0"
                            dy="0"
                            fontSize="10.5"
                            fontWeight="700"
                            fill={primaryTextColor}
                          >
                            {st.nameZh}
                          </tspan>
                        )}
                        <tspan
                          x="0"
                          dy={showChineseLabels ? "12" : "0"}
                          fontSize="8.5"
                          fontWeight="500"
                          fill={secondaryTextColor}
                        >
                          {st.name}
                        </tspan>
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* 8. AUTHENTIC MTR SYSTEM MAP LEGEND BOX (Directly matching the reference image) */}
              <g id="mtr-legend" transform="translate(35, 755)" pointerEvents="none" className="select-none">
                <rect
                  x="0"
                  y="0"
                  width="180"
                  height="175"
                  rx="10"
                  ry="10"
                  fill={isOfficial ? "#ffffff" : "#0c1527"}
                  stroke={isOfficial ? "#a2d2e8" : "#1e293b"}
                  strokeWidth="1.5"
                  opacity="0.95"
                  className="shadow-lg"
                />

                <text x="12" y="20" fill={isOfficial ? "#0f172a" : "#f8fafc"} fontSize="11" fontWeight="700">
                  港鐵路綫圖 MTR System Map
                </text>

                {/* 10 Lines Grid */}
                <g transform="translate(12, 32)">
                  {/* Left Column (5 lines) */}
                  <g transform="translate(0, 0)">
                    <rect x="0" y="0" width="12" height="4" rx="2" fill="#00888A" />
                    <text x="16" y="5" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">機場快綫 Airport Express</text>

                    <rect x="0" y="14" width="12" height="4" rx="2" fill="#F38B00" />
                    <text x="16" y="19" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">東涌綫 Tung Chung Line</text>

                    <rect x="0" y="28" width="12" height="4" rx="2" fill="#F173AC" />
                    <text x="16" y="33" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">迪士尼綫 Disneyland Line</text>

                    <rect x="0" y="42" width="12" height="4" rx="2" fill="#53B7E8" />
                    <text x="16" y="47" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">東鐵綫 East Rail Line</text>

                    <rect x="0" y="56" width="12" height="4" rx="2" fill="#007DC5" />
                    <text x="16" y="61" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">港島綫 Island Line</text>

                    <rect x="0" y="70" width="12" height="4" rx="2" fill="#00AB4E" />
                    <text x="16" y="75" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">觀塘綫 Kwun Tong Line</text>

                    <rect x="0" y="84" width="12" height="4" rx="2" fill="#BAC429" />
                    <text x="16" y="89" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">南港島綫 South Island Line</text>

                    <rect x="0" y="98" width="12" height="4" rx="2" fill="#7D499D" />
                    <text x="16" y="103" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">將軍澳綫 Tseung Kwan O Line</text>

                    <rect x="0" y="112" width="12" height="4" rx="2" fill="#923011" />
                    <text x="16" y="117" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">屯馬綫 Tuen Ma Line</text>

                    <rect x="0" y="126" width="12" height="4" rx="2" fill="#E2231A" />
                    <text x="16" y="131" fill={isOfficial ? "#334155" : "#94a3b8"} fontSize="8">荃灣綫 Tsuen Wan Line</text>
                  </g>
                </g>
              </g>
            </svg>
          </>
        )}

        {/* Selected Station Floating HUD Panel */}
        {selectedStation && (
          <div className={`absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 transition-all border ${isOfficial ? 'bg-white/95 border-slate-300 text-slate-900' : 'bg-[#0c1324]/95 border-slate-700/80 text-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base tracking-tight">
                    <span>{selectedStation.nameZh}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">{selectedStation.name}</span>
                  </h3>
                  {selectedStation.isInterchange && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold">
                      轉綫 Interchange
                    </Badge>
                  )}
                  {eliminatedStationIds.includes(selectedStation.id) ? (
                    <Badge variant="destructive" className="text-[9px] py-0 px-1.5 font-bold">
                      Eliminated
                    </Badge>
                  ) : suspectStationIds.includes(selectedStation.id) ? (
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[9px] py-0 px-1.5 font-bold flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-amber-500" />
                      Top Suspect
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      Candidate ({remainingCandidatesCount}/{totalStations})
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{selectedStation.district} District • 500m Safe Zone Territory</span>
                </p>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setInternalSelectedStationId(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Connecting Lines */}
            <div className="flex flex-wrap items-center gap-1.5 my-2.5">
              {selectedStation.lines.map(lineId => {
                const line = MTR_LINES[lineId];
                if (!line) return null;
                return (
                  <Badge
                    key={lineId}
                    style={{ backgroundColor: `${line.color}25`, borderColor: line.color, color: line.color }}
                    className="border text-[11px] px-2 py-0.5 flex items-center gap-1.5 font-bold"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                    {line.nameZh} {line.name}
                  </Badge>
                );
              })}
            </div>

            {/* Action buttons based on Role */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {role === 'hider' && (
                <Button
                  size="sm"
                  onClick={() => {
                    triggerHaptic('success');
                    soundEffects.playVictory();
                    onSelectStation?.(selectedStation);
                    lockHiderStation(selectedStation.id);
                    toast({
                      title: "Hiding Zone Locked In! 🛡️",
                      description: `Your 500m safe zone territory is anchored at ${selectedStation.nameZh} (${selectedStation.name}). Seekers cannot see your location!`,
                    });
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 flex items-center justify-center gap-1.5 shadow-md rounded-xl"
                >
                  <Shield className="h-4 w-4" />
                  Lock In As My Safe Zone (鎖定為安全區)
                </Button>
              )}

              {role === 'seeker' && (
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Button
                    size="sm"
                    onClick={() => {
                      triggerHaptic('light');
                      onTargetForQuestion?.(selectedStation);
                      try {
                        navigator.clipboard.writeText(`${selectedStation.name} Station`);
                      } catch {}
                      toast({
                        title: `Targeted ${selectedStation.nameZh} (${selectedStation.name})!`,
                        description: `Station filled into your question. Switched to Questions tab.`,
                      });
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] h-9 flex items-center justify-center gap-1 rounded-xl px-1"
                  >
                    <Compass className="h-3 w-3" />
                    Target
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      triggerHaptic('light');
                      toggleSuspectStation(selectedStation.id);
                    }}
                    className={`w-full text-[11px] h-9 font-semibold flex items-center justify-center gap-1 rounded-xl transition-all px-1 ${
                      suspectStationIds.includes(selectedStation.id)
                        ? 'border-amber-500 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 font-bold'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Star className={`h-3 w-3 ${suspectStationIds.includes(selectedStation.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                    {suspectStationIds.includes(selectedStation.id) ? 'Suspect' : 'Suspect?'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      triggerHaptic('warning');
                      toggleEliminateStation(selectedStation.id);
                    }}
                    className={`w-full text-[11px] h-9 font-semibold flex items-center justify-center gap-1 rounded-xl transition-all px-1 ${
                      eliminatedStationIds.includes(selectedStation.id)
                        ? 'border-rose-500 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 font-bold'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <X className="h-3 w-3" />
                    {eliminatedStationIds.includes(selectedStation.id) ? 'Restore' : 'Cross Off'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
