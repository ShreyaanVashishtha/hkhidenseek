"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, ArrowRight, RotateCw, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import { GameRound, Team } from '@/lib/types';
import { triggerHaptic } from '@/lib/haptics';

interface CaughtCelebrationModalProps {
  round: GameRound | null;
  onSwapRoles?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CaughtCelebrationModal({
  round,
  onSwapRoles,
  isOpen,
  onClose,
}: CaughtCelebrationModalProps) {
  if (!round || round.status !== 'completed' || !round.tagEvent) {
    return null;
  }

  const phaseStart = round.phaseStartTime ? new Date(round.phaseStartTime) : new Date(round.startTime || Date.now());
  const tagTime = new Date(round.tagEvent.taggedAt);
  const totalSeconds = Math.max(0, Math.floor((tagTime.getTime() - phaseStart.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeFormatted = `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0a0f1d] border-amber-500/50 text-slate-100 p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center animate-bounce">
            <Trophy className="h-8 w-8" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
            Hiders Caught & Tagged!
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            "The run is over! Bad news for the hiders, huge victory for the seekers."
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-3">
          {/* Survival Time Pill */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/30 text-center space-y-1">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Total Survival Time
            </span>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {timeFormatted}
            </div>
            <p className="text-[11px] text-slate-400">
              Team <strong>{round.hidingTeam?.name || 'Hiders'}</strong> held out across Hong Kong!
            </p>
          </div>

          {/* Caught Photo Proof (if available) */}
          {round.tagEvent.photoUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2 text-center">
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Official Tag Verification Photo</p>
              <Image
                src={round.tagEvent.photoUrl}
                alt="Tag proof"
                width={300}
                height={200}
                className="rounded-lg object-contain mx-auto max-h-48"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 pt-2">
          {onSwapRoles && (
            <Button
              onClick={() => {
                triggerHaptic('success');
                onSwapRoles();
                onClose();
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm h-11 rounded-2xl shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Swap Roles & Start Next Round!
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-9 rounded-xl"
            onClick={onClose}
          >
            <Link href="/leaderboard">
              View Leaderboard Standings <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
