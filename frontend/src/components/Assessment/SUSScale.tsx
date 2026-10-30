/**
 * SUS (System Usability Scale) — 平台内测用的系统可用性问卷
 *
 * 流程：知情同意 → 基本信息（评价的版本、年龄段）→ 10 道题（每屏一题）→ 提交 → 感谢页
 * 计分在后端完成（/sus/responses），这里不调用 AI 解读，也不写入个人测评记录。
 *
 * 题目措辞：采用中文版 SUS（C-SUS），Sheu, Fu & Shih (2017),
 * "Pre-Testing the Chinese Version of the System Usability Scale (C-SUS)", ICCE 2017。
 * 原文为繁体中文，这里只做了繁简字转换；第 5 题原文“许有多”为排印错误，按原意改为“有许多”。
 * 原量表：Brooke (1996)。奇数题为正向表述，偶数题为反向表述。
 * 英文模式下显示 Brooke (1996) 原版英文题目（见 i18n/en.json），并在提交时记录 language = 'en'。
 */

import { useState } from 'react';
import {
    SUS_ITEMS, SUS_OPTIONS as OPTIONS, SUS_AGE_GROUPS as AGE_GROUPS,
    SUS_CONSENT_TITLE, SUS_CONSENT_PROJECT, SUS_CONSENT_SECTIONS, SUS_CONSENT_CHECKBOX,
    submitSus, announceSusSubmitted,
} from './susShared';

const MODES = [
    { key: 'standard', label: '标准版', note: '首页看板、工具箱、测评、AI 对话等' },
    { key: 'companion', label: '陪伴版（关怀模式）', note: '大字、一步一问、红色求助按钮' },
] as const;

type Step = 'consent' | 'info' | 'questions' | 'done';
type Mode = (typeof MODES)[number]['key'];

interface SUSScaleProps {
    onComplete?: (result: unknown) => void;
    onClose?: () => void;
    /** Set when the guided study tour opens the questionnaire: the mode is known, so it is not asked. */
    fixedMode?: Mode;
}

