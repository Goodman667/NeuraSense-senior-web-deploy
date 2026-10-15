import { useEffect, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorRiskModal } from '../components/SeniorRiskModal';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { SeniorTopicChips } from '../components/SeniorTopicChips';
import { seniorApi } from '../services/seniorApi';
import type { SeniorChatMessage, SeniorPage, SeniorRiskAction, SeniorRiskLevel } from '../types/senior';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { LeafShadow } from '../components/LeafShadow';

const makeId = () => Math.random().toString(36).slice(2);

export function SeniorConversation({
  userId,
  onNavigate,
  initialTopic = '',
  onSeedConsumed,
}: {
  userId: string;
  onNavigate: (page: SeniorPage) => void;
  initialTopic?: string;
  onSeedConsumed?: () => void;
}) {
  const [messages, setMessages] = useState<SeniorChatMessage[]>([{ id: makeId(), role: 'assistant', text: '我在这里陪您。您可以说一句最近最挂念的事，也可以点下面的按钮开始。', createdAt: new Date().toISOString() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [riskModal, setRiskModal] = useState<{ action: SeniorRiskAction; level: SeniorRiskLevel } | null>(null);
  const { speak } = useSeniorTTS();

  useEffect(() => {
    if (initialTopic) {
      setInput(initialTopic);
      onSeedConsumed?.();
    }
  }, [initialTopic, onSeedConsumed]);

  const send = async (text = input.trim()) => {
    if (!text || loading) return;
    const userMsg: SeniorChatMessage = { id: makeId(), role: 'user', text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev.slice(-3), userMsg]); setInput(''); setLoading(true);
    try {
      const history = messages.slice(-6).map(msg => ({ role: msg.role, content: msg.text }));
      const res = await seniorApi.seniorChat(userId, text, history);
      const assistant: SeniorChatMessage = { id: makeId(), role: 'assistant', text: res.reply_text, createdAt: new Date().toISOString(), riskLevel: res.risk_level };
      setMessages(prev => [...prev.slice(-4), assistant]);
      markSeniorProgress(userId, 'chat');
      await speak(res.tts_text || res.reply_text, { emotion: res.risk_level === 'urgent' || res.risk_level === 'medical_emergency' ? 'empathetic' : 'friendly' });
      if (res.risk_action?.should_show_modal) {
        setRiskModal({ action: res.risk_action, level: res.risk_level });
      }
      if (res.risk_level === 'elevated' || res.risk_level === 'urgent' || res.risk_level === 'medical_emergency') seniorApi.recordHelpEvent(userId, 'chat_risk_prompt', { message: text, risk_reason: res.risk_reason, family_message: res.risk_action?.family_message }, res.risk_level).catch(() => null);
    } catch {
      const fallback = '网络有点慢，但我还在这里。您可以先喝口水，慢慢告诉我最想说的一件事。';
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', text: fallback, createdAt: new Date().toISOString() }]);
      markSeniorProgress(userId, 'chat');
      speak(fallback);
    } finally { setLoading(false); }
  };
  return (
    <div className="mx-auto max-w-6xl">
      <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} endLabel="聊完了" />
      {riskModal ? <SeniorRiskModal action={riskModal.action} level={riskModal.level} onNavigate={onNavigate} onClose={() => setRiskModal(null)} /> : null}

      <section className="sn-wall sn-rise overflow-hidden rounded-[28px] border border-[var(--sn-line)]">
        <LeafShadow />
        <header className="px-6 pb-2 pt-8 text-center md:px-10">
          <h1 className="text-[clamp(2rem,3vw,2.8rem)] leading-tight text-[#2a2420]">这里可以慢慢说</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[1.15rem] leading-8 text-[#2a2420]/75">想到哪里说到哪里。我听完回您几句，每次只给一个小建议。</p>
        </header>

        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-8" aria-live="polite">
          {input && !messages.some(msg => msg.role === 'user') ? (
            <p className="sn-notice tone-warning text-[1.08rem]">已经帮您放进输入框了。合适就直接点“发送”，也可以先改几个字。</p>
          ) : null}
          {messages.slice(-6).map(msg => (
            <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[88%] rounded-[22px] px-6 py-4 text-[1.3rem] leading-[1.85] ${msg.role === 'user' ? 'rounded-br-md bg-[var(--sn-teal)] text-[#FBF8F3]' : 'rounded-bl-md border border-[var(--sn-line)] bg-[rgba(251,248,243,0.92)] text-[var(--sn-ink)] backdrop-blur-sm'}`}>
                {msg.role === 'assistant' ? <span className="mb-1 flex items-center gap-2 text-[1rem] text-[var(--sn-teal)]"><SeniorIcon name="heart" className="h-4 w-4" />陪您说话</span> : null}
                <span>{msg.text}</span>
              </div>
            </div>
          ))}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[22px] rounded-bl-md border border-[var(--sn-line)] bg-[rgba(251,248,243,0.92)] px-6 py-4 text-[1.2rem] text-[var(--sn-ink-2)]">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--sn-ochre)] motion-safe:animate-pulse" />我在认真读您的话…</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="sn-sheet mt-5 p-5 md:p-6">
        <p className="sn-small mb-3">不知道怎么开口，点一个就行：</p>
        <SeniorTopicChips compact onSelect={(prompt) => send(prompt)} />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="sn-chat-input" className="sr-only">输入想说的话</label>
          <input id="sn-chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="也可以在这里打字…" className="sn-input flex-1 !text-[1.3rem]" />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="sn-btn sn-btn-primary sn-btn-lg">发送</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--sn-line)] pt-4">
          <span className="sn-small">我只给生活上的建议，不做医学诊断。</span>
          <button onClick={() => onNavigate('help')} className="sn-btn sn-btn-help-quiet ml-auto"><SeniorIcon name="phone" />我现在需要帮助</button>
        </div>
      </section>
    </div>
  );
}
