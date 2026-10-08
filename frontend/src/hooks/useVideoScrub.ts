import { useEffect, useRef, useState } from "react";
import type { Sample, Track } from "mp4box";

const LERP_TAU = 8;
const SNAP = 0.002;
const LRU_MAX = 24;
const LEAD = 24;
const WATCHDOG = 60_000;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

type BankFrame = { ts: number; blob: Blob };
type ParsedVideo = {
  config: VideoDecoderConfig;
  samples: Sample[];
  duration: number;
};

async function parseVideo(buffer: ArrayBuffer): Promise<ParsedVideo> {
  const MP4Box = await import("mp4box");
  return new Promise((resolve, reject) => {
    const file = MP4Box.createFile();
    let track: Track;
    let config: VideoDecoderConfig;
    const samples: Sample[] = [];
    file.onError = (message) => reject(new Error(message));
    file.onReady = (info) => {
      try {
        track = info.videoTracks[0];
        if (!track) throw new Error("The source has no video track.");
        const entry = file.getTrackById(track.id).mdia.minf.stbl.stsd
          .entries[0];
        const box = entry.avcC ?? entry.hvcC ?? entry.vpcC ?? entry.av1C;
        let description: Uint8Array | undefined;
        if (box) {
          const stream = new MP4Box.DataStream(
            undefined,
            0,
            MP4Box.DataStream.BIG_ENDIAN,
          );
          box.write(stream);
          description = new Uint8Array(stream.buffer.slice(8));
        }
        config = {
          codec: track.codec,
          codedWidth: track.video.width,
          codedHeight: track.video.height,
          description,
        };
        file.setExtractionOptions(track.id, null, {
          nbSamples: track.nb_samples,
        });
        file.start();
      } catch (error) {
        reject(error);
      }
    };
    file.onSamples = (_id, _user, batch) => {
      samples.push(...batch);
      if (samples.length >= track.nb_samples) {
        file.stop();
        resolve({
          config,
          samples,
          duration: track.duration / track.timescale,
        });
      }
    };
    const input = buffer as ArrayBuffer & { fileStart: number };
    input.fileStart = 0;
    file.appendBuffer(input);
    file.flush();
  });
}

async function decodeBank(
  parsed: ParsedVideo,
  signal: AbortSignal,
): Promise<BankFrame[]> {
  // A hardware failure gets one software retry; the caller retains video seeking.
  for (const hardwareAcceleration of [
    "prefer-hardware",
    "prefer-software",
  ] as const) {
    signal.throwIfAborted();
    const config = { ...parsed.config, hardwareAcceleration };
    const support = await VideoDecoder.isConfigSupported(config);
    if (!support.supported) continue;
    const bank: BankFrame[] = [];
    const surface = document.createElement("canvas");
    surface.width = parsed.config.codedWidth ?? 1920;
    surface.height = parsed.config.codedHeight ?? 1080;
    const ctx = surface.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    const encodings: Promise<void>[] = [];
    let pending = 0;
    let decodeError: Error | null = null;
    const decoder = new VideoDecoder({
      error: (error) => {
        decodeError = error;
      },
      output: (frame) => {
        if (signal.aborted) {
          frame.close();
          return;
        }
        const ts = frame.timestamp;
        pending++;
        try {
          ctx.drawImage(frame, 0, 0);
          // toBlob snapshots this canvas before the next output frame is drawn.
          encodings.push(
            new Promise<void>((resolve) => {
              surface.toBlob(
                (blob) => {
                  if (blob && !signal.aborted) bank.push({ ts, blob });
                  else if (!signal.aborted)
                    decodeError = new Error("Frame encoding failed");
                  pending--;
                  resolve();
                },
                "image/webp",
                0.82,
              );
            }),
          );
        } catch (error) {
          pending--;
          decodeError =
            error instanceof Error ? error : new Error(String(error));
        } finally {
          frame.close();
        }
      },
    });
    const abort = () => {
      if (decoder.state !== "closed") decoder.close();
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      decoder.configure(config);
      for (const sample of parsed.samples) {
        signal.throwIfAborted();
        if (decodeError) throw decodeError;
        while (decoder.decodeQueueSize + pending >= LEAD) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          signal.throwIfAborted();
          if (decodeError) throw decodeError;
        }
        decoder.decode(
          new EncodedVideoChunk({
            type: sample.is_sync ? "key" : "delta",
            timestamp: Math.round((sample.cts / sample.timescale) * 1e6),
            duration: Math.round((sample.duration / sample.timescale) * 1e6),
            data: sample.data,
          }),
        );
      }
      await decoder.flush();
      await Promise.all(encodings);
      signal.throwIfAborted();
      if (decodeError || !bank.length)
        throw decodeError ?? new Error("No decoded frames");
      bank.sort((a, b) => a.ts - b.ts);
      const firstTimestamp = bank[0].ts;
      return bank.map(frame => ({ ...frame, ts: frame.ts - firstTimestamp }));
    } catch (error) {
      await Promise.all(encodings);
      if (signal.aborted || hardwareAcceleration === "prefer-software")
        throw error;
    } finally {
      signal.removeEventListener("abort", abort);
      if (decoder.state !== "closed") decoder.close();
      surface.width = surface.height = 0;
    }
  }
  throw new Error("VideoDecoder does not support this codec");
}

function nearestIndex(bank: BankFrame[], seconds: number) {
  const timestamp = seconds * 1e6;
  let low = 0;
  let high = bank.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (bank[mid].ts < timestamp) low = mid + 1;
    else high = mid;
  }
  return low > 0 && timestamp - bank[low - 1].ts < bank[low].ts - timestamp
    ? low - 1
    : low;
}