export const SUSScale = ({ onClose, fixedMode }: SUSScaleProps) => {
    const token = localStorage.getItem('token');
    const [step, setStep] = useState<Step>('consent');
    const [mode, setMode] = useState<Mode>(fixedMode || 'standard');
    const [agreed, setAgreed] = useState(false);
    const [ageGroup, setAgeGroup] = useState<string | null>(null);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);

    const choose = (value: number) => {
        const next = [...answers];
        next[current] = value;
        setAnswers(next);
        if (current < 9) setTimeout(() => setCurrent((c) => Math.min(9, c + 1)), 250);
    };

    const submit = async () => {
        if (!token || !ageGroup || answers.some((a) => a === null)) return;
        setSubmitting(true);
        setError(null);
        try {
            const susScore = await submitSus(token, mode, ageGroup, answers as number[]);
            setScore(susScore);
            announceSusSubmitted(mode);
            setStep('done');
        } catch (e) {
            setError(e instanceof Error ? e.message : '提交失败，请检查网络后重试');
        } finally {
            setSubmitting(false);
        }
    };

    const card = 'rounded-[20px] bg-white p-6 shadow-sm sm:rounded-[28px] sm:p-8';
    const primary = 'rounded-full bg-black px-6 py-3 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40';
    const secondary = 'rounded-full border border-black/15 px-6 py-3 text-sm text-gray-700 transition hover:border-black/40';

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <section className={card}>
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 text-gray-700 transition hover:border-black/40" aria-label="返回">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <div>
                        <h2 className="font-display-cn text-[26px] leading-none text-black md:text-[30px]">SUS 系统可用性量表</h2>
                        <p className="mt-2 text-sm text-black/55">平台内测问卷 · 10 题 · 约 3 分钟</p>
                    </div>
                </div>
            </section>

            {step === 'consent' && (
                <section className={card}>
                    <h3 className="text-lg font-semibold text-gray-900">{SUS_CONSENT_TITLE}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{SUS_CONSENT_PROJECT}</p>
                    <dl className="mt-5 space-y-4 text-[15px] leading-relaxed text-gray-700">
                        {SUS_CONSENT_SECTIONS.map((sec) => (
                            <div key={sec.heading}>
                                <dt className="font-semibold text-gray-900">{sec.heading}</dt>
                                <dd className="mt-1">{sec.body}</dd>
                            </div>
                        ))}
                    </dl>
                    <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-[15px] text-gray-900">
                        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-black" />
                        <span>{SUS_CONSENT_CHECKBOX}</span>
                    </label>
                    {!token && (
                        <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">请先登录账号再填写，这样您的回答才能和账号关联。</p>
                    )}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button className={primary} disabled={!token || !agreed} onClick={() => setStep('info')}>同意并继续</button>
                        <button className={secondary} onClick={onClose}>不参加，返回</button>
                    </div>
                </section>
            )}

            {step === 'info' && (
                <section className={card}>
                    {!fixedMode && (<>
                    <h3 className="text-lg font-semibold text-gray-900">本次评价的是哪个版本？</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {MODES.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setMode(m.key)}
                                aria-pressed={mode === m.key}
                                className={`rounded-2xl border-2 p-4 text-left transition ${mode === m.key ? 'border-black bg-gray-50' : 'border-black/10 hover:border-black/30'}`}
                            >
                                <span className="block text-[15px] font-medium text-gray-900">{m.label}</span>
                                <span className="mt-1 block text-xs text-gray-500">{m.note}</span>
                            </button>
                        ))}
                    </div>
                    </>)}

                    <h3 className={`${fixedMode ? '' : 'mt-7 '}text-lg font-semibold text-gray-900`}>您的年龄段</h3>
                    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="年龄段">
                        {AGE_GROUPS.map((g) => (
                            <button
                                key={g}
                                onClick={() => setAgeGroup(g)}
                                aria-pressed={ageGroup === g}
                                className={`min-w-[5.5rem] rounded-full px-4 py-2.5 text-sm transition ${ageGroup === g ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                            >
                                {g} 岁
                            </button>
                        ))}
                    </div>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <button className={primary} disabled={!ageGroup} onClick={() => setStep('questions')}>开始答题</button>
                        <button className={secondary} onClick={() => setStep('consent')}>上一步</button>
                    </div>
                </section>
            )}

            {step === 'questions' && (
                <section className={card}>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>第 {current + 1} / 10 题</span>
                        <span>{answers.filter((a) => a !== null).length} 题已答</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-black transition-all duration-300" style={{ width: `${((current + 1) / 10) * 100}%` }} />
                    </div>

                    <p className="mt-7 min-h-[64px] text-xl font-medium leading-relaxed text-gray-900">{SUS_ITEMS[current]}</p>

                    <div className="mt-6 grid gap-2 sm:grid-cols-5">
                        {OPTIONS.map((o) => (
                            <button
                                key={o.value}
                                onClick={() => choose(o.value)}
                                aria-pressed={answers[current] === o.value}
                                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition sm:flex-col sm:gap-1 sm:px-2 sm:text-center ${answers[current] === o.value ? 'border-black bg-gray-50' : 'border-black/10 hover:border-black/30'}`}
                            >
                                <span className="text-lg font-semibold text-gray-900">{o.value}</span>
                                <span className="text-sm text-gray-600 sm:text-xs">{o.label}</span>
                            </button>
                        ))}
                    </div>

                    {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

                    <div className="mt-7 flex items-center justify-between">
                        <button
                            className="px-2 py-3 text-sm text-gray-600 disabled:opacity-40"
                            disabled={current === 0}
                            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                        >
                            ← 上一题
                        </button>
                        {current === 9 ? (
                            <button className={primary} disabled={answers.some((a) => a === null) || submitting} onClick={submit}>
                                {submitting ? '提交中…' : '提交问卷'}
                            </button>
                        ) : (
                            <button
                                className="px-2 py-3 text-sm text-gray-900 disabled:opacity-40"
                                disabled={answers[current] === null}
                                onClick={() => setCurrent((c) => Math.min(9, c + 1))}
                            >
                                下一题 →
                            </button>
                        )}
                    </div>
                </section>
            )}

            {step === 'done' && (
                <section className={`${card} text-center`}>
                    <h3 className="font-display-cn text-[28px] text-black">感谢您的参与！</h3>
                    <p className="mt-3 text-[15px] text-gray-600">您的回答已保存。</p>
                    {score !== null && (
                        <div className="mx-auto mt-6 w-fit rounded-2xl bg-gray-50 px-8 py-5">
                            <span className="block text-xs text-gray-500">本次 SUS 得分</span>
                            <span className="mt-1 block text-4xl font-semibold text-gray-900">
                                {score}
                                <span className="ml-1 text-base font-normal text-gray-400">/ 100</span>
                            </span>
                        </div>
                    )}
                    <button className={`${primary} mt-7`} onClick={onClose}>返回测评中心</button>
                </section>
            )}
        </div>
    );
};

export default SUSScale;
