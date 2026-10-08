# Cloud scroll video

The accepted MotionSites footage is retained, served from `/cloud/` on the site itself.
Source: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4

The original is 1920×1080, 24 fps, 241 frames, 12,378,962 bytes, with keyframes
at 0 and 7 seconds. Seeking can require decoding almost seven seconds of video.
The former runtime WebCodecs → WebP frame bank also downloaded the video twice
and encoded every frame on the visitor's device before becoming available.

The replacements are H.264 all-intra (every frame is a keyframe), no audio,
24 fps, yuv420p, faststart. Desktop uses 1280×720 (3,139,295 bytes); mobile
uses 960×540 (1,688,415 bytes). This trades some fine detail for much faster
random access. A 43 KB poster appears while video data loads.

`useVideoScrub` normally coalesces scrolling into one native seek at a time. If
a seek waits on network data for over 150 ms, it retargets to the newest input.
It quantizes to actual frames, eases changes, and stops scheduling animation frames when settled
or hidden. No autoplay permission, WebCodecs support, extra fetch, or image bank
is needed. Reduced-motion skips easing. Error recovery retains the reload button.

Reproduce assets with ffmpeg installed:

```sh
node scripts/prepare-cloud-video.mjs /path/to/original.mp4
```

When changing media, update the version suffix in the script and page to avoid
stale browser caches. Keep the hook's FPS synchronized with the output frame rate.

Local Chromium comparison (80 forward/reverse seeks, fully downloaded video blobs,
same machine, no network latency):

| Media | Median seek | p95 seek |
| --- | ---: | ---: |
| Original 1080p | 240.5 ms | 1125.5 ms |
| All-intra 720p | 9.1 ms | 11.7 ms |
| All-intra 540p | 5.5 ms | 7.3 ms |

These are decoder seek timings, not end-to-end FPS guarantees. Cold network speed
and mobile hardware still affect the first load and presentation rate.
