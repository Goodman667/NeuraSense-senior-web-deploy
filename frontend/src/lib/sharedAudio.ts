/**
 * One audio context for the whole page on iPad/iPhone.
 *
 * iOS ties microphone capture and playback to one hardware audio session. Creating and closing a
 * new AudioContext for every recording, and playing read-aloud through separate <audio> elements
 * in between, left later recordings silent: only the first one worked. Voice apps that work on
 * iPad keep one AudioContext, wake it inside every tap (it can drop to "suspended" or the
 * WebKit-only "interrupted" state), open the microphone only while listening, and play speech
 * through that same context. This module provides that context, a small player for decoded audio,
 * and an optional on-screen log (?voice-debug=1) for testing on a real device.
 */

type ACClass = typeof AudioContext;

let shared: AudioContext | null = null;

function audioContextClass(): ACClass | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { AudioContext?: ACClass; webkitAudioContext?: ACClass };
    return w.AudioContext || w.webkitAudioContext || null;
}

/** The page's audio context; created on first use (call it inside a tap the first time). */
export function getSharedAudioContext(create = true): AudioContext | null {
    if (shared && shared.state !== 'closed') return shared;
    if (!create) return null;
    const AC = audioContextClass();
    if (!AC) return null;
    shared = new AC();
    voiceDebug({ ctxCreated: new Date().toLocaleTimeString() });
    return shared;
}

/** Create/resume the context. Call synchronously inside a tap handler. */
export function wakeSharedAudio(): AudioContext | null {
    const ctx = getSharedAudioContext(true);
    if (ctx && ctx.state !== 'running') {
        try { void ctx.resume(); } catch { /* ignore */ }
    }
    return ctx;
}

/** Wait briefly for the context to run; false if it stays suspended (no tap yet). */
export async function ensureRunning(ctx: AudioContext, ms = 400): Promise<boolean> {
    if (ctx.state === 'running') return true;
    try {
        await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, ms))]);
    } catch { /* ignore */ }
    return (ctx.state as string) === 'running'; // re-read: resume() may have changed it
}

let unlockInstalled = false;
/** Keep the context awake: every tap resumes it if iOS suspended or interrupted it. */
export function installAudioUnlock() {
    if (unlockInstalled || typeof document === 'undefined') return;
    unlockInstalled = true;
    const wake = () => { wakeSharedAudio(); };
    document.addEventListener('touchend', wake, { capture: true, passive: true });
    document.addEventListener('click', wake, { capture: true, passive: true });
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

export function decodeAudio(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
    // Older Safari only has the callback form.
    return new Promise((resolve, reject) => {
        const p = ctx.decodeAudioData(data, resolve, reject);
        if (p && typeof (p as Promise<AudioBuffer>).then === 'function') (p as Promise<AudioBuffer>).then(resolve, reject);
    });
}

/** The part of HTMLAudioElement the read-aloud store uses. */
export interface PlayableAudio {
    paused: boolean;
    currentTime: number;
    play(): Promise<void>;
    pause(): void;
}

/** Plays a decoded buffer through the shared context, with pause/resume like an <audio> element. */
export class BufferPlayer implements PlayableAudio {
    paused = true;
    onplay: (() => void) | null = null;
    onended: (() => void) | null = null;
    private source: AudioBufferSourceNode | null = null;
    private startedAt = 0;
    private offset = 0;

    constructor(private ctx: AudioContext, private buffer: AudioBuffer) {}

    get currentTime() {
        return this.paused ? this.offset : this.offset + (this.ctx.currentTime - this.startedAt);
    }

    set currentTime(value: number) {
        const wasPlaying = !this.paused;
        this.halt();
        this.offset = Math.max(0, value);
        if (wasPlaying) void this.play();
    }

    async play() {
        if (!this.paused) return;
        await ensureRunning(this.ctx);
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffer;
        source.connect(this.ctx.destination);
        source.onended = () => {
            if (this.source !== source) return;
            this.source = null;
            this.paused = true;
            this.offset = 0;
            this.onended?.();
        };
        this.source = source;
        this.startedAt = this.ctx.currentTime;
        source.start(0, Math.min(this.offset, Math.max(0, this.buffer.duration - 0.01)));
        this.paused = false;
        this.onplay?.();
    }

    pause() {
        if (this.paused) return;
        this.offset = this.currentTime;
        this.halt();
    }

    private halt() {
        const source = this.source;
        this.source = null;
        this.paused = true;
        if (source) {
            source.onended = null;
            try { source.stop(); } catch { /* already stopped */ }
            try { source.disconnect(); } catch { /* ignore */ }
        }
    }
}

// ---------- optional on-screen log for testing on a real iPad: add ?voice-debug=1 ----------
let debugOn: boolean | null = null;
const debugState: Record<string, unknown> = {};
function isDebug() {
    if (debugOn !== null) return debugOn;
    try {
        const q = new URLSearchParams(window.location.search).get('voice-debug');
        if (q === '1') localStorage.setItem('ns-voice-debug', '1');
        if (q === '0') localStorage.removeItem('ns-voice-debug');
        debugOn = localStorage.getItem('ns-voice-debug') === '1';
    } catch {
        debugOn = false;
    }
    return debugOn;
}

export function voiceDebug(patch: Record<string, unknown>) {
    if (typeof window === 'undefined' || !isDebug()) return;
    Object.assign(debugState, patch);
    let box = document.getElementById('ns-voice-debug');
    if (!box) {
        box = document.createElement('pre');
        box.id = 'ns-voice-debug';
        box.setAttribute('data-no-translate', '');
        box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:92vw;max-height:40vh;overflow:auto;margin:0;padding:8px 10px;background:rgba(15,23,42,.88);color:#e2e8f0;font:12px/1.4 ui-monospace,Menlo,monospace;border-radius:8px;white-space:pre-wrap;pointer-events:none';
        document.body.appendChild(box);
    }
    if (shared) debugState.ctxState = shared.state;
    box.textContent = Object.entries(debugState).map(([k, v]) => `${k}: ${typeof v === 'number' ? Math.round(v * 10000) / 10000 : String(v)}`).join('\n');
}
