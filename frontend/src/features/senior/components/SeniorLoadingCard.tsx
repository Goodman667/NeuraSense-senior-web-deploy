export function SeniorLoadingCard({ title = '正在读取内容', lines = 3 }: { title?: string; lines?: number }) {
  return (
    <section className="sn-sheet p-6" aria-live="polite">
      <p className="sn-h3 text-[var(--sn-ink-2)]">{title}</p>
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-4 overflow-hidden rounded-full bg-[var(--sn-sheet-2)]" style={{ width: `${88 - index * 14}%` }}>
            <div className="h-full w-1/2 rounded-full bg-[var(--sn-line)] motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
