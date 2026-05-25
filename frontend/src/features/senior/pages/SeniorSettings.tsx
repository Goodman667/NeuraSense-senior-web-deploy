import { useEffect, useRef, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { mergeContacts, readStoredContacts, writeStoredContacts } from '../lib/localSupportContacts';
import { seniorApi } from '../services/seniorApi';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import type { SeniorPreference, SeniorSupportContact } from '../types/senior';

const defaultPref: SeniorPreference = {
  user_id: '', auto_enter_senior: false, font_scale: 'large', senior_voice_enabled: true, senior_voice_speed: 0.9, senior_voice_name: 'xiaoyi', text_fallback_enabled: true, caregiver_notify_enabled: false, preferred_region: 'CN',
};
const FONT_SCALE_STORAGE = 'neurasense-senior-font-scale';
const VOICE_SPEED_STORAGE = 'neurasense-senior-voice-speed';
const CONTACT_READY_STORAGE = 'neurasense-senior-contact-ready';

const storageUserKey = (prefix: string, userId: string) => `${prefix}:${userId || 'anonymous'}`;

const fontScaleLabel: Record<SeniorPreference['font_scale'], string> = {
  large: '大',
  larger: '更大',
  largest: '超大',
};

const isFontScale = (value: string | null): value is SeniorPreference['font_scale'] => (
  value === 'large' || value === 'larger' || value === 'largest'
);

export function SeniorSettings({ userId, required = false, onSaved, autoOpenContact = false }: { userId: string; required?: boolean; onSaved?: () => void; autoOpenContact?: boolean }) {
  const [pref, setPref] = useState<SeniorPreference>({ ...defaultPref, user_id: userId });
  const [contacts, setContacts] = useState<SeniorSupportContact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(required || autoOpenContact);
  const requiredGuideSpokenRef = useRef(false);
  const settingsGuideSpokenRef = useRef(false);
  const { speak, stop, isPlaying } = useSeniorTTS();
  const stopAndClearAudio = () => {
    stop();
    useSeniorAudioStore.setState({ currentText: '', error: null });
  };
  useEffect(() => {
    const localContacts = readStoredContacts(userId);
    setContacts(localContacts);
    seniorApi.getProfile(userId).then(res => {
      const localFontScale = localStorage.getItem(FONT_SCALE_STORAGE);
      const fontScale = isFontScale(localFontScale) ? localFontScale : (res.profile.font_scale || 'large');
      setPref({ ...res.profile, font_scale: fontScale });
      const mergedContacts = mergeContacts(res.contacts || [], localContacts);
      setContacts(mergedContacts);
      if (mergedContacts.length) {
        writeStoredContacts(userId, mergedContacts);
        localStorage.setItem(storageUserKey(CONTACT_READY_STORAGE, userId), 'true');
      }
      localStorage.setItem(FONT_SCALE_STORAGE, fontScale);
      window.dispatchEvent(new Event('neurasense-senior-font-scale'));
    }).catch(() => null);
  }, [userId]);
  useEffect(() => {
    if (!required || requiredGuideSpokenRef.current) return;
    requiredGuideSpokenRef.current = true;
    setContactDialogOpen(true);
    const guide = '现在先帮您添加一位紧急联系人。这个联系人很重要：以后您在小测或帮助里不舒服时，页面会提醒您先联系这个人。可以填子女、邻居、医生或信任的朋友。只需要填姓名和电话，点保存联系人，填完就能进入首页。这里不会偷偷打电话，也不会自动发消息。';
    const timer = window.setTimeout(() => speak(guide, { voice: pref.senior_voice_name || 'xiaoyi', emotion: 'friendly' }), 650);
    return () => window.clearTimeout(timer);
  }, [pref.senior_voice_name, required, speak]);
  useEffect(() => {
    if (required || settingsGuideSpokenRef.current) return;
    settingsGuideSpokenRef.current = true;
    const guide = contacts.length
      ? '这里可以调整字号和朗读声音。更重要的是紧急联系人：下面已经显示了联系人，如果电话号码换了，或者想加子女、邻居、医生，请点添加或更换联系人。'
      : '这里可以调整字号和朗读声音。更重要的是先设置一位紧急联系人：以后您在小测或帮助页面觉得不舒服时，页面会提醒您先找这个人。请点添加联系人，填写姓名和电话，再点保存。';
    const timer = window.setTimeout(() => speak(guide, { voice: pref.senior_voice_name || 'xiaoyi', emotion: 'friendly' }), 650);
    return () => window.clearTimeout(timer);
  }, [contacts.length, pref.senior_voice_name, required, speak]);
  useEffect(() => {
    if (required || !autoOpenContact) return;
    setContactDialogOpen(true);
  }, [autoOpenContact, required]);
  const savePref = async (patch: Partial<SeniorPreference>) => {
    const next = { ...pref, ...patch };
    setPref(next);
    if (patch.font_scale) {
      localStorage.setItem(FONT_SCALE_STORAGE, patch.font_scale);
      window.dispatchEvent(new Event('neurasense-senior-font-scale'));
    }
    if (patch.senior_voice_speed) {
      localStorage.setItem(VOICE_SPEED_STORAGE, String(patch.senior_voice_speed));
    }
    try {
      const res = await seniorApi.updateProfile(userId, next);
      setPref({ ...res.profile, ...patch });
      if (patch.font_scale) {
        localStorage.setItem(FONT_SCALE_STORAGE, patch.font_scale);
        window.dispatchEvent(new Event('neurasense-senior-font-scale'));
      }
      setMessage('设置已经保存。');
    } catch { setMessage('暂时没有保存成功，但您可以继续使用。'); }
  };
  const saveContact = async (fallbackName?: string, fallbackRelationship = '家人') => {
    const finalName = contactName.trim() || fallbackName || '';
    const finalPhone = contactPhone.trim();
    if (!finalName || !finalPhone) { setMessage('请填写联系人姓名和电话。'); return; }
    const optimisticContact: SeniorSupportContact = {
      id: `local-${Date.now()}`,
      user_id: userId,
      contact_name: finalName,
      contact_phone: finalPhone,
      relationship: fallbackRelationship,
      is_primary: contacts.length === 0,
      notify_on_elevated_risk: true,
    };
    setContacts(prev => {
      const next = [optimisticContact, ...prev.filter(item => item.contact_phone !== optimisticContact.contact_phone)];
      writeStoredContacts(userId, next);
      return next;
    });
    setContactName('');
    setContactPhone('');
    setMessage('联系人已经保存到当前页面。');
    try {
      const res = await seniorApi.saveContact(userId, {
        contact_name: optimisticContact.contact_name,
        contact_phone: optimisticContact.contact_phone,
        relationship: optimisticContact.relationship,
        is_primary: optimisticContact.is_primary,
        notify_on_elevated_risk: true,
      });
      setContacts(prev => {
        const next = mergeContacts([res.contact], prev.filter(item => item.id !== optimisticContact.id));
        writeStoredContacts(userId, next);
        return next;
      });
      setMessage('联系人已经保存。');
      setContactDialogOpen(false);
      onSaved?.();
    } catch {
      setMessage('网络保存暂时没有成功，但联系人已保留在当前页面，演示和继续使用不受影响。');
      setContactDialogOpen(false);
      if (required) window.setTimeout(() => onSaved?.(), 300);
    }
  };
  const previewVoice = () => speak('您好。我会用这样的声音，陪您慢慢完成今天的小步骤。这里也可以添加紧急联系人，方便不舒服时知道先找谁。', { voice: pref.senior_voice_name, emotion: 'friendly' });
  const contactGuideText = '请在这里填写一位能联系到的人。可以是子女、配偶、邻居、医生或可信任的朋友。填好姓名和电话后，点保存联系人。保存后，小测和帮助页面就能提醒您优先联系这个人。这里不会自动打电话，也不会偷偷发消息。';
  return (
    <div className="mx-auto max-w-5xl">
      <SeniorPageHeader
        eyebrow={required ? '先完成这一步' : '陪伴版设置'}
        title={required ? '先添加一位紧急联系人' : '把页面调成您用着舒服的样子'}
        desc={required ? '第一次使用陪伴版时，先保存一位能联系到的人。' : '这里可以设置字号、朗读声音，也可以添加或更换紧急联系人。'}
      />
      {required ? (
        <div className="mb-5 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="flex items-center gap-2 text-2xl font-black"><SeniorIcon name="shield" className="h-7 w-7" />先说明一下：为什么要填这个</p>
          <p className="mt-2 text-xl leading-9">陪伴版里有“小测”和“需要帮助”功能。为了您不舒服时能马上知道找谁，第一次使用前先保存一位联系人。不会偷偷打电话，也不会自动发消息，只是在需要时把“联系谁、怎么说”准备好。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ['1', '填姓名', '子女、邻居、医生或可信任朋友都可以'],
              ['2', '填电话', '能联系到就行，演示也可用测试号码'],
              ['3', '点添加', '保存后马上进入首页使用其它功能'],
            ].map(([step, title, desc]) => (
              <div key={step} className="rounded-2xl bg-white/80 p-4">
                <p className="text-lg font-black text-amber-700">第 {step} 步</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{title}</p>
                <p className="mt-2 text-base leading-7 text-slate-700">{desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setContactDialogOpen(true);
              speak(contactGuideText, { voice: pref.senior_voice_name, emotion: 'friendly' });
            }}
            className="mt-5 min-h-[56px] rounded-2xl border border-amber-300 bg-white px-5 text-lg font-black text-amber-900"
          >
            <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-5 w-5" />再听一遍说明</span>
          </button>
        </div>
      ) : null}
      {contactDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2.4rem] border border-cyan-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-lg font-black text-amber-900">
                  <SeniorIcon name="shield" className="h-5 w-5" />
                  {required ? '先完成这个安全设置' : '添加或更换联系人'}
                </p>
                <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">请填一位能联系到的人</h2>
                <p className="mt-3 text-xl leading-9 text-slate-600">以后您在“小测”或“需要帮助”里不舒服时，页面会提醒您先联系这个人。不会自动打电话，也不会偷偷发消息。</p>
              </div>
              {!required ? (
                <button onClick={() => setContactDialogOpen(false)} className="rounded-2xl bg-slate-100 px-4 py-3 text-lg font-black text-slate-700">关闭</button>
              ) : null}
            </div>
            <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-lg font-bold leading-8 text-cyan-950">
              可以填子女、配偶、邻居、医生或可信任朋友。演示时也可以填测试号码。
            </div>
            <label className="mt-5 block text-xl font-black text-slate-800">联系人姓名</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="例如：女儿、儿子、邻居王阿姨、张医生" autoFocus className="mt-2 min-h-[64px] w-full rounded-2xl border border-slate-300 px-5 text-xl" />
            <label className="mt-4 block text-xl font-black text-slate-800">联系电话</label>
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="填写手机号或常用电话" className="mt-2 min-h-[64px] w-full rounded-2xl border border-slate-300 px-5 text-xl" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => saveContact()} className="min-h-[66px] rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white">保存联系人</button>
              <button onClick={() => speak(contactGuideText, { voice: pref.senior_voice_name, emotion: 'friendly' })} className="min-h-[66px] rounded-2xl border border-cyan-200 bg-cyan-50 px-6 text-xl font-black text-cyan-900">
                <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-6 w-6" />朗读说明</span>
              </button>
            </div>
            {!required ? <button onClick={() => setContactDialogOpen(false)} className="mt-3 min-h-[58px] w-full rounded-2xl border border-slate-200 bg-white px-6 text-lg font-black text-slate-700">暂时不改</button> : null}
          </div>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[2.2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-68px_rgba(15,23,42,0.38)]">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
              <SeniorIcon name="settings" className="h-8 w-8" />
            </span>
            <div>
              <h2 className="text-3xl font-black text-slate-950">显示和朗读</h2>
              <p className="mt-2 text-lg leading-8 text-slate-600">先把字和声音调舒服，再开始使用。</p>
            </div>
          </div>
          <label className="mt-5 block text-xl font-bold text-slate-800">字体大小</label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(['large','larger','largest'] as const).map(v => <button key={v} onClick={() => savePref({ font_scale: v })} className={`min-h-[58px] rounded-2xl text-lg font-black ${pref.font_scale === v ? 'bg-cyan-900 text-white' : 'bg-slate-100 text-slate-800'}`}>{v === 'large' ? '大' : v === 'larger' ? '更大' : '超大'}</button>)}
          </div>
          <label className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-xl font-bold text-slate-800">
            自动朗读
            <input type="checkbox" checked={pref.senior_voice_enabled} onChange={e => savePref({ senior_voice_enabled: e.target.checked })} className="h-7 w-7" />
          </label>
          <label className="mt-5 block text-xl font-bold text-slate-800">声音</label>
          <select value={pref.senior_voice_name} onChange={e => savePref({ senior_voice_name: e.target.value })} className="mt-3 min-h-[58px] w-full rounded-2xl border border-slate-300 px-4 text-xl">
            <option value="xiaoyi">活泼女声</option><option value="xiaoxiao">温柔女声</option><option value="yunxi">年轻男声</option><option value="yunjian">稳重男声</option>
          </select>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button onClick={previewVoice} className="min-h-[58px] rounded-2xl border border-cyan-200 bg-cyan-50 px-5 text-lg font-black text-cyan-900">
              <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-5 w-5" />试听声音</span>
            </button>
            <button onClick={stopAndClearAudio} className="min-h-[58px] rounded-2xl border border-slate-200 bg-white px-5 text-lg font-black text-slate-700">{isPlaying ? '停止试听' : '停止朗读'}</button>
          </div>
          <label className="mt-5 block text-xl font-bold text-slate-800">语速</label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[0.72, 0.82, 0.9].map(speed => <button key={speed} onClick={() => savePref({ senior_voice_speed: speed })} className={`min-h-[54px] rounded-2xl text-lg font-black ${Math.abs(pref.senior_voice_speed - speed) < 0.01 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-800'}`}>{speed === 0.72 ? '很慢' : speed === 0.82 ? '慢一点' : '适中'}</button>)}
          </div>
          <label className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-xl font-bold text-slate-800">
            下次自动进入陪伴版
            <input type="checkbox" checked={pref.auto_enter_senior} onChange={e => savePref({ auto_enter_senior: e.target.checked })} className="h-7 w-7" />
          </label>
        </section>
        <section className="rounded-[2.2rem] border border-cyan-100 bg-white p-6 shadow-[0_24px_80px_-68px_rgba(15,23,42,0.38)]">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <SeniorIcon name="phone" className="h-8 w-8" />
            </span>
            <div>
              <h2 className="text-3xl font-black text-slate-950">紧急联系人</h2>
              <p className="mt-3 text-lg leading-8 text-slate-600">需要时页面会优先提示您联系这里的人；当前版本会记录事件并准备好说明，不会偷偷发消息。</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-amber-950">
            <p className="flex items-center gap-2 text-lg font-black"><SeniorIcon name="shield" className="h-5 w-5" />建议填写真实可联系的人</p>
            <p className="mt-1 text-base leading-7">比如子女、配偶、邻居或常联系的朋友。演示时也可以使用测试号码。</p>
          </div>
          <button onClick={() => {
            setContactDialogOpen(true);
            speak(contactGuideText, { voice: pref.senior_voice_name, emotion: 'friendly' });
          }} className="mt-5 min-h-[64px] w-full rounded-2xl bg-rose-700 px-6 text-xl font-black text-white">
            <span className="inline-flex items-center gap-2"><SeniorIcon name="phone" className="h-6 w-6" />添加或更换联系人</span>
          </button>
          <label className="mt-5 block text-xl font-black text-slate-800">联系人姓名</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="例如：女儿、儿子、邻居王阿姨、张医生" className="mt-2 min-h-[60px] w-full rounded-2xl border border-slate-300 px-5 text-xl" />
          <label className="mt-4 block text-xl font-black text-slate-800">联系电话</label>
          <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="填写手机号或常用电话" className="mt-2 min-h-[60px] w-full rounded-2xl border border-slate-300 px-5 text-xl" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button onClick={() => saveContact('家人', '家人')} className="min-h-[64px] rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white">添加家人</button>
            <button onClick={() => saveContact('医生', '医生')} className="min-h-[64px] rounded-2xl border border-cyan-200 bg-cyan-50 px-6 text-xl font-black text-cyan-900">添加医生</button>
          </div>
          <button onClick={() => saveContact()} className="mt-3 min-h-[60px] w-full rounded-2xl border border-slate-200 bg-white px-6 text-lg font-black text-slate-700">保存当前填写的联系人</button>
          <div className="mt-5 space-y-3">
            {contacts.map(c => <div key={c.id || c.contact_phone} className="rounded-2xl bg-cyan-50 p-4 text-xl font-bold text-cyan-950"><span className="inline-flex items-center gap-2"><SeniorIcon name="user" className="h-5 w-5" />{c.contact_name} · {c.contact_phone}</span></div>)}
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xl font-black"><SeniorIcon name="check" className="h-6 w-6" />当前页面预览</p>
            <p className="mt-2 text-lg leading-8">字号：{fontScaleLabel[pref.font_scale]}；朗读：{pref.senior_voice_enabled ? '已开启' : '已关闭'}；声音：{pref.senior_voice_name === 'xiaoyi' ? '活泼女声' : pref.senior_voice_name === 'xiaoxiao' ? '温柔女声' : pref.senior_voice_name === 'yunxi' ? '年轻男声' : '稳重男声'}。</p>
          </div>
          <button onClick={previewVoice} className="min-h-[58px] rounded-2xl bg-emerald-800 px-5 text-lg font-black text-white">再试听一次</button>
        </div>
      </section>
      {message ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xl font-bold text-emerald-800">{message}</p> : null}
      {!required && contacts.length ? (
        <button onClick={() => onSaved?.()} className="mt-4 min-h-[58px] rounded-2xl bg-slate-950 px-6 text-lg font-black text-white">回到首页</button>
      ) : null}
    </div>
  );
}
