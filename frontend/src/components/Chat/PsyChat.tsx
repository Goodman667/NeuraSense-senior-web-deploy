/**
 * Premium Psychological Counseling Chat Interface
 *
 * Features:
 * - Modern glassmorphism UI with gradient accents
 * - Voice input via Web Speech API
 * - Non-blocking TTS (can send messages while bot is speaking)
 * - Typing indicators
 * - Message timestamps
 * - Emotion indicators
 * - Structured exercise integration (CBT Thought Record, Behavior Activation)
 */

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import { API_BASE } from '../../config/api';

// ==================== Types ====================

interface ExerciseAction {
    type: 'OPEN_EXERCISE';
    exercise: 'THOUGHT_RECORD' | 'BEHAVIOR_ACTIVATION';
    context?: { trigger_thought?: string; trigger_context?: string };
}

type AssessmentMode = 'text_only' | 'multimodal';
type HiddenDistressRisk = 'low' | 'moderate' | 'high';
type InnovationKind = 'A' | 'B' | null;
type InsightChipTone = 'rose' | 'emerald' | 'amber' | 'slate';

interface InsightContent {
    kind?: string;
    title: string;
    subtitle: string;
    focus: string;
    explanation: string;
    whyPopup: string[];
    suggestions: string[];
    note: string;
    cardTitle: string;
    cardBadge: string;
    actionLabel: string;
    chipTone: InsightChipTone;
}

interface InnovationReference {
    code: 'A' | 'B';
    label: string;
    summary: string;
}

interface BackendInsightPayload {
    kind?: string;
    title?: string;
    subtitle?: string;
    focus?: string;
    explanation?: string;
    why_popup?: string[];
    whyPopup?: string[];
    suggestions?: string[];
    note?: string;
    card_title?: string;
    cardTitle?: string;
    card_badge?: string;
    cardBadge?: string;
    action_label?: string;
    actionLabel?: string;
    chip_tone?: InsightChipTone | string;
    chipTone?: InsightChipTone | string;
    show?: boolean;
    should_show?: boolean;
    shouldShow?: boolean;
}

interface SensorSnapshot {
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    fatigueIndex: number;
    blinkRate: number;
    jitterPercent: number;
    shimmerPercent: number;
    speakingDuration: number;
    silenceDuration: number;
    keystrokeAnxiety: number;
    keystrokeFocus: number;
    totalKeystrokes: number;
}

interface DemoInsight {
    assessmentMode?: AssessmentMode;
    phq9Score?: number;
    hiddenDistressRisk?: HiddenDistressRisk | null;
    hiddenDistressHdi?: number | null;
    sensorSnapshot?: SensorSnapshot;
    userText?: string;
    innovationKind?: InnovationKind;
    showDemoCard?: boolean;
    isCrisis?: boolean;
    structuredContent?: InsightContent | null;
}

interface InnovationModalState {
    insight: DemoInsight;
}

interface SensorPanelState {
    camera: {
        isRunning: boolean;
        error?: string | null;
        blinkRate: number;
        fatigueIndex: number;
        fatigueLevel: string;
        isTracking: boolean;
        videoRef?: RefObject<HTMLVideoElement | null>;
        canvasRef?: RefObject<HTMLCanvasElement | null>;
        onToggle: () => void;
    };
    microphone: {
        isRunning: boolean;
        permissionStatus: 'granted' | 'denied' | 'prompt';
        error?: string | null;
        jitterPercent: number;
        shimmerPercent: number;
        speakingDuration: number;
        silenceDuration: number;
        isSpeaking: boolean;
        onToggle: () => void;
    };
    keystroke: {
        isActive: boolean;
        anxietyIndex: number;
        focusScore: number;
        totalKeystrokes: number;
        typingSpeed: number;
    };
    aggregator: {
        isCollecting: boolean;
        sampleCount: number;
    };
    multimodalReady: boolean;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    emotion?: string;
    isSpeaking?: boolean;
    action?: ExerciseAction;
    insight?: DemoInsight;
}

interface ChatSession {
    id: string;
    title: string;
    updatedAt: string;
    messages: ChatMessage[];
}

interface PsyChatProps {
    onSendMessage: (message: string, history?: ChatMessage[]) => Promise<{
        reply_text: string;
        risk_flag?: boolean;
        avatar_command?: {
            emotion?: string;
            enable_entrainment?: boolean;
        };
        action?: ExerciseAction;
        phq9_score?: number;
        assessment_mode?: AssessmentMode;
        hidden_distress_risk?: HiddenDistressRisk | null;
        hidden_distress_hdi?: number | null;
        insight?: BackendInsightPayload | null;
        ui_insight?: BackendInsightPayload | null;
        support_insight?: BackendInsightPayload | null;
    }>;
    onSpeak?: (text: string, emotion?: string) => void;
    onStopSpeaking?: () => void;
    isSpeaking?: boolean;
    onBack?: () => void;
    authToken?: string | null;
    userId?: string;
    sensorPanel?: SensorPanelState;
    onCrisisDetected?: () => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);
const CHAT_SESSIONS_KEY = 'neurasense-chat-sessions-v2';
const AUTO_READ_KEY = 'neurasense-chat-auto-read';
const INITIAL_ASSISTANT_TEXT = '你好，我是小心。你可以直接说最近发生了什么，我会先听你说完，再一起把事情理清楚。';

const createInitialMessages = (): ChatMessage[] => [
    {
        id: generateId(),
        role: 'assistant',
        text: INITIAL_ASSISTANT_TEXT,
        timestamp: new Date(),
        emotion: 'friendly',
    },
];

const reviveMessage = (message: ChatMessage): ChatMessage => ({
    ...message,
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
});

const readStoredChatSessions = (): ChatSession[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(CHAT_SESSIONS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ChatSession[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(session => session?.id && Array.isArray(session.messages))
            .map(session => ({
                ...session,
                title: session.title || '新的对话',
                updatedAt: session.updatedAt || new Date().toISOString(),
                messages: session.messages.map(reviveMessage),
            }))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 30);
    } catch (error) {
        console.warn('Failed to read chat sessions:', error);
        return [];
    }
};

const createChatBootstrap = () => {
    const stored = readStoredChatSessions();
    if (stored.length > 0) {
        return {
            sessions: stored,
            activeSessionId: stored[0].id,
            messages: stored[0].messages.length > 0 ? stored[0].messages : createInitialMessages(),
        };
    }

    const id = generateId();
    const messages = createInitialMessages();
    return {
        sessions: [{
            id,
            title: '新的对话',
            updatedAt: new Date().toISOString(),
            messages,
        }],
        activeSessionId: id,
        messages,
    };
};

const deriveSessionTitle = (messages: ChatMessage[]) => {
    const firstUserMessage = messages.find(message => message.role === 'user')?.text.trim();
    if (!firstUserMessage) return '新的对话';
    return firstUserMessage.length > 18 ? `${firstUserMessage.slice(0, 18)}…` : firstUserMessage;
};

const formatSessionTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay
        ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

// Format time
const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const normalizeChipTone = (value?: string): InsightChipTone => {
    if (value === 'rose' || value === 'emerald' || value === 'amber' || value === 'slate') {
        return value;
    }
    return 'slate';
};

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const sanitizeInsightList = (value: unknown, fallback: string[] = []) => {
    if (!Array.isArray(value)) return fallback;
    const items = value.filter((item): item is string => isNonEmptyString(item));
    return items.length > 0 ? items : fallback;
};

const CALM_MASKING_CUES = [
    '我还好',
    '还好',
    '没事',
    '没什么事',
    '没什么大事',
    '我能扛',
    '扛得住',
    '挺得住',
    '不用担心',
    '我可以',
];

