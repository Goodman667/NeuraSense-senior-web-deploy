// Visual assets for the standard mode.
// Sources (ts.leess.fun prompt library): Nexar Hero, FlowMate Carousel, Veloce Cards.
const CF = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P';
const higgs = (file: string, width = 1280) =>
  `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(`${CF}/${file}`)}&w=${width}&q=85`;

export const standardAssets = {
  // Nexar: fullscreen sky loop behind the dashboard
  skyVideo: `${CF}/hf_20260403_054410_6b17f7f9-d11e-44f1-90b0-75ee563d1971.mp4`,
  skyPoster: higgs('hf_20260403_055416_630ff6c1-4b72-4cb6-a563-0c7e41124fe1.png', 1600),
  metricsCard: higgs('hf_20260403_055416_630ff6c1-4b72-4cb6-a563-0c7e41124fe1.png', 1280),
  avatars: [
    higgs('hf_20260403_075317_744395c6-7168-48c6-a1f6-5b9b7bd58f87.png', 160),
    higgs('hf_20260403_075333_2caea84e-742e-4846-9284-ed8532c44c99.png', 160),
    higgs('hf_20260403_075354_70a33cfd-3c9c-45ef-a7bb-d371cb8aa0af.png', 160),
  ],
  // FlowMate: painterly cards
  paintings: [
    higgs('hf_20260405_081328_19f48c5b-ea4d-4f23-8f80-7374f31015d4.png'),
    higgs('hf_20260405_081342_ad378347-1ebd-4b17-a716-ee895bf739c0.png'),
    higgs('hf_20260405_081415_a6e8a76c-224e-417b-bf99-6b86d6494644.png'),
    higgs('hf_20260405_081513_cf1cd2c1-2122-4de6-90ed-acae8bfbdb00.png'),
    higgs('hf_20260405_081541_9d2d28bf-d6a3-4b31-b0bb-cfc5202d4fcd.png'),
  ],
  // Veloce: soft looping video tiles for stats
  softVideos: [
    { src: `${CF}/hf_20260405_143605_bc7bd6c0-9c68-49ff-a9d3-073a10759fa4.mp4`, overlay: 'rgba(206,223,235,0.25)' },
    { src: `${CF}/hf_20260405_145119_f4ec4d9f-3ecd-4116-baa3-26e8cf2df976.mp4`, overlay: 'rgba(247,236,233,0.6)' },
    { src: `${CF}/hf_20260405_140728_ae719193-f10b-4105-82fc-c989610b3aa6.mp4`, overlay: 'rgba(218,218,218,0.2)' },
  ],
};
