import { useEffect, useState } from 'react';
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

const fontScaleLabel: Record<SeniorPreference['font_scale'], string> = {
  large: '大',
  larger: '更大',
  largest: '超大',
};

const isFontScale = (value: string | null): value is SeniorPreference['font_scale'] => (
  value === 'large' || value === 'larger' || value === 'largest'
);

export function SeniorSettings({ userId }: { userId: string }) {
  const [pref, setPref] = useState<SeniorPreference>({ ...defaultPref, user_id: userId });
  const [contacts, setContacts] = useState<SeniorSupportContact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState('');
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
      writeStoredContacts(userId, mergedContacts);
      localStorage.setItem(FONT_SCALE_STORAGE, fontScale);
      window.dispatchEvent(new Event('neurasense-senior-font-scale'));
    }).catch(() => null);
  }, [userId]);
  const savePref = async (patch: Partial<SeniorPreference>) => {
    const next = { ...pref, ...patch };
    setPref(next);
    if (patch.font_scale) {
      localStorage.setItem(FONT_SCALE_STORAGE, patch.font_scale);
      window.dispatchEvent(new Event('neurasense-senior-font-scale'));
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
  const saveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) { setMessage('请填写联系人姓名和电话。'); return; }
    const optimisticContact: SeniorSupportContact = {
      id: `local-${Date.now()}`,
      user_id: userId,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      relationship: '家人',
      is_primary: contacts.length === 0,
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
      });
      setContacts(prev => {
        const next = mergeContacts([res.contact], prev.filter(item => item.id !== optimisticContact.id));
        writeStoredContacts(userId, next);
        return next;
      });
      setMessage('联系人已经保存。');
    } catch { setMessage('网络保存暂时没有成功，但联系人已保留在当前页面，演示和继续使用不受影响。'); }
  };
  const previewVoice = () => speak('您好。我会用这样的声音，陪您慢慢完成今天的小步骤。', { voice: pref.senior_voice_name, emotion: 'friendly' });
  return (
    <div className="mx-auto max-w-5xl">
      <SeniorPageHeader eyebrow="陪伴版设置" title="把页面调成您用着舒服的样子" desc="这里可以设置字号、朗读、声音和紧急联系人。" />
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
            {[0.82, 0.9, 1].map(speed => <button key={speed} onClick={() => savePref({ senior_voice_speed: speed })} className={`min-h-[54px] rounded-2xl text-lg font-black ${Math.abs(pref.senior_voice_speed - speed) < 0.01 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-800'}`}>{speed === 0.82 ? '慢一点' : speed === 0.9 ? '适中' : '快一点'}</button>)}
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
              <p className="mt-3 text-lg leading-8 text-slate-600">第一版不会自动发短信，只会在帮助页显示，方便您自己联系。</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-amber-950">
            <p className="flex items-center gap-2 text-lg font-black"><SeniorIcon name="shield" className="h-5 w-5" />建议填写真实可联系的人</p>
            <p className="mt-1 text-base leading-7">比如子女、配偶、邻居或常联系的朋友。演示时也可以使用测试号码。</p>
          </div>
          <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="联系人姓名" className="mt-5 min-h-[60px] w-full rounded-2xl border border-slate-300 px-5 text-xl" />
          <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="电话" className="mt-3 min-h-[60px] w-full rounded-2xl border border-slate-300 px-5 text-xl" />
          <button onClick={saveContact} className="mt-4 min-h-[64px] w-full rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white">保存联系人</button>
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
    </div>
  );
}
