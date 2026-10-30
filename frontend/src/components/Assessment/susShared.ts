/**
 * SUS content and submission shared by the standard-mode questionnaire (SUSScale) and the
 * companion-mode page (SeniorSus).
 *
 * Item wording: Chinese C-SUS (Sheu, Fu & Shih, 2017), converted to simplified characters, item 5
 * typo corrected; English mode shows the Brooke (1996) original (see i18n/en.json).
 */
import { API_BASE } from '../../config/api';
import { isEnglish } from '../../i18n/autoTranslate';
import { emitStudyEvent } from '../../lib/studyEvents';

export const SUS_ITEMS = [
    '我觉得我会常使用这个系统。',
    '我觉得这个系统太过不必要的复杂。',
    '我觉得这个系统是容易操作的。',
    '我觉得我需要透过专人的协助才能操作这个系统。',
    '我觉得这个系统有许多不同功能，整合的很好。',
    '我觉得这个系统很多地方不一致令人困惑。',
    '我觉得大部分的人都能很快知道怎么使用这个系统。',
    '我觉得这个系统使用起来有点麻烦。',
    '我非常有信心下次能自己顺利操作这个系统。',
    '我在能操作这个系统前，要学很多东西。',
];

export const SUS_OPTIONS = [
    { value: 1, label: '非常不同意' },
    { value: 2, label: '不同意' },
    { value: 3, label: '一般' },
    { value: 4, label: '同意' },
    { value: 5, label: '非常同意' },
];

export const SUS_AGE_GROUPS = ['18-29', '30-44', '45-59', '60-69', '70-79', '80+'];

export type SusMode = 'standard' | 'companion';

/** Participant information shown before the questionnaire (matches the ethics participant information sheet). */
export const SUS_CONSENT_TITLE = '研究参与知情同意';
export const SUS_CONSENT_PROJECT = 'NeuraSense：双模式 AI 辅助心理健康网页平台的设计、实现与形成性可用性评估（澳门理工大学应用科学学院硕士研究项目）';
export const SUS_CONSENT_SECTIONS: Array<{ heading: string; body: string }> = [
    { heading: '研究目的', body: '本问卷采用系统可用性量表（SUS），用于评估 NeuraSense 平台的易用程度。研究结果将用于改进平台设计。' },
    { heading: '参与内容', body: '问卷共 10 道题，约需 3 分钟。您需要填写所评价的版本和年龄段。问卷不涉及任何诊断，答案没有对错之分，请根据您的真实使用感受作答。' },
    { heading: '自愿参与与退出', body: '参与完全出于自愿。您可以拒绝参加，或在任何时候关闭页面退出，无需说明理由，也不会因此受到任何不利影响。' },
    { heading: '数据使用与保密', body: '您的回答以账号编号保存，仅用于本研究，只有研究人员及其导师可以查阅。研究结果仅以汇总形式在硕士论文及学术报告中呈现，不会公开任何可识别您身份的信息。' },
    { heading: '风险与收益', body: '参与本问卷没有可预见的风险，也没有直接收益或报酬。' },
    { heading: '联系方式', body: '如有疑问，请联系研究人员 Ma Runqi（电邮：P2523030@mpu.edu.mo）。' },
];
export const SUS_CONSENT_CHECKBOX = '我已年满 18 周岁，已阅读并理解以上说明，自愿参加本研究。';

/** Save one response; the server does the scoring. Returns the 0–100 SUS score. */
export async function submitSus(token: string, mode: SusMode, ageGroup: string, answers: number[]) {
    const res = await fetch(`${API_BASE}/sus/responses?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, age_group: ageGroup, answers, consent: true, language: isEnglish() ? 'en' : 'zh' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || '提交失败');
    return data.sus_score as number;
}

/** Tell the guided study tour that a SUS response was saved. */
export function announceSusSubmitted(mode: SusMode) {
    emitStudyEvent('sus-submitted', { mode });
}
