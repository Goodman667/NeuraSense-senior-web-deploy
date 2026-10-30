import { useCallback, useEffect, useState } from 'react';
import { SeniorIcon, type SeniorIconName } from '../components/SeniorIcon';
import { SeniorLoadingCard } from '../components/SeniorLoadingCard';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { seniorApi } from '../services/seniorApi';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { useSeniorOnlineStatus } from '../hooks/useSeniorOnlineStatus';
import { useSeniorDailyProgress } from '../hooks/useSeniorDailyProgress';
import { seniorAssets } from '../lib/seniorAssets';
import { useStudyTourStore } from '../../studyTour/useStudyTourStore';

/** Start (or resume) the guided study tour of the companion version. */
function TourStartCard() {
  const active = useStudyTourStore((s) => s.active);
  const finished = useStudyTourStore((s) => s.finishedModes.includes('companion'));
  const start = useStudyTourStore((s) => s.start);
  if (active || finished) return null;
  return (
    <section className="sn-sheet flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
      <div>
        <p className="sn-kicker"><SeniorIcon name="spark" className="h-5 w-5" />第一次用？</p>
        <h2 className="sn-h2 mt-1">跟着引导，一步一步体验</h2>
        <p className="sn-body mt-1">一共 6 步，跟着页面上亮起来的地方点就好，最后填一份 10 道题的小问卷。大约 20 分钟。</p>
      </div>
      <button onClick={() => start('companion')} className="sn-btn sn-btn-primary sn-btn-lg" data-tour="senior-tour-start">
        开始体验流程<SeniorIcon name="arrow" />
      </button>
    </section>
  );
}

function PhotoCard({ image, icon, tag, title, desc, onClick, help = false }: { image: string; icon: SeniorIconName; tag: string; title: string; desc: string; onClick: () => void; help?: boolean }) {
  return (
    <button onClick={onClick} className={`sn-photo-card aspect-[3/4] max-sm:aspect-[4/3] ${help ? 'is-help' : ''}`}>
      <img src={image} alt="" loading="lazy" />
      <span className="sn-pill"><SeniorIcon name={icon} className="h-5 w-5" />{tag}</span>
      <span>
        <span className="block text-[1.75rem] leading-tight">{title}</span>
        <span className="mt-2 block text-[1.08rem] leading-7 text-white/85">{desc}</span>
      </span>
    </button>
  );
}

const steps: Array<{ key: 'companion' | 'summary' | 'relax'; label: string; color: string }> = [
  { key: 'companion', label: '完成今天的问候', color: 'var(--sn-ochre)' },
  { key: 'summary', label: '看一眼今天的建议', color: 'var(--sn-olive)' },
  { key: 'relax', label: '做一个小练习', color: 'var(--sn-sage)' },
];

