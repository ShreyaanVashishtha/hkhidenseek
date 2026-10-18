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
  Eye
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

  const [internalSelectedStationId, setInternalSelectedStationId] = useState<string | null>(null);
  const activeStationId = externalSelectedStationId ?? internalSelectedStationId;

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Toggles
  const [showZones, setShowZones] = useState(true);
  const [showChineseLabels, setShowChineseLabels] = useState(true);
  const [onlyInterchanges, setOnlyInterchanges] = useState(false);

  // Default Spacious ViewBox (1750 x 1150)
  const DEFAULT_VIEWBOX = useMemo(() => ({ x: 20, y: -40, width: 1720, height: 1180 }), []);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

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

    // Smoothly pan & focus towards the station
    setViewBox(prev => {
      const targetWidth = Math.min(prev.width, 850);
      const targetHeight = Math.min(prev.height, 580);
      return {
        x: Math.max(-50, Math.min(1850 - targetWidth, station.x - targetWidth / 2)),
        y: Math.max(-60, Math.min(1250 - targetHeight, station.y - targetHeight / 2)),
        width: targetWidth,
        height: targetHeight,
      };
    });
  }, [onSelectStation]);

  const handleZoom = (factor: number) => {
    setViewBox(prev => {
      const newWidth = Math.max(450, Math.min(2200, prev.width * factor));
      const newHeight = Math.max(300, Math.min(1500, prev.height * factor));
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

  // Drag Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // Helper for computing station label transform & text anchor
  const getLabelProps = (station: MTRStation) => {
    const { labelPlacement, labelDx = 0, labelDy = 0 } = station;
    
    switch (labelPlacement) {
      case 'angle-top-right':
        return {
          transform: `translate(${station.x + 8 + labelDx}, ${station.y - 8 + labelDy}) rotate(-40)`,
          textAnchor: 'start' as const,
        };
      case 'left':
        return {
          transform: `translate(${station.x - 12 + labelDx}, ${station.y + 4 + labelDy})`,
          textAnchor: 'end' as const,
        };
      case 'right':
        return {
          transform: `translate(${station.x + 12 + labelDx}, ${station.y + 4 + labelDy})`,
          textAnchor: 'start' as const,
        };
      case 'top':
        return {
          transform: `translate(${station.x + labelDx}, ${station.y - 12 + labelDy})`,
          textAnchor: 'middle' as const,
        };
      case 'bottom':
        return {
          transform: `translate(${station.x + labelDx}, ${station.y + 16 + labelDy})`,
          textAnchor: 'middle' as const,
        };
      default:
        return {
          transform: `translate(${station.x + 12}, ${station.y + 4})`,
          textAnchor: 'start' as const,
        };
    }
  };

  return (
    <Card className="w-full bg-[#080d19] text-slate-100 border-slate-800 shadow-2xl overflow-hidden relative">
      {!hideTitleBar && (
        <CardHeader className="p-4 border-b border-slate-800 bg-[#0c1324]/80 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Compass className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-wide flex items-center gap-2 text-white">
                  Hong Kong MTR System Map
                  <Badge variant="outline" className="text-xs font-mono bg-sky-950/60 text-sky-300 border-sky-700/50">
                    Official Schematic
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  {role === 'hider' ? 'Pick your 500m station zone • Clean official octolinear layout' :
                   role === 'seeker' ? 'Click stations to target radar clues • Filter transit corridors' :
                   'Clean, spacious schematic transit network with non-overlapping station labels'}
                </CardDescription>
              </div>
            </div>

            {/* Zone & Label Toggles */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
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

              <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
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

              <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
                <Switch 
                  id="only-interchanges" 
                  checked={onlyInterchanges} 
                  onCheckedChange={setOnlyInterchanges} 
                  className="data-[state=checked]:bg-sky-500 h-4 w-7"
                />
                <Label htmlFor="only-interchanges" className="cursor-pointer text-slate-300">
                  Interchanges Only
                </Label>
              </div>
            </div>
          </div>

          {/* Line Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            <Button
              size="sm"
              variant={activeLineId === null ? "default" : "outline"}
              onClick={() => setActiveLineId(null)}
              className={`h-7 px-2.5 text-xs rounded-full border transition-all ${
                activeLineId === null 
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-sm' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
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
                      : 'text-slate-400 hover:text-slate-200 border-slate-800/80 bg-slate-900/60'
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
      <div className="relative w-full h-[580px] sm:h-[680px] bg-[#070b14] overflow-hidden select-none">
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating Search Bar */}
        <div className="absolute top-3 left-3 z-20 w-64 sm:w-80">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search station (e.g. Admiralty, Central, 旺角)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="pl-9 pr-8 h-9 text-xs bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 rounded-lg shadow-xl backdrop-blur-md focus:border-sky-500"
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
            <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
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

          {/* Clean Water Channel - Victoria Harbour */}
          <path
            d="M 120 860 Q 600 850 850 820 T 1700 890 L 1700 900 Q 850 850 120 870 Z"
            fill="#0f1f38"
            opacity="0.4"
          />

          {/* Subtle Region Watermarks */}
          <g id="region-labels" opacity="0.25" pointerEvents="none" className="select-none font-bold">
            <text x="800" y="-30" fill="#334155" fontSize="26" letterSpacing="10" textAnchor="middle">
              NEW TERRITORIES 新界
            </text>
            <text x="1100" y="420" fill="#334155" fontSize="24" letterSpacing="10" textAnchor="middle">
              KOWLOON 九龍
            </text>
            <text x="950" y="865" fill="#38bdf8" fontSize="18" letterSpacing="8" textAnchor="middle">
              VICTORIA HARBOUR 維多利亞港
            </text>
            <text x="950" y="990" fill="#334155" fontSize="24" letterSpacing="10" textAnchor="middle">
              HONG KONG ISLAND 香港島
            </text>
          </g>

          {/* 500m Hiding Territory Rings */}
          {showZones && (
            <g id="hiding-zones" opacity="0.75">
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
                      r={isSelected ? 45 : 32}
                      fill={isSelected ? "url(#hidingZonePulse)" : "none"}
                      stroke={isSelected ? "#38bdf8" : isHighlighted ? "#f59e0b" : "#1e293b"}
                      strokeWidth={isSelected ? "2" : "1"}
                      strokeDasharray={isSelected ? "none" : "3,3"}
                      opacity={isSelected ? 1 : isHighlighted ? 0.9 : 0.6}
                    />
                    {isSelected && (
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r={52}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        opacity="0.6"
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
                <g key={`track-${line.id}`} opacity={isActive ? 1 : 0.12} className="transition-opacity duration-300">
                  {/* Track Casing (Dark outline for high contrast) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#020617"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Main Line Track */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Central / Hong Kong Underground Walking Interchange Connector */}
          <g id="inter-station-connectors">
            <line
              x1="530"
              y1="920"
              x2="530"
              y2="860"
              stroke="#64748b"
              strokeWidth="4"
              strokeDasharray="3,3"
            />
          </g>

          {/* Station Nodes */}
          <g id="station-nodes">
            {Object.values(MTR_STATIONS).map(st => {
              const isSelected = activeStationId === st.id;
              const isHighlighted = highlightStationIds.includes(st.id);
              const isLineActive = !activeLineId || st.lines.includes(activeLineId);
              const primaryLine = MTR_LINES[st.lines[0]];

              const opacity = isLineActive ? 1 : 0.12;

              return (
                <g
                  key={`node-${st.id}`}
                  onClick={() => handleSelectStation(st)}
                  className="cursor-pointer group"
                  opacity={opacity}
                >
                  {/* Generous Clickable Hit Area */}
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="18"
                    fill="transparent"
                  />

                  {/* Pulsing Highlight */}
                  {(isSelected || isHighlighted) && (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="18"
                      fill={isSelected ? "#38bdf8" : "#f59e0b"}
                      opacity="0.5"
                      className="animate-ping"
                      style={{ transformOrigin: `${st.x}px ${st.y}px`, animationDuration: '2s' }}
                    />
                  )}

                  {/* Interchange Node (Official MTR style: large white ring with dark outer casing) */}
                  {st.isInterchange ? (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={isSelected ? "9.5" : "8"}
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth="3.5"
                      filter={isSelected ? "url(#activeGlow)" : undefined}
                      className="transition-transform duration-200 group-hover:scale-125"
                    />
                  ) : (
                    /* Regular Station (Official MTR style: clean solid white circle with line border) */
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={isSelected ? "7" : "5"}
                      fill="#ffffff"
                      stroke={primaryLine?.color || "#ffffff"}
                      strokeWidth="2.5"
                      className="transition-transform duration-200 group-hover:scale-125"
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Station Labels (Placed with dedicated octolinear positioning to prevent collisions) */}
          <g id="station-labels">
            {Object.values(MTR_STATIONS).map(st => {
              const isSelected = activeStationId === st.id;
              const isHighlighted = highlightStationIds.includes(st.id);
              const isLineActive = !activeLineId || st.lines.includes(activeLineId);

              // If user toggles "Interchanges Only", hide regular station labels unless selected
              if (onlyInterchanges && !st.isInterchange && !isSelected && !isHighlighted) {
                return null;
              }

              const opacity = isLineActive ? 1 : 0.12;
              const labelProps = getLabelProps(st);

              return (
                <g
                  key={`label-${st.id}`}
                  {...labelProps}
                  opacity={opacity}
                  pointerEvents="none"
                  className="select-none transition-all duration-200"
                >
                  <text
                    textAnchor={labelProps.textAnchor}
                    fill={isSelected ? "#38bdf8" : isHighlighted ? "#f59e0b" : "#f8fafc"}
                    fontSize={isSelected ? "12" : st.isInterchange ? "11" : "10"}
                    fontWeight={isSelected || st.isInterchange ? "700" : "500"}
                    stroke="#070b14"
                    strokeWidth="3.5"
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {st.name}
                    {showChineseLabels && (
                      <tspan 
                        fill={isSelected ? "#bae6fd" : "#94a3b8"} 
                        fontSize="9" 
                        fontWeight="400"
                        dx="3"
                      >
                        {st.nameZh}
                      </tspan>
                    )}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Station Floating HUD Panel */}
        {selectedStation && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 bg-[#0c1324]/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-20 transition-all animate-in fade-in slide-in-from-bottom-2">
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
                      Interchange Hub
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

            {/* Connecting Lines */}
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
                    onSelectStation?.(selectedStation);
                    navigator.clipboard.writeText(`${selectedStation.name} Station`);
                    toast({
                      title: "Targeted for Radar Clue!",
                      description: `Added "${selectedStation.name} (${selectedStation.nameZh})" to your question prompt.`,
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

      {/* Legend & Help Footer */}
      <div className="p-3 bg-[#0a0f1d] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900 inline-block shadow-sm" />
            <span>Interchange Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-sky-400 inline-block" />
            <span>Station</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border border-dashed border-sky-400 inline-block" />
            <span>500m Zone</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Tip: Drag to pan • Scroll to zoom • Toggle lines to focus corridors
        </div>
      </div>
    </Card>
  );
}
