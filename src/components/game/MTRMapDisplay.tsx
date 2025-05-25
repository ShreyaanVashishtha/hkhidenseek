
"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';
import { useGameContext } from '@/hooks/useGameContext';

export function MTRMapDisplay() {
  const { mtrMapUrl } = useGameContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          MTR System Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mtrMapUrl ? (
          <Image 
            src={mtrMapUrl} 
            alt="MTR System Map" 
            width={800} 
            height={600} 
            className="rounded-md border object-contain"
            data-ai-hint="map transport"
            priority={false} // Not critical for LCP
          />
        ) : (
          <p className="text-muted-foreground">MTR map URL not set by admin.</p>
        )}
      </CardContent>
    </Card>
  );
}