function ProgressCard({ progress, doneCount }: { progress: Record<string, boolean>; doneCount: number }) {
  const circumference = 2 * Math.PI * 14;
  const arc = circumference / steps.length;
  return (
    <div className="flex aspect-[3/4] flex-col rounded-[20px] bg-[#EBE4DC] p-4 text-left max-sm:aspect-auto">
      <span className="inline-flex items-center gap-2 px-1 text-[1.05rem] text-[var(--sn-ink-2)]"><SeniorIcon name="clock" className="h-5 w-5" />今天的进度</span>
      <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 rounded-[18px] bg-[#F4F1EC] p-4">
        <div className="relative h-32 w-32 xl:h-36 xl:w-36">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#E2DAD0" strokeWidth="5" />
            {steps.map((step, index) => progress[step.key] ? (
              <circle key={step.key} cx="18" cy="18" r="14" fill="none" stroke={step.color} strokeWidth="5"
                strokeDasharray={`${arc - 0.6} ${circumference - arc + 0.6}`} strokeDashoffset={-index * arc} />
            ) : null)}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[1.9rem] leading-none text-[var(--sn-forest)]">{doneCount}/3</span>
            <span className="mt-1 text-sm text-[var(--sn-ink-3)]">已完成</span>
          </div>
        </div>
        <ul className="w-full space-y-1.5 text-[1.02rem]">
          {steps.map(step => (
            <li key={step.key} className="flex items-center gap-2 text-[var(--sn-ink-2)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: progress[step.key] ? step.color : '#D3C9BD' }} />
              <span className={progress[step.key] ? 'text-[var(--sn-ink)]' : ''}>{step.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SeniorHome({
  userId,
  currentUserName,
  latestSummary,
  onNavigate,
  onStartTopic: _onStartTopic,
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
  const { progress, doneCount } = useSeniorDailyProgress(userId);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await seniorApi.getDailySummary(userId);
      setSummary(res.summary || latestSummary || null);
    } catch {
      setSummary(latestSummary || null);
      if (!latestSummary) setSummaryError('今天的建议暂时没有读出来。您仍然可以先完成问候，或者直接聊天。');
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

  const hour = new Date().getHours();
  const greeting = hour >= 18 ? '晚上好' : hour >= 12 ? '下午好' : '早上好';
  const title = summary ? '今天已经有一份建议了' : '今天先聊几句，好吗？';
  const desc = summary
    ? '可以接着看刚才的建议，也可以换一组问题，重新回答一轮。'
    : '我一次只问一个问题。您可以说话、打字，或者直接点选。三五分钟就好。';

  return (
    <div className="space-y-8">
      <TourStartCard />
      <section
        className="sn-media sn-rise rounded-[28px] border border-[var(--sn-line)]"
        style={{ backgroundColor: '#EAE3DE', backgroundImage: `url(${seniorAssets.inkLandscapePoster})`, backgroundSize: 'cover', backgroundPosition: 'center bottom' }}
      >
        <video autoPlay muted loop playsInline preload="auto" poster={seniorAssets.inkLandscapePoster} style={{ objectPosition: 'center bottom' }} aria-hidden="true">
          <source src={seniorAssets.inkLandscapeVideo} type="video/mp4" />
        </video>
        <div className="flex min-h-[31rem] flex-col px-7 pb-[13rem] pt-8 md:px-12 md:pt-11 lg:min-h-[34rem]">
          <p className="text-[1.25rem] text-[var(--sn-teal)]">{greeting}{currentUserName ? `，${currentUserName}` : ''}</p>
          <h1 className="sn-display mt-2 max-w-3xl">{title}</h1>
          <p className="sn-lede mt-3 max-w-2xl text-[#2D5258]">{desc}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => onNavigate('companion')} className="sn-btn sn-btn-primary sn-btn-lg" data-tour="senior-start-greeting">
              {summary ? '重新回答一轮' : '开始今天的问候'}
              <SeniorIcon name="arrow" />
            </button>
            {summary ? (
              <button onClick={() => onNavigate('summary')} className="sn-btn sn-btn-glass sn-btn-lg">查看刚才的建议</button>
            ) : null}
            <button onClick={() => speak(summary?.tts_text || `${greeting}。${title}${desc}`)} className="sn-btn sn-btn-glass sn-btn-lg">
              <SeniorIcon name="volume" />朗读这段话
            </button>
          </div>
        </div>
      </section>

      {!isOnline || summaryError ? (
        <div className="space-y-3">
          {!isOnline ? (
            <SeniorStatusNotice tone="warning" title="网络好像不太稳定" desc="已经打开的内容还能看。要整理新建议或保存时，请稍后再试。" />
          ) : null}
          {summaryError ? (
            <SeniorStatusNotice tone="danger" title="今天的建议没读出来" desc={summaryError} actionLabel="再试一次" onAction={loadSummary} />
          ) : null}
        </div>
      ) : null}

      <section className="sn-rise" style={{ animationDelay: '.08s' }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="sn-h2">今天只选一件事</h2>
            <p className="sn-body mt-1">不放很多功能，选一张就好。</p>
          </div>
          <button onClick={() => onNavigate('checkup')} className="sn-btn sn-btn-dark">
            <SeniorIcon name="clipboard" />陪您做个小测
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PhotoCard image={seniorAssets.cardSilhouette} icon="chat" tag="一步一步问" title="今天聊几句" desc="不用自己组织语言，我一句一句问您。" onClick={() => onNavigate('companion')} />
          <PhotoCard image={seniorAssets.cardMossStone} icon="leaf" tag="三分钟" title="做个小练习" desc="按今天的状态，只推荐一个练习。" onClick={() => onNavigate('relax')} />
          <ProgressCard progress={progress as unknown as Record<string, boolean>} doneCount={doneCount} />
          <PhotoCard image={seniorAssets.cardLoneTree} icon="phone" tag="已存好号码" title="联系家人" desc="需要时直接找到，不用临时翻号码。" onClick={() => onNavigate('help')} help />
        </div>
      </section>

      <section className="sn-sheet sn-rise p-6 md:p-8" style={{ animationDelay: '.14s' }}>
        {summaryLoading ? (
          <SeniorLoadingCard title="正在读取最近一次建议" lines={2} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="sn-kicker"><SeniorIcon name="spark" className="h-5 w-5" />最近一次建议</p>
              <h2 className="sn-h2 mt-2">{summary ? summary.summary_title : '还没有今天的建议'}</h2>
              <p className="sn-body mt-2 max-w-3xl">{summary ? summary.plain_summary : '完成一次“今天的问候”后，这里会告诉您今天先做哪一步。'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => onNavigate(summary ? 'summary' : 'companion')} className="sn-btn sn-btn-primary">{summary ? '查看建议' : '现在开始'}</button>
              {summary ? <button onClick={() => onNavigate('relax')} className="sn-btn sn-btn-quiet">按建议做一步</button> : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
