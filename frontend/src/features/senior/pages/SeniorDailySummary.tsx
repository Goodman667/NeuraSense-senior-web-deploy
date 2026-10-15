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
      <div className="mx-auto max-w-5xl space-y-4">
        <SeniorSafetyActions onNavigate={onNavigate} />
        <SeniorLoadingCard title="正在读取今天的建议" lines={4} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <SeniorSafetyActions onNavigate={onNavigate} />
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
        <section className="sn-sheet p-8">
          <SeniorPageHeader eyebrow="今天的建议" title="还没有今天的建议" desc="先完成一次简短的问候，我帮您整理今天适合做什么。" />
          <p className="sn-notice tone-info text-[1.15rem] leading-8">只要回答几个简单问题，比如昨晚睡得怎么样、今天心情如何、有没有挂念的事。说话打字都可以。</p>
          <button onClick={() => onNavigate('companion')} className="sn-btn sn-btn-primary sn-btn-lg mt-6">开始今天的问候<SeniorIcon name="arrow" /></button>
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl">
      <SeniorSafetyActions onNavigate={onNavigate} />
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
      <div className="mb-5 flex flex-wrap gap-3">
        <button onClick={() => speak(summary.tts_text || summary.plain_summary)} className="sn-btn sn-btn-outline"><SeniorIcon name="volume" />朗读建议</button>
        <button onClick={loadSummary} disabled={loading} className="sn-btn sn-btn-quiet"><SeniorIcon name="reset" />{loading ? '正在刷新' : '刷新'}</button>
        <button onClick={() => onNavigate('companion')} className="sn-btn sn-btn-quiet">重新问答</button>
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
