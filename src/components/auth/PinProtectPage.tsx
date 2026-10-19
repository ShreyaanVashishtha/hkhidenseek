"use client";

import { useState, type ReactNode, useEffect } from 'react';
import { useGameContext } from '@/hooks/useGameContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound, ShieldAlert, Fingerprint, Sparkles, Loader2, Eye, EyeOff, Zap, CheckCircle2, ShieldCheck, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { authenticateAdminWithPasskey, hasRegisteredAdminPasskey, isPasskeySupported } from '@/lib/passkeyAuth';
import { useToast } from '@/hooks/use-toast';
import { triggerHaptic } from '@/lib/haptics';

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
  const [showPin, setShowPin] = useState(false);
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
    triggerHaptic('medium');
    const result = await authenticateAdminWithPasskey();
    setIsBiometricsChecking(false);
    if (result.success) {
      triggerHaptic('success');
      authenticateAdminDirect();
      toast({
        title: "Biometric Login Successful",
        description: "Welcome back, Game Master / Referee!",
      });
    } else {
      triggerHaptic('warning');
      setError(result.error || 'Biometric authentication failed.');
    }
  };

  const handleQuickUnlock = () => {
    triggerHaptic('medium');
    const targetPin = pinForRole || (role === 'admin' ? '113221' : role === 'hider' ? '0000' : '1111');
    setInputPin(targetPin);
    if (authenticateFunction(targetPin)) {
      triggerHaptic('success');
      toast({
        title: "Access Granted",
        description: `Unlocked ${role.toUpperCase()} panel successfully.`,
      });
    } else {
      triggerHaptic('warning');
      setError('Auto-fill PIN failed. Please verify in Admin settings.');
    }
  };

  if (!pageReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md glass-card border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Access Control...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Checking authentication credentials...</p>
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
      triggerHaptic('success');
    } else {
      triggerHaptic('warning');
      setError('Incorrect PIN. Please try again.');
      setInputPin('');
    }
  };

  // Role color accents
  const roleStyles = {
    admin: {
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      btnBg: 'bg-purple-600 hover:bg-purple-500',
      border: 'border-purple-500/30 hover:border-purple-500/50',
      defaultPinHint: '113221 (or 1234 in test matches)',
    },
    hider: {
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500',
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      defaultPinHint: '0000 (test seed PIN)',
    },
    seeker: {
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      iconColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      btnBg: 'bg-sky-600 hover:bg-sky-500',
      border: 'border-sky-500/30 hover:border-sky-500/50',
      defaultPinHint: '1111 (test seed PIN)',
    },
  }[role];

  const RoleIcon = role === 'admin' ? ShieldCheck : role === 'hider' ? Eye : Search;

  return (
    <div className="flex items-center justify-center min-h-[75vh] p-4">
      <Card className={`w-full max-w-md glass-card ${roleStyles.border} shadow-2xl transition-all`}>
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border ${roleStyles.iconColor} shadow-inner`}>
            <RoleIcon className="h-7 w-7" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-white">
              {role} Panel Locked
            </CardTitle>
            <Badge className={`${roleStyles.badgeBg} text-[10px] font-mono uppercase px-2 py-0.5`}>
              Protected
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-300">
            This operational terminal requires credentials to ensure competitive secrecy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {role === 'admin' && passkeySupported && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricLogin}
                disabled={isBiometricsChecking}
                className="w-full py-5 flex items-center justify-center gap-3 border-purple-500/40 hover:border-purple-400 hover:bg-purple-500/10 text-white font-medium shadow-md transition-all rounded-xl"
              >
                {isBiometricsChecking ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    <span>Verifying Face ID / Touch ID...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-6 w-6 text-purple-400" />
                    <span className="font-semibold text-sm">Sign in with Face ID / Touch ID</span>
                  </>
                )}
              </Button>
              {passkeyRegistered ? (
                <p className="text-center text-xs text-emerald-400 font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Biometric Passkey Active on Device
                </p>
              ) : (
                <p className="text-center text-xs text-slate-400">
                  First time? Log in with PIN and register biometric passkey in Admin.
                </p>
              )}
              <div className="flex items-center gap-2 py-1">
                <Separator className="flex-1 bg-slate-800" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Or Enter PIN</span>
                <Separator className="flex-1 bg-slate-800" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id={`pin-input-${role}`}
                  type={showPin ? "text" : "password"}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder={`Enter ${role} PIN`}
                  required
                  autoFocus
                  className={`text-lg h-12 bg-slate-900/90 text-white font-mono tracking-widest text-center border-slate-700 ${
                    error ? 'border-destructive ring-destructive' : 'focus:ring-primary focus:border-primary'
                  }`}
                  aria-describedby={error ? `pin-error-${role}` : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p id={`pin-error-${role}`} className="text-xs text-destructive text-center font-semibold pt-1">{error}</p>}
            </div>

            <Button type="submit" className={`w-full text-sm font-bold py-3 h-11 rounded-xl shadow-lg ${roleStyles.btnBg} text-white`}>
              Unlock Access
            </Button>
          </form>

          {/* Quick Unlock / PIN Assistant Card */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-primary" /> Active PIN:
              </span>
              <span className="font-mono font-bold text-amber-300">
                {pinForRole || roleStyles.defaultPinHint}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleQuickUnlock}
              className="w-full text-xs font-bold h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Auto-Fill & Quick Unlock
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
