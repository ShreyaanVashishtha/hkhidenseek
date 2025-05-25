
"use client";

import { useState, type ReactNode, useEffect } from 'react';
import { useGameContext } from '@/hooks/useGameContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, ShieldAlert } from 'lucide-react';

interface PinProtectPageProps {
  role: 'admin' | 'hider' | 'seeker';
  children: ReactNode;
}

export function PinProtectPage({ role, children }: PinProtectPageProps) {
  const {
    // Global PIN settings from Supabase (via GameState)
    adminPin: globalAdminPin,
    hiderPin: globalHiderPin,
    seekerPin: globalSeekerPin,
    // Local auth status from GameContext (backed by localStorage and local React state)
    isAdminAuthenticated,
    isHiderAuthenticated,
    isSeekerAuthenticated,
    // Auth functions
    authenticateAdmin,
    authenticateHider,
    authenticateSeeker,
  } = useGameContext();

  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');
  const [pageReady, setPageReady] = useState(false);

  let isAuthenticatedForRole = false;
  let pinForRole: string | undefined;
  let authenticateFunction: (pin: string) => boolean;

  switch (role) {
    case 'admin':
      isAuthenticatedForRole = isAdminAuthenticated;
      pinForRole = globalAdminPin;
      authenticateFunction = authenticateAdmin;
      break;
    case 'hider':
      isAuthenticatedForRole = isHiderAuthenticated;
      pinForRole = globalHiderPin;
      authenticateFunction = authenticateHider;
      break;
    case 'seeker':
      isAuthenticatedForRole = isSeekerAuthenticated;
      pinForRole = globalSeekerPin;
      authenticateFunction = authenticateSeeker;
      break;
    default:
      // This should not happen if used correctly
      return <p>Error: Invalid role for PIN protection.</p>;
  }

  useEffect(() => {
    // This effect helps prevent a flash of the PIN screen if auth status is already true
    // from localStorage, or if no PIN is set for the role.
    // It assumes GameContext has initialized its local auth states from localStorage.
    setPageReady(true);
  }, [isAdminAuthenticated, isHiderAuthenticated, isSeekerAuthenticated, globalAdminPin, globalHiderPin, globalSeekerPin]);


  if (!pageReady) {
    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Loading Access Control...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Please wait while we check your access credentials.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  // If no PIN is set for the role OR if the user is already authenticated for this role
  if (!pinForRole || isAuthenticatedForRole) {
    return <>{children}</>;
  }

  // If a PIN is set but the user is not authenticated, show the PIN form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (authenticateFunction(inputPin)) {
      // Authentication successful, PinProtectPage will re-render due to context change
      // and the children will be shown.
    } else {
      setError('Incorrect PIN. Please try again.');
    }
    setInputPin('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>
          <CardTitle>
            {role.charAt(0).toUpperCase() + role.slice(1)} Panel Access
          </CardTitle>
          <CardDescription>
            This area is PIN protected. Please enter the PIN set by the administrator to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                id={`pin-input-${role}`}
                type="password"
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                placeholder="Enter PIN"
                required
                className={`text-lg ${error ? 'border-destructive ring-destructive' : 'focus:ring-primary'}`}
                aria-describedby={error ? `pin-error-${role}` : undefined}
              />
              {error && <p id={`pin-error-${role}`} className="text-sm text-destructive pt-1">{error}</p>}
            </div>
            <Button type="submit" className="w-full text-base py-3">
              Unlock Access
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
