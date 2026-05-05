import { create } from 'zustand';
import { API_BASE } from '../../../config/api';
import { cleanForSeniorTTS } from '../services/seniorTextNormalizer';

interface SeniorAudioState {
  isLoading: boolean;
  isPlaying: boolean;
  currentText: string;
  error: string | null;
  audio: HTMLAudioElement | null;
  playbackId: number;
  abortController: AbortController | null;
  play: (text: string, options?: { voice?: string; emotion?: string }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => Promise<void>;
}

export const useSeniorAudioStore = create<SeniorAudioState>((set, get) => ({
  isLoading: false,
  isPlaying: false,
  currentText: '',
  error: null,
  audio: null,
  playbackId: 0,
  abortController: null,
  play: async (text, options) => {
    const speechText = cleanForSeniorTTS(text);
    if (!speechText) return;
    const previousAudio = get().audio;
    const previousController = get().abortController;
    if (previousAudio) {
      previousAudio.pause();
      previousAudio.currentTime = 0;
    }
    previousController?.abort();
    window.speechSynthesis?.cancel();

    const playbackId = get().playbackId + 1;
    const abortController = new AbortController();
    set({
      playbackId,
      abortController,
      isLoading: true,
      isPlaying: false,
      error: null,
      currentText: speechText,
      audio: null,
    });
    try {
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, voice: options?.voice || 'xiaoyi', emotion: options?.emotion || 'friendly' }),
        signal: abortController.signal,
      });
      if (get().playbackId !== playbackId) return;
      if (!response.ok) throw new Error('TTS request failed');
      const data = await response.json();
      if (get().playbackId !== playbackId) return;
      if (!data.success || !data.audio) throw new Error('TTS audio missing');
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      audio.onplay = () => {
        if (get().playbackId === playbackId) set({ isPlaying: true, isLoading: false });
      };
      audio.onended = () => {
        if (get().playbackId === playbackId) set({ isPlaying: false, audio: null, abortController: null });
      };
      audio.onerror = () => {
        if (get().playbackId === playbackId) set({ isPlaying: false, isLoading: false, audio: null, abortController: null, error: '朗读暂时不可用，但您可以继续看文字。' });
      };
      set({ audio });
      await audio.play();
    } catch (error) {
      if (get().playbackId !== playbackId || abortController.signal.aborted) return;
      set({ isLoading: false, isPlaying: false, audio: null, abortController: null, error: '朗读暂时不可用，但您可以继续看文字。' });
    }
  },
  pause: () => {
    const audio = get().audio;
    if (audio && !audio.paused) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      set({ isPlaying: false });
    }
  },
  resume: () => {
    const audio = get().audio;
    if (audio && audio.paused) {
      audio.play().catch(() => set({ error: '无法继续朗读。' }));
    } else {
      set({ error: '没有可以继续播放的朗读。' });
    }
  },
  stop: () => {
    const audio = get().audio;
    const abortController = get().abortController;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    abortController?.abort();
    window.speechSynthesis?.cancel();
    set((state) => ({ playbackId: state.playbackId + 1, isPlaying: false, isLoading: false, audio: null, abortController: null }));
  },
  replay: async () => {
    const text = get().currentText;
    if (text) await get().play(text);
  },
}));
