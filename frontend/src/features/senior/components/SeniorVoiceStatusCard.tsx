import type { SpeechStatus } from '../hooks/useSeniorSpeechRecognition';
import { SeniorIcon } from './SeniorIcon';

const statusCopy: Record<SpeechStatus, { title: string; tone: string; icon: 'mic' | 'keyboard' | 'check' | 'warning' }> = {
  idle: { title: '说话、打字都可以', tone: 'tone-info', icon: 'keyboard' },
  unsupported: { title: '这个浏览器听不了声音', tone: 'tone-warning', icon: 'warning' },
  listening: { title: '正在听您说话', tone: 'tone-info', icon: 'mic' },
  recognized: { title: '已经记成文字了', tone: 'tone-success', icon: 'check' },
  error: { title: '刚才没听清楚', tone: 'tone-warning', icon: 'warning' },
  permission_denied: { title: '麦克风没有打开', tone: 'tone-danger', icon: 'warning' },
};

export function SeniorVoiceStatusCard({ status, hint }: { status: SpeechStatus; hint: string }) {
  const copy = statusCopy[status];
  return (
    <div className={`sn-notice ${copy.tone}`} aria-live="polite">
      <SeniorIcon name={copy.icon} className="mt-1 h-6 w-6 shrink-0" />
      <div>
        <p className="text-[1.2rem]">{copy.title}</p>
        <p className="mt-1 text-[1.02rem] leading-7 opacity-90">{hint}</p>
      </div>
    </div>
  );
}
