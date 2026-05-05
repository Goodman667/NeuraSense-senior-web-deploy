import { SeniorIcon, type SeniorIconName } from './SeniorIcon';

export interface SeniorTopic {
  label: string;
  prompt: string;
  icon: SeniorIconName;
  tone: 'cyan' | 'emerald' | 'amber' | 'rose';
}

const toneClass: Record<SeniorTopic['tone'], string> = {
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950 hover:bg-cyan-100',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
  amber: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100',
  rose: 'border-rose-200 bg-rose-50 text-rose-950 hover:bg-rose-100',
};

export const seniorDefaultTopics: SeniorTopic[] = [
  { label: '睡得不好', prompt: '我最近睡得不好，想慢慢说说。', icon: 'clock', tone: 'cyan' },
  { label: '有点孤单', prompt: '我今天有点孤单，想有人陪我说几句。', icon: 'heart', tone: 'emerald' },
  { label: '心里担心', prompt: '我心里有点担心，不知道该怎么办。', icon: 'shield', tone: 'amber' },
  { label: '不知道说什么', prompt: '我不知道从哪里说起，你先陪我聊聊吧。', icon: 'chat', tone: 'rose' },
];

export function SeniorTopicChips({
  topics = seniorDefaultTopics,
  onSelect,
  compact = false,
}: {
  topics?: SeniorTopic[];
  onSelect: (prompt: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-4'}`}>
      {topics.map((topic) => (
        <button
          key={topic.label}
          onClick={() => onSelect(topic.prompt)}
          className={`min-h-[72px] rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${toneClass[topic.tone]}`}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80">
              <SeniorIcon name={topic.icon} className="h-6 w-6" />
            </span>
            <span className="text-lg font-black leading-6">{topic.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
