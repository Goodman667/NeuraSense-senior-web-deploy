/**
 * The six guided steps of the usability study, for each version of the site.
 *
 * Each step is a short list of sub-steps:
 *  - click: highlight one button; the step moves on when the participant clicks it.
 *  - task:  highlight a working area; the step moves on when the page announces a study event
 *           (see lib/studyEvents.ts), e.g. "check-in saved".
 *  - view:  highlight something to look at; the participant moves on with the button in the panel.
 *
 * Targets are `data-tour="…"` ids, or `page:<name>` for the main content area of a page
 * (`data-tour-page` on the shell's <main>). A list means "whichever of these is on screen".
 */
import type { StudyEventName } from '../../lib/studyEvents';
import { useCheckinStore } from '../../store/useCheckinStore';

export type TourMode = 'standard' | 'companion';

export type TourSub =
    | { kind: 'click'; target: string; text: string }
    | {
          kind: 'task';
          target: string | string[];
          event: StudyEventName;
          text: string;
          /** when this is already done today, show `text` as a view with a "下一步" button */
          alreadyDone?: { when: () => boolean; text: string };
          panel?: 'top' | 'bottom';
      }
    | {
          kind: 'view';
          target: string | string[];
          text: string;
          button?: string;
          /** let the participant use the highlighted area (scroll, flip cards, download); page changes stay blocked */
          interactive?: boolean;
          panel?: 'top' | 'bottom';
      };

export interface TourStep {
    key: string;
    label: string;
    desc: string;
    subs: TourSub[];
}

export const STANDARD_STEPS: TourStep[] = [
    {
        key: 'checkin',
        label: '每日签到',
        desc: '记录今天的状态',
        subs: [
            { kind: 'click', target: 'nav-today', text: '先点一下亮起来的「今日」，回到首页。' },
            {
                kind: 'task',
                target: 'today-checkin',
                event: 'checkin-done',
                text: '拖动四个滑块，记录今天的心情、压力、精力和睡眠，然后点「完成签到」。',
                alreadyDone: {
                    when: () => useCheckinStore.getState().hasCheckedIn,
                    text: '你今天已经签到过了，这里显示的是今天的记录。点「下一步」继续。',
                },
            },
        ],
    },
    {
        key: 'assessment',
        label: '心理自评',
        desc: 'PHQ-9 量表',
        subs: [
            { kind: 'click', target: 'nav-toolbox', text: '点一下亮起来的「工具箱」。' },
            { kind: 'click', target: 'toolbox-scale', text: '点「量表评估」，进入测评中心。' },
            { kind: 'click', target: 'scale-phq9', text: '选择「PHQ-9」抑郁自评量表。' },
            {
                kind: 'task',
                target: 'page:scale',
                event: 'assessment-done',
                text: '按最近两周的真实情况回答 9 道题，答完会生成一份报告。',
                panel: 'top',
            },
            {
                kind: 'view',
                target: 'page:scale',
                interactive: true,
                text: '这是你的评估报告：总分、各维度得分和 AI 建议，也可以下载 PDF。看完点「下一步」。',
                button: '看完了，下一步',
                panel: 'top',
            },
        ],
    },
    {
        key: 'chat',
        label: 'AI 陪伴',
        desc: '和小心聊一句',
        subs: [
            { kind: 'click', target: 'nav-chat', text: '点一下亮起来的「AI 陪伴」。' },
            {
                kind: 'task',
                target: 'page:chat',
                event: 'chat-replied',
                text: '和小心说一句话，比如今天最在意的一件事。发出后等它回复。',
                panel: 'top',
            },
        ],
    },
    {
        key: 'tools',
        label: '放松练习',
        desc: '呼吸与正念',
        subs: [
            { kind: 'click', target: 'nav-toolbox', text: '点一下亮起来的「工具箱」。' },
            { kind: 'click', target: 'tool-breathing_478', text: '找到「4-7-8 呼吸法」，点开它。' },
            {
                kind: 'task',
                target: 'page:tool-runner',
                event: 'tool-done',
                text: '点「开始练习」，跟着步骤做，每一步可以点「下一步」，做完点「提交打卡」。',
                panel: 'top',
            },
            { kind: 'click', target: 'nav-toolbox', text: '再回到「工具箱」。' },
            { kind: 'click', target: 'tool-mindfulness_1min', text: '这次做一个正念练习：点开「1 分钟正念」。' },
            {
                kind: 'task',
                target: 'page:tool-runner',
                event: 'tool-done',
                text: '跟着做完这个正念练习，最后点「提交打卡」。',
                panel: 'top',
            },
        ],
    },
    {
        key: 'program',
        label: '课程计划',
        desc: '完成第 1 课',
        subs: [
            { kind: 'click', target: 'nav-programs', text: '点一下亮起来的「课程计划」。' },
            { kind: 'click', target: 'program-stress-7', text: '选择「7 天减压训练营」。' },
            {
                kind: 'task',
                target: ['page:programs', 'page:tool-runner'],
                event: 'program-day-done',
                text: '先做课前测评，再点「开始课程」进入第 1 天：看视频、做今日练习、写复盘、做章节小测，最后点「完成今日课程」。',
                panel: 'top',
            },
        ],
    },
    {
        key: 'me',
        label: '个人中心',
        desc: '查看记录',
        subs: [
            { kind: 'click', target: 'nav-me', text: '点一下亮起来的「个人中心」。' },
            {
                kind: 'view',
                target: 'page:me',
                text: '这里能看到你的总分、近期趋势和今天的完成情况。看完点「完成」。',
                button: '完成',
                panel: 'top',
            },
        ],
    },
];

