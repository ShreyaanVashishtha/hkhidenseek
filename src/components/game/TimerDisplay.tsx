
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

  useEffect(() => {
    // Calculate initial time left based on phaseStartTime
    if (isActive && phaseStartTime) {
      const phaseStartDateTime = new Date(phaseStartTime).getTime();
      const elapsedSeconds = Math.floor((Date.now() - phaseStartDateTime) / 1000);
      const initialTime = (durationMinutes * 60) - elapsedSeconds;
      setTimeLeft(Math.max(0, initialTime));
    } else if (!isActive) {
      setTimeLeft(durationMinutes * 60); // Reset to full duration if not active
    } else {
      // Fallback if phaseStartTime is not available but timer is active (should ideally not happen for persistent timers)
      setTimeLeft(durationMinutes * 60);
    }
  }, [durationMinutes, isActive, phaseStartTime]);

  useEffect(() => {
    if (!isActive || !phaseStartTime) {
      // If timer is not active or no phaseStartTime, clear any existing interval and do nothing.
      // If timeLeft was already 0 and onTimerEnd exists, it would have been called by the interval.
      return;
    }
    
    if (timeLeft <= 0) {
        // If timeLeft is already zero (or less) when this effect runs,
        // and it's active, call onTimerEnd if it hasn't been called.
        if (onTimerEnd) {
            onTimerEnd();
        }
        return;
    }

    const intervalId = setInterval(() => {
      const phaseStartDateTime = new Date(phaseStartTime).getTime();
      const elapsedSeconds = Math.floor((Date.now() - phaseStartDateTime) / 1000);
      const newTimeLeft = (durationMinutes * 60) - elapsedSeconds;
      
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
  }, [isActive, phaseStartTime, durationMinutes, onTimerEnd, timeLeft]); // Added timeLeft to deps to re-evaluate if it becomes 0 externally

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const displayTime = isActive ? timeLeft : durationMinutes * 60;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-4xl font-bold ${displayTime <= 60 && displayTime > 0 && isActive ? 'text-destructive' : 'text-foreground'}`}>
          {formatTime(displayTime)}
        </p>
        {!isActive && timeLeft > 0 && <p className="text-sm text-muted-foreground">Timer paused or not started.</p>}
        {isActive && timeLeft <=0 && <p className="text-sm text-destructive">Time's up!</p>}
      </CardContent>
    </Card>
  );
}

