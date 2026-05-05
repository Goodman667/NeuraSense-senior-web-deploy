import { useCallback } from 'react';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';

export function useSeniorTTS() {
  const { isLoading, isPlaying, currentText, error, play, pause, resume, stop, replay } = useSeniorAudioStore();
  const speak = useCallback((text: string, options?: { voice?: string; emotion?: string }) => play(text, options), [play]);
  return { isLoading, isPlaying, currentText, error, speak, pause, resume, stop, replay };
}
