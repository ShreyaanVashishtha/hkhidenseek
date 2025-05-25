
"use client";

import { useContext } from 'react';
import { GameContext } from '@/contexts/GameContext';

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};
