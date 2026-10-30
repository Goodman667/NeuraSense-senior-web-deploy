/**
 * Voice input with the browser's own speech recognition (no server).
 *
 * Why the second press used to fail on phones and iPads:
 *  - the button flipped back to "press to speak" as soon as the first words came in, while the
 *    browser was still finishing that round of recognition;
 *  - pressing again then started a second recognition on top of the unfinished one, which
 *    Safari and Chrome on mobile refuse (or silently ignore);
 *  - the chat page reused one recognition object, so start() on it while it was still stopping
 *    threw an error;
 *  - read-aloud audio was still holding the iPad's audio session.
 *
 * So: one recognition at a time, a fresh one for every press, the old one aborted first;
 * "listening" stays on until the browser really ends the round; read-aloud is stopped before
 * listening; 8 seconds without speech ends the round; recognised words are added after what was
 * already in the box instead of replacing it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { speechLang } from '../i18n/autoTranslate';

export type SpeechInputStatus = 'idle' | 'unsupported' | 'listening' | 'recognized' | 'no-speech' | 'error' | 'permission_denied';

const SILENCE_MS = 8000;

type Recognition = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: any) => void) | null;
    onerror: ((e: any) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
};

function getRecognitionClass(): (new () => Recognition) | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechInputSupported() {
    return !!getRecognitionClass();
}

export function isAppleTouchDevice() {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function joinText(base: string, said: string) {
    const b = base.trim();
    const s = said.trim();
    if (!b) return s;
    if (!s) return b;
    // Chinese needs no space between parts; Latin text does.
    const needsSpace = /[A-Za-z0-9.,!?]$/.test(b) && /^[A-Za-z0-9]/.test(s);
    return `${b}${needsSpace ? ' ' : ''}${s}`;
}

export interface SpeechInputOptions {
    /** called with the full text (what was there before + what has been said so far) */
    onText: (text: string) => void;
    /** stop any read-aloud before the microphone opens */
    onBeforeStart?: () => void;
}

export function useSpeechInput({ onText, onBeforeStart }: SpeechInputOptions) {
    const [status, setStatus] = useState<SpeechInputStatus>(() => (isSpeechInputSupported() ? 'idle' : 'unsupported'));
    const [failures, setFailures] = useState(0);
    const recRef = useRef<Recognition | null>(null);
    const sessionRef = useRef(0);
    const heardRef = useRef(false);
    const silenceRef = useRef<number | null>(null);
    const onTextRef = useRef(onText);
    const beforeRef = useRef(onBeforeStart);
    onTextRef.current = onText;
    beforeRef.current = onBeforeStart;

    const clearSilence = () => {
        if (silenceRef.current !== null) window.clearTimeout(silenceRef.current);
        silenceRef.current = null;
    };

    const detach = (rec: Recognition | null) => {
        if (!rec) return;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try { rec.abort(); } catch { /* already ended */ }
    };

    const stop = useCallback(() => {
        clearSilence();
        const rec = recRef.current;
        if (!rec) {
            setStatus((s) => (s === 'listening' ? 'idle' : s));
            return;
        }
        // stop() (not abort) lets the browser deliver the last words. The button flips back right
        // away, so pressing again at once starts a new round (start() drops this one first).
        try { rec.stop(); } catch { /* ignore */ }
        setStatus(heardRef.current ? 'recognized' : 'idle');
    }, []);

    const start = useCallback((base = '') => {
        const Rec = getRecognitionClass();
        if (!Rec) {
            setStatus('unsupported');
            return;
        }
        beforeRef.current?.();
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }

        // One recognition at a time: drop any unfinished one first.
        detach(recRef.current);
        recRef.current = null;
        clearSilence();

        const session = sessionRef.current + 1;
        sessionRef.current = session;
        heardRef.current = false;
        const rec = new Rec();
        rec.lang = speechLang();
        rec.continuous = false;
        rec.interimResults = true;

        const armSilence = () => {
            clearSilence();
            silenceRef.current = window.setTimeout(() => {
                if (sessionRef.current === session) {
                    try { rec.stop(); } catch { /* ignore */ }
                }
            }, SILENCE_MS);
        };

        rec.onresult = (event: any) => {
            if (sessionRef.current !== session) return;
            const said = Array.from(event.results as ArrayLike<any>).map((r: any) => r?.[0]?.transcript || '').join('');
            if (said.trim()) heardRef.current = true;
            onTextRef.current(joinText(base, said));
            armSilence();
        };
        rec.onerror = (event: any) => {
            if (sessionRef.current !== session) return;
            const code = event?.error;
            if (code === 'aborted') return;
            clearSilence();
            if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'permission-denied') setStatus('permission_denied');
            else if (code === 'no-speech') setStatus('no-speech');
            else setStatus('error');
            if (code !== 'no-speech') setFailures((n) => n + 1);
        };
        rec.onend = () => {
            if (sessionRef.current !== session) return;
            clearSilence();
            recRef.current = null;
            setStatus((s) => (s === 'listening' ? (heardRef.current ? 'recognized' : 'no-speech') : s));
            if (heardRef.current) setFailures(0);
        };

        recRef.current = rec;
        setStatus('listening');
        armSilence();
        try {
            rec.start();
        } catch {
            // The browser still thinks an older round is running: try once more a moment later.
            window.setTimeout(() => {
                if (sessionRef.current !== session) return;
                try {
                    rec.start();
                } catch {
                    recRef.current = null;
                    clearSilence();
                    setStatus('error');
                    setFailures((n) => n + 1);
                }
            }, 350);
        }
    }, []);

    // Close the microphone when the page goes away.
    useEffect(() => () => {
        sessionRef.current += 1;
        clearSilence();
        detach(recRef.current);
        recRef.current = null;
    }, []);

    return {
        status,
        isListening: status === 'listening',
        supported: status !== 'unsupported',
        /** two failed rounds in a row: suggest the keyboard's own dictation instead */
        suggestDictation: status === 'unsupported' || failures >= 2,
        start,
        stop,
    };
}
