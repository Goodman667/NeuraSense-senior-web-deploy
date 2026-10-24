import { useEffect, useRef, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { mergeContacts, readStoredContacts, writeStoredContacts } from '../lib/localSupportContacts';
import { seniorApi } from '../services/seniorApi';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import type { SeniorPreference, SeniorSupportContact } from '../types/senior';
import { isEnglish, setLangAndReload } from '../../../i18n/autoTranslate';

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
  const voiceLabel = pref.senior_voice_name === 'xiaoyi' ? '活泼女声' : pref.senior_voice_name === 'xiaoxiao' ? '温柔女声' : pref.senior_voice_name === 'yunxi' ? '年轻男声' : '稳重男声';
  return (
    <div className="mx-auto max-w-6xl">
      <SeniorPageHeader
        eyebrow={required ? '先完成这一步' : '设置'}
        title={required ? '先添加一位紧急联系人' : '把页面调成您用着舒服的样子'}
        desc={required ? '第一次用陪伴版，先存好一位能联系到的人。' : '字号、朗读声音和紧急联系人都在这里。'}
      />
      {required ? (
        <section className="sn-sheet mb-6 p-6 md:p-7">
          <p className="sn-h3 flex items-center gap-2"><SeniorIcon name="shield" className="h-7 w-7 text-[var(--sn-teal)]" />为什么要先填这个</p>
          <p className="sn-body mt-2 max-w-4xl">陪伴版里有“小测”和“需要帮助”。为了您不舒服时马上知道找谁，第一次使用前先存好一位联系人。这里不会偷偷打电话，也不会自动发消息，只是在需要时把“联系谁、怎么说”准备好。</p>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ['填姓名', '子女、邻居、医生或信得过的朋友都可以'],
              ['填电话', '能联系到就行，演示时可用测试号码'],
              ['点保存', '保存后马上进入首页'],
            ].map(([title, desc], index) => (
              <li key={title} className="sn-sheet-flat flex gap-4 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--sn-line-strong)] text-[1.2rem] text-[var(--sn-teal-deep)]">{index + 1}</span>
                <span>
                  <span className="block text-[1.35rem]">{title}</span>
                  <span className="sn-small mt-1 block">{desc}</span>
                </span>
              </li>
            ))}
          </ol>
          <button
            onClick={() => {
              setContactDialogOpen(true);
              speak(contactGuideText, { voice: pref.senior_voice_name, emotion: 'friendly' });
            }}
            className="sn-btn sn-btn-quiet mt-5"
          >
            <SeniorIcon name="volume" />再听一遍说明
          </button>
        </section>
      ) : null}

      {contactDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,40,43,0.45)] p-4" role="dialog" aria-modal="true" aria-labelledby="sn-contact-title">
          <div className="sn sn-sheet max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 shadow-[0_40px_120px_-40px_rgba(8,21,12,0.55)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="sn-kicker"><SeniorIcon name="shield" className="h-5 w-5" />{required ? '先完成这个安全设置' : '添加或更换联系人'}</p>
                <h2 id="sn-contact-title" className="sn-h1 mt-2">请填一位能联系到的人</h2>
                <p className="sn-body mt-2">以后您在“小测”或“需要帮助”里不舒服时，页面会提醒您先联系这个人。不会自动打电话，也不会偷偷发消息。</p>
              </div>
              {!required ? (
                <button onClick={() => setContactDialogOpen(false)} className="sn-btn sn-btn-quiet shrink-0">关闭</button>
              ) : null}
            </div>
            <p className="sn-notice tone-info mt-5 text-[1.1rem] leading-8">可以填子女、配偶、邻居、医生或信得过的朋友。演示时也可以填测试号码。</p>
            <label htmlFor="sn-contact-name" className="mt-6 block text-[1.25rem]">联系人怎么称呼</label>
            <input id="sn-contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="例如：女儿、邻居王阿姨、张医生" autoFocus className="sn-input mt-2" />
            <label htmlFor="sn-contact-phone" className="mt-4 block text-[1.25rem]">联系电话</label>
            <input id="sn-contact-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="手机号或常用电话" inputMode="tel" className="sn-input mt-2" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => saveContact()} className="sn-btn sn-btn-primary sn-btn-lg">保存联系人</button>
              <button onClick={() => speak(contactGuideText, { voice: pref.senior_voice_name, emotion: 'friendly' })} className="sn-btn sn-btn-quiet sn-btn-lg">
                <SeniorIcon name="volume" />朗读说明
              </button>
            </div>
            {message ? <p className="mt-4 text-[1.1rem] text-[var(--sn-teal-deep)]" role="status">{message}</p> : null}
            {!required ? <button onClick={() => setContactDialogOpen(false)} className="sn-btn sn-btn-quiet sn-btn-block mt-3">暂时不改</button> : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="sn-sheet p-6 md:p-7">
          <h2 className="sn-h2 flex items-center gap-3"><SeniorIcon name="settings" className="h-7 w-7 text-[var(--sn-teal)]" />显示和朗读</h2>
          <p className="sn-body mt-1">先把字和声音调舒服，再开始用。</p>

          <p className="mt-6 text-[1.2rem]">语言 / Language</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="语言 / Language" data-no-translate>
            <button lang="zh-CN" onClick={() => { if (isEnglish()) setLangAndReload('zh'); }} aria-pressed={!isEnglish()} className="sn-chip justify-center whitespace-nowrap !rounded-[14px] !px-2">中文</button>
            <button lang="en" onClick={() => { if (!isEnglish()) setLangAndReload('en'); }} aria-pressed={isEnglish()} className="sn-chip justify-center whitespace-nowrap !rounded-[14px] !px-2">English</button>
          </div>

          <p className="mt-6 text-[1.2rem]">字体大小</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="字体大小">
            {(['large', 'larger', 'largest'] as const).map(v => (
              <button key={v} onClick={() => savePref({ font_scale: v })} aria-pressed={pref.font_scale === v} className="sn-chip justify-center whitespace-nowrap !rounded-[14px] !px-2">
                <span style={{ fontSize: v === 'large' ? '1.1rem' : v === 'larger' ? '1.3rem' : '1.5rem' }}>{fontScaleLabel[v]}</span>
              </button>
            ))}
          </div>

          <label className="mt-6 flex min-h-[3.6rem] items-center justify-between gap-4 rounded-[14px] bg-[var(--sn-sheet-2)] px-4 text-[1.2rem]">
            打开页面时自动朗读
            <input type="checkbox" checked={pref.senior_voice_enabled} onChange={e => savePref({ senior_voice_enabled: e.target.checked })} className="h-7 w-7 accent-[#175A67]" />
          </label>

          <label htmlFor="sn-voice" className="mt-6 block text-[1.2rem]">朗读声音</label>
          <select id="sn-voice" value={pref.senior_voice_name} onChange={e => savePref({ senior_voice_name: e.target.value })} className="sn-select mt-2">
            <option value="xiaoyi">活泼女声</option><option value="xiaoxiao">温柔女声</option><option value="yunxi">年轻男声</option><option value="yunjian">稳重男声</option>
          </select>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button onClick={previewVoice} className="sn-btn sn-btn-outline"><SeniorIcon name="volume" />试听声音</button>
            <button onClick={stopAndClearAudio} className="sn-btn sn-btn-quiet">{isPlaying ? '停止试听' : '停止朗读'}</button>
          </div>

          <p className="mt-6 text-[1.2rem]">说话快慢</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="语速">
            {[0.72, 0.82, 0.9].map(speed => (
              <button key={speed} onClick={() => savePref({ senior_voice_speed: speed })} aria-pressed={Math.abs(pref.senior_voice_speed - speed) < 0.01} className="sn-chip justify-center whitespace-nowrap !rounded-[14px] !px-2">
                {speed === 0.72 ? '很慢' : speed === 0.82 ? '慢一点' : '适中'}
              </button>
            ))}
          </div>

          <label className="mt-6 flex min-h-[3.6rem] items-center justify-between gap-4 rounded-[14px] bg-[var(--sn-sheet-2)] px-4 text-[1.2rem]">
            下次自动进入陪伴版
            <input type="checkbox" checked={pref.auto_enter_senior} onChange={e => savePref({ auto_enter_senior: e.target.checked })} className="h-7 w-7 accent-[#175A67]" />
          </label>
          <p className="sn-small mt-4">现在：字号{fontScaleLabel[pref.font_scale]}，朗读{pref.senior_voice_enabled ? '已开启' : '已关闭'}，{voiceLabel}。</p>
        </section>

        <section className="sn-sheet p-6 md:p-7">
          <h2 className="sn-h2 flex items-center gap-3"><SeniorIcon name="phone" className="h-7 w-7 text-[var(--sn-help)]" />紧急联系人</h2>
          <p className="sn-body mt-1">需要帮助时，页面会先提醒您联系这里的人，并准备好一段可以发给他们的话。</p>

          <div className="mt-5 space-y-2">
            {contacts.length ? contacts.map(c => (
              <div key={c.id || c.contact_phone} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[14px] border border-[var(--sn-line)] bg-white/60 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3 text-[1.25rem]"><SeniorIcon name="user" className="h-6 w-6 text-[var(--sn-teal)]" />{c.contact_name}</span>
                <span className="text-[1.15rem] tabular-nums text-[var(--sn-ink-2)]">{c.contact_phone}</span>
              </div>
            )) : (
              <p className="sn-notice tone-warning text-[1.1rem]">还没有联系人。建议先添加一位家人。</p>
            )}
          </div>

          <button onClick={() => {
            setContactDialogOpen(true);
            speak(contactGuideText, { voice: pref.senior_voice_name, emotion: 'friendly' });
          }} className="sn-btn sn-btn-help sn-btn-block mt-5">
            <SeniorIcon name="phone" />添加或更换联系人
          </button>

          <hr className="sn-rule my-6" />
          <p className="text-[1.2rem]">或者直接在这里填</p>
          <label htmlFor="sn-inline-name" className="sr-only">联系人姓名</label>
          <input id="sn-inline-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="称呼，例如：女儿" className="sn-input mt-2" />
          <label htmlFor="sn-inline-phone" className="sr-only">联系电话</label>
          <input id="sn-inline-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="联系电话" inputMode="tel" className="sn-input mt-2" />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button onClick={() => saveContact('家人', '家人')} className="sn-btn sn-btn-primary">存为家人</button>
            <button onClick={() => saveContact('医生', '医生')} className="sn-btn sn-btn-outline">存为医生</button>
            <button onClick={() => saveContact()} className="sn-btn sn-btn-quiet">保存</button>
          </div>
        </section>
      </div>

      {message ? <p className="sn-notice tone-success mt-6 text-[1.15rem]" role="status">{message}</p> : null}
      {!required && contacts.length ? (
        <button onClick={() => onSaved?.()} className="sn-btn sn-btn-dark mt-5">回到今天</button>
      ) : null}
    </div>
  );
}
