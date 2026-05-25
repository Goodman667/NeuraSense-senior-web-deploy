import { useCallback, useEffect, useState } from 'react';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorResultCard } from '../components/SeniorResultCard';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorLoadingCard } from '../components/SeniorLoadingCard';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { seniorApi } from '../services/seniorApi';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { useSeniorOnlineStatus } from '../hooks/useSeniorOnlineStatus';

export function SeniorDailySummary({ userId, latestSummary, onNavigate }: { userId: string; latestSummary: SeniorSummary | null; onNavigate: (page: SeniorPage) => void }) {
  const [summary, setSummary] = useState<SeniorSummary | null>(latestSummary);
  const [loading, setLoading] = useState(!latestSummary);
  const [error, setError] = useState('');
  const { speak } = useSeniorTTS();
  const isOnline = useSeniorOnlineStatus();

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await seniorApi.getDailySummary(userId);
      setSummary(res.summary);
    } catch {
      setSummary(null);
      setError('今天的建议暂时没有读取成功。您可以稍后重试，也可以重新完成一次问候。');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (latestSummary) {
      setSummary(latestSummary);
      setLoading(false);
      setError('');
      return;
    }
    loadSummary();
  }, [latestSummary, loadSummary]);

  useEffect(() => {
    if (summary) {
      markSeniorProgress(userId, 'summary');
      markSeniorProgress(userId, 'companion');
    }
  }, [summary, userId]);

  if (loading && !summary) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} />
        <SeniorLoadingCard title="正在读取今天的建议" lines={4} />
        <button onClick={() => onNavigate('home')} className="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-5 text-lg font-black text-slate-700">先回到今天</button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} />
        {!isOnline ? (
          <SeniorStatusNotice
            tone="warning"
            title="当前网络可能不稳定"
            desc="如果刚刚完成过问候，建议可能会晚一点显示。请先不要关闭页面。"
          />
        ) : null}
        {error ? (
          <SeniorStatusNotice
            tone="danger"
            title="建议暂时没有读出来"
            desc={error}
            actionLabel="再试一次"
            onAction={loadSummary}
          />
        ) : null}
        <div className="rounded-[2.4rem] border border-cyan-100 bg-white p-8 shadow-[0_28px_90px_-68px_rgba(15,23,42,0.42)]">
          <SeniorPageHeader eyebrow="今日状态" title="还没有今天的建议" desc="先完成一次简短问候，我会帮您整理今天适合做什么。" />
          <div className="rounded-[2rem] bg-cyan-50 p-6 text-cyan-950">
            <p className="flex items-center gap-2 text-xl font-black"><SeniorIcon name="chat" className="h-6 w-6" />您只需要回答几个简单问题</p>
            <p className="mt-2 text-xl leading-9">比如昨晚睡得怎么样、今天心情如何、有没有挂念的事。可以说话，也可以打字。</p>
          </div>
          <button onClick={() => onNavigate('companion')} className="mt-6 min-h-[72px] rounded-2xl bg-cyan-900 px-8 text-2xl font-black text-white">开始今天的问候</button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl">
      <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} />
      <div className="mb-4 space-y-3">
        {!isOnline ? (
          <SeniorStatusNotice
            tone="warning"
            title="当前网络可能不稳定"
            desc="这份已经读取到的建议可以继续查看。新的保存或朗读可能需要稍后再试。"
          />
        ) : null}
        {error ? (
          <SeniorStatusNotice tone="danger" title="刷新建议失败" desc={error} actionLabel="再试一次" onAction={loadSummary} />
        ) : null}
      </div>
      <div className="mb-5 flex flex-wrap justify-end gap-3">
        <button onClick={() => speak(summary.tts_text || summary.plain_summary)} className="min-h-[56px] rounded-2xl border border-cyan-200 bg-cyan-50 px-5 text-lg font-black text-cyan-900">
          <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-5 w-5" />朗读建议</span>
        </button>
        <button onClick={loadSummary} disabled={loading} className="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-5 text-lg font-black text-slate-700 disabled:opacity-60">
          {loading ? '正在刷新' : '刷新建议'}
        </button>
        <button onClick={() => onNavigate('companion')} className="min-h-[56px] rounded-2xl border border-cyan-200 bg-cyan-50 px-5 text-lg font-black text-cyan-900">重新问答</button>
        <button onClick={() => onNavigate('home')} className="min-h-[56px] rounded-2xl border border-slate-200 bg-white px-5 text-lg font-black text-slate-700">回到今天</button>
      </div>
      <SeniorResultCard summary={summary} onNext={() => onNavigate(resolveSummaryNextPage(summary))} onHelp={() => onNavigate('help')} />
    </div>
  );
}

function resolveSummaryNextPage(summary: SeniorSummary): SeniorPage {
  if (summary.risk_level === 'urgent' || summary.risk_level === 'medical_emergency' || summary.recommendation.type === 'help') return 'help';
  if (summary.recommendation.type === 'relax' || summary.recommendation.type === 'rest' || summary.recommended_exercise) return 'relax';
  const route = summary.next_action.route as SeniorPage;
  return route === 'home' || route === 'companion' || route === 'chat' || route === 'summary' || route === 'relax' || route === 'help' || route === 'settings'
    ? route
    : 'relax';
}