const getInnovationKind = (insight: DemoInsight): InnovationKind => {
    if (insight.hiddenDistressRisk === 'moderate' || insight.hiddenDistressRisk === 'high') {
        return 'B';
    }

    if (insight.assessmentMode === 'multimodal') {
        return 'A';
    }

    return null;
};

const hasCalmMaskingCue = (text?: string) => {
    if (!text) return false;
    return CALM_MASKING_CUES.some((cue) => text.includes(cue));
};

const quoteUserText = (text?: string) => {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    return trimmed.length > 24 ? `${trimmed.slice(0, 24)}...` : trimmed;
};

const detectStateTopics = (text?: string) => {
    const value = text || '';
    return {
        sleep: /失眠|睡不着|睡眠|睡不好|睡不好觉/.test(value),
        fatigue: /累|疲惫|疲劳|没精神|精力差|撑不住|扛不住|透支/.test(value),
        focus: /分心|注意力|专注|集中不起来/.test(value),
        mood: /难受|压抑|灰暗|没兴趣|提不起劲|低落|麻木|烦死了/.test(value),
        anxiety: /焦虑|紧张|心慌|慌|喘不过气|胸口闷|害怕|不安/.test(value),
        pressure: /压力|崩溃|压得|顶不住|撑不下去|好烦|好痛苦|太难了/.test(value),
        hopeless: /没希望|没有希望|活着没意思|不想继续|不如消失|放弃算了/.test(value),
        crisis: /自杀|自残|不想活|想死|死了算了|结束生命|伤害自己|一了百了|遗书/.test(value),
        masking: hasCalmMaskingCue(value),
    };
};

const hasNotableDistressCue = (text?: string) => {
    const topics = detectStateTopics(text);
    return Boolean(
        topics.sleep ||
        topics.fatigue ||
        topics.focus ||
        topics.mood ||
        topics.anxiety ||
        topics.pressure ||
        topics.hopeless ||
        topics.crisis,
    );
};

const summarizeStateTopics = (text?: string) => {
    const topics = detectStateTopics(text);
    const labels: string[] = [];

    if (topics.sleep) labels.push('睡眠');
    if (topics.fatigue) labels.push('疲惫');
    if (topics.focus) labels.push('注意力');
    if (topics.anxiety) labels.push('紧张不安');
    if (topics.pressure) labels.push('压力');
    if (topics.mood) labels.push('情绪低落');
    if (topics.hopeless) labels.push('失去希望');

    return labels.slice(0, 3);
};

