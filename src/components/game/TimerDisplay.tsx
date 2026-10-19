"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerDisplayProps {
  title: string;
  durationMinutes: number;
  phaseStartTime?: Date;
  isActive: boolean;
  onTimerEnd?: () => void;
  className?: string;
}

export function TimerDisplay({ title, durationMinutes, phaseStartTime, isActive, onTimerEnd, className }: TimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isActive || !phaseStartTime) {
      setTimeLeft(durationMinutes * 60);
      return;
    }

    const phaseStartDateTime = new Date(phaseStartTime).getTime();
    const elapsedSeconds = Math.floor((Date.now() - phaseStartDateTime) / 1000);
    const initialTime = (durationMinutes * 60) - elapsedSeconds;
    const newInitialTimeLeft = Math.max(0, initialTime);
    setTimeLeft(newInitialTimeLeft);

    if (newInitialTimeLeft <= 0) {
      if (onTimerEnd) {
        onTimerEnd();
      }
      return;
    }

    const intervalId = setInterval(() => {
      const currentPhaseStartDateTime = new Date(phaseStartTime).getTime();
      const currentElapsedSeconds = Math.floor((Date.now() - currentPhaseStartDateTime) / 1000);
      const newTimeLeft = (durationMinutes * 60) - currentElapsedSeconds;

      setTimeLeft(prevTime => {
        const currentTimeLeft = Math.max(0, newTimeLeft);
        if (currentTimeLeft <= 0) {
          clearInterval(intervalId);
          if (onTimerEnd) {
            onTimerEnd();
          }
        }
        return currentTimeLeft;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [mounted, isActive, phaseStartTime, durationMinutes, onTimerEnd]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayTime = mounted && isActive ? timeLeft : durationMinutes * 60;
  const isUrgent = mounted && isActive && timeLeft <= 60 && timeLeft > 0;
  const isExpired = mounted && isActive && timeLeft <= 0;

  return (
    <Card className={cn(
      "glass-card border-slate-800 shadow-xl transition-all overflow-hidden",
      isUrgent && "border-red-500/80 bg-red-950/20 animate-pulse shadow-red-500/20",
      isExpired && "border-red-500 bg-red-950/30",
      className
    )}>
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Clock className={cn("h-3.5 w-3.5", isUrgent ? "text-red-400 animate-spin" : "text-sky-400")} />
            {title}
          </span>
          {isActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-baseline gap-2">
          <p className={cn(
            "text-3xl sm:text-4xl font-black font-digital tracking-tight",
            isUrgent ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]" :
            isExpired ? "text-red-500" :
            "text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]"
          )}>
            {formatTime(displayTime)}
          </p>
          <span className="text-[10px] font-mono uppercase text-slate-400">
            {Math.floor(displayTime / 3600) > 0 ? "HRS:MIN:SEC" : "MIN:SEC"}
          </span>
        </div>
        {!mounted && <p className="text-[11px] text-slate-400 mt-1 font-mono">Initializing timer...</p>}
        {mounted && !isActive && timeLeft > 0 && <p className="text-[11px] text-slate-400 mt-1 font-mono">Standby</p>}
        {mounted && isExpired && <p className="text-[11px] text-red-400 mt-1 font-mono font-bold uppercase">Time Expired</p>}
      </CardContent>
    </Card>
  );
}
