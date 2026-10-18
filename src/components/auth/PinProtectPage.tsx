
"use client";

import { useState, type ReactNode, useEffect } from 'react';
import { useGameContext } from '@/hooks/useGameContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, ShieldAlert, Fingerprint, Sparkles, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { authenticateAdminWithPasskey, hasRegisteredAdminPasskey, isPasskeySupported } from '@/lib/passkeyAuth';
import { useToast } from '@/hooks/use-toast';

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
    authenticateAdminDirect,
    authenticateHider,
    authenticateSeeker,
  } = useGameContext();
  const { toast } = useToast();

  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');
  const [pageReady, setPageReady] = useState(false);
  const [isBiometricsChecking, setIsBiometricsChecking] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);

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
      return <p>Error: Invalid role for PIN protection.</p>;
  }

  useEffect(() => {
    setPageReady(true);
    if (role === 'admin') {
      isPasskeySupported().then(supported => setPasskeySupported(supported));
      setPasskeyRegistered(hasRegisteredAdminPasskey());
    }
  }, [role, isAdminAuthenticated, isHiderAuthenticated, isSeekerAuthenticated, globalAdminPin, globalHiderPin, globalSeekerPin]);

  const handleBiometricLogin = async () => {
    setIsBiometricsChecking(true);
    setError('');
    const result = await authenticateAdminWithPasskey();
    setIsBiometricsChecking(false);
    if (result.success) {
      authenticateAdminDirect();
      toast({
        title: "Biometric Login Successful",
        description: "Welcome back, Game Master / Referee!",
      });
    } else {
      setError(result.error || 'Biometric authentication failed.');
    }
  };

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
            This area is protected. Please verify your credentials to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {role === 'admin' && passkeySupported && (
            <div className="space-y-4 mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricLogin}
                disabled={isBiometricsChecking}
                className="w-full py-6 flex items-center justify-center gap-3 border-primary/40 hover:border-primary hover:bg-primary/5 text-base font-medium shadow-sm transition-all"
              >
                {isBiometricsChecking ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Verifying Biometrics...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-6 w-6 text-primary" />
                    <span>Sign in with Face ID / Touch ID</span>
                  </>
                )}
              </Button>
              {passkeyRegistered ? (
                <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Device passkey registered
                </p>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  First time? Log in with PIN and register your passkey in the admin settings!
                </p>
              )}
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs uppercase text-muted-foreground">Or Enter PIN</span>
                <Separator className="flex-1" />
              </div>
            </div>
          )}

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
