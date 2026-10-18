"use client";

import React from 'react';
import { TimelineEvent } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  Flame, 
  Trophy, 
  Compass, 
  ShieldAlert, 
  Camera, 
  Clock,
  Radio
} from 'lucide-react';

interface MatchTimelineProps {
  events?: TimelineEvent[];
  maxHeight?: string;
  className?: string;
}

export function MatchTimeline({ events = [], maxHeight = "400px", className = "" }: MatchTimelineProps) {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'question_asked':
        return <HelpCircle className="h-4 w-4 text-sky-400" />;
      case 'question_answered':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'challenge_drawn':
      case 'challenge_completed':
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case 'challenge_vetoed':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'curse_activated':
        return <ShieldAlert className="h-4 w-4 text-purple-400" />;
      case 'curse_resolved':
        return <CheckCircle2 className="h-4 w-4 text-purple-300" />;
      case 'endgame_breach':
        return <Flame className="h-4 w-4 text-red-500 animate-pulse" />;
      case 'tagged':
      case 'round_completed':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'hiding_locked':
        return <Compass className="h-4 w-4 text-blue-400" />;
      default:
        return <Radio className="h-4 w-4 text-slate-400" />;
    }
  };

  const getEventBadgeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'question_asked':
      case 'question_answered':
        return 'bg-sky-950/80 text-sky-300 border-sky-600/40';
      case 'challenge_drawn':
      case 'challenge_completed':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/40';
      case 'challenge_vetoed':
        return 'bg-rose-950/80 text-rose-300 border-rose-600/40';
      case 'curse_activated':
        return 'bg-purple-950/80 text-purple-300 border-purple-600/40';
      case 'endgame_breach':
        return 'bg-red-950 text-red-300 border-red-500 animate-pulse';
      case 'tagged':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className={`border-slate-800 bg-slate-900/90 shadow-xl ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
            <CardTitle className="text-base text-white font-bold tracking-tight">
              Live Match Timeline
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
            {events.length} Events
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Chronological match feed • Jet Lag episode log
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {sortedEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Clock className="h-8 w-8 text-slate-600/60" />
            <p>No events recorded yet in this round.</p>
            <p className="text-[11px] text-slate-600">
              When questions are asked, challenges completed, or curses rolled, live updates will stream here.
            </p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="p-4">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
              {sortedEvents.map((event) => {
                const date = new Date(event.timestamp);
                const timeStr = !isNaN(date.getTime())
                  ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--:--';

                return (
                  <div key={event.id} className="relative group">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center shadow-md">
                      {getEventIcon(event.type)}
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white text-xs">{event.title}</span>
                          {event.badge && (
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${getEventBadgeColor(event.type)}`}>
                              {event.badge}
                            </Badge>
                          )}
                          {event.teamName && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {event.teamName}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">{timeStr}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{event.description}</p>

                      {event.photoUrl && (
                        <div className="mt-2.5 rounded-md overflow-hidden border border-slate-800 bg-black/40 max-w-xs">
                          <img
                            src={event.photoUrl}
                            alt="Clue or Challenge Proof"
                            className="w-full h-auto max-h-40 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
