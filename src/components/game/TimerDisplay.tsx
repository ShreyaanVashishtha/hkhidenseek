
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface TimerDisplayProps {
  title: string;
  durationMinutes: number; // Duration in minutes
  isActive: boolean;
  onTimerEnd?: () => void;
  className?: string;
}

export function TimerDisplay({ title, durationMinutes, isActive, onTimerEnd, className }: TimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    setTimeLeft(durationMinutes * 60); // Reset timer when duration or active state changes
  }, [durationMinutes, isActive]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (isActive && timeLeft <= 0 && onTimerEnd) {
        onTimerEnd();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, timeLeft, onTimerEnd]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-4xl font-bold ${timeLeft <= 60 && timeLeft > 0 ? 'text-destructive' : 'text-foreground'}`}>
          {isActive ? formatTime(timeLeft) : formatTime(durationMinutes * 60)}
        </p>
        {!isActive && <p className="text-sm text-muted-foreground">Timer paused or not started.</p>}
      </CardContent>
    </Card>
  );
}
