export function SeniorLoadingCard({ title = '正在读取内容', lines = 3 }: { title?: string; lines?: number }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-62px_rgba(15,23,42,0.32)]" aria-live="polite">
      <p className="text-xl font-black text-slate-700">{title}</p>
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-100 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
