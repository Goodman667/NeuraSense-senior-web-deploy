import { useEffect, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorRiskModal } from '../components/SeniorRiskModal';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { SeniorTopicChips } from '../components/SeniorTopicChips';
import { seniorApi } from '../services/seniorApi';
import type { SeniorChatMessage, SeniorPage, SeniorRiskAction, SeniorRiskLevel } from '../types/senior';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';

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
      <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} />
      {riskModal ? <SeniorRiskModal action={riskModal.action} level={riskModal.level} onNavigate={onNavigate} onClose={() => setRiskModal(null)} /> : null}
      <SeniorPageHeader eyebrow="陪伴式对话" title="这里可以慢慢说" desc="不像标准聊天工具，这里不会给您一堆选项。您说一句，我回几句，然后只给一个小建议。" />
      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-cyan-100 bg-white/92 p-5 shadow-[0_24px_80px_-68px_rgba(15,23,42,0.42)]">
          <div className="rounded-[1.6rem] bg-cyan-900 p-5 text-white">
            <SeniorIcon name="heart" className="h-9 w-9" />
            <h2 className="mt-4 text-2xl font-black">今天不用组织好语言</h2>
            <p className="mt-2 text-lg leading-8 text-cyan-50">想到哪里就说到哪里。您也可以只点一个话题开始。</p>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-lg font-black text-slate-950">对话原则</p>
            <ul className="mt-3 space-y-3 text-lg leading-8 text-slate-600">
              <li className="flex gap-2"><SeniorIcon name="check" className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />不评价您说得对不对</li>
              <li className="flex gap-2"><SeniorIcon name="check" className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />每次只给一个小建议</li>
              <li className="flex gap-2"><SeniorIcon name="check" className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />需要时可以马上找帮助</li>
            </ul>
          </div>

          <button onClick={() => onNavigate('help')} className="mt-4 flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-xl font-black text-rose-800 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100">
            <SeniorIcon name="phone" className="h-6 w-6" />
            我现在需要帮助
          </button>
        </aside>

        <div className="rounded-[2.4rem] border border-cyan-100 bg-white p-5 shadow-[0_30px_90px_-65px_rgba(15,23,42,0.42)] md:p-6">
          {input && !messages.some(msg => msg.role === 'user') ? (
            <div className="mb-5 rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="text-lg font-black">已经帮您放进输入框</p>
              <p className="mt-1 text-lg leading-8">如果这句话合适，直接点“发送”就可以；也可以先改几个字。</p>
            </div>
          ) : null}

          <div className="min-h-[420px] space-y-5 rounded-[2rem] bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4" aria-live="polite">
            {messages.slice(-6).map(msg => (
              <div key={msg.id} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[88%] rounded-[2rem] px-6 py-4 text-xl leading-9 shadow-sm ${msg.role === 'user' ? 'bg-cyan-900 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
                  {msg.role === 'assistant' ? <span className="mb-2 flex items-center gap-2 text-base font-black text-cyan-800"><SeniorIcon name="spark" className="h-4 w-4" />陪您一起看</span> : null}
                  <span>{msg.text}</span>
                </div>
              </div>
            ))}
            {loading ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-lg font-bold text-amber-900">
                <span className="inline-flex items-center gap-2"><SeniorIcon name="spark" className="h-5 w-5" />我正在认真读您的话...</span>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <p className="mb-3 text-lg font-black text-slate-700">不知道怎么说时，可以点一下：</p>
            <SeniorTopicChips compact onSelect={(prompt) => send(prompt)} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="也可以在这里打字..." className="min-h-[68px] flex-1 rounded-2xl border border-slate-300 px-5 text-xl outline-none focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100" />
            <button onClick={() => send()} disabled={loading || !input.trim()} className="min-h-[68px] rounded-2xl bg-cyan-900 px-8 text-xl font-black text-white transition hover:bg-cyan-950 disabled:opacity-50">发送</button>
          </div>
        </div>
      </section>
    </div>
  );
}
