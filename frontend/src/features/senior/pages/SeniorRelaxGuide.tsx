import { useMemo, useState } from 'react';
import { SeniorBreathingGuide } from '../components/SeniorBreathingGuide';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { chooseSeniorExercise } from '../data/seniorExerciseLibrary';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';

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
      <SeniorPageHeader eyebrow="放松练习" title="今天先做这一个就够" desc="这不是固定工具清单，会优先按刚才的问答和今天的建议来安排。" />
      <section className="relative overflow-hidden rounded-[2.6rem] border border-emerald-100 bg-white p-7 shadow-[0_30px_100px_-68px_rgba(15,23,42,0.42)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-cyan-100/60 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-lg font-black text-emerald-800">
              <SeniorIcon name="leaf" className="h-5 w-5" />
              推荐练习
            </p>
            <h2 className="mt-4 text-5xl font-black leading-tight text-slate-950">{personalPlan.title}</h2>
            <p className="mt-5 text-2xl leading-10 text-slate-600">{personalPlan.reason}</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {personalPlan.contextCards.map(card => (
                <div key={card.label} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/90 p-4">
                  <p className="text-base font-black text-slate-500">{card.label}</p>
                  <p className="mt-2 text-xl font-black leading-8 text-slate-950">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
            <p className="flex items-center gap-2 text-xl font-black"><SeniorIcon name="shield" className="h-6 w-6" />练习提醒</p>
            <p className="mt-3 text-lg leading-8">{personalPlan.caution}</p>
            <div className="mt-5 rounded-2xl bg-white/70 p-4">
              <p className="text-base font-black text-emerald-700">今天的小玩法</p>
              <p className="mt-2 text-2xl font-black leading-9">{personalPlan.microQuest}</p>
            </div>
          </div>
        </div>

        <div className="mt-7">
          {showBreathing ? (
            <SeniorBreathingGuide onComplete={completeRelax} />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {personalPlan.steps.map((step, index) => (
                <div key={step} className="rounded-[1.8rem] border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
                  <p className="text-lg font-black text-emerald-700">第 {index + 1} 步</p>
                  <p className="mt-3 text-2xl font-black leading-10">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <button onClick={() => speak(guide)} className="min-h-[72px] rounded-2xl bg-emerald-800 px-6 text-xl font-black text-white">
            <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-6 w-6" />{isPlaying ? '正在播放' : '播放语音引导'}</span>
          </button>
          <button onClick={stop} className="min-h-[72px] rounded-2xl border border-slate-300 bg-white px-6 text-xl font-black text-slate-800">停止</button>
          <button onClick={completeRelax} className="min-h-[72px] rounded-2xl bg-slate-950 px-6 text-xl font-black text-white">{personalPlan.doneLabel}</button>
        </div>
        {done ? (
          <div className="mt-6 rounded-3xl border border-cyan-100 bg-cyan-50 p-5 text-cyan-950">
            <p className="flex items-center gap-2 text-2xl font-black"><SeniorIcon name="check" className="h-7 w-7" />做得很好</p>
            <p className="mt-2 text-xl font-bold leading-9">{sessionDone ? personalPlan.completionText : '今天不需要做很多，慢慢来就好。'}</p>
            {personalPlan.familyMessage ? (
              <p className="mt-3 rounded-2xl bg-white/75 p-4 text-lg font-bold leading-8 text-cyan-900">如果想告诉家人，可以说：{personalPlan.familyMessage}</p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => onNavigate('chat')} className="min-h-[58px] rounded-2xl border border-cyan-200 bg-cyan-50 px-5 text-lg font-black text-cyan-900">做完后还想说说话</button>
          <button onClick={() => onNavigate('home')} className="min-h-[58px] rounded-2xl border border-slate-200 bg-white px-5 text-lg font-black text-slate-700">回到今天</button>
        </div>
      </section>
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
