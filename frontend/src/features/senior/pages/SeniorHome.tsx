import { useCallback, useEffect, useState } from 'react';
import { SeniorCareOrb } from '../components/SeniorCareOrb';
import { SeniorCarePath } from '../components/SeniorCarePath';
import { SeniorDailyLoopCard } from '../components/SeniorDailyLoopCard';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorLoadingCard } from '../components/SeniorLoadingCard';
import { SeniorPrimaryAction } from '../components/SeniorPrimaryAction';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { SeniorTopicChips } from '../components/SeniorTopicChips';
import { seniorApi } from '../services/seniorApi';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { useSeniorOnlineStatus } from '../hooks/useSeniorOnlineStatus';

export function SeniorHome({
  userId,
  currentUserName,
  latestSummary,
  onNavigate,
  onStartTopic,
}: {
  userId: string;
  currentUserName?: string;
  latestSummary?: SeniorSummary | null;
  onNavigate: (page: SeniorPage) => void;
  onStartTopic: (prompt: string) => void;
}) {
  const [summary, setSummary] = useState<SeniorSummary | null>(latestSummary || null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const { speak } = useSeniorTTS();
  const isOnline = useSeniorOnlineStatus();

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await seniorApi.getDailySummary(userId);
      setSummary(res.summary || latestSummary || null);
    } catch {
      setSummary(latestSummary || null);
      if (!latestSummary) setSummaryError('今天状态暂时没有读取成功。您仍然可以先完成问候或直接聊天。');
    } finally {
      setSummaryLoading(false);
    }
  }, [latestSummary, userId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (latestSummary) setSummary(latestSummary);
  }, [latestSummary]);

  const greeting = new Date().getHours() >= 18 ? '晚上好' : new Date().getHours() >= 12 ? '下午好' : '早上好';
  const title = summary ? '今天已经有一份建议了' : '今天先聊几句，好吗？';
  const desc = summary ? '可以继续看刚才的建议，也可以重新回答一轮。我会换一种问法，再帮您整理一次。' : '我会问几个简单问题。您可以说话，也可以打字或点选。';
  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-cyan-100 bg-white p-7 shadow-[0_34px_120px_-72px_rgba(15,23,42,0.42)] md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-lg font-black text-cyan-800">
              <SeniorIcon name="spark" className="h-5 w-5" />
              {greeting}{currentUserName ? `，${currentUserName}` : ''}
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-2xl leading-10 text-slate-600">{desc}</p>

            <div className="mt-7 grid gap-3 rounded-[2rem] border border-slate-100 bg-slate-50/80 p-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-base font-black text-slate-500">预计时间</p>
                <p className="mt-1 text-2xl font-black text-slate-950">3 到 5 分钟</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-base font-black text-slate-500">输入方式</p>
                <p className="mt-1 text-2xl font-black text-slate-950">说话或打字</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-base font-black text-slate-500">今天目标</p>
                <p className="mt-1 text-2xl font-black text-slate-950">只做一件事</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
              <button onClick={() => onNavigate('companion')} className="group min-h-[108px] rounded-[2rem] bg-cyan-900 px-8 text-left text-3xl font-black text-white shadow-xl shadow-cyan-900/10 transition hover:bg-cyan-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200">
                <span className="flex items-center justify-between gap-4">
                  <span>
                    {summary ? '重新回答一轮' : '开始今天的问候'}
                    <span className="mt-2 block text-xl font-semibold text-cyan-50">{summary ? '换一组问题，再整理一次' : '我会一步一步带着您完成'}</span>
                  </span>
                  <SeniorIcon name="arrow" className="h-8 w-8 transition group-hover:translate-x-1" />
                </span>
              </button>
              <button onClick={() => speak(summary?.tts_text || '我们先聊几句，看看今天怎么陪您更合适。')} className="min-h-[76px] rounded-[1.5rem] border border-cyan-200 bg-cyan-50 px-6 text-xl font-black text-cyan-900 transition hover:bg-cyan-100">
                <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-6 w-6" />朗读说明</span>
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <SeniorCareOrb label={summary ? '建议已准备' : '慢慢开始'} />
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-3">
        {!isOnline ? (
          <SeniorStatusNotice
            tone="warning"
            title="当前网络可能不稳定"
            desc="已经打开的内容还能继续看。需要整理新建议或保存时，请稍后再试。"
          />
        ) : null}
        {summaryLoading ? <SeniorLoadingCard title="正在读取最近一次建议" lines={2} /> : null}
        {!summaryLoading && summaryError ? (
          <SeniorStatusNotice
            tone="danger"
            title="今天的建议暂时没读出来"
            desc={summaryError}
            actionLabel="再试一次"
            onAction={loadSummary}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <SeniorDailyLoopCard userId={userId} hasSummary={Boolean(summary)} onNavigate={onNavigate} />
      </div>

      <div className="mt-6">
        <SeniorCarePath hasSummary={Boolean(summary)} onNavigate={onNavigate} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SeniorPrimaryAction title="直接聊聊" desc="不做记录，只是陪您说说话" icon={<SeniorIcon name="chat" className="h-8 w-8" />} tone="light" onClick={() => onNavigate('chat')} />
        <SeniorPrimaryAction title="做一个放松" desc="只推荐一个适合今天的练习" icon={<SeniorIcon name="leaf" className="h-8 w-8" />} tone="light" onClick={() => onNavigate('relax')} />
        <SeniorPrimaryAction title="找帮助" desc="热线和联系人一直在这里" icon={<SeniorIcon name="phone" className="h-8 w-8" />} tone="danger" onClick={() => onNavigate('help')} />
      </div>

      <section className="mt-6 rounded-[2rem] border border-cyan-100 bg-white/92 p-6 shadow-[0_22px_70px_-62px_rgba(15,23,42,0.36)]">
        <SeniorPageHeader eyebrow="不知道怎么开口时" title="可以先点一个话题" desc="不用想完整句子。点一下，我会帮您从这个方向慢慢聊。" />
        <SeniorTopicChips onSelect={onStartTopic} />
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6">
        {summaryLoading ? (
          <SeniorLoadingCard title="正在整理最近一次建议" lines={2} />
        ) : (
          <>
            <SeniorPageHeader eyebrow="最近一次建议" title={summary ? summary.summary_title : '还没有今天的建议'} desc={summary ? summary.plain_summary : '完成一次“今天的问候”后，这里会显示今天先做哪一步。'} />
            <div className="flex flex-wrap gap-3">
              <button onClick={() => onNavigate(summary ? 'summary' : 'companion')} className="min-h-[64px] rounded-2xl bg-slate-950 px-6 text-xl font-black text-white">{summary ? '查看刚才的建议' : '现在开始'}</button>
              {summary ? <button onClick={() => onNavigate('companion')} className="min-h-[64px] rounded-2xl border border-cyan-200 bg-cyan-50 px-6 text-xl font-black text-cyan-900">重新问答</button> : null}
              {summary ? <button onClick={() => onNavigate('relax')} className="min-h-[64px] rounded-2xl border border-emerald-200 bg-emerald-50 px-6 text-xl font-black text-emerald-900">按建议做一步</button> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
