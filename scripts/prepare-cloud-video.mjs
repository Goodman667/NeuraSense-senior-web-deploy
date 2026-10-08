// Usage: node scripts/prepare-cloud-video.mjs /path/to/original.mp4
// Requires ffmpeg. Run only when replacing the source; no runtime transcoding.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = process.argv[2];
if (!source) throw new Error('Pass the original cloud video as the first argument.');
const output = fileURLToPath(new URL('../frontend/public/cloud/', import.meta.url));
mkdirSync(output, { recursive: true });
const run = (args) => {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', source, ...args], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error ?? new Error('ffmpeg failed');
};
for (const [height, width, quality] of [[720, 1280, 25], [540, 960, 26]]) {
  run(['-an', '-vf', `scale=${width}:${height}`, '-r', '24', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', String(quality), '-g', '1', '-bf', '0',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', `${output}/cloud-scrub-${height}-v1.mp4`]);
}
run(['-frames:v', '1', '-vf', 'scale=1280:720', '-quality', '85', '-y', `${output}/cloud-poster-v1.webp`]);
