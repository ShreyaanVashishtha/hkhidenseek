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
  MTR_LINES, 
  MTR_STATIONS, 
  MTRStation, 
  MTRLine 
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
  Info,
  Maximize2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MTRMapDisplayProps {
  onSelectStation?: (station: MTRStation) => void;
  selectedStationId?: string;
  role?: 'hider' | 'seeker' | 'admin' | 'spectator';
  highlightStationIds?: string[];
  hideTitleBar?: boolean;
}

export function MTRMapDisplay({
  onSelectStation,
  selectedStationId: externalSelectedStationId,
  role = 'spectator',
  highlightStationIds = [],
  hideTitleBar = false,
}: MTRMapDisplayProps) {
  const { toast } = useToast();

  // Selected station
  const [internalSelectedStationId, setInternalSelectedStationId] = useState<string | null>(null);
  const activeStationId = externalSelectedStationId ?? internalSelectedStationId;

  // Active Line Filter (null = show all)
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Toggles
  const [showZones, setShowZones] = useState(true);
  const [showChineseLabels, setShowChineseLabels] = useState(true);

  // Pan and Zoom transform state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1300, height: 920 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Default coordinate bounds
  const DEFAULT_VIEWBOX = useMemo(() => ({ x: 0, y: 0, width: 1300, height: 920 }), []);

  // Filtered stations for search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return Object.values(MTR_STATIONS).filter(station => 
      station.name.toLowerCase().includes(q) || 
      station.nameZh.includes(q) ||
      station.district.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Handle station selection
  const handleSelectStation = useCallback((station: MTRStation) => {
    setInternalSelectedStationId(station.id);
    onSelectStation?.(station);

    // Smoothly pan towards the station
    setViewBox(prev => {
      const targetWidth = Math.min(prev.width, 700);
      const targetHeight = Math.min(prev.height, 500);
      return {
        x: Math.max(0, Math.min(1300 - targetWidth, station.x - targetWidth / 2)),
        y: Math.max(0, Math.min(920 - targetHeight, station.y - targetHeight / 2)),
        width: targetWidth,
        height: targetHeight,
      };
    });
  }, [onSelectStation]);

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setViewBox(prev => {
      const newWidth = Math.max(350, Math.min(1600, prev.width * factor));
      const newHeight = Math.max(250, Math.min(1150, prev.height * factor));
      const dx = (newWidth - prev.width) / 2;
      const dy = (newHeight - prev.height) / 2;
      return {
        x: Math.max(-100, prev.x - dx),
        y: Math.max(-100, prev.y - dy),
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

  // Mouse / Touch Drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !svgRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    handleZoom(zoomFactor);
  };

  const selectedStation = activeStationId ? MTR_STATIONS[activeStationId] : null;

  // Generate SVG path for a line based on its ordered station IDs
  const getLinePath = (line: MTRLine) => {
    const points = line.stationIds
      .map(id => MTR_STATIONS[id])
      .filter(Boolean);

    if (points.length < 2) return "";

    return points.reduce((path, pt, index) => {
      return index === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
    }, "");
  };

  return (
    <Card className="w-full bg-slate-950 text-slate-100 border-slate-800 shadow-2xl overflow-hidden relative">
      {!hideTitleBar && (
        <CardHeader className="p-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Compass className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2 text-white">
                  Hong Kong MTR Interactive Transit Radar
                  <Badge variant="outline" className="text-xs font-mono bg-sky-950/50 text-sky-300 border-sky-700/50">
                    Live System
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  {role === 'hider' ? 'Explore stations & pick your 500m hiding zone' :
                   role === 'seeker' ? 'Track lines, estimate distances & plan radar questions' :
                   'Full schematic transit network with 500m station zones'}
                </CardDescription>
              </div>
            </div>

            {/* Zone & Label Toggles */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 bg-slate-800/60 px-2.5 py-1.5 rounded-md border border-slate-700/50">
                <Switch 
                  id="show-zones" 
                  checked={showZones} 
                  onCheckedChange={setShowZones} 
                  className="data-[state=checked]:bg-sky-500 h-4 w-7"
                />
                <Label htmlFor="show-zones" className="cursor-pointer text-slate-300 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-sky-400" />
                  500m Zones
                </Label>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/60 px-2.5 py-1.5 rounded-md border border-slate-700/50">
                <Switch 
                  id="show-zh" 
                  checked={showChineseLabels} 
                  onCheckedChange={setShowChineseLabels} 
                  className="data-[state=checked]:bg-sky-500 h-4 w-7"
                />
                <Label htmlFor="show-zh" className="cursor-pointer text-slate-300">
                  中文
                </Label>
              </div>
            </div>
          </div>

          {/* Quick Line Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            <Button
              size="sm"
              variant={activeLineId === null ? "default" : "outline"}
              onClick={() => setActiveLineId(null)}
              className={`h-7 px-2.5 text-xs rounded-full border transition-all ${
                activeLineId === null 
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-sm' 
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              All Lines
            </Button>
            {Object.values(MTR_LINES).map(line => {
              const isActive = activeLineId === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => setActiveLineId(isActive ? null : line.id)}
                  className={`h-7 px-2.5 text-xs rounded-full font-medium flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                    isActive 
                      ? 'text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 border-slate-800 bg-slate-900/60'
                  }`}
                  style={{
                    borderColor: isActive ? line.color : undefined,
                    backgroundColor: isActive ? `${line.color}33` : undefined,
                  }}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20" 
                    style={{ backgroundColor: line.color }} 
                  />
                  <span>{line.name}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
      )}

      {/* Main Map Viewport */}
      <div className="relative w-full h-[520px] sm:h-[620px] bg-[#070b14] overflow-hidden select-none">
        {/* Subtle coordinate grid overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Floating Search Bar */}
        <div className="absolute top-3 left-3 z-20 w-64 sm:w-80">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search station (e.g., Admiralty, 金鐘)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="pl-9 pr-8 h-9 text-xs bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 rounded-lg shadow-lg backdrop-blur-md focus:border-sky-500"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl p-1.5 backdrop-blur-lg z-30 max-h-60 overflow-y-auto">
              {searchResults.map(station => (
                <div
                  key={station.id}
                  onClick={() => {
                    handleSelectStation(station);
                    setIsSearchOpen(false);
                    setSearchQuery(station.name);
                  }}
                  className="px-3 py-2 hover:bg-sky-950/60 rounded-md cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{station.name}</span>
                      <span className="text-slate-400 font-normal">{station.nameZh}</span>
                      {station.isInterchange && (
                        <Badge className="h-4 px-1 text-[9px] bg-slate-800 text-sky-400 border border-sky-500/30">
                          Interchange
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{station.district}</div>
                  </div>
                  <div className="flex gap-1">
                    {station.lines.map(lineId => (
                      <span
                        key={lineId}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: MTR_LINES[lineId]?.color || '#888' }}
                        title={MTR_LINES[lineId]?.name}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Zoom & Reset Tools */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 shadow-xl backdrop-blur-md">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleZoom(0.8)}
            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleZoom(1.25)}
            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Separator className="bg-slate-800" />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleResetView}
            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* SVG Interactive Canvas */}
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`w-full h-full cursor-${isDragging ? 'grabbing' : 'grab'}`}
          style={{ touchAction: 'none' }}
        >
          <defs>
            {/* Glow Filter for Active Stations */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radar Pulsing Animation */}
            <radialGradient id="hidingZoneGradient">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* District & Region Water / Land Outlines (Schematic styling) */}
          <g id="regions" opacity="0.4" pointerEvents="none">
            {/* Victoria Harbour Channel Watermark */}
            <text x="640" y="665" fill="#1e293b" fontSize="22" fontWeight="bold" letterSpacing="6" opacity="0.4">
              VICTORIA HARBOUR 維多利亞港
            </text>
            <text x="590" y="80" fill="#1e293b" fontSize="24" fontWeight="bold" letterSpacing="6" opacity="0.3">
              NEW TERRITORIES 新界
            </text>
            <text x="730" y="490" fill="#1e293b" fontSize="24" fontWeight="bold" letterSpacing="6" opacity="0.3">
              KOWLOON 九龍
            </text>
            <text x="640" y="780" fill="#1e293b" fontSize="24" fontWeight="bold" letterSpacing="6" opacity="0.3">
              HONG KONG ISLAND 香港島
            </text>
          </g>

          {/* 500m Hiding Zones (Rendered below tracks) */}
          {showZones && (
            <g id="hiding-zones" opacity="0.7">
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
                      r={isSelected ? 38 : 28}
                      fill={isSelected ? "url(#hidingZoneGradient)" : "none"}
                      stroke={isSelected ? "#38bdf8" : isHighlighted ? "#f59e0b" : "#334155"}
                      strokeWidth={isSelected ? "2" : "1"}
                      strokeDasharray={isSelected ? "none" : "3,3"}
                      opacity={isSelected ? 1 : isHighlighted ? 0.9 : 0.45}
                    />
                    {isSelected && (
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r={44}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        opacity="0.5"
                        strokeDasharray="4,4"
                        className="animate-spin"
                        style={{ transformOrigin: `${st.x}px ${st.y}px`, animationDuration: '10s' }}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Rail Tracks */}
          <g id="tracks">
            {Object.values(MTR_LINES).map(line => {
              const isActive = !activeLineId || activeLineId === line.id;
              const pathD = getLinePath(line);

              return (
                <g key={`track-${line.id}`} opacity={isActive ? 1 : 0.15} className="transition-opacity duration-300">
                  {/* Track Casing */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#020617"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Core Colored Track */}
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

          {/* Stations & Interchange Nodes */}
          <g id="stations">
            {Object.values(MTR_STATIONS).map(st => {
              const isSelected = activeStationId === st.id;
              const isHighlighted = highlightStationIds.includes(st.id);
              const isLineActive = !activeLineId || st.lines.includes(activeLineId);
              const primaryLine = MTR_LINES[st.lines[0]];

              const opacity = isLineActive ? 1 : 0.15;

              return (
                <g
                  key={`node-${st.id}`}
                  onClick={() => handleSelectStation(st)}
                  className="cursor-pointer group"
                  opacity={opacity}
                >
                  {/* Station Hit Area */}
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="16"
                    fill="transparent"
                  />

                  {/* Pulsing Highlight for Active Station */}
                  {(isSelected || isHighlighted) && (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="18"
                      fill={isSelected ? "#38bdf8" : "#f59e0b"}
                      opacity="0.4"
                      className="animate-ping"
                      style={{ transformOrigin: `${st.x}px ${st.y}px`, animationDuration: '2s' }}
                    />
                  )}

                  {/* Outer Node Ring */}
                  {st.isInterchange ? (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={isSelected ? "9" : "7.5"}
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth="3"
                      filter={isSelected ? "url(#glow)" : undefined}
                      className="transition-all duration-200 group-hover:scale-125"
                    />
                  ) : (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={isSelected ? "7" : "5"}
                      fill="#ffffff"
                      stroke={primaryLine?.color || "#fff"}
                      strokeWidth="2.5"
                      className="transition-all duration-200 group-hover:scale-125"
                    />
                  )}

                  {/* Station Label */}
                  <g
                    transform={`translate(${st.x + (st.x > 900 ? -12 : 12)}, ${st.y + 4})`}
                    className="pointer-events-none select-none transition-all"
                  >
                    <text
                      textAnchor={st.x > 900 ? "end" : "start"}
                      fill={isSelected ? "#38bdf8" : isHighlighted ? "#f59e0b" : "#f8fafc"}
                      fontSize={isSelected ? "13" : "10"}
                      fontWeight={isSelected || st.isInterchange ? "bold" : "500"}
                      stroke="#020617"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {st.name} {showChineseLabels && <tspan fill="#94a3b8" fontSize="9"> {st.nameZh}</tspan>}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Station Floating HUD Panel */}
        {selectedStation && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-20 transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    {selectedStation.name}
                  </h3>
                  <span className="text-slate-400 text-sm font-normal">
                    {selectedStation.nameZh}
                  </span>
                  {selectedStation.isInterchange && (
                    <Badge variant="outline" className="bg-sky-950/80 text-sky-400 border-sky-600/40 text-[10px] py-0">
                      Interchange
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  {selectedStation.district} District • 500m Hiding Territory
                </p>
              </div>

              <button
                onClick={() => setInternalSelectedStationId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Station Lines */}
            <div className="flex flex-wrap items-center gap-1.5 my-3">
              {selectedStation.lines.map(lineId => {
                const line = MTR_LINES[lineId];
                if (!line) return null;
                return (
                  <Badge
                    key={lineId}
                    style={{ backgroundColor: `${line.color}25`, borderColor: line.color, color: '#fff' }}
                    className="border text-xs px-2 py-0.5 flex items-center gap-1.5 font-medium"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                    {line.name} ({line.nameZh})
                  </Badge>
                );
              })}
            </div>

            {/* Action buttons based on Role */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              {role === 'hider' && (
                <Button
                  size="sm"
                  onClick={() => {
                    onSelectStation?.(selectedStation);
                    toast({
                      title: "Hiding Zone Selected!",
                      description: `Your 500m hiding territory is anchored at ${selectedStation.name} (${selectedStation.nameZh}).`,
                    });
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 flex items-center justify-center gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Lock In As My Hiding Zone
                </Button>
              )}

              {role === 'seeker' && (
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${selectedStation.name} Station`);
                    toast({
                      title: "Copied for Seeker Radar!",
                      description: `"${selectedStation.name} Station" copied to clipboard for your next Radar clue.`,
                    });
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs h-8 flex items-center justify-center gap-1.5"
                >
                  <Compass className="h-3.5 w-3.5" />
                  Target in Radar Question
                </Button>
              )}

              {role === 'spectator' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedStation.name);
                    toast({
                      title: "Station Name Copied",
                      description: `${selectedStation.name} (${selectedStation.nameZh}) copied to clipboard.`,
                    });
                  }}
                  className="w-full border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 text-xs h-8"
                >
                  Copy Station Name
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend / Status Footer */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white border-2 border-slate-900 inline-block" />
            <span>Interchange Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span>Regular Station</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-dashed border-sky-400/80 inline-block" />
            <span>500m Hiding Territory</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Tip: Drag to pan • Scroll to zoom • Click any station for details
        </div>
      </div>
    </Card>
  );
}
