/**
 * SUS questionnaire in companion mode: large text, one question per screen, read aloud.
 * The version is recorded as "companion"; the data go to the same table and CSV export as the
 * standard-mode questionnaire.
 */
import { useEffect, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import type { SeniorPage } from '../types/senior';
import {
  SUS_ITEMS, SUS_OPTIONS, SUS_AGE_GROUPS,
  SUS_CONSENT_TITLE, SUS_CONSENT_PROJECT, SUS_CONSENT_SECTIONS, SUS_CONSENT_CHECKBOX,
  submitSus, announceSusSubmitted,
} from '../../../components/Assessment/susShared';

type Step = 'consent' | 'age' | 'questions' | 'done';

export function SeniorSus({ onNavigate }: { onNavigate: (page: SeniorPage) => void }) {
  const token = localStorage.getItem('token');
  const { speak } = useSeniorTTS();
  const [step, setStep] = useState<Step>('consent');
  const [agreed, setAgreed] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = (text: string) => speak(text, { voice: 'xiaoyi', emotion: 'friendly' });

  useEffect(() => {
    if (step === 'consent') read('这是一份 10 道题的使用感受问卷。请先看一下说明，同意的话，勾选下面的方框，再点继续。');
    if (step === 'age') read('请选一下您的年龄段。');
    if (step === 'done') read('谢谢您，问卷已经交好了。');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === 'questions') read(`第 ${current + 1} 题。${SUS_ITEMS[current]}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, current]);

  const choose = (value: number) => {
    const next = [...answers];
    next[current] = value;
    setAnswers(next);
    if (current < 9) window.setTimeout(() => setCurrent((c) => Math.min(9, c + 1)), 300);
  };

  const submit = async () => {
    if (!token || !ageGroup || answers.some((a) => a === null)) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitSus(token, 'companion', ageGroup, answers as number[]);
      announceSusSubmitted('companion');
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '没有交上去，请检查网络后再试一次。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <SeniorPageHeader eyebrow="使用感受问卷" title="说说您用起来的感受" desc="一共 10 道题，大约 3 分钟。没有对错，按您的真实感受选就好。" />

      {step === 'consent' && (
        <section className="sn-sheet p-6 md:p-8">
          <h2 className="sn-h2">{SUS_CONSENT_TITLE}</h2>
          <p className="sn-small mt-2">{SUS_CONSENT_PROJECT}</p>
          <div className="mt-5 space-y-4">
            {SUS_CONSENT_SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <p className="text-[1.25rem] font-semibold text-[var(--sn-ink)]">{sec.heading}</p>
                <p className="sn-body mt-1">{sec.body}</p>
              </div>
            ))}
          </div>
          <label className="mt-6 flex min-h-[3.6rem] cursor-pointer items-start gap-4 rounded-[14px] bg-[var(--sn-sheet-2)] px-4 py-3 text-[1.25rem]">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-7 w-7 shrink-0 accent-[#175A67]" />
            <span>{SUS_CONSENT_CHECKBOX}</span>
          </label>
          {!token && <p className="sn-small mt-4 text-[var(--sn-help)]">请先登录账号再填写。</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="sn-btn sn-btn-primary sn-btn-lg" disabled={!token || !agreed} onClick={() => setStep('age')}>同意，继续</button>
            <button className="sn-btn sn-btn-outline" onClick={() => onNavigate('home')}>不参加，回到今天</button>
          </div>
        </section>
      )}

      {step === 'age' && (
        <section className="sn-sheet p-6 md:p-8">
          <h2 className="sn-h2">您的年龄段</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3" role="group" aria-label="年龄段">
            {SUS_AGE_GROUPS.map((g) => (
              <button key={g} onClick={() => setAgeGroup(g)} aria-pressed={ageGroup === g} className="sn-chip min-h-[4rem] justify-center !rounded-[16px] text-[1.35rem]">
                {g} 岁
              </button>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="sn-btn sn-btn-primary sn-btn-lg" disabled={!ageGroup} onClick={() => setStep('questions')}>开始答题</button>
            <button className="sn-btn sn-btn-outline" onClick={() => setStep('consent')}>上一步</button>
          </div>
        </section>
      )}

      {step === 'questions' && (
        <section className="sn-sheet overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-[var(--sn-line)] px-6 py-4 md:px-8">
            <span className="text-[1.15rem] tabular-nums text-[var(--sn-ink-2)]">第 {current + 1} 题 · 共 10 题</span>
            <div className="sn-progress min-w-[8rem] flex-1"><span style={{ width: `${((current + 1) / 10) * 100}%` }} /></div>
          </div>
          <div className="px-6 py-8 md:px-10 md:py-10">
            <h1 className="sn-display !text-[var(--sn-ink)]">{SUS_ITEMS[current]}</h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-5">
              {SUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => choose(o.value)}
                  aria-pressed={answers[current] === o.value}
                  className={`flex min-h-[6rem] flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] px-3 text-[var(--sn-ink)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8FB9B3] ${answers[current] === o.value ? 'border-[var(--sn-teal)] bg-[var(--sn-teal-soft)]' : 'border-[var(--sn-line-strong)] bg-[#FFFDF9] hover:border-[var(--sn-teal)]'}`}
                >
                  <span className="text-[1.6rem] font-semibold">{o.value}</span>
                  <span className="text-[1.15rem]">{o.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="sn-body mt-5 text-[var(--sn-help)]">{error}</p>}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button className="sn-btn sn-btn-outline" disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>上一题</button>
              <button onClick={() => read(SUS_ITEMS[current])} className="sn-btn sn-btn-quiet"><SeniorIcon name="volume" />再读一遍</button>
              {current === 9 ? (
                <button className="sn-btn sn-btn-primary sn-btn-lg ml-auto" disabled={answers.some((a) => a === null) || submitting} onClick={submit}>
                  {submitting ? '正在提交…' : '提交问卷'}
                </button>
              ) : (
                <button className="sn-btn sn-btn-primary ml-auto" disabled={answers[current] === null} onClick={() => setCurrent((c) => Math.min(9, c + 1))}>下一题</button>
              )}
            </div>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="sn-sheet p-8 text-center">
          <h2 className="sn-h1">谢谢您的参与！</h2>
          <p className="sn-lede mt-3">问卷已经交好了。</p>
          <button className="sn-btn sn-btn-primary sn-btn-lg mt-7" onClick={() => onNavigate('home')}>回到今天</button>
        </section>
      )}
    </div>
  );
}