/** Scroll-driven video with a bounded decoded-frame cache and a seeking fallback. */
export function useVideoScrub(videoSrc: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [canvasLive, setCanvasLive] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const controller = new AbortController();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lru = new Map<number, ImageBitmap | null>();
    let bank: BankFrame[] = [];
    let disposed = false;
    let reverted = false;
    let building = false;
    let painted = false;
    let duration = 0;
    let current = 0;
    let published = -1;
    let lastDrawn = -1;
    let start = 0;
    let span = 1;
    let raf = 0;
    let lastTime = 0;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const measure = () => {
      start = container.getBoundingClientRect().top + window.scrollY;
      span = Math.max(1, container.offsetHeight - window.innerHeight);
    };
    const getProgress = () => clamp((window.scrollY - start) / span);
    const metadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      setMediaError(false);
    };
    const mediaFailed = () => setMediaError(true);
    const releaseCache = () => {
      lru.forEach((bitmap) => bitmap?.close());
      lru.clear();
    };
    const revert = () => {
      reverted = true;
      bank = [];
      releaseCache();
      painted = false;
      setCanvasLive(false);
      controller.abort();
    };
    const warm = (index: number) => {
      if (index < 0 || index >= bank.length || lru.has(index)) return;
      lru.set(index, null);
      void createImageBitmap(bank[index].blob)
        .then((bitmap) => {
          if (disposed || reverted || !lru.has(index)) {
            bitmap.close();
            return;
          }
        lru.get(index)?.close();
          lru.set(index, bitmap);
        })
        .catch(() => {
          if (!disposed && !reverted) revert();
        });
      while (lru.size > LRU_MAX) {
        const oldest = lru.keys().next().value;
        if (oldest === undefined) break;
        lru.get(oldest)?.close();
        lru.delete(oldest);
      }
    };
    const draw = (seconds: number) => {
      if (!ctx || !bank.length) return;
      const index = nearestIndex(bank, seconds);
      // Request the target first so a large scroll jump can paint promptly.
      warm(index);
      for (let i = index - 1; i <= index + 2; i++) warm(i);
      const bitmap = lru.get(index);
      if (!bitmap) return;
      lru.delete(index);
      lru.set(index, bitmap);
      if (lastDrawn !== index) {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        lastDrawn = index;
      }
      if (!painted) {
        painted = true;
        setCanvasLive(true);
      }
    };
    const tick = (time: number) => {
      if (disposed) return;
      const dt = Math.min(0.1, Math.max(0, (time - (lastTime || time)) / 1000));
      lastTime = time;
      const p = getProgress();
      if (
        Math.abs(p - published) > 0.0001 ||
        (p === 0 && published !== 0) ||
        (p === 1 && published !== 1)
      ) {
        published = p;
        setProgress(p);
      }
      if (duration > 0) {
        const target = p * Math.max(0, duration - 1 / 24);
        current = preference.matches
          ? target
          : current + (target - current) * (1 - Math.exp(-dt * LERP_TAU));
        if (Math.abs(target - current) < SNAP) current = target;
        if (bank.length && !reverted) draw(current);
        if (
          !painted &&
          video.readyState >= 1 &&
          !video.seeking &&
          Math.abs(video.currentTime - current) > 0.01
        ) {
          video.currentTime = current;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const build = async () => {
      if (
        building ||
        disposed ||
        preference.matches ||
        !("VideoDecoder" in window) ||
        !ctx
      )
        return;
      building = true;
      watchdog = setTimeout(() => {
        if (!disposed) {
          if (import.meta.env.DEV) console.debug('[video-scrub] Frame cache timed out; using video seeking.');
          revert();
        }
      }, WATCHDOG);
      try {
        const response = await fetch(videoSrc, { signal: controller.signal });
        if (!response.ok) throw new Error(`Video HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        if (import.meta.env.DEV) console.debug('[video-scrub] Download complete:', data.byteLength);
        const parsed = await parseVideo(data);
        if (import.meta.env.DEV) console.debug('[video-scrub] Decode starting:', parsed.samples.length);
        controller.signal.throwIfAborted();
        const decoded = await decodeBank(parsed, controller.signal);
        if (disposed || reverted) return;
        bank = decoded;
        duration = parsed.duration;
        if (import.meta.env.DEV) console.debug(`[video-scrub] Frame cache ready: ${bank.length} frames.`);
      } catch (error) {
        if (!disposed && !reverted) {
          if (import.meta.env.DEV) console.debug('[video-scrub] Using video seeking:', error);
          revert();
        }
      } finally {
        clearTimeout(watchdog);
      }
    };
    const preferenceChanged = () => {
      if (preference.matches && building) revert();
    };
    // Waiting for window load avoids competing with the first render and video metadata.
    const onLoad = () => {
      void build();
    };
    measure();
    metadata();
    setCanvasLive(false);
    video.addEventListener("loadedmetadata", metadata);
    video.addEventListener("error", mediaFailed);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    preference.addEventListener("change", preferenceChanged);
    if (document.readyState === "complete") void build();
    else window.addEventListener("load", onLoad, { once: true });
    raf = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(raf);
      clearTimeout(watchdog);
      bank = [];
      releaseCache();
      video.removeEventListener("loadedmetadata", metadata);
      video.removeEventListener("error", mediaFailed);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("load", onLoad);
      preference.removeEventListener("change", preferenceChanged);
    };
  }, [videoSrc]);

  const scrollToProgress = (next: number) => {
    const container = containerRef.current;
    if (!container) return;
    const top = container.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + clamp(next) * (container.offsetHeight - window.innerHeight),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return {
    containerRef,
    videoRef,
    canvasRef,
    progress,
    canvasLive,
    mediaError,
    scrollToProgress,
  };
}
