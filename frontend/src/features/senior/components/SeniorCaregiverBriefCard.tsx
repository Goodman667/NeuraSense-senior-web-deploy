import { useMemo, useState } from 'react';
import type { SeniorSummary } from '../types/senior';
import { SeniorIcon } from './SeniorIcon';

function buildBrief(summary: SeniorSummary) {
  const next = summary.recommendation.title || summary.next_action.label;
  const reason = Object.values(summary.dimensions || {})
    .filter(item => /关注|陪伴|较高|中等|需要|偏高|一般/.test(`${item.status}${item.text}`))
    .slice(0, 2)
    .map(item => `${item.label}${item.status}`)
    .join('，') || summary.recommendation.reason;
  const helpText = summary.risk_level === 'urgent' || summary.risk_level === 'elevated'
    ? '请今天多陪我一会儿，必要时帮我联系医生或当地急救。'
    : `请先陪我把这一步做完：${next}。`;
  return `我今天有点不舒服，主要是${reason}。接下来想先${next}。${helpText}`;
}

export function SeniorCaregiverBriefCard({ summary }: { summary: SeniorSummary }) {
  const [copied, setCopied] = useState(false);
  const brief = useMemo(() => buildBrief(summary), [summary]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-lg font-black text-slate-700">
            <SeniorIcon name="user" className="h-5 w-5" />
            想告诉家人的话
          </p>
          <h3 className="mt-4 text-3xl font-black text-slate-950">不用解释很多，复制这一段就够</h3>
          <p className="mt-3 text-xl leading-9 text-slate-600">只说今天哪里不舒服、希望家人怎么陪。</p>
        </div>
        <button onClick={copy} className="min-h-[60px] rounded-2xl bg-slate-950 px-6 text-xl font-black text-white transition hover:bg-slate-800">
          {copied ? '已复制' : '复制给家人'}
        </button>
      </div>
      <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-xl leading-9 text-slate-800">
        {brief}
      </div>
    </section>
  );
}
