"use client";

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  MapPin, 
  Target, 
  GitCompareArrows, 
  Camera, 
  ScanLine, 
  Dice5, 
  ShieldAlert, 
  Citrus, 
  Footprints, 
  Car, 
  Route, 
  Bird, 
  Train, 
  AlertTriangle,
  Clock,
  Sparkles,
  Coins
} from 'lucide-react';
import { QUESTION_OPTIONS, CURSE_DICE_OPTIONS, CURSE_DICE_COST, MAX_CURSES_PER_ROUND } from '@/lib/constants';

interface QuickRulesDrawerProps {
  trigger?: React.ReactNode;
}

export function QuickRulesDrawer({ trigger }: QuickRulesDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2.5 rounded-full border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-semibold flex items-center gap-1.5"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Rules Cheat Sheet</span>
            <span className="xs:hidden">Rules</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[92vw] sm:max-w-md p-0 bg-[#0a0f1d] text-slate-100 border-slate-800 flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-slate-800 bg-[#0d1424]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Jet Lag Quick Rules & Cheat Sheet
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-400">
                Hong Kong MTR Edition • Essential game mechanics
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="questions" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 bg-[#0d1424] border-b border-slate-800">
            <TabsList className="grid grid-cols-3 w-full bg-slate-900 border border-slate-800 h-9 p-1">
              <TabsTrigger value="questions" className="text-xs font-semibold py-1">
                ❓ Questions
              </TabsTrigger>
              <TabsTrigger value="curses" className="text-xs font-semibold py-1">
                🎲 Curses
              </TabsTrigger>
              <TabsTrigger value="core" className="text-xs font-semibold py-1">
                📜 Core Rules
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: QUESTIONS CHEAT SHEET */}
          <TabsContent value="questions" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-3 pb-6">
                <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs text-sky-300">
                  💡 <strong>How Coins Work:</strong> Asking questions is free for Seekers, but each question awards <strong>Coins to the Hider</strong> to buy Curse Dice!
                </div>

                {QUESTION_OPTIONS.map((q) => {
                  const Icon = q.icon || MapPin;
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-sky-500/10 text-sky-400">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-sm text-white">{q.name}</span>
                        </div>
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          +{q.hiderCoinsEarned} to Hider
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {q.description}
                      </p>
                      <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-md font-mono border border-slate-800/60">
                        <strong className="text-slate-300">Examples:</strong> {q.seekerPrompt}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 2: CURSE DICE CHEAT SHEET */}
          <TabsContent value="curses" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-3 pb-6">
                <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-xs text-purple-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Dice5 className="h-3.5 w-3.5" />
                    Cost: {CURSE_DICE_COST} Coins • Max {MAX_CURSES_PER_ROUND} Rolls / Round
                  </div>
                  <p className="text-[11px] text-purple-400">
                    Hider rolls a d6 to impose an immediate handicap on seekers. If duplicate rolled, 1 re-roll granted.
                  </p>
                </div>

                {CURSE_DICE_OPTIONS.map((curse) => {
                  const Icon = curse.icon || Dice5;
                  return (
                    <div
                      key={curse.number}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold text-xs flex items-center justify-center border border-purple-500/30">
                            {curse.number}
                          </span>
                          <span className="font-bold text-sm text-white">{curse.name}</span>
                        </div>
                        {curse.durationMinutes && (
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                            <Clock className="h-3 w-3 mr-1" />
                            {curse.durationMinutes} min
                          </Badge>
                        )}
                        {curse.requiresSeekerAction === 'photo' && (
                          <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-700/60">
                            <Camera className="h-3 w-3 mr-1" />
                            Photo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {curse.description}
                      </p>
                      <div className="text-[11px] text-amber-300/90 bg-amber-950/20 p-2 rounded-md border border-amber-900/30">
                        <strong>Handicap on Seekers:</strong> {curse.effect}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 3: CORE RULES */}
          <TabsContent value="core" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-3 pb-6 text-xs text-slate-300 leading-relaxed">
                {/* Transport */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Train className="h-4 w-4 text-sky-400" />
                    Allowed Transport: MTR Only
                  </div>
                  <p>
                    Only the MTR (Subway / Rail network) may be used for transit. Buses, minibuses, ferries, taxis, and trams are strictly prohibited.
                  </p>
                </div>

                {/* 500m Safe Zone */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-400" />
                    500m Metric Safe Zone
                  </div>
                  <p>
                    Hiders must choose one station and remain within its 500m radius circle for the entire duration of the seeking phase. All hiders must stay together.
                  </p>
                </div>

                {/* Endgame Breach */}
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 space-y-1.5 text-red-200">
                  <div className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Endgame 500m Breach Siren
                  </div>
                  <p>
                    When seekers cross into the hiders' 500m circle, the <strong>Breach Siren</strong> activates! Photo clues are immediately disabled to prevent instant identification. Seekers must physically spot and tag hiders.
                  </p>
                </div>

                {/* Veto Penalty */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-400" />
                    Challenge Veto Penalty
                  </div>
                  <p>
                    Seekers may veto a drawn challenge or concede a failed challenge, which triggers an immediate <strong>15-minute Freeze Penalty</strong>. During a freeze, seekers cannot board trains, travel, or ask questions.
                  </p>
                </div>

                {/* AI Referee */}
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-1.5 text-purple-200">
                  <div className="font-bold text-sm text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Gemini AI Clue Referee
                  </div>
                  <p>
                    Photo challenges are reviewed automatically by the Gemini AI Referee with visual object detection and authentic <em>Jet Lag</em> banter.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