const formatTopicSummary = (labels: string[]) => {
    if (labels.length === 0) return '';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]}和${labels[1]}`;
    return `${labels[0]}、${labels[1]}和${labels[2]}`;
};

const buildMultimodalReasons = (snapshot?: SensorSnapshot, userText?: string) => {
    const reasons: string[] = [];
    const quotedText = quoteUserText(userText);

    if (quotedText) {
        reasons.push(`你刚才提到“${quotedText}”，说明这些感受已经影响到你当下的状态。`);
    }
    if (snapshot?.cameraEnabled && snapshot?.microphoneEnabled) {
        reasons.push('这次我不只参考了你说的话，也一起参考了你的语音和眼动变化。');
    } else if (snapshot?.cameraEnabled) {
        reasons.push('这次除了你说的话，我也参考了你这轮的眼动和疲劳变化。');
    } else if (snapshot?.microphoneEnabled) {
        reasons.push('这次除了你说的话，我也参考了你这轮的语气、停顿和声音状态。');
    }
    if (snapshot?.totalKeystrokes && snapshot.totalKeystrokes > 0) {
        reasons.push('这次还参考了你的输入节奏，所以提醒会比只看一句话更细一点。');
    }
    reasons.push('我是在聊天过程中持续理解你的状态，而不是让你跳出去单独做一次量表。');

    return reasons.slice(0, 4);
};

const buildDiscordanceReasons = (snapshot?: SensorSnapshot, userText?: string) => {
    const reasons: string[] = [];
    const quotedText = quoteUserText(userText);

    if (hasCalmMaskingCue(userText) && quotedText) {
        reasons.push(`你刚才说“${quotedText}”，听起来像是在让自己撑住。`);
    }
    if (snapshot?.cameraEnabled && snapshot.fatigueIndex >= 20) {
        reasons.push('但你的眼动状态显示，你这会儿其实已经有些疲惫了。');
    }
    if (snapshot?.microphoneEnabled && (snapshot.jitterPercent >= 2 || snapshot.shimmerPercent >= 5)) {
        reasons.push('你的声音里有一点紧绷感，比文字里表现出来的更明显。');
    }
    if (snapshot?.microphoneEnabled && (snapshot.speakingDuration > 0 || snapshot.silenceDuration > 0)) {
        reasons.push('你这轮说话和停顿的节奏，也像是在勉强撑着。');
    }
    if (snapshot?.totalKeystrokes && snapshot.keystrokeAnxiety >= 50) {
        reasons.push('你的输入节奏也有点急，像是心里其实并没有那么轻松。');
    }

    if (reasons.length === 0) {
        reasons.push('这轮对话里的身体和语音线索，比你说出来的感受更紧一些。');
    }

    return reasons.slice(0, 4);
};

const buildSupportSuggestions = (insight: DemoInsight, innovationKind: InnovationKind) => {
    const suggestions: string[] = [];
    const topics = detectStateTopics(insight.userText);

    if (innovationKind === 'B') {
        if (hasCalmMaskingCue(insight.userText)) {
            suggestions.push('如果你愿意，可以把“我还好”换成更具体的一句，比如“我其实有点累，只是不想让别人担心”。');
        }
        suggestions.push('先停 1 分钟，慢慢呼气几次，让身体先从“硬撑着”里松一点。');
        suggestions.push('今晚尽量少给自己安排一件最消耗你的事，把精力优先留给休息。');
        suggestions.push('如果这种“嘴上说没事、其实很累”的状态最近经常出现，我们可以继续把它聊得更具体一点。');
        return suggestions.slice(0, 4);
    }

    if (topics.sleep) {
        suggestions.push('今晚尽量提前 30 分钟放下屏幕，把脑子里最烦的一件事写下来后再休息。');
    }
    if (topics.fatigue) {
        suggestions.push('今天先给自己留出 10 分钟空白，不做决定，只让身体缓一缓。');
    }
    if (topics.focus) {
        suggestions.push('把接下来要做的事缩小成 10 分钟内能完成的一小步，先别要求自己一下子恢复。');
    }
    if (topics.anxiety) {
        suggestions.push('先把注意力拉回身体，慢慢吸气 4 秒、呼气 6 秒，重复几轮，让紧绷感先降一点。');
    }
    if (topics.pressure) {
        suggestions.push('先别逼自己一次把所有问题都解决，挑一件最急的事，我们一点点拆开。');
    }
    if (topics.mood) {
        suggestions.push('先别急着逼自己振作，你可以先告诉我，现在最压着你的那件事是什么。');
    }
    if (topics.hopeless) {
        suggestions.push('如果你已经开始觉得什么都撑不住了，先别一个人扛着，尽量立刻联系一个你信得过的人。');
    }
    if (suggestions.length === 0) {
        suggestions.push('如果你愿意，可以先告诉我现在最困扰你的那一件事，我陪你一起慢慢拆开。');
    }
    suggestions.push('如果这些困扰已经连续出现了几天，我们可以继续聊聊它最影响你生活的哪个部分。');

    return suggestions.slice(0, 4);
};

const normalizeInsightPayload = (payload?: BackendInsightPayload | null): (InsightContent & { shouldShow?: boolean }) | null => {
    if (!payload) return null;

    const title = payload.title?.trim();
    const subtitle = payload.subtitle?.trim();
    const focus = payload.focus?.trim();
    const explanation = payload.explanation?.trim();
    const note = payload.note?.trim();
    const cardTitle = (payload.cardTitle ?? payload.card_title)?.trim();
    const cardBadge = (payload.cardBadge ?? payload.card_badge)?.trim();
    const actionLabel = (payload.actionLabel ?? payload.action_label)?.trim();
    const whyPopup = sanitizeInsightList(payload.whyPopup ?? payload.why_popup);
    const suggestions = sanitizeInsightList(payload.suggestions);

    if (!title || !subtitle || !focus || !explanation || !note || !cardTitle || !cardBadge || !actionLabel) {
        return null;
    }

    return {
        kind: payload.kind,
        title,
        subtitle,
        focus,
        explanation,
        whyPopup,
        suggestions,
        note,
        cardTitle,
        cardBadge,
        actionLabel,
        chipTone: normalizeChipTone(payload.chipTone ?? payload.chip_tone),
        shouldShow: payload.shouldShow ?? payload.should_show ?? payload.show,
    };
};

const extractBackendInsight = (
    response: {
        insight?: BackendInsightPayload | null;
        ui_insight?: BackendInsightPayload | null;
        support_insight?: BackendInsightPayload | null;
    },
) => normalizeInsightPayload(
    response.insight ?? response.ui_insight ?? response.support_insight ?? null,
);

const getInnovationReference = (
    insight: DemoInsight,
    content: InsightContent,
): InnovationReference | null => {
    const innovationKind = insight.innovationKind ?? getInnovationKind(insight);

    if (innovationKind === 'B' || content.kind === 'discordance') {
        return {
            code: 'B',
            label: '基于跨模态不一致性的隐性痛苦检测',
            summary: '这一轮会结合你表达出来的内容，以及语音、眼动或输入节奏之间的差异，进一步留意那些没有直接说出口的压力、压抑或痛苦信号。',
        };
    }

    if (
        innovationKind === 'A'
        || content.kind === 'multimodal'
        || content.kind === 'support'
        || (insight.assessmentMode === 'multimodal' && !insight.isCrisis)
    ) {
        return {
            code: 'A',
            label: '多模态嵌入式对话评估',
            summary: '这一轮会把评估自然嵌入聊天过程里，持续结合你的文字表达和当下状态变化，更完整地理解你现在的处境与感受。',
        };
    }

    return null;
};

const getCrisisInsightContent = (insight: DemoInsight): InsightContent => {
    const quotedText = quoteUserText(insight.userText);

    return {
        title: '我现在更担心你的安全',
        subtitle: '这条信息说明你可能正处在非常难熬的时刻',
        focus: quotedText
            ? `你刚才提到“${quotedText}”，这已经不是普通的情绪波动了，我想先把你的安全放在最前面。`
            : '你刚才表达出的内容让我非常担心，我想先把你的安全放在最前面。',
        explanation: '现在最重要的不是一个人继续硬扛，而是尽快联系身边的人或专业援助，让你先稳定下来。',
        whyPopup: [
            quotedText
                ? `你刚才直接提到了“${quotedText}”，这是需要立刻认真对待的信号。`
                : '你刚才表达了明显的自伤或轻生想法，这是需要立刻认真对待的信号。',
            '这种时候先确保有人能陪着你，比继续一个人消化这些感觉更重要。',
        ],
        suggestions: [
            '请现在就联系一个你信得过的人，让对方知道你需要陪伴，不要独自待着。',
            '如果你觉得自己随时可能伤害自己，请立刻拨打心理援助热线或直接去最近的急诊。',
            '先把身边可能伤害到自己的物品挪远一点，然后告诉我你现在是不是一个人。',
        ],
        note: '这不是小题大做，而是因为你现在值得被立刻保护和支持。',
        cardTitle: '安全提醒',
        cardBadge: '请优先求助',
        actionLabel: '查看紧急建议',
        chipTone: 'rose',
    };
};

const getInnovationModalContent = (insight: DemoInsight): InsightContent => {
    if (insight.structuredContent) {
        return insight.structuredContent;
    }

    if (insight.isCrisis) {
        return getCrisisInsightContent(insight);
    }

    const hdi = insight.hiddenDistressHdi ?? 0;
    const phq9 = insight.phq9Score ?? 0;
    const innovationKind = insight.innovationKind ?? getInnovationKind(insight);
    const multimodalReasons = buildMultimodalReasons(insight.sensorSnapshot, insight.userText);
    const discordanceReasons = buildDiscordanceReasons(insight.sensorSnapshot, insight.userText);
    const topicLabels = summarizeStateTopics(insight.userText);
    const topicSummary = formatTopicSummary(topicLabels);
    const quotedText = quoteUserText(insight.userText);

    if (innovationKind === 'B') {
        return {
            title: '我想提醒你一下',
            subtitle: '你现在可能比自己说出来的更辛苦一点',
            focus: '你刚才看起来像是在说“没事，我能扛住”，但这轮状态线索显示你其实已经有点累了。',
            explanation: '这不是在给你贴标签，而是在提醒你别一直一个人硬撑。',
            whyPopup: discordanceReasons,
            note: `这次提醒更像是在说：你说出来的轻松感，和身体表现出来的紧绷感之间有一点落差。${hdi > 0 ? ` 这轮这种落差比前面更明显一些。` : ''}`,
            suggestions: buildSupportSuggestions(insight, 'B'),
            cardTitle: '状态提醒',
            cardBadge: '建议多留意',
            actionLabel: '查看建议',
            chipTone: 'rose',
        };
    }

    if (innovationKind === 'A') {
        const focusText = topicSummary
            ? `你刚才已经提到了${topicSummary}上的吃力，所以我想给你一个更贴近当下的提醒。`
            : quotedText
                ? `你刚才提到“${quotedText}”，所以我想给你一个更贴近当下的提醒。`
                : '这轮我感觉到你现在并不轻松，所以想先给你一个更贴近当下的提醒。';

        return {
            title: '我留意到你最近有点吃力',
            subtitle: '这轮我结合了你说的话和当下状态来理解你',
            focus: focusText,
            explanation: phq9 > 0
                ? '这说明这些感受已经开始影响睡眠、精力或专注，而不只是“想太多”。'
                : '虽然你没有把难受说得很重，但这轮状态线索已经提示我需要多关照你一下。',
            whyPopup: multimodalReasons.length > 0 ? multimodalReasons : ['这轮我不只参考了文字，也参考了更多当下状态线索。'],
            note: hdi <= 0.001
                ? '这次提醒并不是在说你隐藏了情绪，而是在帮你更早看见自己的状态。'
                : '这次除了你说的话，我也看到了一些状态上的轻微波动，所以提醒会更细一些。',
            suggestions: buildSupportSuggestions(insight, 'A'),
            cardTitle: '状态小结',
            cardBadge: '已结合更多线索',
            actionLabel: '查看我可以怎么帮你',
            chipTone: 'emerald',
        };
    }

    return {
        title: '我们可以慢慢来',
        subtitle: '这轮我主要还是根据你说的话来陪你',
        focus: '我暂时还没有拿到足够多的状态线索，所以这轮主要根据你的文字来理解你。',
        explanation: '这并不影响我们继续聊，如果你愿意，后面也可以再开启麦克风或摄像头。',
        whyPopup: ['目前我主要参考了你说的话。'],
        note: '不用急着一次把所有事都说清楚，你可以先从最困扰你的那一件说起。',
        suggestions: ['如果你一时不知道从哪里开始，可以先告诉我：最近最影响你的一件事是什么？'],
        cardTitle: '状态提示',
        cardBadge: '文字为主',
        actionLabel: '查看建议',
        chipTone: 'slate',
    };
};

const CaptureChannelCard = ({
    title,
    status,
    detail,
    tone,
    actionLabel,
    onAction,
}: {
    title: string;
    status: string;
    detail: string;
    tone: 'active' | 'idle' | 'warn';
    actionLabel: string;
    onAction: () => void;
}) => {
    const toneClass = tone === 'active'
        ? 'border-emerald-200 bg-emerald-50'
        : tone === 'warn'
            ? 'border-amber-200 bg-amber-50'
            : 'border-slate-200 bg-slate-50';

    return (
        <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-500">{title}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{status}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
                </div>
                <button
                    onClick={onAction}
                    className="rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
};

const RealtimeCapturePanel = ({
    sensorPanel,
    onUseDemoPrompt,
}: {
    sensorPanel: SensorPanelState;
    onUseDemoPrompt: (text: string) => void;
}) => {
    const cameraTone = sensorPanel.camera.error
        ? 'warn'
        : sensorPanel.camera.isRunning
            ? 'active'
            : 'idle';
    const microphoneTone = sensorPanel.microphone.error || sensorPanel.microphone.permissionStatus === 'denied'
        ? 'warn'
        : sensorPanel.microphone.isRunning
            ? 'active'
            : 'idle';

    return (
        <div className="mb-4 rounded-3xl border border-violet-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-warm-800">状态辅助</p>
                    <p className="text-xs text-warm-500">如果你开启了摄像头或麦克风，我会把这轮对话里的更多线索一起纳入参考。</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    sensorPanel.multimodalReady
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}>
                    {sensorPanel.multimodalReady ? '更多线索已开启' : '当前主要根据文字理解'}
                </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
                <CaptureChannelCard
                    title="摄像头辅助"
                    status={sensorPanel.camera.isRunning ? '辅助中' : '未开启'}
                    detail={sensorPanel.camera.error
                        ? sensorPanel.camera.error
                        : sensorPanel.camera.isRunning
                            ? '已开启，我会额外参考你这轮的眼动和疲惫变化。'
                            : '开启后，我会额外参考眼动和疲惫状态。'}
                    tone={cameraTone}
                    actionLabel={sensorPanel.camera.isRunning ? '关闭' : '开启'}
                    onAction={sensorPanel.camera.onToggle}
                />

                <CaptureChannelCard
                    title="麦克风辅助"
                    status={sensorPanel.microphone.isRunning ? (sensorPanel.microphone.isSpeaking ? '辅助中' : '监听中') : '未开启'}
                    detail={sensorPanel.microphone.error
                        ? sensorPanel.microphone.error
                        : sensorPanel.microphone.isRunning
                            ? '已开启，我会额外参考语气、停顿和声音波动。'
                            : '开启后，我会额外参考语气、停顿和声音变化。'}
                    tone={microphoneTone}
                    actionLabel={sensorPanel.microphone.isRunning ? '关闭' : '开启'}
                    onAction={sensorPanel.microphone.onToggle}
                />

                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3">
                    <p className="text-xs text-slate-500">输入节奏</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {sensorPanel.keystroke.isActive ? '已纳入参考' : '等待输入'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                        {sensorPanel.keystroke.totalKeystrokes > 0
                            ? '这轮输入时的节奏和停顿变化，也会一起帮助我理解你当前的状态。'
                            : '开始输入后，我会把你的输入节奏一起纳入参考。'}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[240px_1fr]">
                <div className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3">
                    <p className="text-xs text-violet-500">辅助状态</p>
                    <p className="mt-1 text-sm font-semibold text-violet-800">
                        {sensorPanel.aggregator.isCollecting ? '这轮线索正在持续更新' : '发送后会开始同步判断'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-violet-700">
                        {sensorPanel.aggregator.isCollecting
                            ? '我会在不打断对话的前提下，持续结合这轮对话里的文字、语音或状态变化。'
                            : '你正常聊天就好；发送消息后，我会结合当前已开启的辅助线索来理解你。'}
                    </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3">
                    <p className="text-xs text-amber-600">温和提示</p>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                        只打字也可以正常聊天；如果你开启摄像头或麦克风，我会在不打断聊天的前提下，多参考一些当下状态。
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 px-3 py-3">
                <p className="text-xs text-purple-500">试试这样开口</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    <button
                        onClick={() => onUseDemoPrompt('最近经常失眠，也经常觉得累，工作时容易分心。')}
                        className="rounded-full bg-white px-3 py-1.5 text-sm text-purple-700 shadow-sm transition hover:bg-purple-100"
                    >
                        最近经常失眠，也觉得累
                    </button>
                    <button
                        onClick={() => onUseDemoPrompt('其实我还好，没什么大事，我能扛得住。')}
                        className="rounded-full bg-white px-3 py-1.5 text-sm text-purple-700 shadow-sm transition hover:bg-purple-100"
                    >
                        其实我还好，我能扛住
                    </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-purple-700">
                    第二句更适合在开启摄像头或麦克风后试试，这样我更容易留意到你是不是在勉强撑着。
                </p>
            </div>

            {sensorPanel.camera.videoRef && sensorPanel.camera.canvasRef && (
                <div className={sensorPanel.camera.isRunning ? 'mt-4 rounded-2xl border border-warm-100 bg-warm-50 p-3' : 'hidden'}>
                    <p className="mb-2 text-xs font-medium text-warm-600">摄像头预览</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <video
                            ref={sensorPanel.camera.videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full rounded-2xl bg-slate-900 object-cover"
                        />
                        <canvas
                            ref={sensorPanel.camera.canvasRef}
                            width={640}
                            height={480}
                            className="w-full rounded-2xl bg-slate-900 object-cover"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


// ==================== Exercise Components ====================

/** ThoughtRecordExercise — 4-step CBT thought record */
const ThoughtRecordExercise = ({
    context,
    onFinish,
}: {
    context?: { trigger_thought?: string };
    onFinish: (data: Record<string, string>) => void;
}) => {
    const [step, setStep] = useState(0);
    const [values, setValues] = useState([
        context?.trigger_thought || '',
        '',
        '',
        '',
    ]);

    const steps = [
        { title: '自动化想法', prompt: '刚才脑海中浮现了什么自动化的消极想法？', placeholder: '例如：我总是做不好任何事情...' },
        { title: '证据支持', prompt: '有什么证据支持这个想法？', placeholder: '例如：上次项目确实出了一些问题...' },
        { title: '证据反驳', prompt: '有什么证据反驳这个想法？', placeholder: '例如：其实上个月的项目我做得不错，同事也夸奖过我...' },
        { title: '更平衡的想法', prompt: '综合两方面的证据，有没有更平衡的看法？', placeholder: '例如：虽然有时候会出错，但我也有做得好的时候，我在不断进步...' },
    ];

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            onFinish({
                automatic_thought: values[0],
                supporting_evidence: values[1],
                counter_evidence: values[2],
                balanced_thought: values[3],
            });
        }
    };

    return (
        <div className="py-4">
            <div className="flex justify-between mb-6">
                {steps.map((_, i) => (
                    <div key={i} className="flex items-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= step ? 'bg-purple-600 text-white' : 'bg-warm-100 text-warm-300'}`}>
                            {i + 1}
                        </span>
                        {i < 3 && <div className={`w-8 h-0.5 ${i < step ? 'bg-purple-600' : 'bg-warm-200'}`} />}
                    </div>
                ))}
            </div>
            <h4 className="font-bold text-warm-800 mb-2">{steps[step].title}</h4>
            <p className="text-warm-600 text-sm mb-3">{steps[step].prompt}</p>
            <textarea
                value={values[step]}
                onChange={(e) => {
                    const newValues = [...values];
                    newValues[step] = e.target.value;
                    setValues(newValues);
                }}
                placeholder={steps[step].placeholder}
                className="w-full p-3 border border-warm-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
            />
            <button
                onClick={handleNext}
                disabled={!values[step].trim()}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
                {step < 3 ? '下一步' : '完成练习'}
            </button>
        </div>
    );
};


