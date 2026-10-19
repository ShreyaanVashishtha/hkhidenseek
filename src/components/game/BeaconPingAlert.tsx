"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, MapPin, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { BeaconPing } from '@/lib/types';
import { triggerHaptic } from '@/lib/haptics';

interface BeaconPingAlertProps {
  role: 'hider' | 'seeker';
  latestPing?: BeaconPing;
  onTransmitBeacon?: () => void;
  isSeekingPhase: boolean;
}

export function BeaconPingAlert({
  role,
  latestPing,
  onTransmitBeacon,
  isSeekingPhase,
}: BeaconPingAlertProps) {
  if (!isSeekingPhase) return null;

  if (role === 'hider') {
    return (
      <Card className="border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-card to-sky-950/20 shadow-md">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white">
                  30-Minute Cellular Beacon Window
                </span>
                <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/30">
                  Jet Lag Rule
                </Badge>
              </div>
              <p className="text-[11px] text-slate-300">
                Transmit your mandatory periodic cell tower ping to satisfy match protocol.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              triggerHaptic('success');
              onTransmitBeacon?.();
            }}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-md whitespace-nowrap"
          >
            <Radio className="h-3.5 w-3.5 mr-1.5 animate-ping" />
            Transmit Beacon Ping
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Seeker View: Display latest beacon if received within the match
  if (latestPing) {
    return (
      <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-[#0c1424] border border-sky-500/50 shadow-lg animate-in fade-in space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-400 animate-pulse" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              📡 Automated Hider Beacon Received
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(latestPing.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-200 pt-0.5">
          <span>Transit Cell Area:</span>
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[11px] font-bold">
            <MapPin className="h-3 w-3 mr-1" />
            {latestPing.district} District
          </Badge>
          <Badge variant="outline" className="text-[11px] text-slate-300 border-slate-700">
            {latestPing.lineName}
          </Badge>
        </div>
      </div>
    );
  }

  return null;
}
