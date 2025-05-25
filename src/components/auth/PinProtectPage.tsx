
"use client";

import { useState, type ReactNode, useEffect } from 'react';
import { useGameContext } from '@/hooks/useGameContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, ShieldAlert } from 'lucide-react'; // Or other icon

interface PinProtectPageProps {
  role: 'admin' | 'hider' | 'seeker';
  children: ReactNode;
}

export function PinProtectPage({ role, children }: PinProtectPageProps) {
  const {
    adminPin, hiderPin, seekerPin,
    isAdminAuthenticated, isHiderAuthenticated, isSeekerAuthenticated,
    authenticateAdmin, authenticateHider, authenticateSeeker,
  } = useGameContext();

  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');
  const [pageReady, setPageReady] = useState(false); // To prevent flash of PIN screen if already authed

  // Determine current authentication state and PIN for the role
  let isAuthenticatedForRole = false;
  let pinForRole: string | undefined;
  let authenticateFunction: (pin: string) => boolean;

  switch (role) {
    case 'admin':
      isAuthenticatedForRole = isAdminAuthenticated ?? false;
      pinForRole = adminPin;
      authenticateFunction = authenticateAdmin;
      break;
    case 'hider':
      isAuthenticatedForRole = isHiderAuthenticated ?? false;
      pinForRole = hiderPin;
      authenticateFunction = authenticateHider;
      break;
    case 'seeker':
      isAuthenticatedForRole = isSeekerAuthenticated ?? false;
      pinForRole = seekerPin;
      authenticateFunction = authenticateSeeker;
      break;
    default:
      // Should not happen
      return <p>Error: Invalid role for PIN protection.</p>;
  }
  
  // This effect ensures we don't show PIN screen prematurely if context is still loading localStorage
  useEffect(() => {
    // Check if the context has loaded the pins (they won't be undefined if loaded and empty, but truly undefined if not yet loaded from async storage effect in context)
    // A simple check: if adminPin is still in its default state (undefined) and we are checking admin role, it might not be ready.
    // For simplicity, we assume context loads fast. A more robust solution might involve a loading state in context.
    // However, our GameContext initializes pins to undefined and auth to false, then useEffect loads them.
    // So, by the time this component renders, pins *should* be populated from localStorage or remain undefined if not set.
    setPageReady(true);
  }, [adminPin, hiderPin, seekerPin]); // Re-check when pins are potentially updated


  if (!pageReady) {
    // Optional: show a loading spinner or minimal UI
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
  
  // If no PIN is set for this specific role, grant access directly.
  // Or if user is already authenticated for this role.
  if (!pinForRole || isAuthenticatedForRole) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (authenticateFunction(inputPin)) {
      // Auth status is set in context, PinProtectPage will re-render and grant access.
    } else {
      setError('Incorrect PIN. Please try again.');
    }
    setInputPin(''); // Clear input regardless of success
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
