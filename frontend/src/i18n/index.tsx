/**
 * Internationalization (i18n) Support
 * 
 * Simple context-based i18n for Chinese/English
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface Translations {
    [key: string]: {
        zh: string;
        en: string;
    };
}

// Translation dictionary
export const translations: Translations = {
    // Header
    'app.name': { zh: 'NeuraSense', en: 'NeuraSense' },
    'app.subtitle': { zh: '智能心理测评平台', en: 'AI Mental Health Platform' },
    'nav.home': { zh: '首页', en: 'Home' },
    'nav.chat': { zh: '心理咨询', en: 'Counseling' },
    'nav.login': { zh: '登录', en: 'Login' },
    'nav.logout': { zh: '退出', en: 'Logout' },

    // Home page
    'home.welcome': { zh: '欢迎回来', en: 'Welcome back' },
    'home.greeting': { zh: '今天感觉怎么样？', en: "How are you feeling today?" },
    'home.streak': { zh: '连续签到', en: 'Day Streak' },
    'home.points': { zh: '今日积分', en: 'Today Points' },

    // Assessment
    'assessment.title': { zh: '心理评估', en: 'Mental Assessment' },
    'assessment.phq9': { zh: 'PHQ-9 抑郁筛查', en: 'PHQ-9 Depression Screening' },
    'assessment.gad7': { zh: 'GAD-7 焦虑筛查', en: 'GAD-7 Anxiety Screening' },
    'assessment.sds': { zh: 'SDS 抑郁自评', en: 'SDS Depression Self-Rating' },
    'assessment.sas': { zh: 'SAS 焦虑自评', en: 'SAS Anxiety Self-Rating' },
    'assessment.start': { zh: '开始评估', en: 'Start Assessment' },
    'assessment.complete': { zh: '完成', en: 'Complete' },

    // Chat
    'chat.title': { zh: 'AI 心理咨询', en: 'AI Counseling' },
    'chat.placeholder': { zh: '输入你想说的话...', en: 'Type your message...' },
    'chat.send': { zh: '发送', en: 'Send' },
    'chat.voice': { zh: '语音输入', en: 'Voice Input' },

    // Community
    'community.title': { zh: '温暖社区', en: 'Warm Community' },
    'community.post': { zh: '发布动态', en: 'Post' },
    'community.feed': { zh: '📱 动态', en: '📱 Feed' },
    'community.leaderboard': { zh: '🏆 排行榜', en: '🏆 Leaderboard' },
    'community.messages': { zh: '💬 私信', en: '💬 Messages' },
    'community.subtitle': { zh: '匿名分享，传递正能量', en: 'Share anonymously, spread positivity' },
    'community.publishBtn': { zh: '✨ 发布动态', en: '✨ Publish' },
    'community.placeholder': { zh: '分享一件让你开心的事，传递温暖给他人...', en: 'Share something that makes you happy...' },
    'community.publishing': { zh: '发布中...', en: 'Publishing...' },
    'community.publish': { zh: '发布', en: 'Publish' },
    'community.loading': { zh: '加载中...', en: 'Loading...' },
    'community.empty': { zh: '还没有动态，来发布第一条吧！', en: 'No posts yet, be the first!' },
    'community.like': { zh: '点赞', en: 'Like' },
    'community.reply': { zh: '回复', en: 'Reply' },
    'community.message': { zh: '私信', en: 'Message' },
    'community.replies': { zh: '回复', en: 'replies' },
    'community.replyPlaceholder': { zh: '写下你的回复...', en: 'Write your reply...' },
    'community.replyBtn': { zh: '回复', en: 'Reply' },
    'community.footer': { zh: '🌟 在这里，每一句话都可能温暖另一个人', en: '🌟 Every word here can warm another heart' },
    'community.anonymous': { zh: '匿名用户', en: 'Anonymous' },

    // Categories
    'category.all': { zh: '全部', en: 'All' },
    'category.gratitude': { zh: '感恩', en: 'Gratitude' },
    'category.encouragement': { zh: '鼓励', en: 'Encouragement' },
    'category.achievement': { zh: '成就', en: 'Achievement' },

    // Breathing
    'breathing.title': { zh: '呼吸训练', en: 'Breathing Exercise' },
    'breathing.inhale': { zh: '吸气', en: 'Inhale' },
    'breathing.hold': { zh: '屏息', en: 'Hold' },
    'breathing.exhale': { zh: '呼气', en: 'Exhale' },
    'breathing.rest': { zh: '休息', en: 'Rest' },

    // Common
    'common.back': { zh: '返回', en: 'Back' },
    'common.save': { zh: '保存', en: 'Save' },
    'common.cancel': { zh: '取消', en: 'Cancel' },
    'common.confirm': { zh: '确认', en: 'Confirm' },
    'common.loading': { zh: '加载中...', en: 'Loading...' },
    'common.error': { zh: '出错了', en: 'Error occurred' },
    'common.success': { zh: '成功', en: 'Success' },

    // Settings
    'settings.language': { zh: '语言', en: 'Language' },
    'settings.theme': { zh: '主题', en: 'Theme' },
    'settings.darkMode': { zh: '深色模式', en: 'Dark Mode' },
    'settings.title': { zh: '设置', en: 'Settings' },
    'settings.appearance': { zh: '外观', en: 'Appearance' },
    'settings.reminders': { zh: '提醒设置', en: 'Reminders' },
    'settings.reminderFreq': { zh: '提醒频率', en: 'Frequency' },
    'settings.reminderTime': { zh: '提醒时间', en: 'Reminder Time' },
    'settings.save': { zh: '保存提醒设置', en: 'Save Reminder Settings' },
    'settings.data': { zh: '数据管理', en: 'Data' },
    'settings.export': { zh: '导出我的数据', en: 'Export My Data' },
    'settings.exportDesc': { zh: '下载 JSON 格式的全部数据', en: 'Download all data as JSON' },
    'settings.about': { zh: '关于', en: 'About' },
    'settings.version': { zh: '版本 1.0.0', en: 'Version 1.0.0' },
    'settings.disclaimer': { zh: '本平台仅供参考，不能替代专业医疗诊断', en: 'For reference only, not a substitute for professional diagnosis' },

    // Me Page
    'me.loginPrompt': { zh: '登录后体验完整功能', en: 'Login for full access' },
    'me.loginDesc': { zh: '保存评估记录、追踪成长轨迹', en: 'Save assessments & track progress' },
    'me.loginBtn': { zh: '登录 / 注册', en: 'Login / Register' },
    'me.dataCenter': { zh: '数据中心', en: 'Data Center' },
    'me.assessments': { zh: '评估报告', en: 'Assessments' },
    'me.journal': { zh: '心情日记', en: 'Mood Journal' },
    'me.achievements': { zh: '我的成就', en: 'Achievements' },
    'me.community': { zh: '温暖社区', en: 'Community' },
    'me.appearance': { zh: '外观模式', en: 'Appearance' },
    'me.moreSettings': { zh: '更多设置', en: 'More Settings' },
    'me.moreSettingsDesc': { zh: '提醒、语言、数据导出', en: 'Reminders, language, export' },
    'me.streak': { zh: '连续打卡', en: 'Streak' },
    'me.points': { zh: '总积分', en: 'Points' },
    'me.thisWeek': { zh: '本周练习', en: 'This Week' },
    'me.logout': { zh: '退出登录', en: 'Logout' },

    // Notifications / Messages
    'messages.title': { zh: '消息中心', en: 'Messages' },
    'messages.readAll': { zh: '全部已读', en: 'Read all' },
    'messages.empty': { zh: '暂无消息', en: 'No messages' },
    'messages.filterAll': { zh: '全部', en: 'All' },
    'messages.filterUnread': { zh: '未读', en: 'Unread' },
};

interface I18nContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
    const [lang, setLang] = useState<Language>(() => {
        const saved = localStorage.getItem('language');
        return (saved as Language) || 'zh';
    });

    useEffect(() => {
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const t = (key: string): string => {
        const translation = translations[key];
        if (!translation) {
            console.warn(`Missing translation: ${key}`);
            return key;
        }
        return translation[lang];
    };

    return (
        <I18nContext.Provider value={{ lang, setLang, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within I18nProvider');
    }
    return context;
};

// Language toggle component
export const LanguageToggle = () => {
    const { lang, setLang } = useI18n();

    return (
        <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="px-3 py-1.5 bg-warm-100 dark:bg-gray-700 hover:bg-warm-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-warm-700 dark:text-gray-200 transition-all flex items-center gap-1.5"
            title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
        >
            🌐 {lang === 'zh' ? 'EN' : '中文'}
        </button>
    );
};

export default I18nProvider;
