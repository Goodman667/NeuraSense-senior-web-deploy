import { SeniorIcon } from './SeniorIcon';

export function SeniorCareOrb({ label = '今天只做一件事' }: { label?: string }) {
  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(34,211,238,0.55),rgba(8,145,178,0.26)_38%,rgba(236,253,245,0.15)_70%,transparent_72%)] blur-sm motion-safe:animate-pulse" />
      <div className="absolute inset-7 rounded-full border border-cyan-100 bg-white/72 shadow-[0_30px_90px_-50px_rgba(8,145,178,0.65)] backdrop-blur-xl" />
      <div className="absolute inset-12 rounded-full bg-[conic-gradient(from_180deg,#ecfeff,#dcfce7,#fff7ed,#ecfeff)] opacity-80" />
      <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full bg-cyan-900 text-white shadow-2xl shadow-cyan-900/20">
        <SeniorIcon name="heart" className="h-9 w-9" />
        <span className="mt-2 px-4 text-center text-base font-black leading-5">{label}</span>
      </div>
    </div>
  );
}
