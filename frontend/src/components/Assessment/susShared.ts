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

/**
 * Participant information and consent shown before the questionnaire, laid out like a typical
 * online-survey consent page: a short invitation, key facts, numbered sections, and consent
 * statements the participant ticks one by one.
 */
export const SUS_CONSENT_TITLE = '参与研究知情同意书';
export const SUS_CONSENT_INTRO = '您好！感谢您使用 NeuraSense。我们诚邀您参加一项关于网站使用体验的研究。在决定是否参加之前，请花一两分钟阅读以下说明。如有任何不明白的地方，可以随时向研究人员提问。';
export const SUS_CONSENT_FACTS: Array<{ label: string; value: string }> = [
    { label: '研究单位', value: '澳门理工大学 应用科学学院' },
    { label: '研究人员', value: 'Ma Runqi（硕士研究生）' },
    { label: '指导老师', value: 'Wenwang Rao' },
    { label: '所需时间', value: '约 3 分钟，共 10 题' },
];
export const SUS_CONSENT_SECTIONS: Array<{ heading: string; body?: string; points?: string[] }> = [
    {
        heading: '研究目的',
        body: '本研究希望了解大家在使用 NeuraSense 标准版和陪伴版时是否方便、顺手，找出不好用的地方，以便改进网站的设计，让不同年龄的使用者都能更轻松地使用。',
    },
    {
        heading: '您需要做什么',
        points: [
            '选择您这次评价的版本和您的年龄段。',
            '回答 10 道关于使用感受的选择题（系统可用性量表，SUS），每题从“非常不同意”到“非常同意”中选一项。',
            '答案没有对错之分，请按您的真实感受作答。问卷不涉及任何心理评估或诊断。',
        ],
    },
    {
        heading: '会记录哪些信息',
        points: [
            '会记录：问卷答案、所评价的版本、年龄段、提交时间和账号编号。',
            '问卷本身不要求填写姓名、电话、地址等能识别您身份的信息。',
        ],
    },
    {
        heading: '自愿参加与退出',
        body: '参加完全出于自愿。您可以拒绝参加，也可以在提交前随时关闭页面退出，无需说明理由，这不会影响您继续使用网站的任何功能。提交后如希望撤回您的回答，可以联系研究人员删除。',
    },
    {
        heading: '可能的风险与益处',
        body: '问卷只涉及对网站的使用感受，预计不会给您带来风险或不适；如作答时感到不舒服，可以随时停止。参加本研究没有直接的报酬，但您的反馈会帮助我们把网站改得更好用。',
    },
    {
        heading: '保密与数据保存',
        body: '您的回答以账号编号保存在项目服务器上，只有研究人员和指导老师可以查阅。研究结果只以汇总统计的形式出现在硕士论文和学术报告中，不会公开任何能识别您身份的信息。研究结束后，数据将按照澳门理工大学的研究数据管理要求保存和销毁。',
    },
    {
        heading: '联系方式',
        body: '如对本研究有任何疑问，或希望撤回您的回答，请联系研究人员 Ma Runqi（电邮：P2523030@mpu.edu.mo）。',
    },
];
/** Every statement must be ticked before the questionnaire starts. */
export const SUS_CONSENT_CHECKS = [
    '我已年满 18 周岁。',
    '我已阅读并理解以上说明，有疑问时知道可以联系谁。',
    '我自愿参加本研究，并同意研究人员按上述方式使用我的问卷回答。',
];

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
