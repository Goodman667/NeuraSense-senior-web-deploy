import { useEffect, useRef } from 'react';

// Soft palm-frond shadows drifting across a warm wall.
// Recreates the "Botanical Shadow About" backdrop procedurally (its hosted video is not publicly reachable).
type Frond = { x: number; y: number; angle: number; length: number; leaflets: number; phase: number; scale: number };

const FRONDS: Frond[] = [
  { x: -0.04, y: -0.1, angle: 0.62, length: 0.7, leaflets: 15, phase: 0, scale: 1 },
  { x: -0.02, y: 0.62, angle: -0.3, length: 0.55, leaflets: 13, phase: 1.7, scale: 0.8 },
  { x: 1.04, y: -0.08, angle: 2.45, length: 0.66, leaflets: 15, phase: 3.1, scale: 0.95 },
  { x: 1.03, y: 0.75, angle: 3.5, length: 0.45, leaflets: 12, phase: 4.4, scale: 0.7 },
];

function drawFrond(ctx: CanvasRenderingContext2D, w: number, h: number, f: Frond, t: number) {
  const size = Math.min(w, h) * 1.25;
  const sway = Math.sin(t * 0.55 + f.phase) * 0.06 + Math.sin(t * 0.23 + f.phase * 2) * 0.03;
  const base = f.angle + sway;
  const len = f.length * size * f.scale;
  ctx.save();
  ctx.translate(f.x * w, f.y * h);
  ctx.rotate(base);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.08, len, len * 0.22);
  ctx.lineWidth = Math.max(2, size * 0.006);
  ctx.stroke();
  for (let i = 1; i <= f.leaflets; i += 1) {
    const p = i / (f.leaflets + 1);
    const px = len * p;
    const py = len * 0.22 * p * p;
    const leafLen = size * 0.22 * Math.sin(Math.PI * Math.min(1, 0.15 + p * 0.95)) * f.scale;
    const flutter = Math.sin(t * 1.3 + i * 0.6 + f.phase) * 0.08;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(side * (1.15 - p * 0.45) + flutter);
      ctx.beginPath();
      ctx.ellipse(leafLen / 2, 0, leafLen / 2, Math.max(1.5, leafLen * 0.045), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

export function LeafShadow({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = 0;
    const start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };

    const render = (now: number) => {
      const t = (now - start) / 1000;
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(58, 48, 36, 0.27)';
      ctx.strokeStyle = 'rgba(58, 48, 36, 0.27)';
      ctx.filter = `blur(${Math.round(Math.min(w, h) * 0.008)}px)`;
      FRONDS.forEach(f => drawFrond(ctx, w, h, f, t));
      ctx.filter = 'none';
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 40) return;
      last = now;
      render(now);
    };

    resize();
    render(performance.now());
    if (!reduce) raf = requestAnimationFrame(loop);
    const observer = new ResizeObserver(() => { resize(); render(performance.now()); });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
