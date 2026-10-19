/**
 * Haptic Feedback Engine for Mobile Web App
 * Uses navigator.vibrate with safe feature detection for iOS/Android/desktop
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'breach' | 'eliminate' | 'coin';

export function triggerHaptic(type: HapticPattern = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(15);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'heavy':
        navigator.vibrate(60);
        break;
      case 'coin':
        navigator.vibrate([20, 30, 40]);
        break;
      case 'success':
        navigator.vibrate([30, 40, 50]);
        break;
      case 'eliminate':
        navigator.vibrate([40, 25, 25]);
        break;
      case 'warning':
        navigator.vibrate([50, 40, 50, 40, 80]);
        break;
      case 'breach':
        navigator.vibrate([100, 50, 100, 50, 200]);
        break;
    }
  } catch {
    // Silently catch browsers that require user gesture for vibration
  }
}
