export function SeniorPageHeader({ eyebrow, title, desc }: { eyebrow?: string; title: string; desc?: string }) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="text-lg font-bold text-cyan-800">{eyebrow}</p> : null}
      <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">{title}</h1>
      {desc ? <p className="mt-4 max-w-3xl text-xl leading-9 text-slate-600">{desc}</p> : null}
    </header>
  );
}