export const COMPANION_STEPS: TourStep[] = [
    {
        key: 'greeting',
        label: '今天的问候',
        desc: '回答 5 个问题',
        subs: [
            { kind: 'click', target: 'senior-nav-home', text: '先点一下亮起来的「今天」。' },
            { kind: 'click', target: 'senior-start-greeting', text: '点一下亮起来的这个按钮，开始今天的问候。' },
            {
                kind: 'task',
                target: 'page:companion',
                event: 'senior-greeting-done',
                text: '我会问您 5 个问题。可以按话筒说，也可以打字或点选。每题答完点「继续下一步」。',
                panel: 'top',
            },
        ],
    },
    {
        key: 'summary',
        label: '看建议',
        desc: '一张一张看',
        subs: [
            {
                kind: 'view',
                target: 'page:companion',
                interactive: true,
                text: '这是根据您的回答整理的建议，可以一张一张翻着看。看完点「下一步」。',
                button: '看完了，下一步',
                panel: 'top',
            },
        ],
    },
    {
        key: 'chat',
        label: '聊一聊',
        desc: '说一句或打一句',
        subs: [
            { kind: 'click', target: 'senior-nav-chat', text: '点一下亮起来的「聊聊」。' },
            {
                kind: 'task',
                target: 'page:chat',
                event: 'senior-chat-replied',
                text: '按话筒说一句，或者打一句话，发出去，等我回复。',
                panel: 'top',
            },
        ],
    },
    {
        key: 'relax',
        label: '放松练习',
        desc: '选一个做',
        subs: [
            { kind: 'click', target: 'senior-nav-relax', text: '点一下亮起来的「放松」。' },
            {
                kind: 'task',
                target: 'page:relax',
                event: 'senior-relax-done',
                text: '选一个练习，跟着做。做好了点「我做完了」。',
                panel: 'top',
            },
        ],
    },
    {
        key: 'checkup',
        label: '小测',
        desc: '一题一题答',
        subs: [
            { kind: 'click', target: 'senior-nav-checkup', text: '点一下亮起来的「小测」。' },
            {
                kind: 'task',
                target: 'page:checkup',
                event: 'senior-checkup-done',
                text: '一题一题回答，答完会给您结果。',
                panel: 'top',
            },
            {
                kind: 'view',
                target: 'page:checkup',
                interactive: true,
                text: '这是小测的结果和今天能做的一步。看完点「下一步」。',
                button: '看完了，下一步',
                panel: 'top',
            },
        ],
    },
    {
        key: 'help',
        label: '找帮助',
        desc: '知道按钮在哪',
        subs: [
            { kind: 'click', target: 'senior-nav-help', text: '点一下亮起来的「帮助」。' },
            {
                kind: 'view',
                target: 'page:help',
                text: '这里有可以打的支持电话和您的联系人。现在不用拨打，看一看就好。',
                button: '下一步',
                panel: 'top',
            },
            {
                kind: 'view',
                target: 'senior-help-button',
                text: '不舒服的时候，随时点页面最上面这个红色的「需要帮助」按钮。现在不用点，看完点「完成」。',
                button: '完成',
            },
        ],
    },
];

export const TOUR_STEPS: Record<TourMode, TourStep[]> = {
    standard: STANDARD_STEPS,
    companion: COMPANION_STEPS,
};

export const MODE_LABEL: Record<TourMode, string> = { standard: '标准版', companion: '陪伴版' };
