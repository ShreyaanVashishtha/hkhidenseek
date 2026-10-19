"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, AlertTriangle, Camera, CheckCircle2, Clock, Upload, X } from 'lucide-react';
import { CURSE_DICE_OPTIONS } from '@/lib/constants';
import { ActiveCurseInfo } from '@/lib/types';
import { TimerDisplay } from './TimerDisplay';
import { triggerHaptic } from '@/lib/haptics';
import { useGameContext } from '@/hooks/useGameContext';

interface CurseKlaxonModalProps {
  activeCurse: ActiveCurseInfo | null;
  onCompleteCursePhoto?: (photoFile: File) => Promise<void>;
  onAcknowledgeCurse?: () => void;
}

export function CurseKlaxonModal({
  activeCurse,
  onCompleteCursePhoto,
  onAcknowledgeCurse,
}: CurseKlaxonModalProps) {
  const { clearActiveCurse } = useGameContext();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  if (!activeCurse || activeCurse.resolutionStatus === 'resolved') {
    return null;
  }

  const curseDetails = CURSE_DICE_OPTIONS.find(c => c.number === activeCurse.curseId);
  if (!curseDetails) return null;

  const Icon = curseDetails.icon || Zap;
  const isPendingHiderReview = activeCurse.resolutionStatus === 'pending_hider_acknowledgement';

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitProof = async () => {
    if (!photoFile || !onCompleteCursePhoto) return;
    setIsSubmitting(true);
    try {
      await onCompleteCursePhoto(photoFile);
      setPhotoFile(null);
      setPhotoPreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-40">
      {/* Persistent Pulsing Warning Banner on Seeker View */}
      <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-amber-950/70 border-2 border-purple-500/80 shadow-2xl animate-in fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0 animate-pulse">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
                  CURSE ACTIVE: {curseDetails.name}
                </span>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-mono">
                  Die #{curseDetails.number}
                </Badge>
              </div>
              <p className="text-xs text-purple-200/90 leading-snug">
                {curseDetails.description}
              </p>
              {activeCurse.hiderInputText && (
                <p className="text-xs font-semibold text-amber-300">
                  Hider's Specific Condition: "{activeCurse.hiderInputText}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center">
            {curseDetails.durationMinutes && activeCurse.startTime && activeCurse.resolutionStatus === 'pending_seeker_action' && (
              <div className="w-full sm:w-auto">
                <TimerDisplay
                  title="Curse Timer"
                  durationMinutes={curseDetails.durationMinutes}
                  phaseStartTime={new Date(activeCurse.startTime)}
                  isActive={true}
                  onTimerEnd={() => {
                    clearActiveCurse();
                  }}
                  className="text-xs py-1 px-3"
                />
              </div>
            )}

            {curseDetails.requiresSeekerAction === 'photo' && (
              isPendingHiderReview ? (
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs py-1 px-3 whitespace-nowrap">
                  Photo Sent • Awaiting Hider Review
                </Badge>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                    <Camera className="h-4 w-4" />
                    <span>{photoFile ? "Change Photo" : "Snap Proof"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                  {photoFile && (
                    <Button
                      size="sm"
                      onClick={handleSubmitProof}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-xl whitespace-nowrap"
                    >
                      {isSubmitting ? "Uploading..." : "Submit Photo"}
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {photoPreview && (
          <div className="mt-3 pt-3 border-t border-purple-500/30 flex items-center gap-3">
            <Image
              src={photoPreview}
              alt="Curse proof preview"
              width={80}
              height={60}
              className="rounded-lg border border-purple-500/40 object-cover"
            />
            <div className="text-xs text-slate-300 flex-1">
              <span className="font-semibold text-white">Curse proof photo ready.</span>
              <p className="text-[11px] text-slate-400">Tap "Submit Photo" to send to the hider for approval and lift the curse!</p>
            </div>
            <button
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
