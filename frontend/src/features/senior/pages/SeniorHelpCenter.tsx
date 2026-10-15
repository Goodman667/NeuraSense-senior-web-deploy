import { useCallback, useEffect, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorLoadingCard } from '../components/SeniorLoadingCard';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { mergeContacts, readStoredContacts, writeStoredContacts } from '../lib/localSupportContacts';
import { seniorApi } from '../services/seniorApi';
import { seniorAssets } from '../lib/seniorAssets';
import type { SeniorPage, SeniorSummary, SeniorSupportContact, SeniorSupportResource } from '../types/senior';

export function SeniorHelpCenter({ userId, latestSummary, onNavigate }: { userId: string; latestSummary?: SeniorSummary | null; onNavigate: (page: SeniorPage) => void }) {
  const [resources, setResources] = useState<SeniorSupportResource[]>([]);
  const [contacts, setContacts] = useState<SeniorSupportContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceError, setResourceError] = useState('');
  const [contactError, setContactError] = useState('');
  const [copied, setCopied] = useState(false);
  const safety = latestSummary?.safety;
  const familyMessage = latestSummary?.family_message || (safety?.should_contact_family ? '我现在有点不舒服，需要你陪我一下。如果情况加重，请帮我联系专业帮助。' : '我今天想让自己慢一点。如果方便，请陪我做一个小步骤。');
  const urgent = latestSummary?.risk_level === 'urgent' || latestSummary?.risk_level === 'medical_emergency';

  const copyFamilyMessage = async () => {
    try {
      await navigator.clipboard.writeText(familyMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const loadHelpData = useCallback(async () => {
    setLoading(true);
    setResourceError('');
    setContactError('');
    const localContacts = readStoredContacts(userId);
    const [resourceResult, contactResult] = await Promise.allSettled([
      seniorApi.getSupportResources(),
      seniorApi.getContacts(userId),
    ]);

    if (resourceResult.status === 'fulfilled') {
      setResources(resourceResult.value.resources);
    } else {
      setResources([]);
      setResourceError('支持资源暂时没有读取成功。请优先联系身边可信任的人，或拨打当地急救电话。');
    }

    if (contactResult.status === 'fulfilled') {
      const merged = mergeContacts(contactResult.value.contacts, localContacts);
      setContacts(merged);
      writeStoredContacts(userId, merged);
    } else {
      setContacts(localContacts);
      setContactError('紧急联系人暂时没有读取成功。可以稍后再试，或先去设置里重新查看。');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    markSeniorProgress(userId, 'help');
    loadHelpData();
    seniorApi.recordHelpEvent(userId, 'open_help_center').catch(() => null);
  }, [userId, loadHelpData]);
  return (
    <div className="mx-auto max-w-6xl">
      <SeniorSafetyActions onNavigate={onNavigate} />
      <SeniorPageHeader
        eyebrow="帮助"
        title={urgent ? '现在先联系一个真人' : '需要有人帮忙吗？'}
        desc={urgent ? '先别一个人待着。这一页只帮您更快找到身边的人。' : '这些入口一直在这里。最重要的是让您找得到人，不用一个人硬扛。'}
      />
      {resourceError || contactError ? (
        <div className="mb-5">
          <SeniorStatusNotice tone="warning" title="有些帮助信息没读出来" desc={[resourceError, contactError].filter(Boolean).join(' ')} actionLabel="重新读取" onAction={loadHelpData} />
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-[#E8C3B9] bg-[var(--sn-help-soft)] p-6 text-[#5E1F18] md:p-7">
            <div className="flex items-start gap-4">
              <SeniorIcon name="shield" className="mt-1 h-8 w-8 shrink-0 text-[var(--sn-help)]" />
              <div>
                <h2 className="sn-h2 !text-[#5E1F18]">{safety?.title || '如果现在很不舒服'}</h2>
                <p className="mt-2 text-[1.2rem] leading-9">{safety?.message || '请马上联系身边信得过的人，或拨打当地急救电话。这里帮您更快找到现实中的支持。'}</p>
              </div>
            </div>
          </div>

          <div className="sn-sheet p-6 md:p-7">
            <p className="sn-kicker"><SeniorIcon name="user" className="h-5 w-5" />可以直接发给家人</p>
            <h2 className="sn-h2 mt-2">不用解释很多，复制这一段就好</h2>
            <blockquote className="mt-4 rounded-[16px] bg-[#F4F1EC] p-5 text-[1.3rem] leading-9 text-[var(--sn-ink)]">{familyMessage}</blockquote>
            <button onClick={copyFamilyMessage} className="sn-btn sn-btn-dark mt-4">{copied ? '已复制' : '复制这段话'}</button>
          </div>

          {safety?.steps?.length ? (
            <ol className="grid gap-3 md:grid-cols-3">
              {safety.steps.slice(0, 3).map((step, index) => (
                <li key={step} className="sn-sheet p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sn-line-strong)] text-[1.1rem] text-[var(--sn-teal-deep)]">{index + 1}</span>
                  <p className="mt-3 text-[1.25rem] leading-8">{step}</p>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('chat')} className="sn-btn sn-btn-quiet"><SeniorIcon name="chat" />先陪我聊聊</button>
            <button onClick={() => onNavigate('relax')} className="sn-btn sn-btn-quiet"><SeniorIcon name="leaf" />先坐下呼吸一会</button>
            <button onClick={() => onNavigate('settings')} className="sn-btn sn-btn-quiet"><SeniorIcon name="user" />添加联系人</button>
          </div>

          <div className="sn-sheet p-6 md:p-7">
            <h2 className="sn-h2">可以打的支持电话</h2>
            <p className="sn-body mt-1">不方便自己打，可以请身边的人帮忙拨。</p>
            <div className="mt-4 divide-y divide-[var(--sn-line)]">
              {loading ? <SeniorLoadingCard title="正在读取帮助资源" lines={3} /> : null}
              {!loading && !resources.length ? (
                <SeniorStatusNotice tone="warning" title="暂时没有读到热线" desc="如果现在不安全，请马上联系身边的人，或拨打当地急救电话。" actionLabel="再试一次" onAction={loadHelpData} />
              ) : null}
              {resources.map(item => (
                <a key={item.id} href={item.phone ? `tel:${item.phone}` : item.url || '#'} className="flex items-center justify-between gap-5 py-4 transition hover:text-[var(--sn-help-deep)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#E8C3B9]">
                  <span className="flex items-start gap-4">
                    <SeniorIcon name="phone" className="mt-1 h-7 w-7 shrink-0 text-[var(--sn-help)]" />
                    <span>
                      <span className="block text-[1.35rem]">{item.name}</span>
                      <span className="mt-1 block text-[1.05rem] leading-7 text-[var(--sn-ink-2)]">{item.description}</span>
                      {item.available_time ? <span className="sn-small block">{item.available_time}</span> : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-[1.4rem] tabular-nums text-[var(--sn-help)]">{item.phone || '打开'}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="sn-photo-card is-help min-h-[15rem] cursor-default">
            <img src={seniorAssets.cardLoneTree} alt="" />
            <span className="sn-pill"><SeniorIcon name="phone" className="h-5 w-5" />紧急联系人</span>
            <span className="text-[1.15rem] leading-8 text-white/90">需要时不用临时找号码。点名字就能打。</span>
          </div>
          {loading ? (
            <SeniorLoadingCard title="正在读取联系人" lines={2} />
          ) : contacts.length ? (
            <div className="space-y-2">
              {contacts.map(contact => (
                <a key={contact.id || contact.contact_phone} href={`tel:${contact.contact_phone}`} className="sn-sheet flex items-center justify-between gap-3 p-4 transition hover:border-[var(--sn-help)]">
                  <span>
                    <span className="block text-[1.35rem]">{contact.contact_name}</span>
                    <span className="sn-small block">{contact.relationship || '联系人'}</span>
                  </span>
                  <span className="text-[1.2rem] tabular-nums text-[var(--sn-help)]">{contact.contact_phone}</span>
                </a>
              ))}
            </div>
          ) : (
            <SeniorStatusNotice
              tone={contactError ? 'warning' : 'info'}
              title={contactError ? '联系人没读出来' : '还没有联系人'}
              desc={contactError || '先去设置里添加一位家人或信得过的人。'}
              actionLabel={contactError ? '重新读取' : undefined}
              onAction={contactError ? loadHelpData : undefined}
            />
          )}
          <button onClick={() => onNavigate('settings')} className="sn-btn sn-btn-help sn-btn-block">去设置联系人</button>
        </aside>
      </section>
    </div>
  );
}
