import { create } from 'zustand';
import { API_BASE } from '../../../config/api';
import { cleanForSeniorTTS } from '../services/seniorTextNormalizer';
import { isAppleTouchDevice } from '../../../lib/useSpeechInput';
import {
  BufferPlayer,
  base64ToArrayBuffer,
  decodeAudio,
  ensureRunning,
  getSharedAudioContext,
  installAudioUnlock,
  type PlayableAudio,
} from '../../../lib/sharedAudio';

// On iPad/iPhone read-aloud plays through the page's one audio context, the same one voice input
// records with; separate <audio> elements left later recordings silent (see lib/sharedAudio.ts).
// The slower senior speed is then made on the server, because slowing a buffer down would also
// lower the voice.
const APPLE = isAppleTouchDevice();
if (APPLE) installAudioUnlock();

const VOICE_SPEED_STORAGE = 'neurasense-senior-voice-speed';

interface SeniorAudioState {
  isLoading: boolean;
  isPlaying: boolean;
  currentText: string;
  error: string | null;
  audio: PlayableAudio | null;
  fallbackMode: 'none' | 'browser';
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
  fallbackMode: 'none',
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
      fallbackMode: 'none',
    });
    try {
      const savedSpeed = Number(localStorage.getItem(VOICE_SPEED_STORAGE) || '0.88');
      const speed = Number.isFinite(savedSpeed) ? Math.min(1, Math.max(0.72, savedSpeed)) : 0.88;
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, voice: options?.voice || 'xiaoyi', emotion: options?.emotion || 'friendly', ...(APPLE ? { speed } : {}) }),
        signal: abortController.signal,
      });
      if (get().playbackId !== playbackId) return;
      if (!response.ok) throw new Error('TTS request failed');
      const data = await response.json();
      if (get().playbackId !== playbackId) return;
      if (!data.success || !data.audio) throw new Error('TTS audio missing');
      const audioFormat = String(data.format || 'mp3').toLowerCase();
      const mimeType = audioFormat === 'wav' ? 'audio/wav' : 'audio/mp3';
      if (APPLE) {
        const ctx = getSharedAudioContext(false);
        if (ctx && (await ensureRunning(ctx))) {
          try {
            const buffer = await decodeAudio(ctx, base64ToArrayBuffer(data.audio));
            if (get().playbackId !== playbackId) return;
            const player = new BufferPlayer(ctx, buffer);
            player.onplay = () => {
              if (get().playbackId === playbackId) set({ isPlaying: true, isLoading: false, fallbackMode: 'none', error: null });
            };
            player.onended = () => {
              if (get().playbackId === playbackId) set({ isPlaying: false, audio: null, abortController: null });
            };
            set({ audio: player });
            await player.play();
            return;
          } catch {
            if (get().playbackId !== playbackId) return;
            // fall back to an <audio> element below
          }
        }
      }
      const audio = new Audio(`data:${mimeType};base64,${data.audio}`);
      audio.volume = 1;
      // On iPad/iPhone the server already slowed the speech down.
      audio.playbackRate = APPLE ? 1 : speed;
      audio.onplay = () => {
        if (get().playbackId === playbackId) set({ isPlaying: true, isLoading: false, fallbackMode: 'none', error: null });
      };
      audio.onended = () => {
        if (get().playbackId === playbackId) set({ isPlaying: false, audio: null, abortController: null });
      };
      audio.onerror = () => {
        if (get().playbackId !== playbackId) return;
        set({ isPlaying: false, isLoading: false, audio: null, abortController: null, fallbackMode: 'none', error: '朗读暂时不可用，先看文字就可以。' });
      };
      set({ audio });
      await audio.play();
    } catch (error) {
      if (get().playbackId !== playbackId || abortController.signal.aborted) return;
      set({ isLoading: false, isPlaying: false, audio: null, abortController: null, fallbackMode: 'none', error: '朗读暂时不可用，先看文字就可以。' });
    }
  },
  pause: () => {
    const audio = get().audio;
    if (audio && !audio.paused) {
      audio.pause();
      set({ isPlaying: false });
    } else if (get().fallbackMode === 'browser' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
      set({ isPlaying: false });
    } else {
      set({ isPlaying: false });
    }
  },
  resume: () => {
    const audio = get().audio;
    if (audio && audio.paused) {
      audio.play().catch(() => set({ error: '无法继续朗读。' }));
    } else if (get().fallbackMode === 'browser' && window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      set({ isPlaying: true });
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
    set((state) => ({ playbackId: state.playbackId + 1, isPlaying: false, isLoading: false, audio: null, abortController: null, fallbackMode: 'none' }));
  },
  replay: async () => {
    const text = get().currentText;
    if (text) await get().play(text);
  },
}));
