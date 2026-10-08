import { useEffect, useRef, useState } from "react";

// The bundled footage is 24 fps, with every frame independently decodable.
const FPS = 24;
const EASING = 10;
const SNAP = 0.0005;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Scrub an all-intra video without a second download or a JS frame cache. */
export function useVideoScrub(videoSrc: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let raf = 0;
    let start = 0;
    let span = 1;
    let current = 0;
    let target = 0;
    let lastTime = 0;
    let lastPublishedAt = 0;
    let published = -1;
    let requestedFrame = -1;
    let lastSeekAt = -Infinity;

    const wake = () => {
      if (!disposed && !document.hidden && !raf) {
        raf = requestAnimationFrame(tick);
      }
    };
    const tick = (time: number) => {
      raf = 0;
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      current = preference.matches
        ? target
        : current + (target - current) * (1 - Math.exp(-dt * EASING));
      if (Math.abs(target - current) < SNAP) current = target;

      // Text needs at most 30 updates/sec; video seeks remain display-scheduled.
      if (published !== target && (time - lastPublishedAt >= 32 || current === target)) {
        published = target;
        lastPublishedAt = time;
        setProgress(target);
      }
      let waitingToRetarget = false;
      if (video.readyState >= 1 && Number.isFinite(video.duration)) {
        const lastFrame = Math.max(0, Math.round(video.duration * FPS) - 1);
        const frame = Math.round(current * lastFrame);
        if (frame !== requestedFrame) {
          // Normally wait for seeked; an unbuffered network seek must not block
          // newer input indefinitely. Retarget it at most once per 150 ms.
          if (!video.seeking || time - lastSeekAt >= 150) {
            requestedFrame = frame;
            const seconds = Math.min(frame / FPS, Math.max(0, video.duration - 0.001));
            if (Math.abs(video.currentTime - seconds) > 0.001) {
              lastSeekAt = time;
              video.currentTime = seconds;
            }
          } else waitingToRetarget = true;
        }
      }
      if (current !== target || waitingToRetarget) wake();
      else lastTime = 0;
      // seeked/loadeddata wake us if the final target was waiting on the decoder.
    };
    const onScroll = () => {
      target = clamp((window.scrollY - start) / span);
      wake();
    };
    const measure = () => {
      start = container.getBoundingClientRect().top + window.scrollY;
      span = Math.max(1, container.offsetHeight - window.innerHeight);
      onScroll();
    };
    const metadata = () => {
      requestedFrame = -1;
      setMediaError(false);
      wake();
    };
    const failed = () => setMediaError(true);
    const visibility = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastTime = 0;
      if (!document.hidden) onScroll();
    };

    measure();
    current = target;
    setMediaError(false);
    video.addEventListener("loadedmetadata", metadata);
    video.addEventListener("loadeddata", wake);
    video.addEventListener("seeked", wake);
    video.addEventListener("error", failed);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", wake);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("loadedmetadata", metadata);
      video.removeEventListener("loadeddata", wake);
      video.removeEventListener("seeked", wake);
      video.removeEventListener("error", failed);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      document.removeEventListener("visibilitychange", visibility);
      preference.removeEventListener("change", wake);
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
  return { containerRef, videoRef, progress, mediaError, scrollToProgress };
}