/** BehaviorActivationExercise — 3-step action plan */
const BehaviorActivationExercise = ({
    onFinish,
}: {
    onFinish: (data: Record<string, string>) => void;
}) => {
    const [step, setStep] = useState(0);
    const [chosenAction, setChosenAction] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    const suggestedActions = [
        '散步10分钟', '给朋友发一条消息', '整理一下桌面',
        '听一首喜欢的歌', '喝一杯温水', '做5分钟拉伸',
    ];

    const steps = [
        { title: '选择一个小行动', description: '不需要很大，哪怕是一个微小的行动也是一步前进。' },
        { title: '设置时间', description: '给自己设一个具体的时间，更容易坚持。' },
        { title: '确认计划', description: '你已经制定了行动计划。' },
    ];

    return (
        <div className="py-4">
            <div className="flex justify-between mb-6">
                {steps.map((_, i) => (
                    <div key={i} className="flex items-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= step ? 'bg-green-600 text-white' : 'bg-warm-100 text-warm-300'}`}>
                            {i + 1}
                        </span>
                        {i < 2 && <div className={`w-16 h-0.5 ${i < step ? 'bg-green-600' : 'bg-warm-200'}`} />}
                    </div>
                ))}
            </div>

            <h4 className="font-bold text-warm-800 mb-2">{steps[step].title}</h4>
            <p className="text-warm-600 text-sm mb-4">{steps[step].description}</p>

            {step === 0 && (
                <>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {suggestedActions.map((action) => (
                            <button
                                key={action}
                                onClick={() => setChosenAction(action)}
                                className={`px-3 py-2 rounded-xl text-sm border transition-all ${chosenAction === action ? 'bg-green-100 border-green-400 text-green-700' : 'bg-warm-50 border-warm-200 text-warm-600 hover:bg-warm-100'}`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={chosenAction}
                        onChange={(e) => setChosenAction(e.target.value)}
                        placeholder="或者输入你自己的想法..."
                        className="w-full p-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                        onClick={() => setStep(1)}
                        disabled={!chosenAction.trim()}
                        className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
                    >
                        下一步
                    </button>
                </>
            )}

            {step === 1 && (
                <>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {['现在就做', '30分钟后', '1小时后', '今天下午', '明天上午'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setScheduledTime(t)}
                                className={`px-3 py-2 rounded-xl text-sm border transition-all ${scheduledTime === t ? 'bg-green-100 border-green-400 text-green-700' : 'bg-warm-50 border-warm-200 text-warm-600 hover:bg-warm-100'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setStep(2)}
                        disabled={!scheduledTime}
                        className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
                    >
                        下一步
                    </button>
                </>
            )}

            {step === 2 && (
                <div className="text-center py-4">
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                        <p className="text-green-800 font-medium">{chosenAction}</p>
                        <p className="text-green-600 text-sm mt-1">{scheduledTime}</p>
                    </div>
                    <button
                        onClick={() => onFinish({ chosen_action: chosenAction, scheduled_time: scheduledTime })}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium"
                    >
                        确认计划
                    </button>
                </div>
            )}
        </div>
    );
};


/** ExerciseModal — Glassmorphism overlay wrapper */
const ExerciseModal = ({
    exercise,
    context,
    onComplete,
    onDismiss,
}: {
    exercise: 'THOUGHT_RECORD' | 'BEHAVIOR_ACTIVATION';
    context?: { trigger_thought?: string; trigger_context?: string };
    onComplete: (exerciseData: Record<string, string>, postMood: number) => void;
    onDismiss: () => void;
}) => {
    const [phase, setPhase] = useState<'exercise' | 'feedback'>('exercise');
    const [exerciseResult, setExerciseResult] = useState<Record<string, string>>({});
    const [postMood, setPostMood] = useState(5);

    const config = exercise === 'THOUGHT_RECORD'
        ? { icon: '💭', title: 'CBT 思维记录', gradient: 'from-purple-500 to-indigo-500' }
        : { icon: '🎯', title: '行为激活计划', gradient: 'from-green-500 to-emerald-500' };

    const handleExerciseFinish = (data: Record<string, string>) => {
        setExerciseResult(data);
        setPhase('feedback');
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-fadeIn max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`bg-gradient-to-r ${config.gradient} p-6 text-white relative`}>
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                    <div className="flex items-center space-x-3">
                        <span className="text-4xl">{config.icon}</span>
                        <h3 className="font-bold text-xl">{config.title}</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {phase === 'exercise' && exercise === 'THOUGHT_RECORD' && (
                        <ThoughtRecordExercise context={context} onFinish={handleExerciseFinish} />
                    )}
                    {phase === 'exercise' && exercise === 'BEHAVIOR_ACTIVATION' && (
                        <BehaviorActivationExercise onFinish={handleExerciseFinish} />
                    )}
                    {phase === 'feedback' && (
                        <div className="text-center py-4">
                            <span className="text-5xl mb-4 block">🎉</span>
                            <h4 className="text-xl font-bold text-warm-800 mb-2">做得很棒！</h4>
                            <p className="text-warm-600 mb-6">现在感觉怎么样？</p>
                            <div className="mb-6">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={postMood}
                                    onChange={(e) => setPostMood(Number(e.target.value))}
                                    className="w-full accent-purple-500"
                                />
                                <div className="flex justify-between text-2xl mt-2">
                                    <span>😔</span><span>😐</span><span>😊</span>
                                </div>
                                <p className="text-warm-500 mt-2">心情: {postMood}/10</p>
                            </div>
                            <button
                                onClick={() => onComplete(exerciseResult, postMood)}
                                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium"
                            >
                                完成 ✓
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


/** ExerciseSuggestionCard — Non-intrusive card below assistant message */
const ExerciseSuggestionCard = ({
    exercise,
    onAccept,
    onDismiss,
}: {
    exercise: 'THOUGHT_RECORD' | 'BEHAVIOR_ACTIVATION';
    onAccept: () => void;
    onDismiss: () => void;
}) => {
    const config = exercise === 'THOUGHT_RECORD'
        ? { icon: '💭', title: '认知重构练习', desc: '记录想法，换个角度看问题', gradient: 'from-purple-500 to-indigo-500' }
        : { icon: '🎯', title: '行为激活练习', desc: '选择一个小行动，迈出第一步', gradient: 'from-green-500 to-emerald-500' };

    return (
        <div className="mt-2 ml-8 max-w-[70%] animate-fadeIn">
            <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                        <p className="font-medium text-warm-800 text-sm">{config.title}</p>
                        <p className="text-warm-500 text-xs">{config.desc}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={onAccept}
                        className={`flex-1 py-2 bg-gradient-to-r ${config.gradient} text-white rounded-xl text-sm font-medium`}
                    >
                        试试看
                    </button>
                    <button
                        onClick={onDismiss}
                        className="px-3 py-2 text-warm-400 hover:text-warm-600 text-sm"
                    >
                        稍后
                    </button>
                </div>
            </div>
        </div>
    );
};

const DemoInsightCard = ({
    insight,
    onOpenDetails,
}: {
    insight: DemoInsight;
    onOpenDetails: () => void;
}) => {
    const modalContent = getInnovationModalContent(insight);
    const reasonPreview = modalContent.whyPopup.slice(0, 2);
    const badgeTone = modalContent.chipTone === 'rose'
        ? 'border-rose-200 bg-rose-100 text-rose-700'
        : modalContent.chipTone === 'emerald'
            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
            : modalContent.chipTone === 'amber'
                ? 'border-amber-200 bg-amber-100 text-amber-700'
            : 'border-slate-200 bg-slate-100 text-slate-700';
    const cardBorderTone = modalContent.chipTone === 'rose'
        ? 'border-rose-200'
        : modalContent.chipTone === 'emerald'
            ? 'border-emerald-200'
        : modalContent.chipTone === 'amber'
            ? 'border-amber-200'
            : 'border-violet-200';

    return (
        <div className={`mt-3 ml-8 max-w-[70%] rounded-2xl border bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm ${cardBorderTone}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-warm-800">{modalContent.cardTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-warm-700">{modalContent.focus}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeTone}`}>
                    {modalContent.cardBadge}
                </span>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs text-slate-500">我留意到</p>
                <div className="mt-2 space-y-2">
                    {reasonPreview.map((reason) => (
                        <div key={reason} className="flex gap-2 text-sm leading-6 text-slate-700">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>{reason}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 rounded-2xl bg-violet-50 px-3 py-3">
                <p className="text-xs text-violet-500">我想先这样帮你</p>
                <p className="mt-1 text-sm leading-6 text-violet-900">{modalContent.explanation}</p>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    onClick={onOpenDetails}
                    className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-violet-600 hover:to-purple-700"
                >
                    {modalContent.actionLabel}
                </button>
            </div>
        </div>
    );
};

const InnovationExplainModal = ({
    state,
    onClose,
}: {
    state: InnovationModalState | null;
    onClose: () => void;
}) => {
    if (!state) return null;

    const content = getInnovationModalContent(state.insight);
    const innovationReference = getInnovationReference(state.insight, content);
    const innovationTone = innovationReference?.code === 'B'
        ? 'border-rose-100 bg-rose-50/80 text-rose-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="border-b border-purple-100 bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="mt-1 text-2xl font-bold">{content.title}</h3>
                            <p className="mt-2 text-sm text-white/85">{content.subtitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full bg-white/15 px-3 py-1.5 text-sm transition hover:bg-white/25"
                        >
                            关闭
                        </button>
                    </div>
                </div>

                <div className="space-y-5 px-6 py-6">
                    <div className="rounded-2xl bg-violet-50 px-4 py-4">
                        <p className="text-xs text-violet-500">我为什么想提醒你</p>
                        <p className="mt-1 text-base font-semibold text-violet-900">{content.focus}</p>
                        <p className="mt-2 text-sm leading-6 text-violet-800">{content.explanation}</p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
                        <p className="text-xs text-amber-600">我留意到的线索</p>
                        <div className="mt-2 space-y-2">
                            {content.whyPopup.map((reason) => (
                                <div key={reason} className="flex gap-2 text-sm leading-6 text-amber-900">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span>{reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                        <p className="text-xs text-emerald-600">你现在可以先试试</p>
                        <div className="mt-2 space-y-2">
                            {content.suggestions.map((suggestion) => (
                                <div key={suggestion} className="flex gap-2 text-sm leading-6 text-emerald-900">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span>{suggestion}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                        <p className="text-xs text-sky-600">这意味着什么</p>
                        <p className="mt-2 text-sm leading-6 text-sky-900">{content.note}</p>
                    </div>

                    {innovationReference && (
                        <div className={`rounded-2xl border px-4 py-4 ${innovationTone}`}>
                            <div className="flex items-start gap-2">
                                <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] font-semibold">
                                    创新点 {innovationReference.code}
                                </span>
                                <span className="pt-0.5 text-sm font-medium leading-6 opacity-90">
                                    {innovationReference.label}
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 opacity-90">{innovationReference.summary}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// ==================== Main PsyChat Component ====================

export const PsyChat = ({
    onSendMessage,
    onSpeak,
    onStopSpeaking,
    isSpeaking = false,
    onBack,
    authToken,
    sensorPanel,
    onCrisisDetected,
}: PsyChatProps) => {
    const chatBootstrapRef = useRef<ReturnType<typeof createChatBootstrap> | null>(null);
    if (!chatBootstrapRef.current) {
        chatBootstrapRef.current = createChatBootstrap();
    }
    const [sessions, setSessions] = useState<ChatSession[]>(chatBootstrapRef.current.sessions);
    const [activeSessionId, setActiveSessionId] = useState(chatBootstrapRef.current.activeSessionId);
    const [messages, setMessages] = useState<ChatMessage[]>(chatBootstrapRef.current.messages);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [sessionSearch, setSessionSearch] = useState('');
    const [showSensorDock, setShowSensorDock] = useState(false);
    const [autoReadReplies, setAutoReadReplies] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.localStorage.getItem(AUTO_READ_KEY) !== 'false';
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Exercise state
    const [activeExercise, setActiveExercise] = useState<{
        exercise: 'THOUGHT_RECORD' | 'BEHAVIOR_ACTIVATION';
        context?: { trigger_thought?: string; trigger_context?: string };
    } | null>(null);
    const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());
    const [innovationModal, setInnovationModal] = useState<InnovationModalState | null>(null);
    const conversationTurnRef = useRef(0);
    const lastPopupRef = useRef<{ kind: 'A' | 'B'; turn: number } | null>(null);
    const [showDemoMode, setShowDemoMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = window.localStorage.getItem('psychat-demo-mode');
        return saved === null ? false : saved === 'true';
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('psychat-demo-mode', String(showDemoMode));
        }
    }, [showDemoMode]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(AUTO_READ_KEY, String(autoReadReplies));
        }
    }, [autoReadReplies]);

    useEffect(() => {
        setSessions(prev => {
            const updatedSession: ChatSession = {
                id: activeSessionId,
                title: deriveSessionTitle(messages),
                updatedAt: new Date().toISOString(),
                messages,
            };
            const next = [
                updatedSession,
                ...prev.filter(session => session.id !== activeSessionId),
            ].slice(0, 30);
            return next;
        });
    }, [activeSessionId, messages]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
        } catch (error) {
            console.warn('Failed to persist chat sessions:', error);
        }
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        const keyword = sessionSearch.trim().toLowerCase();
        if (!keyword) return sessions;
        return sessions.filter(session => (
            session.title.toLowerCase().includes(keyword)
            || session.messages.some(message => message.text.toLowerCase().includes(keyword))
        ));
    }, [sessionSearch, sessions]);

    const hasUserMessages = useMemo(() => messages.some(message => message.role === 'user'), [messages]);

    const startNewSession = useCallback(() => {
        onStopSpeaking?.();
        const id = generateId();
        const initialMessages = createInitialMessages();
        const session: ChatSession = {
            id,
            title: '新的对话',
            updatedAt: new Date().toISOString(),
            messages: initialMessages,
        };
        setActiveSessionId(id);
        setMessages(initialMessages);
        setSessions(prev => [session, ...prev.filter(item => item.id !== id)].slice(0, 30));
        setInputText('');
    }, [onStopSpeaking]);

    const openSession = useCallback((session: ChatSession) => {
        if (session.id === activeSessionId) return;
        onStopSpeaking?.();
        setActiveSessionId(session.id);
        setMessages(session.messages.map(reviveMessage));
        setInputText('');
    }, [activeSessionId, onStopSpeaking]);

    // Check for Web Speech API support
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setVoiceSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'zh-CN';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                setInputText(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
        }
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Toggle voice input
    const toggleVoiceInput = useCallback(() => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            // Stop TTS if playing
            if (isSpeaking && onStopSpeaking) {
                onStopSpeaking();
            }
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening, isSpeaking, onStopSpeaking]);

    const buildCurrentSensorSnapshot = useCallback((): SensorSnapshot | undefined => {
        if (!sensorPanel) return undefined;

        return {
            cameraEnabled: sensorPanel.camera.isRunning,
            microphoneEnabled: sensorPanel.microphone.isRunning,
            fatigueIndex: sensorPanel.camera.fatigueIndex,
            blinkRate: sensorPanel.camera.blinkRate,
            jitterPercent: sensorPanel.microphone.jitterPercent,
            shimmerPercent: sensorPanel.microphone.shimmerPercent,
            speakingDuration: sensorPanel.microphone.speakingDuration,
            silenceDuration: sensorPanel.microphone.silenceDuration,
            keystrokeAnxiety: sensorPanel.keystroke.anxietyIndex,
            keystrokeFocus: sensorPanel.keystroke.focusScore,
            totalKeystrokes: sensorPanel.keystroke.totalKeystrokes,
        };
    }, [sensorPanel]);

    const shouldOpenTimedPopup = useCallback((kind: 'A' | 'B', turn: number) => {
        const lastPopup = lastPopupRef.current;
        if (!lastPopup) return true;
        if (lastPopup.kind !== kind) return true;

        const requiredGap = kind === 'B' ? 1 : 2;
        return turn - lastPopup.turn >= requiredGap;
    }, []);

    const mapInsightKindToPopupKind = useCallback((kind?: string | null): 'A' | 'B' => {
        if (kind === 'discordance' || kind === 'crisis') {
            return 'B';
        }
        return 'A';
    }, []);

    // Send message
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isLoading) return;
        const currentTurn = conversationTurnRef.current + 1;
        conversationTurnRef.current = currentTurn;
        const userTopics = detectStateTopics(text);

        if (userTopics.crisis) {
            onCrisisDetected?.();
        }

        // Stop any ongoing TTS
        if (isSpeaking && onStopSpeaking) {
            onStopSpeaking();
        }

        // Add user message
        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await onSendMessage(text, messages);
            const backendInsight = extractBackendInsight(response);
            const backendPopupKind = mapInsightKindToPopupKind(backendInsight?.kind);
            const innovationKind: InnovationKind =
                response.hidden_distress_risk === 'moderate' || response.hidden_distress_risk === 'high'
                    ? 'B'
                    : response.assessment_mode === 'multimodal'
                        ? 'A'
                        : null;
            const shouldShowInnovationA = innovationKind === 'A'
                && hasNotableDistressCue(text)
                && shouldOpenTimedPopup('A', currentTurn);
            const shouldShowInnovationB = innovationKind === 'B'
                && shouldOpenTimedPopup('B', currentTurn);
            const shouldShowBackendInsight = (backendInsight?.shouldShow ?? Boolean(backendInsight))
                && (backendInsight?.kind === 'crisis' || shouldOpenTimedPopup(backendPopupKind, currentTurn));
            const shouldShowCrisisInsight = response.risk_flag && !shouldShowBackendInsight;
            const shouldShowDemoCard = shouldShowBackendInsight || shouldShowCrisisInsight || shouldShowInnovationA || shouldShowInnovationB;

            if (response.risk_flag) {
                onCrisisDetected?.();
            }

            const popupKind = shouldShowBackendInsight
                ? backendPopupKind
                : innovationKind;

            if (shouldShowDemoCard && popupKind) {
                lastPopupRef.current = {
                    kind: popupKind,
                    turn: currentTurn,
                };
            }

            const insight: DemoInsight = {
                assessmentMode: response.assessment_mode,
                phq9Score: response.phq9_score,
                hiddenDistressRisk: response.hidden_distress_risk,
                hiddenDistressHdi: response.hidden_distress_hdi,
                sensorSnapshot: buildCurrentSensorSnapshot(),
                userText: text,
                innovationKind,
                showDemoCard: shouldShowDemoCard,
                isCrisis: response.risk_flag,
                structuredContent: backendInsight,
            };

            // Add assistant message (with optional action)
            const assistantMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                text: response.reply_text,
                timestamp: new Date(),
                emotion: response.avatar_command?.emotion || (response.risk_flag ? 'concerned' : 'friendly'),
                action: response.action || undefined,
                insight,
            };
            setMessages(prev => [...prev, assistantMessage]);

            const shouldOpenInnovationModal = showDemoMode && shouldShowDemoCard;

            if (shouldOpenInnovationModal) {
                setInnovationModal({
                    insight,
                });
            }

            // Start speaking (non-blocking)
            if (autoReadReplies && onSpeak) {
                onSpeak(response.reply_text, assistantMessage.emotion);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: generateId(),
                    role: 'assistant',
                    text: '抱歉，我现在遇到了一些问题。请稍后再试。',
                    timestamp: new Date(),
                    emotion: 'sorry',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [autoReadReplies, buildCurrentSensorSnapshot, inputText, isLoading, isSpeaking, mapInsightKindToPopupKind, messages, onCrisisDetected, onSendMessage, onSpeak, onStopSpeaking, shouldOpenTimedPopup, showDemoMode]);

    // Handle exercise completion
    const handleExerciseComplete = useCallback(async (
        exerciseData: Record<string, string>,
        postMood: number,
        exerciseType: 'THOUGHT_RECORD' | 'BEHAVIOR_ACTIVATION',
    ) => {
        setActiveExercise(null);

        // Save to backend (best-effort)
        if (authToken) {
            try {
                await fetch(`${API_BASE}/exercises/records?token=${authToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercise_type: exerciseType,
                        exercise_data: exerciseData,
                        post_mood: postMood,
                        trigger_source: 'chat',
                    }),
                });
            } catch (e) {
                console.error('Failed to save exercise:', e);
            }
        }

        // Add completion message to chat
        const completionTexts: Record<string, string> = {
            THOUGHT_RECORD: '你刚刚完成了一个思维记录练习，做得很棒！换个角度看问题，会发现事情并不总是那么糟糕。继续保持这种觉察力。',
            BEHAVIOR_ACTIVATION: '你已经制定了一个行动计划！迈出第一步就是最大的胜利。记得按计划行动哦，完成后会感觉好很多的。',
        };

        setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            text: completionTexts[exerciseType],
            timestamp: new Date(),
            emotion: 'supportive',
        }]);
    }, [authToken]);

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Get emotion icon
    const getEmotionIcon = (emotion?: string) => {
        switch (emotion) {
            case 'friendly': return '😊';
            case 'concerned': return '😟';
            case 'supportive': return '🤗';
            case 'sad': return '😢';
            case 'sorry': return '🙏';
            default: return '💜';
        }
    };

    return (
        <div className="h-[calc(100dvh-13rem)] min-h-[620px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
            <div className="grid h-full grid-cols-[300px_minmax(0,1fr)] bg-white">
                {/* Conversation sidebar */}
                <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-[#f7f7f4]">
                    <div className="border-b border-slate-200 px-4 py-4">
                        <button
                            onClick={startNewSession}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
                        >
                            <span className="text-lg leading-none">＋</span>
                            新聊天
                        </button>
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
                                <input
                                    value={sessionSearch}
                                    onChange={(event) => setSessionSearch(event.target.value)}
                                    placeholder="搜索聊天记录"
                                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                        <div className="mb-2 px-2 text-xs font-medium text-slate-500">最近对话</div>
                        <div className="space-y-1.5">
                            {filteredSessions.map((session) => {
                                const isActive = session.id === activeSessionId;
                                const preview = session.messages.filter(message => message.role === 'assistant' || message.role === 'user').at(-1)?.text || INITIAL_ASSISTANT_TEXT;
                                return (
                                    <button
                                        key={session.id}
                                        onClick={() => openSession(session)}
                                        className={`group w-full rounded-2xl px-3 py-3 text-left transition-all ${isActive
                                            ? 'bg-white shadow-sm ring-1 ring-slate-200'
                                            : 'hover:bg-white/70 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className={`truncate text-sm font-semibold ${isActive ? 'text-slate-950' : 'text-slate-700'}`}>{session.title}</div>
                                            <div className="shrink-0 text-[11px] text-slate-400">{formatSessionTime(session.updatedAt)}</div>
                                        </div>
                                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{preview}</div>
                                    </button>
                                );
                            })}
                            {filteredSessions.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
                                    没有找到相关对话
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-200 p-4">
                        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">自动朗读</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-500">切到其他页面会自动停止</div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (autoReadReplies) onStopSpeaking?.();
                                        setAutoReadReplies(prev => !prev);
                                    }}
                                    aria-pressed={autoReadReplies}
                                    className={`relative h-8 w-14 rounded-full transition-colors ${autoReadReplies ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${autoReadReplies ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            {isSpeaking && (
                                <button
                                    onClick={onStopSpeaking}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-100 transition-colors hover:bg-rose-100"
                                >
                                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                    停止朗读
                                </button>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Chat canvas */}
                <section className="relative flex min-h-0 flex-col bg-[#fbfaf7]">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_52%_18%,rgba(45,212,191,0.12),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(148,163,184,0.13),transparent_28%)]" />

                    <header className="relative z-10 flex items-center justify-between border-b border-slate-200/80 bg-[#fbfaf7]/90 px-7 py-4 backdrop-blur-xl">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold tracking-tight text-slate-950">小心</h2>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">在线</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">心理健康陪伴 · 会记住当前对话上下文</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {sensorPanel && (
                                <button
                                    onClick={() => setShowSensorDock(prev => !prev)}
                                    className={`rounded-2xl px-3.5 py-2 text-sm font-medium ring-1 transition-all ${showSensorDock
                                        ? 'bg-slate-950 text-white ring-slate-950'
                                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    多模态监测
                                </button>
                            )}
                            <button
                                onClick={() => setShowDemoMode(prev => !prev)}
                                className={`rounded-2xl px-3.5 py-2 text-sm font-medium ring-1 transition-all ${showDemoMode
                                    ? 'bg-cyan-50 text-cyan-800 ring-cyan-200'
                                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {showDemoMode ? '状态提醒开' : '状态提醒关'}
                            </button>
                        </div>
                    </header>

                    {sensorPanel && showSensorDock && (
                        <div className="relative z-10 border-b border-slate-200 bg-white/75 px-7 py-4 backdrop-blur-xl">
                            <RealtimeCapturePanel
                                sensorPanel={sensorPanel}
                                onUseDemoPrompt={(text) => setInputText(text)}
                            />
                        </div>
                    )}

                    <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6 py-6">
                        {!hasUserMessages ? (
                            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-2xl text-white shadow-2xl shadow-slate-900/20">心</div>
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">有什么想和小心聊聊的？</h1>
                                <p className="mt-3 max-w-xl text-base leading-7 text-slate-500">不用整理成完整的话。可以从“最近让我难受的一件事”开始，我会慢慢陪你拆开来看。</p>
                                <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                                    {['最近天天抽烟，心情不好', '成绩不好，很烦', '最近睡不着，总想很多'].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInputText(suggestion)}
                                            className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left text-sm leading-6 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-4xl space-y-6 pb-4">
                                {messages.map((msg) => (
                                    <div key={msg.id}>
                                        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                                            {msg.role === 'assistant' ? (
                                                <div className="grid max-w-[86%] grid-cols-[36px_minmax(0,1fr)] gap-3">
                                                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">心</div>
                                                    <div>
                                                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                                                            <span className="font-medium text-slate-600">小心</span>
                                                            <span>{formatTime(msg.timestamp)}</span>
                                                        </div>
                                                        <div className="prose prose-slate max-w-none rounded-[1.35rem] rounded-tl-md bg-white px-5 py-4 text-[15px] leading-8 text-slate-800 shadow-sm ring-1 ring-slate-200/80">
                                                            <p className="whitespace-pre-wrap m-0">{msg.text}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="max-w-[72%]">
                                                    <div className="rounded-[1.35rem] rounded-tr-md bg-slate-900 px-5 py-3.5 text-[15px] leading-7 text-white shadow-lg shadow-slate-900/10">
                                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                                    </div>
                                                    <div className="mt-1 pr-1 text-right text-xs text-slate-400">{formatTime(msg.timestamp)}</div>
                                                </div>
                                            )}
                                        </div>

                                        {msg.role === 'assistant' && msg.action && !dismissedActions.has(msg.id) && (
                                            <div className="ml-12 mt-3 max-w-2xl">
                                                <ExerciseSuggestionCard
                                                    exercise={msg.action.exercise}
                                                    onAccept={() => {
                                                        setActiveExercise({
                                                            exercise: msg.action!.exercise,
                                                            context: msg.action!.context,
                                                        });
                                                    }}
                                                    onDismiss={() => {
                                                        setDismissedActions(prev => new Set(prev).add(msg.id));
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {msg.role === 'assistant' && showDemoMode && msg.insight?.showDemoCard && (
                                            <div className="ml-12 mt-3 max-w-2xl">
                                                <DemoInsightCard
                                                    insight={msg.insight}
                                                    onOpenDetails={() => setInnovationModal({
                                                        insight: msg.insight!,
                                                    })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="grid max-w-xl grid-cols-[36px_minmax(0,1fr)] gap-3 animate-fadeIn">
                                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">心</div>
                                        <div className="rounded-[1.35rem] rounded-tl-md bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200/80">
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span className="flex gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </span>
                                                正在认真读你的消息…
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 border-t border-slate-200/80 bg-[#fbfaf7]/95 px-6 py-5 backdrop-blur-xl">
                        <div className="mx-auto max-w-4xl">
                            {isListening && (
                                <div className="mb-3 flex items-center justify-center">
                                    <div className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                                        正在听你说话…
                                    </div>
                                </div>
                            )}
                            <div className="rounded-[1.65rem] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                                <textarea
                                    value={inputText}
                                    onChange={(event) => setInputText(event.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="有问题，尽管问"
                                    rows={1}
                                    className="max-h-36 min-h-[56px] w-full resize-none bg-transparent px-3 py-3 text-base leading-7 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                />
                                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                    <div className="flex items-center gap-2">
                                        {voiceSupported && (
                                            <button
                                                onClick={toggleVoiceInput}
                                                className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-all ${isListening
                                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                                title={isListening ? '停止录音' : '语音输入'}
                                            >
                                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                                                语音输入
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (autoReadReplies) onStopSpeaking?.();
                                                setAutoReadReplies(prev => !prev);
                                            }}
                                            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${autoReadReplies ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                        >
                                            {autoReadReplies ? '自动朗读开' : '自动朗读关'}
                                        </button>
                                        {isSpeaking && (
                                            <button onClick={onStopSpeaking} className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                                                停止朗读
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputText.trim() || isLoading}
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none"
                                        aria-label="发送消息"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12h14M13 6l6 6-6 6" /></svg>
                                    </button>
                                </div>
                            </div>
                            <p className="mt-3 text-center text-xs text-slate-400">小心可以提供心理支持和自助建议，但不能替代医生或心理咨询师的诊断与治疗。</p>
                        </div>
                    </div>
                </section>
            </div>

            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute left-6 top-6 rounded-full bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur hover:bg-white"
                >
                    ← 返回
                </button>
            )}

            {/* Exercise Modal */}
            {activeExercise && (
                <ExerciseModal
                    exercise={activeExercise.exercise}
                    context={activeExercise.context}
                    onComplete={(data, mood) => handleExerciseComplete(data, mood, activeExercise.exercise)}
                    onDismiss={() => setActiveExercise(null)}
                />
            )}

            <InnovationExplainModal
                state={innovationModal}
                onClose={() => setInnovationModal(null)}
            />
        </div>
    );
};

export default PsyChat;
