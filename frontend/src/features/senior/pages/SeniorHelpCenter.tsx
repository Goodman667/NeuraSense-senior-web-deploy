import { useCallback, useEffect, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorLoadingCard } from '../components/SeniorLoadingCard';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { mergeContacts, readStoredContacts, writeStoredContacts } from '../lib/localSupportContacts';
import { seniorApi } from '../services/seniorApi';
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
      <SeniorPageHeader eyebrow="帮助支持" title={urgent ? '现在先联系一个真人' : '需要有人帮忙吗？'} desc={urgent ? '先别继续一个人待着。页面上的内容只帮您更快找到现实中的人。' : '这些入口会一直放在这里。现在最重要的是让您找得到人，而不是一个人硬扛。'} />
      <div className="mb-5 space-y-3">
        {resourceError || contactError ? (
          <SeniorStatusNotice
            tone="warning"
            title="有些帮助信息暂时没读出来"
            desc={[resourceError, contactError].filter(Boolean).join(' ')}
            actionLabel="重新读取"
            onAction={loadHelpData}
          />
        ) : null}
      </div>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[2.4rem] border border-rose-100 bg-white p-7 shadow-[0_30px_90px_-65px_rgba(15,23,42,0.42)]">
          <div className="rounded-[2rem] bg-rose-50 p-6 text-rose-950">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700">
                <SeniorIcon name="shield" className="h-8 w-8" />
              </span>
              <div>
                <h2 className="text-3xl font-black">{safety?.title || '如果现在很不舒服'}</h2>
                <p className="mt-3 text-xl leading-9">{safety?.message || '请马上联系身边可信任的人，或拨打当地急救电话。这里会帮您更快找到现实中的支持。'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-lg font-black">
                  <SeniorIcon name="user" className="h-5 w-5" />
                  可以直接发给家人
                </p>
                <h2 className="mt-4 text-3xl font-black">不用解释很多，复制这一段就好</h2>
                <p className="mt-3 text-xl leading-9">{familyMessage}</p>
              </div>
              <button onClick={copyFamilyMessage} className="min-h-[64px] rounded-2xl bg-amber-900 px-6 text-xl font-black text-white transition hover:bg-amber-950">
                {copied ? '已复制' : '复制这句话'}
              </button>
            </div>
          </div>

          {safety?.steps?.length ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {safety.steps.slice(0, 3).map((step) => (
                <div key={step} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-xl font-bold leading-9 text-slate-800">
                  <SeniorIcon name="check" className="mb-2 h-6 w-6 text-emerald-700" />
                  {step}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <button onClick={() => onNavigate('settings')} className="min-h-[86px] rounded-3xl border border-cyan-200 bg-cyan-50 px-5 text-left text-xl font-black text-cyan-950 hover:bg-cyan-100">
              <SeniorIcon name="user" className="mb-2 h-7 w-7" />添加联系人
            </button>
            <button onClick={() => onNavigate('chat')} className="min-h-[86px] rounded-3xl border border-emerald-200 bg-emerald-50 px-5 text-left text-xl font-black text-emerald-950 hover:bg-emerald-100">
              <SeniorIcon name="chat" className="mb-2 h-7 w-7" />先陪我聊聊
            </button>
            <button onClick={() => onNavigate('home')} className="min-h-[86px] rounded-3xl border border-slate-200 bg-slate-50 px-5 text-left text-xl font-black text-slate-950 hover:bg-white">
              <SeniorIcon name="home" className="mb-2 h-7 w-7" />回到今天
            </button>
          </div>

          <div className="mt-7">
            <h2 className="text-3xl font-black text-slate-950">可联系的支持资源</h2>
            <p className="mt-2 text-xl leading-9 text-slate-600">如果电话不适合您，可以先让身边的人帮您拨打。</p>
          </div>
          <div className="mt-5 grid gap-4">
            {loading ? <SeniorLoadingCard title="正在读取帮助资源" lines={3} /> : null}
            {!loading && !resources.length ? (
              <SeniorStatusNotice
                tone="warning"
                title="暂时没有读取到热线资源"
                desc="如果现在不安全，请马上联系身边可信任的人，或拨打当地急救电话。"
                actionLabel="再试一次"
                onAction={loadHelpData}
              />
            ) : null}
            {resources.map(item => (
              <a key={item.id} href={item.phone ? `tel:${item.phone}` : item.url || '#'} className="group flex min-h-[108px] items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-4 transition hover:border-rose-200 hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100">
                <span className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700">
                    <SeniorIcon name="phone" className="h-8 w-8" />
                  </span>
                  <span>
                    <span className="block text-2xl font-black text-slate-950">{item.name}</span>
                    <span className="mt-1 block text-lg leading-7 text-slate-600">{item.description}</span>
                    {item.available_time ? <span className="mt-1 block text-base font-bold text-slate-500">{item.available_time}</span> : null}
                  </span>
                </span>
                <span className="shrink-0 text-2xl font-black text-rose-700">{item.phone || '打开'}</span>
              </a>
            ))}
          </div>
        </div>

        <aside className="rounded-[2.4rem] border border-cyan-100 bg-cyan-50 p-6 text-cyan-950 shadow-[0_30px_90px_-70px_rgba(15,23,42,0.42)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-cyan-800">
            <SeniorIcon name="user" className="h-9 w-9" />
          </div>
          <h2 className="mt-5 text-3xl font-black">紧急联系人</h2>
          <p className="mt-2 text-xl leading-9">建议至少添加一位家人或信任的人，这样需要时不用临时找号码。</p>
          {loading ? (
            <div className="mt-5"><SeniorLoadingCard title="正在读取联系人" lines={2} /></div>
          ) : contacts.length ? (
            <div className="mt-5 space-y-3">
              {contacts.map(contact => (
                <a key={contact.id || contact.contact_phone} href={`tel:${contact.contact_phone}`} className="block rounded-2xl bg-white p-5 text-xl font-bold text-slate-900 shadow-sm transition hover:bg-cyan-100">
                  <span className="block">{contact.contact_name}</span>
                  <span className="mt-1 block text-lg text-slate-500">{contact.relationship || '联系人'} · {contact.contact_phone}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <SeniorStatusNotice
                tone={contactError ? 'warning' : 'info'}
                title={contactError ? '联系人暂时没读出来' : '还没有添加联系人'}
                desc={contactError || '可以先去设置里添加一位家人或信任的人。'}
                actionLabel={contactError ? '重新读取' : undefined}
                onAction={contactError ? loadHelpData : undefined}
              />
            </div>
          )}
          <button onClick={() => onNavigate('settings')} className="mt-5 min-h-[64px] w-full rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white transition hover:bg-cyan-950">去设置联系人</button>
        </aside>
      </section>
    </div>
  );
}
