import { SeniorIcon, type SeniorIconName } from './SeniorIcon';

export interface SeniorTopic {
  label: string;
  prompt: string;
  icon: SeniorIconName;
  tone: 'cyan' | 'emerald' | 'amber' | 'rose';
}

export const seniorDefaultTopics: SeniorTopic[] = [
  { label: '睡得不好', prompt: '我最近睡得不好，想慢慢说说。', icon: 'clock', tone: 'cyan' },
  { label: '有点孤单', prompt: '我今天有点孤单，想有人陪我说几句。', icon: 'heart', tone: 'emerald' },
  { label: '心里担心', prompt: '我心里有点担心，不知道该怎么办。', icon: 'shield', tone: 'amber' },
  { label: '不知道说什么', prompt: '我不知道从哪里说起，你先陪我聊聊吧。', icon: 'chat', tone: 'rose' },
];

export function SeniorTopicChips({
  topics = seniorDefaultTopics,
  onSelect,
}: {
  topics?: SeniorTopic[];
  onSelect: (prompt: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic) => (
        <button key={topic.label} onClick={() => onSelect(topic.prompt)} className="sn-chip">
          <SeniorIcon name={topic.icon} className="h-5 w-5 text-[var(--sn-teal)]" />
          {topic.label}
        </button>
      ))}
    </div>
  );
}
