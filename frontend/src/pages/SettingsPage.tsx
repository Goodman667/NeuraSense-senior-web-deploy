import { useState } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import { useI18n } from '../i18n';
import { API_BASE } from '../config/api';

interface SettingsPageProps {
    onBack: () => void;
    authToken?: string | null;
}

// ---- 提醒频率选项 ----
const FREQ_OPTIONS = [
    { value: 'none', label_zh: '关闭', label_en: 'Off' },
    { value: 'daily', label_zh: '每天一次', label_en: 'Daily' },
    { value: 'twice', label_zh: '每天两次', label_en: 'Twice daily' },
    { value: 'hourly', label_zh: '每小时', label_en: 'Hourly' },
];

export default function SettingsPage({ onBack, authToken }: SettingsPageProps) {
    const { lang, setLang, t } = useI18n();
    const { darkMode, setDarkMode, profile, updateProfile } = useProfileStore();

    const [reminderFreq, setReminderFreq] = useState(profile?.reminder_freq || 'daily');
    const [reminderTime, setReminderTime] = useState(profile?.reminder_time || '09:00');
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2000);
    };

    // ---- 保存提醒设置 ----
    const handleSaveReminder = async () => {
        if (!authToken) { showToast(lang === 'zh' ? '请先登录' : 'Please login first'); return; }
        setSaving(true);
        await updateProfile(authToken, { reminder_freq: reminderFreq, reminder_time: reminderTime });
        setSaving(false);
        showToast(lang === 'zh' ? '已保存' : 'Saved');
    };

    // ---- 数据导出 ----
    const handleExport = async () => {
        if (!authToken) { showToast(lang === 'zh' ? '请先登录' : 'Please login first'); return; }
        setExporting(true);
        try {
            const res = await fetch(`${API_BASE}/profile/export?token=${authToken}`);
            if (res.ok) {
                const json = await res.json();
                const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `neurasense_export_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast(lang === 'zh' ? '导出成功' : 'Exported');
            }
        } catch {
            showToast(lang === 'zh' ? '导出失败' : 'Export failed');
        }
        setExporting(false);
    };

    return (
        <div className="space-y-5 animate-fadeIn">
            {/* 顶栏 */}
            <div className="flex items-center gap-3 mb-2">
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-warm-100 dark:hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5 text-warm-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold text-warm-800 dark:text-gray-100">
                    {lang === 'zh' ? '设置' : 'Settings'}
                </h2>
            </div>

            {/* === 外观 === */}
            <SettingsSection title={lang === 'zh' ? '外观' : 'Appearance'}>
                {/* 深色模式 */}
                <SettingsRow
                    icon="🌓"
                    label={t('settings.darkMode')}
                    desc={lang === 'zh' ? (darkMode ? '当前：深色' : '当前：浅色') : (darkMode ? 'Current: Dark' : 'Current: Light')}
                >
                    <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
                </SettingsRow>

                {/* 语言 */}
                <SettingsRow
                    icon="🌐"
                    label={t('settings.language')}
                    desc={lang === 'zh' ? '中文 / English' : 'Chinese / English'}
                >
                    <button
                        onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                        className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 text-sm font-medium rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                    >
                        {lang === 'zh' ? 'English' : '中文'}
                    </button>
                </SettingsRow>
            </SettingsSection>

            {/* === 提醒 === */}
            <SettingsSection title={lang === 'zh' ? '提醒设置' : 'Reminders'}>
                <div className="px-4 py-3 space-y-4">
                    {/* 频率 */}
                    <div>
                        <label className="text-sm text-warm-500 dark:text-gray-400 mb-2 block">
                            {lang === 'zh' ? '提醒频率' : 'Frequency'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FREQ_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setReminderFreq(opt.value)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                        reminderFreq === opt.value
                                            ? 'bg-primary-500 text-white border-primary-500'
                                            : 'border-warm-200 dark:border-gray-600 text-warm-600 dark:text-gray-300 hover:bg-warm-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {lang === 'zh' ? opt.label_zh : opt.label_en}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 时间 */}
                    {reminderFreq !== 'none' && (
                        <div>
                            <label className="text-sm text-warm-500 dark:text-gray-400 mb-2 block">
                                {lang === 'zh' ? '提醒时间' : 'Reminder Time'}
                            </label>
                            <input
                                type="time"
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                                className="px-3 py-2 border border-warm-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-warm-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-300 outline-none"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleSaveReminder}
                        disabled={saving}
                        className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                        {saving
                            ? (lang === 'zh' ? '保存中...' : 'Saving...')
                            : (lang === 'zh' ? '保存提醒设置' : 'Save Reminder Settings')}
                    </button>
                </div>
            </SettingsSection>

            {/* === 数据 === */}
            <SettingsSection title={lang === 'zh' ? '数据管理' : 'Data'}>
                <SettingsRow
                    icon="📦"
                    label={lang === 'zh' ? '导出我的数据' : 'Export My Data'}
                    desc={lang === 'zh' ? '下载 JSON 格式的全部数据' : 'Download all data as JSON'}
                >
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-3 py-1.5 bg-warm-100 dark:bg-gray-700 text-warm-700 dark:text-gray-200 text-sm rounded-lg hover:bg-warm-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        {exporting ? '...' : (lang === 'zh' ? '导出' : 'Export')}
                    </button>
                </SettingsRow>
            </SettingsSection>

            {/* === 关于 === */}
            <SettingsSection title={lang === 'zh' ? '关于' : 'About'}>
                <div className="px-4 py-4 space-y-2 text-sm text-warm-500 dark:text-gray-400">
                    <p className="font-medium text-warm-700 dark:text-gray-200">NeuraSense</p>
                    <p>{lang === 'zh' ? '智能心理健康平台' : 'AI Mental Health Platform'}</p>
                    <p>{lang === 'zh' ? '版本 1.0.0' : 'Version 1.0.0'}</p>
                    <p className="pt-2 text-xs">
                        {lang === 'zh'
                            ? '本平台仅供参考，不能替代专业医疗诊断'
                            : 'This platform is for reference only and cannot replace professional medical diagnosis'}
                    </p>
                </div>
            </SettingsSection>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-warm-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-full text-sm font-medium shadow-lg animate-fadeIn z-50">
                    {toast}
                </div>
            )}
        </div>
    );
}


// ========== 子组件 ==========

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-sm font-medium text-warm-400 dark:text-gray-500 mb-2 px-1">{title}</h4>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl border border-warm-200/50 dark:border-gray-700/50 overflow-hidden divide-y divide-warm-100/50 dark:divide-gray-700/50">
                {children}
            </div>
        </div>
    );
}

function SettingsRow({ icon, label, desc, children }: {
    icon: string;
    label: string;
    desc: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-10 h-10 bg-warm-50 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-warm-800 dark:text-gray-100">{label}</div>
                <div className="text-warm-400 dark:text-gray-500 text-xs mt-0.5">{desc}</div>
            </div>
            {children}
        </div>
    );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                checked ? 'bg-primary-500' : 'bg-warm-300 dark:bg-gray-600'
            }`}
        >
            <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}
