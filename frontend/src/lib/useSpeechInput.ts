/**
 * Voice input.
 *
 * Two ways to turn speech into text:
 *  - "browser": the browser's own speech recognition. Used on computers and Android, where it is
 *    fast and reliable.
 *  - "recorder": the page records the microphone itself (getUserMedia + Web Audio), encodes a short
 *    16 kHz WAV and the server transcribes it (POST /speech/transcribe). Used on iPad and iPhone in
 *    every browser, because there the built-in recognition is not dependable:
 *      · Safari: after the first use, or after the page has played audio (read-aloud), recognition
 *        stays "deaf" - it starts but never hears anything and never ends (WebKit bug 321436).
 *      · Chrome / Edge / other iPad browsers: recognition is exposed but refuses to run
 *        ("service-not-allowed", the host app lacks the speech permission; WebKit bug 239816),
 *        so it ended the moment the button was pressed.
 *    Recording with getUserMedia works the same in all of them.
 *
 * If the server cannot transcribe, iPad/iPhone fall back to the built-in recognition and the hint
 * points to the keyboard's own dictation key, which always works.
 *
 * Both ways: what is said is added after what is already in the box; read-aloud is stopped first;
 * the round ends by itself after a pause, or when the button is pressed again.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config/api';
import { speechLang } from '../i18n/autoTranslate';
import { installAudioUnlock, voiceDebug, wakeSharedAudio } from './sharedAudio';

export type SpeechInputStatus =
    | 'idle'
    | 'unsupported'
    | 'listening'
    | 'transcribing'
    | 'recognized'
    | 'no-speech'
    | 'error'
    | 'permission_denied';

const SILENCE_MS = 8000; // browser engine: no words for this long ends the round
const PAUSE_END_MS = 1800; // recorder: a pause this long after speaking ends the round
const NO_SPEECH_MS = 9000; // recorder: nothing said at all
const MAX_RECORD_MS = 60000;
const TARGET_RATE = 16000;

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

function getAudioContextClass(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    return w.AudioContext || w.webkitAudioContext || null;
}

export function isAppleTouchDevice() {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isRecordingSupported() {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!getAudioContextClass();
}

/** ?voice=recorder|browser (remembered) lets testers force one way. */
function forcedEngine(): 'recorder' | 'browser' | null {
    try {
        const fromUrl = new URLSearchParams(window.location.search).get('voice');
        if (fromUrl === 'recorder' || fromUrl === 'browser') {
            localStorage.setItem('ns-voice-engine', fromUrl);
            return fromUrl;
        }
        const saved = localStorage.getItem('ns-voice-engine');
        return saved === 'recorder' || saved === 'browser' ? saved : null;
    } catch {
        return null;
    }
}

function wantsRecorder() {
    const forced = forcedEngine();
    if (forced) return forced === 'recorder' && isRecordingSupported();
    return isRecordingSupported() && (isAppleTouchDevice() || !getRecognitionClass());
}

export function isSpeechInputSupported() {
    return !!getRecognitionClass() || isRecordingSupported();
}

// Whether the server can transcribe. Only a definite answer is remembered.
let serverState: boolean | null = null;
let serverCheck: Promise<boolean> | null = null;
function checkServerSpeech(): Promise<boolean> {
    if (serverState !== null) return Promise.resolve(serverState);
    if (!serverCheck) {
        serverCheck = fetch(`${API_BASE}/speech/status`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j) => {
                serverState = !!j.available;
                return serverState;
            })
            .catch(() => false)
            .finally(() => {
                serverCheck = null;
            });
    }
    return serverCheck;
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

function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const ratio = inputRate / TARGET_RATE;
    const outLength = Math.max(1, Math.floor(total / ratio));
    const pcm = new Int16Array(outLength);
    // Average each block of input samples into one output sample (simple low-pass + decimation).
    let chunkIndex = 0;
    let offset = 0;
    let consumed = 0;
    for (let i = 0; i < outLength; i++) {
        const end = Math.min(total, Math.round((i + 1) * ratio));
        let sum = 0;
        let count = 0;
        while (consumed < end && chunkIndex < chunks.length) {
            sum += chunks[chunkIndex][offset];
            count++;
            consumed++;
            offset++;
            if (offset >= chunks[chunkIndex].length) {
                chunkIndex++;
                offset = 0;
            }
        }
        const v = count ? sum / count : 0;
        pcm[i] = Math.max(-1, Math.min(1, v)) * 0x7fff;
    }
    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    const writeStr = (pos: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, TARGET_RATE, true);
    view.setUint32(28, TARGET_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, pcm.length * 2, true);
    new Int16Array(buffer, 44).set(pcm);
    return new Blob([buffer], { type: 'audio/wav' });
}

