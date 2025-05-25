
"use client";

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { vetoConsequenceForecaster } from '@/ai/flows/veto-consequence-forecaster'; 

interface VetoConsequenceModalProps {
  challengeDescription: string;
  onConfirmVeto: () => void;
  triggerDisabled?: boolean;
}

export function VetoConsequenceModal({ challengeDescription, onConfirmVeto, triggerDisabled = false }: VetoConsequenceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [consequence, setConsequence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchConsequences = async () => {
    if (!challengeDescription) {
        setError("Challenge description is missing.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setConsequence(null);
    try {
      const result = await vetoConsequenceForecaster({ challengeDescription });
      setConsequence(result.consequenceDescription);
    } catch (err) {
      console.error("Error fetching veto consequences:", err);
      setError("Failed to fetch consequences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      handleFetchConsequences();
    } else {
      setConsequence(null);
      setError(null);
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 flex items-center gap-2" disabled={triggerDisabled}>
          <AlertTriangle className="h-4 w-4" /> Veto Challenge
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Veto Challenge: "{challengeDescription.substring(0,30)}..."?</AlertDialogTitle>
          <AlertDialogDescription>
            Vetoing this challenge will result in a 15-minute penalty (no MTR use, no questions).
            Below are the AI-generated potential gameplay consequences of this veto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Analyzing consequences...</p>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive p-4 bg-destructive/10 rounded-md">{error}</p>
        )}
        {consequence && !isLoading && (
          <Textarea 
            value={consequence} 
            readOnly 
            rows={6}
            className="my-4 bg-muted/50 border-muted" 
          />
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmVeto} className="bg-destructive hover:bg-destructive/90">
            Confirm Veto & Accept Penalty
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

