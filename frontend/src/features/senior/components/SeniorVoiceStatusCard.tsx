import type { SpeechStatus } from '../hooks/useSeniorSpeechRecognition';
import { SeniorIcon } from './SeniorIcon';

const statusCopy: Record<SpeechStatus, { title: string; tone: string; icon: 'mic' | 'keyboard' | 'check' | 'warning' }> = {
  idle: { title: '可以说话，也可以打字', tone: 'border-cyan-100 bg-cyan-50 text-cyan-950', icon: 'keyboard' },
  unsupported: { title: '这个浏览器不能语音识别', tone: 'border-amber-200 bg-amber-50 text-amber-950', icon: 'warning' },
  listening: { title: '正在听您说话', tone: 'border-cyan-200 bg-cyan-900 text-white', icon: 'mic' },
  recognized: { title: '已经记录到文字', tone: 'border-emerald-200 bg-emerald-50 text-emerald-950', icon: 'check' },
  error: { title: '刚才没有听清楚', tone: 'border-amber-200 bg-amber-50 text-amber-950', icon: 'warning' },
  permission_denied: { title: '麦克风没有打开', tone: 'border-rose-200 bg-rose-50 text-rose-950', icon: 'warning' },
};

export function SeniorVoiceStatusCard({ status, hint }: { status: SpeechStatus; hint: string }) {
  const copy = statusCopy[status];
  return (
    <div className={`rounded-[1.75rem] border p-5 ${copy.tone}`} aria-live="polite">
      <div className="flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${status === 'listening' ? 'bg-white/15 text-white' : 'bg-white/80'}`}>
          <SeniorIcon name={copy.icon} className="h-7 w-7" />
        </span>
        <div>
          <p className="text-2xl font-black">{copy.title}</p>
          <p className={`mt-2 text-lg leading-8 ${status === 'listening' ? 'text-cyan-50' : ''}`}>{hint}</p>
        </div>
      </div>
    </div>
  );
}
