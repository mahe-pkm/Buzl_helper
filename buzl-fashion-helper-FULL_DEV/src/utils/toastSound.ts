import { toast } from 'sonner';

type ToastTone = 'success' | 'error' | 'info';

let installed = false;
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) audioContext = new AudioContextCtor();
  return audioContext;
};

const playTone = (tone: ToastTone) => {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => {});

    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    const makeOscillator = (frequency: number, start: number, stop: number, type: OscillatorType = 'sine') => {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now + start);
      oscillator.connect(gain);
      oscillator.start(now + start);
      oscillator.stop(now + stop);
    };

    if (tone === 'success') {
      makeOscillator(660, 0, 0.1);
      makeOscillator(880, 0.09, 0.22);
    } else if (tone === 'error') {
      makeOscillator(220, 0, 0.12, 'square');
      makeOscillator(165, 0.1, 0.24, 'square');
    } else {
      makeOscillator(440, 0, 0.16);
    }
  } catch {
    // Sound is best-effort; toast display must never fail because audio is blocked.
  }
};

export const installToastSounds = () => {
  if (installed) return;
  installed = true;

  const originalSuccess = toast.success.bind(toast) as (...args: any[]) => unknown;
  const originalError = toast.error.bind(toast) as (...args: any[]) => unknown;
  const originalInfo = toast.info.bind(toast) as (...args: any[]) => unknown;
  const originalWarning = toast.warning?.bind(toast) as ((...args: any[]) => unknown) | undefined;

  toast.success = ((...args: any[]) => {
    playTone('success');
    return originalSuccess(...args);
  }) as typeof toast.success;

  toast.error = ((...args: any[]) => {
    playTone('error');
    return originalError(...args);
  }) as typeof toast.error;

  toast.info = ((...args: any[]) => {
    playTone('info');
    return originalInfo(...args);
  }) as typeof toast.info;

  if (originalWarning) {
    toast.warning = ((...args: any[]) => {
      playTone('error');
      return originalWarning(...args);
    }) as typeof toast.warning;
  }
};
