import { useCallback, useEffect, useRef, useState } from 'react';
import { SeniorShell } from '../layouts/SeniorShell';
import { SeniorHome } from '../pages/SeniorHome';
import { SeniorVoiceCompanion } from '../pages/SeniorVoiceCompanion';
import { SeniorConversation } from '../pages/SeniorConversation';
import { SeniorDailySummary } from '../pages/SeniorDailySummary';
import { SeniorRelaxGuide } from '../pages/SeniorRelaxGuide';
import { SeniorHelpCenter } from '../pages/SeniorHelpCenter';
import { SeniorSettings } from '../pages/SeniorSettings';
import { SeniorCheckup } from '../pages/SeniorCheckup';
import { SeniorProfile } from '../pages/SeniorProfile';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { useStopAudioOnRouteChange } from '../hooks/useStopAudioOnRouteChange';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { mergeContacts, readStoredContacts, writeStoredContacts } from '../lib/localSupportContacts';
import { seniorApi } from '../services/seniorApi';

interface SeniorRoutesProps {
  userId: string;
  currentUserName?: string;
  onSwitchToStandard: () => void;
  onLogout?: () => void;
}

const STORAGE_ROUTE = 'neurasense-senior-route';
const STORAGE_SUMMARY = 'neurasense-senior-latest-summary';
const pages: SeniorPage[] = ['home', 'companion', 'chat', 'summary', 'relax', 'help', 'settings', 'checkup', 'profile'];
const CONTACT_READY_STORAGE = 'neurasense-senior-contact-ready';

const storageUserKey = (prefix: string, userId: string) => `${prefix}:${userId || 'anonymous'}`;

function resolveStorageUserId(userId: string) {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return userId;
    const parsed = JSON.parse(raw) as { id?: string } | null;
    if (parsed?.id && (!userId || userId.startsWith('guest_') || userId === 'anonymous')) {
      return String(parsed.id);
    }
  } catch {
    return userId;
  }
  return userId;
}

function readStoredPage(userId: string): SeniorPage | null {
  const stored = localStorage.getItem(storageUserKey(STORAGE_ROUTE, userId)) as SeniorPage | null;
  return stored && pages.includes(stored) ? stored : null;
}

function readStoredSummary(userId: string): SeniorSummary | null {
  try {
    return JSON.parse(localStorage.getItem(storageUserKey(STORAGE_SUMMARY, userId)) || 'null');
  } catch {
    return null;
  }
}

function replaceSeniorUrl(page: SeniorPage) {
  window.history.replaceState(null, '', `/senior${page === 'home' ? '' : `/${page}`}`);
}

function getPageVoiceGuide(page: SeniorPage, name?: string) {
  const prefix = name ? `${name}，` : '';
  switch (page) {
    case 'home':
      return `${prefix}已经进入陪伴页面。今天不用找很多功能，先从“今天的问候”开始，或者点一个想聊的话题。`;
    case 'chat':
      return '这里可以慢慢说。您可以直接打一小句话，也可以点下面的话题按钮，我会一次只给一个小建议。';
    case 'summary':
      return '这里会显示今天的建议。先完成一次今天的问候，就能一张一张地看。想重新回答，也可以点重新问答。';
    case 'relax':
      return '这里是放松练习。今天先做一个短练习就够，不需要把所有工具都做一遍。';
    case 'checkup':
      return '这里是老年版小测。题目会覆盖心情、担心、孤单、睡眠和身体安全。我会一题一题问，最后给您今天能做的一步。';
    case 'help':
      return '这里是帮助入口。如果现在很难受，先联系身边可信任的人，或者查看页面上的支持资源。';
    case 'settings':
      return '这里可以调整字号、朗读声音，也可以添加或更换紧急联系人。联系人很重要；在您不舒服或需要帮助时，页面会提醒您先联系这里的人。';
    case 'profile':
      return '这里是个人中心。您可以查看账号、去设置联系人，也可以直接退出当前账号。';
    case 'companion':
    default:
      return '';
  }
}

function getInitialPage(userId: string): SeniorPage {
  const [, seniorSegment, pageSegment] = window.location.pathname.split('/');
  if (seniorSegment === 'senior' && pageSegment && pages.includes(pageSegment as SeniorPage)) return pageSegment as SeniorPage;
  return readStoredPage(userId) || 'home';
}

