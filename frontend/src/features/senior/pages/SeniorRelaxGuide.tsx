import { useMemo, useState } from 'react';
import { SeniorBreathingGuide } from '../components/SeniorBreathingGuide';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { chooseSeniorExercise } from '../data/seniorExerciseLibrary';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { seniorAssets } from '../lib/seniorAssets';

export function SeniorRelaxGuide({ userId, latestSummary, onNavigate }: { userId: string; latestSummary: SeniorSummary | null; onNavigate: (page: SeniorPage) => void }) {
  const [done, setDone] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const { speak, stop, isPlaying } = useSeniorTTS();
  const exercise = useMemo(() => chooseSeniorExercise(latestSummary), [latestSummary]);
  const personalPlan = useMemo(() => buildPersonalRelaxPlan(latestSummary, exercise), [exercise, latestSummary]);
  const guide = latestSummary?.recommended_exercise?.reason
    ? `今天先做这个，${personalPlan.title}。${personalPlan.reason} ${personalPlan.voiceGuide}`
    : exercise.voiceGuide;
  const showBreathing = exercise.id === 'breathing_3min';
  const completeRelax = () => {
    setDone(true);
    setSessionDone(true);
    markSeniorProgress(userId, 'relax');
  };
  return (
    <div className="mx-auto max-w-6xl">
      <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => { stop(); onNavigate('home'); }} endLabel="今天先到这里" />

      <section className="sn-rise relative h-[22rem] overflow-hidden rounded-[28px] border border-[var(--sn-line)] bg-[#E8E4DA] md:h-[27rem]">
        <img src={seniorAssets.stoneValley} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <p className="absolute inset-x-0 top-8 z-[5] text-center text-[clamp(4.5rem,11vw,9.5rem)] leading-[0.9] tracking-[0.2em] text-[#010101]/80 md:top-10" aria-hidden="true">慢慢来</p>
        <img src={seniorAssets.stoneCutout} alt="" className="absolute inset-0 z-10 h-full w-full object-cover" />
        <div className="absolute bottom-5 left-5 z-20 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(251,248,243,0.88)] px-4 py-2 text-[1.05rem] text-[var(--sn-forest)] backdrop-blur"><SeniorIcon name="leaf" className="h-5 w-5" />今天推荐</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(251,248,243,0.88)] px-4 py-2 text-[1.05rem] text-[var(--sn-forest)] backdrop-blur"><SeniorIcon name="clock" className="h-5 w-5" />{personalPlan.contextCards[1]?.value}</span>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="sn-sheet p-6 md:p-8">
          <h1 className="sn-h1">{personalPlan.title}</h1>
          <p className="sn-lede mt-3">{personalPlan.reason}</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {personalPlan.contextCards.map(card => (
              <div key={card.label} className="sn-sheet-flat p-4">
                <dt className="sn-small">{card.label}</dt>
                <dd className="mt-1 text-[1.25rem] leading-8 text-[var(--sn-ink)]">{card.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <aside className="rounded-[22px] bg-[var(--sn-forest)] p-6 text-[#F4EFE8]">
          <p className="flex items-center gap-2 text-[1.25rem]"><SeniorIcon name="shield" className="h-6 w-6" />练习提醒</p>
          <p className="mt-3 text-[1.1rem] leading-8 text-[#F4EFE8]/85">{personalPlan.caution}</p>
          <hr className="my-5 border-0 border-t border-white/15" />
          <p className="text-[1rem] text-[#F4EFE8]/70">今天的小玩法</p>
          <p className="mt-2 text-[1.35rem] leading-9">{personalPlan.microQuest}</p>
        </aside>
      </section>

      <div className="mt-6">
        {showBreathing ? (
          <SeniorBreathingGuide onComplete={completeRelax} />
        ) : (
          <ol className="grid gap-4 md:grid-cols-3">
            {personalPlan.steps.map((step, index) => (
              <li key={step} className="sn-sheet p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--sn-line-strong)] text-[1.2rem] text-[var(--sn-teal-deep)]">{index + 1}</span>
                <p className="mt-4 text-[1.4rem] leading-9">{step}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => speak(guide)} className="sn-btn sn-btn-primary sn-btn-lg"><SeniorIcon name="volume" />{isPlaying ? '正在播放引导' : '播放语音引导'}</button>
        <button onClick={stop} className="sn-btn sn-btn-quiet sn-btn-lg">停止</button>
        <button onClick={completeRelax} className="sn-btn sn-btn-dark sn-btn-lg"><SeniorIcon name="check" />{personalPlan.doneLabel}</button>
      </div>

      {done ? (
        <div className="sn-notice tone-success mt-6 flex-col">
          <p className="flex items-center gap-2 text-[1.5rem]"><SeniorIcon name="check" className="h-7 w-7" />做得很好</p>
          <p className="text-[1.2rem] leading-9">{sessionDone ? personalPlan.completionText : '今天不用做很多，慢慢来就好。'}</p>
          {personalPlan.familyMessage ? (
            <p className="rounded-[14px] bg-white/60 p-4 text-[1.1rem] leading-8">想告诉家人的话，可以这样说：{personalPlan.familyMessage}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('chat')} className="sn-btn sn-btn-quiet">做完还想说说话</button>
            <button onClick={() => onNavigate('home')} className="sn-btn sn-btn-quiet">回到今天</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function cleanText(text?: string) {
  return (text || '')
    .replace(/NeuraSense|项目|平台|AI|人工智能|算法|模型|诊断|评分|分数|量表|风险等级/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPrimaryDimension(summary: SeniorSummary | null) {
  const dimensions = Object.values(summary?.dimensions || {});
  return dimensions.find(item => /需要|关注|偏高|陪伴|不适|一般|低落/.test(`${item.status}${item.text}`)) || dimensions[0];
}

function buildPersonalRelaxPlan(summary: SeniorSummary | null, exercise: ReturnType<typeof chooseSeniorExercise>) {
  const primary = getPrimaryDimension(summary);
  const reason = cleanText(summary?.recommended_exercise?.reason || summary?.recommendation?.reason || exercise.cardText);
  const familyMessage = cleanText(summary?.family_message);
  const memory = summary?.memory_snapshot;
  const preference = memory?.preferred_support?.[0] || exercise.suitableFor;
  const frequentConcern = memory?.frequent_concerns?.[0] || primary?.label || '今天的状态';
  const title = cleanText(summary?.recommended_exercise?.title || exercise.title);
  const duration = summary?.recommended_exercise?.duration_label || exercise.durationLabel;
  const steps = (summary?.recommended_exercise?.steps?.length ? summary.recommended_exercise.steps : exercise.steps)
    .map(cleanText)
    .filter(Boolean);

  if (exercise.id === 'connection_message' && familyMessage) {
    steps[1] = `直接发这句：${familyMessage}`;
  }
  if (exercise.id === 'worry_note' && summary?.risk_explanation) {
    steps[0] = `只写这一类事：${cleanText(summary.risk_explanation)}`;
  }
  if (exercise.id === 'rest_15min' && primary?.text) {
    steps[0] = '找一个安全位置，先不处理别的事';
  }

  const contextCards = [
    { label: '为什么是它', value: primary ? `${primary.label}：${cleanText(primary.status)}` : '先照顾当下' },
    { label: '预计时间', value: duration },
    { label: '今天偏好', value: cleanText(preference).slice(0, 18) || '做完就停' },
  ];

  return {
    title,
    reason: reason || exercise.cardText,
    steps: steps.slice(0, 3),
    caution: cleanText(summary?.recommended_exercise?.stop_rule || summary?.safety?.message || exercise.caution) || '如果感到头晕、不舒服，请立刻停止。坐稳、慢一点，比做得标准更重要。',
    microQuest: cleanText(summary?.recommended_exercise?.play_prompt || exercise.microQuest || frequentConcern),
    voiceGuide: `${exercise.voiceGuide} 这次只需要完成“${exercise.playLabel}”，做完就可以停。`,
    doneLabel: exercise.id === 'connection_message' ? '我发完了' : exercise.id === 'worry_note' ? '我写完了' : '我做完了',
    completionText: cleanText(exercise.completionText),
    familyMessage,
    contextCards,
  };
}
