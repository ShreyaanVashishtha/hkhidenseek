
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

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
      // If not mounted or timer is not active or no phaseStartTime, calculate initial/reset time.
      // This also handles resetting the display if isActive becomes false.
      setTimeLeft(durationMinutes * 60);
      return;
    }

    // Calculate initial time left based on phaseStartTime once mounted and active
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
      // Recalculate based on phaseStartTime on each interval to ensure accuracy
      const currentPhaseStartDateTime = new Date(phaseStartTime).getTime(); // Re-fetch in case phaseStartTime object changed
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
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine what to display. If not mounted, show the full duration or a placeholder.
  // Otherwise, show the dynamically calculated timeLeft.
  const displayTime = mounted && isActive ? timeLeft : durationMinutes * 60;
  const showActualTime = mounted && isActive;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-4xl font-bold ${showActualTime && timeLeft <= 60 && timeLeft > 0 ? 'text-destructive' : 'text-foreground'}`}>
          {formatTime(displayTime)}
        </p>
        {!mounted && <p className="text-sm text-muted-foreground">Initializing timer...</p>}
        {mounted && !isActive && timeLeft > 0 && <p className="text-sm text-muted-foreground">Timer paused or not started.</p>}
        {mounted && isActive && timeLeft <=0 && <p className="text-sm text-destructive">Time's up!</p>}
      </CardContent>
    </Card>
  );
}