type Recording = {
    base: string;
    ctx: AudioContext;
    stream: MediaStream | null;
    source: MediaStreamAudioSourceNode | null;
    processor: ScriptProcessorNode | null;
    chunks: Float32Array[];
    heard: boolean;
    finishing: boolean;
    maxRms: number;
    dead: boolean;
};

export interface SpeechInputOptions {
    /** called with the full text (what was there before + what has been said so far) */
    onText: (text: string) => void;
    /** stop any read-aloud before the microphone opens */
    onBeforeStart?: () => void;
}

export function useSpeechInput({ onText, onBeforeStart }: SpeechInputOptions) {
    const [status, setStatus] = useState<SpeechInputStatus>(() => (isSpeechInputSupported() ? 'idle' : 'unsupported'));
    const [failures, setFailures] = useState(0);
    const [serverDown, setServerDown] = useState(false);
    const [micSilent, setMicSilent] = useState(false);
    const roundRef = useRef(0);
    const recRef = useRef<Recognition | null>(null);
    const recordingRef = useRef<Recording | null>(null);
    const sessionRef = useRef(0);
    const heardRef = useRef(false);
    const timersRef = useRef<number[]>([]);
    const onTextRef = useRef(onText);
    const beforeRef = useRef(onBeforeStart);
    onTextRef.current = onText;
    beforeRef.current = onBeforeStart;

    const clearTimers = () => {
        timersRef.current.forEach((t) => window.clearTimeout(t));
        timersRef.current = [];
    };
    const later = (fn: () => void, ms: number) => {
        timersRef.current.push(window.setTimeout(fn, ms));
    };

    // Ask the server early on iPad/iPhone so the first press already knows which way to go,
    // and keep the shared audio context awake on every tap.
    useEffect(() => {
        if (wantsRecorder()) void checkServerSpeech();
        if (isAppleTouchDevice()) installAudioUnlock();
    }, []);

    const detachRecognition = (rec: Recognition | null) => {
        if (!rec) return;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try { rec.abort(); } catch { /* already ended */ }
    };

    const releaseRecording = (r: Recording | null) => {
        if (!r) return;
        if (r.processor) r.processor.onaudioprocess = null;
        try { r.processor?.disconnect(); } catch { /* ignore */ }
        try { r.source?.disconnect(); } catch { /* ignore */ }
        r.stream?.getTracks().forEach((t) => t.stop());
        r.processor = null;
        r.source = null;
        r.stream = null;
        // The audio context is shared and stays open (see lib/sharedAudio.ts).
    };

    // ---------- recorder engine ----------
    const finishRecording = useCallback(async (session: number, base: string, manual: boolean) => {
        const r = recordingRef.current;
        if (!r || r.finishing || sessionRef.current !== session) return;
        r.finishing = true;
        clearTimers();
        releaseRecording(r);
        recordingRef.current = null;
        const seconds = r.chunks.reduce((n, c) => n + c.length, 0) / r.ctx.sampleRate;
        voiceDebug({ phase: manual ? 'stopped by tap' : 'stopped by itself', seconds, heard: r.heard, maxRms: r.maxRms, micSilent: r.dead });
        if (r.dead) {
            setMicSilent(true);
            setStatus('error');
            setFailures((n) => n + 1);
            return;
        }
        // Upload unless the recording is clearly empty; the server decides what was said.
        if (!r.heard && r.maxRms < 0.02 && !(manual && seconds >= 0.6)) {
            setStatus('no-speech');
            if (isAppleTouchDevice()) setFailures((n) => n + 1);
            return;
        }
        setStatus('transcribing');
        try {
            const wav = encodeWav(r.chunks, r.ctx.sampleRate);
            const res = await fetch(`${API_BASE}/speech/transcribe?lang=${encodeURIComponent(speechLang())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'audio/wav' },
                body: wav,
            });
            voiceDebug({ upload: `HTTP ${res.status}, ${Math.round(wav.size / 1024)} KB` });
            if (sessionRef.current !== session) return;
            if (res.status === 503) {
                serverState = false;
                setServerDown(true);
                setStatus('error');
                setFailures((n) => n + 1);
                return;
            }
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            const said = String(data.text || '').trim();
            voiceDebug({ textLength: said.length });
            if (!said) {
                setStatus('no-speech');
                return;
            }
            onTextRef.current(joinText(base, said));
            setStatus('recognized');
            setFailures(0);
            setMicSilent(false);
        } catch (err) {
            voiceDebug({ uploadError: String(err) });
            if (sessionRef.current !== session) return;
            setStatus('error');
            setFailures((n) => n + 1);
        }
    }, []);

    const startRecording = useCallback((base: string, session: number, ctx: AudioContext) => {
        const r: Recording = { base, ctx, stream: null, source: null, processor: null, chunks: [], heard: false, finishing: false, maxRms: 0, dead: false };
        recordingRef.current = r;
        roundRef.current += 1;
        setStatus('listening');
        voiceDebug({ engine: 'recorder', round: roundRef.current, phase: 'opening mic', ctxRate: ctx.sampleRate, heard: false, maxRms: 0, upload: '-', textLength: '-', uploadError: '-' });
        later(() => void finishRecording(session, base, false), MAX_RECORD_MS);

        const fail = (err: unknown) => {
            if (sessionRef.current !== session) return;
            clearTimers();
            releaseRecording(r);
            recordingRef.current = null;
            const name = (err as { name?: string })?.name;
            voiceDebug({ phase: `mic error ${name || err}` });
            setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission_denied' : 'error');
            setFailures((n) => n + 1);
        };

        let reopened = false;
        const openMic = () => navigator.mediaDevices
            .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
            .then((stream) => {
                if (sessionRef.current !== session || r.finishing) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                r.stream = stream;
                const track = stream.getAudioTracks()[0];
                voiceDebug({ phase: 'recording', track: track ? `${track.readyState}, muted=${track.muted}, enabled=${track.enabled}` : 'none' });
                if (ctx.state !== 'running') {
                    try { void ctx.resume(); } catch { /* ignore */ }
                }
                const source = ctx.createMediaStreamSource(stream);
                const processor = ctx.createScriptProcessor(4096, 1, 1);
                r.source = source;
                r.processor = processor;
                let elapsed = 0;
                let quietFor = 0;
                let loudFor = 0;
                let noiseMin = Infinity;
                let peak = 0;
                let blocks = 0;
                processor.onaudioprocess = (event) => {
                    if (r.finishing || r.processor !== processor) return;
                    const data = event.inputBuffer.getChannelData(0);
                    r.chunks.push(new Float32Array(data));
                    let sum = 0;
                    for (let i = 0; i < data.length; i++) {
                        const v = data[i];
                        sum += v * v;
                        const a = v < 0 ? -v : v;
                        if (a > peak) peak = a;
                    }
                    const rms = Math.sqrt(sum / data.length);
                    const ms = (data.length / ctx.sampleRate) * 1000;
                    elapsed += ms;
                    blocks += 1;
                    if (rms > r.maxRms) r.maxRms = rms;
                    // Nothing but digital silence: the microphone is not delivering sound. Reopen it once.
                    if (elapsed >= 1500 && peak < 1e-6) {
                        if (!reopened) {
                            reopened = true;
                            voiceDebug({ phase: 'mic gave only silence, reopening' });
                            releaseRecording(r);
                            r.chunks = [];
                            openMic().catch(fail);
                        } else {
                            r.dead = true;
                            void finishRecording(session, base, false);
                        }
                        return;
                    }
                    // Speech detection against the quietest moment heard so far.
                    if (elapsed > 300 && rms > 0) noiseMin = Math.min(noiseMin, rms);
                    const threshold = Math.max(0.006, (noiseMin === Infinity ? 0.004 : noiseMin) * 3);
                    if (rms > threshold) {
                        loudFor += ms;
                        quietFor = 0;
                        if (loudFor >= 200) r.heard = true;
                    } else {
                        quietFor += ms;
                    }
                    if (blocks % 6 === 0) voiceDebug({ seconds: elapsed / 1000, rms, maxRms: r.maxRms, threshold, heard: r.heard });
                    if (r.heard && quietFor >= PAUSE_END_MS) void finishRecording(session, base, false);
                    else if (!r.heard && elapsed >= NO_SPEECH_MS) void finishRecording(session, base, false);
                };
                source.connect(processor);
                processor.connect(ctx.destination); // the processor only runs when connected; it outputs silence
            });
        openMic().catch(fail);
    }, [finishRecording]);

    // ---------- browser engine ----------
    const startRecognition = useCallback((base: string, session: number) => {
        const Rec = getRecognitionClass();
        if (!Rec) {
            setStatus('unsupported');
            return;
        }
        heardRef.current = false;
        const rec = new Rec();
        rec.lang = speechLang();
        rec.continuous = false;
        rec.interimResults = true;

        // If the round never reports back (a known iPad Safari failure), close it ourselves.
        const giveUp = () => {
            if (sessionRef.current !== session || recRef.current !== rec) return;
            detachRecognition(rec);
            recRef.current = null;
            clearTimers();
            setStatus(heardRef.current ? 'recognized' : 'no-speech');
            if (!heardRef.current) setFailures((n) => n + 1);
        };
        const armSilence = () => {
            clearTimers();
            later(() => {
                if (sessionRef.current !== session) return;
                try { rec.stop(); } catch { /* ignore */ }
                later(giveUp, 2000);
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
            voiceDebug({ phase: `browser error ${code}` });
            if (code === 'aborted') return;
            clearTimers();
            if (code === 'service-not-allowed' && isAppleTouchDevice()) setStatus('unsupported');
            else if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'permission-denied') setStatus('permission_denied');
            else if (code === 'no-speech') setStatus('no-speech');
            else setStatus('error');
            if (code !== 'no-speech') setFailures((n) => n + 1);
        };
        rec.onend = () => {
            if (sessionRef.current !== session) return;
            clearTimers();
            recRef.current = null;
            setStatus((s) => (s === 'listening' ? (heardRef.current ? 'recognized' : 'no-speech') : s));
            if (heardRef.current) setFailures(0);
            // On iPad/iPhone "heard nothing" is how the built-in recognition fails, so count it.
            else if (isAppleTouchDevice()) setFailures((n) => n + 1);
        };

        recRef.current = rec;
        setStatus('listening');
        voiceDebug({ engine: 'browser', phase: 'listening' });
        armSilence();
        try {
            rec.start();
        } catch {
            // The browser still thinks an older round is running: try once more a moment later.
            later(() => {
                if (sessionRef.current !== session) return;
                try {
                    rec.start();
                } catch {
                    recRef.current = null;
                    clearTimers();
                    setStatus('error');
                    setFailures((n) => n + 1);
                }
            }, 350);
        }
    }, []);

    // After a manual stop, let the browser deliver the last words, then drop the round.
    const detachLater = (rec: Recognition, session: number) => {
        window.setTimeout(() => {
            if (recRef.current === rec && sessionRef.current === session) {
                detachRecognition(rec);
                recRef.current = null;
            }
        }, 1500);
    };

    const stop = useCallback(() => {
        const session = sessionRef.current;
        if (recordingRef.current) {
            void finishRecording(session, recordingRef.current.base, true);
            return;
        }
        const rec = recRef.current;
        if (!rec) {
            // Nothing running yet (e.g. still asking the server): cancel the pending start.
            sessionRef.current += 1;
            clearTimers();
            setStatus((s) => (s === 'listening' ? 'idle' : s));
            return;
        }
        clearTimers();
        // stop() (not abort) lets the browser deliver the last words. The button flips back right
        // away, so pressing again at once starts a new round (start() drops this one first).
        try { rec.stop(); } catch { /* ignore */ }
        detachLater(rec, session);
        setStatus(heardRef.current ? 'recognized' : 'idle');
    }, [finishRecording]);

    const start = useCallback((base = '') => {
        beforeRef.current?.();
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }

        // One round at a time: drop any unfinished one first.
        sessionRef.current += 1;
        const session = sessionRef.current;
        clearTimers();
        detachRecognition(recRef.current);
        recRef.current = null;
        releaseRecording(recordingRef.current);
        recordingRef.current = null;

        if (!wantsRecorder() || serverState === false) {
            startRecognition(base, session);
            return;
        }
        // One audio context for the page, woken inside the tap (iPad keeps it suspended otherwise).
        const ctx = wakeSharedAudio();
        if (!ctx) {
            startRecognition(base, session);
            return;
        }
        const begin = () => startRecording(base, session, ctx);
        if (serverState === true) {
            begin();
            return;
        }
        setStatus('listening');
        void checkServerSpeech().then((ok) => {
            if (sessionRef.current !== session) return;
            if (ok) begin();
            else {
                setServerDown(true);
                startRecognition(base, session);
            }
        });
    }, [startRecognition, startRecording]);

    // Close the microphone when the page goes away.
    useEffect(() => () => {
        sessionRef.current += 1;
        clearTimers();
        detachRecognition(recRef.current);
        recRef.current = null;
        releaseRecording(recordingRef.current);
        recordingRef.current = null;
    }, []);

    return {
        status,
        isListening: status === 'listening',
        /** the recording is being turned into text */
        isBusy: status === 'transcribing',
        supported: status !== 'unsupported',
        /** suggest the keyboard's own dictation instead */
        suggestDictation: status === 'unsupported' || failures >= 2 || micSilent || (serverDown && isAppleTouchDevice() && failures >= 1),
        start,
        stop,
    };
}
