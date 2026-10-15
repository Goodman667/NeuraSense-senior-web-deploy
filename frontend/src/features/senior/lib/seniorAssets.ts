// Visual assets for the senior companion mode.
// Sources (ts.leess.fun prompt library): Heritage Grove, Breathstone, Botanical Shadow About, Kova Features.
const CF = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P';
const higgs = (file: string, width = 1280) =>
  `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(`${CF}/${file}`)}&w=${width}&q=85`;

export const seniorAssets = {
  // Heritage Grove: hand-drawn teal ink landscape with cranes (10s loop, 16:9)
  inkLandscapeVideo: `${CF}/hf_20260901_122529_931c22c8-8d2d-47c0-ad51-b97f56a91e42.mp4`,
  inkLandscapePoster: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4f690bd1-881a-4192-82f2-d714d34c8fb9.png',
  // Breathstone: misty valley with mossy standing stones
  stoneValley: higgs('hf_20260803_132000_94a85ef5-2f7d-416c-bb6e-694b71474711.png', 1600),
  stoneValleyBloom: higgs('hf_20260803_200722_d93e38f8-cdc7-44ed-a1db-810e268cfedc.png', 1600),
  stoneCutout: higgs('hf_20260803_140923_39a44bbe-5cc4-4c25-8692-a3be30d15453.png', 1600),
  // Kova Features: quiet nature cards
  cardSilhouette: higgs('hf_20260517_061249_f20dfeda-1033-45ce-a3ee-070965599cbf.png', 900),
  cardMossStone: higgs('hf_20260517_061305_db631f5f-185f-4fda-a7a8-1dd7359ef2ea.png', 900),
  cardLoneTree: higgs('hf_20260517_061316_50e651f8-02d0-4add-9ddb-7d81d15ac02e.png', 900),
};
