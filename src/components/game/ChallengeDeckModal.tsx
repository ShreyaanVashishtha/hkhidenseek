"use client";

import React, { useState, useEffect } from 'react';
import { ChallengeCard, ActiveChallenge } from '@/lib/types';
import { HK_CHALLENGE_DECK, drawRandomChallenges } from '@/lib/challengesData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { soundEffects } from '@/lib/soundEffects';
import { 
  Sparkles, 
  Coins, 
  Clock, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Upload, 
  X,
  Zap,
  Coffee,
  Train,
  Smile
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChallengeDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChallenge: ActiveChallenge | null | undefined;
  onAcceptChallenge: (card: ChallengeCard) => void;
  onCompleteChallenge: (card: ChallengeCard, photoFile?: File) => Promise<void>;
  onVetoChallenge: (card: ChallengeCard) => void;
  isPenaltyActive?: boolean;
  penaltyTimeRemaining?: string | null;
}

export function ChallengeDeckModal({
  isOpen,
  onClose,
  activeChallenge,
  onAcceptChallenge,
  onCompleteChallenge,
  onVetoChallenge,
  isPenaltyActive = false,
  penaltyTimeRemaining = null,
}: ChallengeDeckModalProps) {
  const { toast } = useToast();
  const [drawnCards, setDrawnCards] = useState<ChallengeCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [showVetoConfirm, setShowVetoConfirm] = useState(false);

  // When modal opens and no active challenge, automatically draw 2 cards if empty
  useEffect(() => {
    if (isOpen && !activeChallenge && drawnCards.length === 0) {
      handleDrawCards();
    }
  }, [isOpen, activeChallenge]);

  const handleDrawCards = () => {
    soundEffects.playCardDraw();
    const newCards = drawRandomChallenges(2);
    setDrawnCards(newCards);
  };

  const handleSelectCard = (card: ChallengeCard) => {
    soundEffects.playCardDraw();
    onAcceptChallenge(card);
    setDrawnCards([]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofPhoto(file);
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
      setProofPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleComplete = async () => {
    if (!activeChallenge) return;
    if (activeChallenge.card.requiresPhotoProof && !proofPhoto) {
      toast({
        title: "Photo Proof Required",
        description: "Please attach a photo proving you completed this challenge.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompleteChallenge(activeChallenge.card, proofPhoto || undefined);
      soundEffects.playCoin();
      toast({
        title: "Challenge Completed!",
        description: `Earned +${activeChallenge.card.coinsReward} Coins for your team!`,
      });
      setProofPhoto(null);
      setProofPreviewUrl(null);
      onClose();
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit challenge.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVeto = () => {
    if (!activeChallenge) return;
    setShowVetoConfirm(false);
    soundEffects.playCurseAlarm();
    onVetoChallenge(activeChallenge.card);
    toast({
      title: "Challenge Vetoed!",
      description: "15-minute freeze penalty activated. No transit or questions allowed.",
      variant: "destructive",
    });
    onClose();
  };

  const getDifficultyBadge = (diff: ChallengeCard['difficulty']) => {
    switch (diff) {
      case 'easy':
        return <Badge className="bg-emerald-600/90 text-white text-[10px]">Easy (+{diff === 'easy' ? '15-25' : ''})</Badge>;
      case 'medium':
        return <Badge className="bg-amber-600/90 text-white text-[10px]">Medium (+{diff === 'medium' ? '40-60' : ''})</Badge>;
      case 'hard':
        return <Badge className="bg-rose-600/90 text-white text-[10px]">Hard (+{diff === 'hard' ? '80-120' : ''})</Badge>;
    }
  };

  const getCategoryIcon = (cat: ChallengeCard['category']) => {
    switch (cat) {
      case 'food':
        return <Coffee className="h-3.5 w-3.5 text-amber-400" />;
      case 'transit':
        return <Train className="h-3.5 w-3.5 text-sky-400" />;
      default:
        return <Smile className="h-3.5 w-3.5 text-emerald-400" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl bg-[#0b1324] border-slate-800 text-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  Hong Kong Challenge Deck
                </DialogTitle>
              </div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-xs">
                Jet Lag Economy
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Draw and complete location-based challenges across Hong Kong to earn coins for questions.
            </DialogDescription>
          </DialogHeader>

          {/* Penalty Banner */}
          {isPenaltyActive && (
            <div className="bg-rose-950/80 border border-rose-600/60 rounded-xl p-3.5 flex items-center gap-3 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <div className="text-xs">
                <strong className="text-rose-200">Freeze Penalty Active:</strong> You vetoed a challenge or failed a task. Movement on MTR and questions are locked for another{' '}
                <span className="font-mono text-rose-300 font-bold">{penaltyTimeRemaining || 'a few minutes'}</span>.
              </div>
            </div>
          )}

          {/* ACTIVE CHALLENGE VIEW */}
          {activeChallenge ? (
            <div className="space-y-4">
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500" />

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getDifficultyBadge(activeChallenge.card.difficulty)}
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 flex items-center gap-1">
                        {getCategoryIcon(activeChallenge.card.category)}
                        <span className="capitalize">{activeChallenge.card.category}</span>
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {activeChallenge.card.title}
                    </h3>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5 shrink-0">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span className="font-bold text-amber-300 text-sm">
                      +{activeChallenge.card.coinsReward} Coins
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed mb-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {activeChallenge.card.description}
                </p>

                {/* Photo Upload Area */}
                {activeChallenge.card.requiresPhotoProof && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-sky-400" />
                      Attach Photo Proof
                    </label>

                    {proofPreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-700 max-h-48 bg-black/60 flex items-center justify-center">
                        <img src={proofPreviewUrl} alt="Challenge Proof" className="max-h-48 object-contain" />
                        <button
                          onClick={() => {
                            setProofPhoto(null);
                            setProofPreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white p-1 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-700 hover:border-sky-500/80 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 transition-colors">
                        <Upload className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-300 font-medium">Take or Upload Proof Photo</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG supported</span>
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
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVetoConfirm(true)}
                  className="border-rose-800 text-rose-300 hover:bg-rose-950/60 hover:text-rose-200 text-xs"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1 text-rose-400" />
                  Veto Challenge (15m Freeze)
                </Button>

                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting || (activeChallenge.card.requiresPhotoProof && !proofPhoto)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 shadow-lg"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {isSubmitting ? "Submitting..." : `Complete & Claim +${activeChallenge.card.coinsReward} Coins`}
                </Button>
              </div>
            </div>
          ) : (
            /* CARD DRAW SELECTION VIEW */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {drawnCards.map((card) => (
                  <Card
                    key={card.id}
                    className="bg-slate-900/90 border-slate-700/80 hover:border-amber-500/60 transition-all flex flex-col justify-between p-4 shadow-xl relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {getDifficultyBadge(card.difficulty)}
                        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          +{card.coinsReward} Coins
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-sm tracking-tight mb-2 group-hover:text-amber-300 transition-colors">
                        {card.title}
                      </h4>

                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {card.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {card.timeLimitMinutes} min limit
                        </span>
                        {card.requiresPhotoProof && (
                          <span className="flex items-center gap-1 text-sky-400">
                            <Camera className="h-3 w-3" />
                            Photo proof
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => handleSelectCard(card)}
                        disabled={isPenaltyActive}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-8"
                      >
                        Accept This Challenge
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDrawCards}
                  disabled={isPenaltyActive}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Redraw Another 2 Cards
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VETO CONFIRMATION DIALOG */}
      <Dialog open={showVetoConfirm} onOpenChange={setShowVetoConfirm}>
        <DialogContent className="max-w-md bg-[#0f172a] border-slate-700 text-white p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 text-base">
              <AlertTriangle className="h-5 w-5" />
              Confirm Challenge Veto?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 pt-1">
              Per official Jet Lag rules, vetoing a challenge immediately activates a{' '}
              <strong className="text-rose-400">15-minute freeze penalty</strong> for your team. You will not be permitted to ride trains or ask questions until the timer expires.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVetoConfirm(false)}
              className="text-xs border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleVeto}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Confirm Veto (Start 15m Penalty)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
