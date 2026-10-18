"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { soundEffects } from '@/lib/soundEffects';
import { Flame, Trophy, AlertTriangle, Camera, Upload, X, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EndgameBreachModalProps {
  isBreached: boolean;
  role: 'hider' | 'seeker' | 'admin' | 'spectator';
  lockedStationName?: string;
  onConfirmTag?: (photoFile?: File) => Promise<void>;
  onDismissAlert?: () => void;
}

export function EndgameBreachModal({
  isBreached,
  role,
  lockedStationName,
  onConfirmTag,
  onDismissAlert,
}: EndgameBreachModalProps) {
  const { toast } = useToast();
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagPhoto, setTagPhoto] = useState<File | null>(null);
  const [tagPreviewUrl, setTagPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isBreached) {
      soundEffects.playBreachAlarm();
    }
  }, [isBreached]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTagPhoto(file);
      if (tagPreviewUrl) URL.revokeObjectURL(tagPreviewUrl);
      setTagPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleExecuteTag = async () => {
    if (!onConfirmTag) return;
    setIsSubmitting(true);
    try {
      await onConfirmTag(tagPhoto || undefined);
      soundEffects.playVictory();
      toast({
        title: "🎯 HIDER TAGGED!",
        description: "Round complete! Score calculated and recorded in match history.",
      });
      setShowTagDialog(false);
    } catch (err: any) {
      toast({
        title: "Tag Error",
        description: err.message || "Could not log tag.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isBreached) return null;

  return (
    <>
      {/* High-visibility Endgame Banner across the screen */}
      <div className="w-full bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-y-2 border-red-500 py-3 px-4 shadow-2xl animate-pulse flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-full text-white shadow-lg animate-bounce">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-sm uppercase text-red-200">
                🚨 ENDGAME PROTOCOL ACTIVATED 🚨
              </span>
              <Badge className="bg-red-600 text-white font-mono text-[10px]">
                500m ZONE BREACHED
              </Badge>
            </div>
            <p className="text-xs text-red-100">
              {role === 'hider'
                ? "Seekers have penetrated your 500m station territory! Photo clues disabled. Run or conceal!"
                : `You are inside the 500m radius of ${lockedStationName || 'the hider'}! Close in for the physical tag!`}
            </p>
          </div>
        </div>

        {role === 'seeker' && (
          <Button
            size="sm"
            onClick={() => setShowTagDialog(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs px-4 h-9 shadow-xl shrink-0 flex items-center gap-1.5"
          >
            <Trophy className="h-4 w-4" />
            TAG HIDER (WIN ROUND)
          </Button>
        )}
      </div>

      {/* TAGGING CONFIRMATION MODAL */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-md bg-[#0a0f1d] border-red-500 text-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="h-6 w-6" />
              <DialogTitle className="text-xl font-bold tracking-tight">
                Confirm Hider Capture
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-300 pt-1">
              Have you physically tagged or visually captured the hider within 10 meters?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="text-slate-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                This will finalize the hiding timer for this round.
              </div>
              <p className="text-slate-400 text-[11px]">
                The round score will be saved to the leaderboard, and roles will rotate for the next round.
              </p>
            </div>

            {/* Victory Photo Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-sky-400" />
                Capture Victory Photo (Optional)
              </label>

              {tagPreviewUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-700 max-h-48 bg-black/60 flex items-center justify-center">
                  <img src={tagPreviewUrl} alt="Victory Tag" className="max-h-48 object-contain" />
                  <button
                    onClick={() => {
                      setTagPhoto(null);
                      setTagPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white p-1 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-700 hover:border-sky-500/80 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 transition-colors">
                  <Upload className="h-5 w-5 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium">Take Victory Selfie</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagDialog(false)}
              className="text-xs border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleExecuteTag}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs px-4"
            >
              {isSubmitting ? "Finalizing..." : "CONFIRM TAG & END ROUND"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
