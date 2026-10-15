export function SeniorPageHeader({ eyebrow, title, desc }: { eyebrow?: string; title: string; desc?: string }) {
  return (
    <header className="mb-6 max-w-4xl">
      {eyebrow ? <p className="sn-kicker">{eyebrow}</p> : null}
      <h1 className="sn-h1 mt-2">{title}</h1>
      {desc ? <p className="sn-lede mt-3 max-w-3xl">{desc}</p> : null}
    </header>
  );
}