export default function SeniorRoutes({ userId, currentUserName, onSwitchToStandard, onLogout }: SeniorRoutesProps) {
  const storageUserId = resolveStorageUserId(userId);
  const [page, setPage] = useState<SeniorPage>(() => getInitialPage(storageUserId));
  const [chatSeed, setChatSeed] = useState<string>('');
  const [latestSummary, setLatestSummary] = useState<SeniorSummary | null>(() => readStoredSummary(storageUserId));
  const [contactsReady, setContactsReady] = useState(() => readStoredContacts(storageUserId).length > 0 || localStorage.getItem(storageUserKey(CONTACT_READY_STORAGE, storageUserId)) === 'true');
  const [contactsChecking, setContactsChecking] = useState(true);
  const skipNextPersistRef = useRef(false);
  const lastUserIdRef = useRef(storageUserId);
  const { speak } = useSeniorTTS();
  const stopAndClearAudio = useCallback(() => {
    useSeniorAudioStore.getState().stop();
    useSeniorAudioStore.setState({ currentText: '', error: null });
  }, []);
  useStopAudioOnRouteChange(page);
  useEffect(() => {
    if (lastUserIdRef.current === storageUserId) return;
    lastUserIdRef.current = storageUserId;
    skipNextPersistRef.current = true;
    stopAndClearAudio();
    setChatSeed('');
    setLatestSummary(readStoredSummary(storageUserId));
    const localReady = readStoredContacts(storageUserId).length > 0 || localStorage.getItem(storageUserKey(CONTACT_READY_STORAGE, storageUserId)) === 'true';
    setContactsReady(localReady);
    const nextPage = readStoredPage(storageUserId) || 'home';
    setPage(nextPage);
    localStorage.setItem(storageUserKey(STORAGE_ROUTE, storageUserId), nextPage);
    replaceSeniorUrl(nextPage);
  }, [stopAndClearAudio, storageUserId]);
  useEffect(() => {
    let cancelled = false;
    setContactsChecking(true);
    const localContacts = readStoredContacts(storageUserId);
    if (localContacts.length) {
      setContactsReady(true);
      localStorage.setItem(storageUserKey(CONTACT_READY_STORAGE, storageUserId), 'true');
    }
    seniorApi.getContacts(storageUserId).then(res => {
      if (cancelled) return;
      const merged = mergeContacts(res.contacts || [], localContacts);
      if (merged.length) {
        writeStoredContacts(storageUserId, merged);
        localStorage.setItem(storageUserKey(CONTACT_READY_STORAGE, storageUserId), 'true');
        setContactsReady(true);
      } else {
        setContactsReady(false);
      }
    }).catch(() => {
      if (!cancelled) setContactsReady(localContacts.length > 0);
    }).finally(() => {
      if (!cancelled) setContactsChecking(false);
    });
    return () => { cancelled = true; };
  }, [storageUserId]);
  useEffect(() => {
    if (contactsChecking || contactsReady) return;
    if (page === 'settings' || page === 'help' || page === 'profile') return;
    setPage('settings');
    replaceSeniorUrl('settings');
  }, [contactsChecking, contactsReady, page]);
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    localStorage.setItem(storageUserKey(STORAGE_ROUTE, storageUserId), page);
    replaceSeniorUrl(page);
  }, [page, storageUserId]);
  useEffect(() => {
    if (page === 'companion') return;
    if (page === 'summary' && latestSummary) return;
    if (page === 'settings') return;
    const guide = getPageVoiceGuide(page, currentUserName);
    if (!guide) return;
    const timer = window.setTimeout(() => speak(guide, { voice: 'xiaoyi', emotion: 'friendly' }), 520);
    return () => window.clearTimeout(timer);
  }, [contactsReady, currentUserName, latestSummary, page, speak]);
  const goTop = () => window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
  const handleNavigate = (next: SeniorPage) => { stopAndClearAudio(); setPage(next); goTop(); };
  const handleStartTopic = (prompt: string) => { stopAndClearAudio(); setChatSeed(prompt); setPage('chat'); goTop(); };
  const handleSummary = (summary: SeniorSummary) => {
    setLatestSummary(summary);
    localStorage.setItem(storageUserKey(STORAGE_SUMMARY, storageUserId), JSON.stringify(summary));
  };
  const handleContactSaved = () => {
    setContactsReady(true);
    localStorage.setItem(storageUserKey(CONTACT_READY_STORAGE, storageUserId), 'true');
    handleNavigate('home');
  };
  if (contactsChecking && !contactsReady) {
    return (
      <SeniorShell page="settings" onNavigate={handleNavigate} onSwitchToStandard={onSwitchToStandard} currentUserName={currentUserName} contactRequired>
        <div className="mx-auto max-w-3xl rounded-[2.2rem] border border-cyan-100 bg-white p-8 text-center shadow-[0_30px_100px_-70px_rgba(15,23,42,0.45)]">
          <p className="text-2xl font-black text-slate-950">正在确认第一次使用的安全设置</p>
          <p className="mt-3 text-xl leading-9 text-slate-600">别担心，只是检查有没有一位能联系到的人。没有的话，我会带您一步一步填写，填完马上进入首页。</p>
        </div>
      </SeniorShell>
    );
  }
  const content = (() => {
    if (!contactsReady && page !== 'settings' && page !== 'help' && page !== 'profile') {
      return <SeniorSettings userId={storageUserId} required autoOpenContact onSaved={handleContactSaved} />;
    }
    switch (page) {
      case 'companion': return <SeniorVoiceCompanion userId={storageUserId} onNavigate={handleNavigate} onSummary={handleSummary} />;
      case 'chat': return <SeniorConversation userId={storageUserId} onNavigate={handleNavigate} initialTopic={chatSeed} onSeedConsumed={() => setChatSeed('')} />;
      case 'summary': return <SeniorDailySummary userId={storageUserId} latestSummary={latestSummary} onNavigate={handleNavigate} />;
      case 'relax': return <SeniorRelaxGuide userId={storageUserId} latestSummary={latestSummary} onNavigate={handleNavigate} />;
      case 'checkup': return <SeniorCheckup userId={storageUserId} onNavigate={handleNavigate} />;
      case 'help': return <SeniorHelpCenter userId={storageUserId} latestSummary={latestSummary} onNavigate={handleNavigate} />;
      case 'settings': return <SeniorSettings userId={storageUserId} required={!contactsReady} autoOpenContact={!contactsReady} onSaved={handleContactSaved} />;
      case 'profile': return <SeniorProfile userId={storageUserId} currentUserName={currentUserName} onNavigate={handleNavigate} onSwitchToStandard={onSwitchToStandard} onLogout={onLogout || (() => {})} />;
      case 'home':
      default: return <SeniorHome userId={storageUserId} currentUserName={currentUserName} latestSummary={latestSummary} onNavigate={handleNavigate} onStartTopic={handleStartTopic} />;
    }
  })();
  return <SeniorShell page={page} onNavigate={handleNavigate} onSwitchToStandard={onSwitchToStandard} currentUserName={currentUserName} contactRequired={!contactsReady}>{content}</SeniorShell>;
}
