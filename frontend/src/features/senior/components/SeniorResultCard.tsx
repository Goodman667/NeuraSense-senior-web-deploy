import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SeniorInsightCard, SeniorRiskLevel, SeniorSummary } from '../types/senior';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import { SeniorIcon, type SeniorIconName } from './SeniorIcon';
import { seniorAssets } from '../lib/seniorAssets';

type ResultSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: SeniorIconName;
  tone: 'mint' | 'cyan' | 'rose' | 'slate';
  bullets?: string[];
  speakText: string;
};

const iconNames: SeniorIconName[] = ['home', 'chat', 'leaf', 'help', 'settings', 'spark', 'play', 'check', 'phone', 'heart', 'shield', 'volume', 'keyboard', 'mic', 'edit', 'pause', 'reset', 'warning', 'clock', 'user', 'arrow'];

const slideImage: Record<string, string> = {
  overview: seniorAssets.stoneValley,
  next: seniorAssets.cardMossStone,
  why: seniorAssets.cardSilhouette,
  safety: seniorAssets.cardLoneTree,
  family: seniorAssets.stoneValleyBloom,
};
const fallbackImages = [seniorAssets.stoneValley, seniorAssets.cardMossStone, seniorAssets.cardSilhouette, seniorAssets.cardLoneTree, seniorAssets.stoneValleyBloom];

function slideToneFromRisk(level?: SeniorRiskLevel | string): ResultSlide['tone'] {
  if (level === 'urgent' || level === 'medical_emergency' || level === 'elevated') return 'rose';
  if (level === 'watch') return 'cyan';
  if (level === 'normal') return 'mint';
  return 'slate';
}

function iconFromCard(icon?: string): SeniorIconName {
  return iconNames.includes(icon as SeniorIconName) ? icon as SeniorIconName : 'spark';
}

function cleanDisplayText(text?: string) {
  return (text || '')
    .replace(/NeuraSense|关怀模式|项目|平台|AI|人工智能/gi, '')
    .replace(/医学诊断|诊断|评分|分数|量表|风险等级|PHQ-?9|GAD-?7/gi, '')
    .replace(/这不是，?/g, '')
    .replace(/这不是[，,。；;]*/g, '')
    .replace(/[。；;，,]\s*[。；;，,]+/g, '。')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpeechPart(text?: string) {
  return cleanDisplayText(text).replace(/[。！？!?，,；;\s]+/g, '');
}

function composeSlideSpeech(slide: ResultSlide) {
  const parts = [slide.eyebrow, slide.title, slide.speakText].map(cleanDisplayText).filter(Boolean);
  return parts
    .filter((part, index) => {
      const normalized = normalizeSpeechPart(part);
      if (!normalized) return false;
      return !parts.slice(0, index).some(prev => {
        const previous = normalizeSpeechPart(prev);
        return previous === normalized || previous.includes(normalized) || normalized.includes(previous);
      });
    })
    .join('。');
}

function buildCaregiverBrief(summary: SeniorSummary) {
  if (summary.family_message?.trim()) return cleanDisplayText(summary.family_message);
  const next = summary.recommendation.title || summary.next_action.label;
  const dimensionHints = Object.values(summary.dimensions || {})
    .filter(item => /关注|陪伴|较高|中等|需要|偏高|一般/.test(`${item.status}${item.text}`))
    .slice(0, 2)
    .map(item => `${item.label}${item.status}`)
    .join('，');
  const reason = cleanDisplayText(dimensionHints || summary.recommendation.reason || summary.risk_explanation);
  const helpText = summary.risk_level === 'urgent' || summary.risk_level === 'elevated'
    ? '今天请尽量陪在我身边，如果我很不舒服，帮我联系医生或当地急救。'
    : `今天请先陪我做这一步：${cleanDisplayText(next)}。`;
  return `我今天有点不舒服，主要是${reason || '状态不太稳'}。接下来想先${cleanDisplayText(next)}。${helpText}`;
}

function slideFromInsightCard(card: SeniorInsightCard): ResultSlide {
  return {
    id: card.id,
    eyebrow: cleanDisplayText(card.eyebrow) || '今天的建议',
    title: cleanDisplayText(card.title) || '先慢慢来',
    body: cleanDisplayText(card.body) || '今天先照顾当下，不需要一次做很多。',
    icon: iconFromCard(card.icon),
    tone: slideToneFromRisk(card.tone),
    bullets: (card.bullets || []).map(cleanDisplayText).filter(Boolean).slice(0, 4),
    speakText: cleanDisplayText(card.speak_text || card.body || card.title),
  };
}

function buildSlides(summary: SeniorSummary): ResultSlide[] {
  if (summary.insight_cards && summary.insight_cards.length >= 2) {
    return summary.insight_cards.map(slideFromInsightCard);
  }
  const dimensions = Object.values(summary.dimensions || {});
  const primaryDimension = dimensions.find(item => /关注|陪伴|较高|中等|需要|偏高/.test(`${item.status}${item.text}`)) || dimensions[0];
  const needsHelp = summary.risk_level === 'elevated' || summary.risk_level === 'urgent' || summary.risk_level === 'medical_emergency';
  const plainSummary = cleanDisplayText(summary.plain_summary);
  const recommendationTitle = cleanDisplayText(summary.recommendation.title);
  const recommendationReason = cleanDisplayText(summary.recommendation.reason);
  const whyText = cleanDisplayText(
    primaryDimension
      ? `${primaryDimension.text} 所以今天先做：${recommendationTitle}。`
      : `${recommendationReason} 今天先做：${recommendationTitle}。`
  );
  const caregiverBrief = buildCaregiverBrief(summary);

  return [
    {
      id: 'overview',
      eyebrow: '先看这一点',
      title: cleanDisplayText(summary.summary_title) || '今天先慢一点',
      body: plainSummary,
      icon: 'spark',
      tone: needsHelp ? 'rose' : 'mint',
      bullets: [
        primaryDimension ? `${primaryDimension.label}：${primaryDimension.status}` : '先照顾自己',
        '今天只先做一件小事',
      ],
      speakText: cleanDisplayText(summary.tts_text) || plainSummary,
    },
    {
      id: 'next',
      eyebrow: '现在先做',
      title: recommendationTitle,
      body: recommendationReason,
      icon: needsHelp ? 'phone' : 'leaf',
      tone: needsHelp ? 'rose' : 'cyan',
      bullets: [
        `只做这一步：${recommendationTitle}`,
        needsHelp ? '如果现在不安全，请先联系身边的人' : '做完这一步就可以停下来',
      ],
      speakText: `现在先做：${recommendationTitle}。${recommendationReason}`,
    },
    {
      id: 'why',
      eyebrow: '为什么先做这个',
      title: '先照顾今天最明显的地方',
      body: whyText,
      icon: 'shield',
      tone: 'slate',
      bullets: dimensions.slice(0, 4).map(item => cleanDisplayText(item.text)),
      speakText: whyText,
    },
    {
      id: 'safety',
      eyebrow: needsHelp ? '现在先别一个人扛' : '如果等下又不舒服',
      title: needsHelp ? '先找一个真人陪在身边' : '照这张安心卡做',
      body: needsHelp
        ? '现在最重要的是安全和陪伴。请先联系一个可信任的人，或打开帮助入口。'
        : '不用重新想该怎么办，先按下面三个小步骤来。做完第一步就可以停。',
      icon: needsHelp ? 'warning' : 'heart',
      tone: needsHelp ? 'rose' : 'cyan',
      bullets: needsHelp
        ? ['给家人或可信任的人打电话', '不要一个人待着', '如果有危险，请联系当地急救或专业帮助']
        : ['坐稳，喝一口水', `先做：${summary.recommendation.title}`, '如果加重，再联系家人或专业帮助'],
      speakText: needsHelp
        ? '现在先别一个人扛。请联系一个可信任的人，或打开帮助入口。'
        : `如果等下又不舒服，先坐稳喝口水，再做：${summary.recommendation.title}。`,
    },
    {
      id: 'family',
      eyebrow: '想告诉家人的话',
      title: '可以直接发这一段',
      body: caregiverBrief,
      icon: 'user',
      tone: 'slate',
      bullets: ['不用解释太多', '只说今天希望家人怎么陪'],
      speakText: '这里有一段可以直接发给家人的话。只说今天希望家人怎么陪您。',
    },
  ];
}

export function SeniorResultCard({ summary, onNext, onHelp }: { summary: SeniorSummary; onNext: () => void; onHelp: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const slides = useMemo(() => buildSlides(summary), [summary]);
  const activeSlide = slides[activeIndex] || slides[0];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === slides.length - 1;
  const needsHelp = summary.risk_level === 'elevated' || summary.risk_level === 'urgent' || summary.risk_level === 'medical_emergency';
  const { speak, stop } = useSeniorTTS();
  const stopAndClearAudio = useCallback(() => {
    stop();
    useSeniorAudioStore.setState({ currentText: '', error: null });
  }, [stop]);

  useEffect(() => {
    stopAndClearAudio();
    const timer = window.setTimeout(() => {
      speak(composeSlideSpeech(activeSlide), { voice: 'xiaoyi', emotion: needsHelp ? 'calm' : 'friendly' });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      stopAndClearAudio();
    };
  }, [activeSlide, needsHelp, speak, stopAndClearAudio]);

  useEffect(() => () => stopAndClearAudio(), [stopAndClearAudio]);

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (clamped === activeIndex) return;
    setDirection(clamped > activeIndex ? 1 : -1);
    setActiveIndex(clamped);
  };

  const copyFamilyText = async () => {
    try {
      await navigator.clipboard.writeText(buildCaregiverBrief(summary));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handlePrimary = () => {
    if (activeSlide.id === 'family') {
      copyFamilyText();
      return;
    }
    if (needsHelp && activeSlide.id === 'safety') {
      onHelp();
      return;
    }
    onNext();
  };

  const handleNavigate = () => {
    if (needsHelp) {
      onHelp();
      return;
    }
    onNext();
  };

  const handleTouchEnd = (clientX: number) => {
    if (touchStart === null) return;
    const delta = clientX - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) < 45) return;
    goTo(delta < 0 ? activeIndex + 1 : activeIndex - 1);
  };

  const image = slideImage[activeSlide.id] || fallbackImages[activeIndex % fallbackImages.length];
  const urgentTone = activeSlide.tone === 'rose';

  return (
    <section className="sn-sheet overflow-hidden p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3 pt-1">
        <p className="sn-kicker"><SeniorIcon name="spark" className="h-5 w-5" />今天的建议 · 一张一张看</p>
        <p className="text-[1.1rem] tabular-nums text-[var(--sn-ink-3)]">{activeIndex + 1} / {slides.length}</p>
      </div>

      <div
        onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        <AnimatePresence custom={direction} mode="wait">
          <motion.article
            key={activeSlide.id}
            custom={direction}
            initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          >
            <div className={`sn-photo-card min-h-[18rem] cursor-default xl:min-h-[30rem] ${urgentTone ? 'is-help' : ''}`}>
              <img src={image} alt="" />
              <span className="sn-pill"><SeniorIcon name={activeSlide.icon} className="h-5 w-5" />{activeSlide.eyebrow}</span>
              <h3 className="text-[clamp(1.9rem,2.8vw,2.6rem)] leading-tight [text-wrap:balance]">{activeSlide.title}</h3>
            </div>

            <div className="flex flex-col rounded-[20px] bg-[#F4F1EC] p-6 md:p-8">
              <p className="text-[1.4rem] leading-[1.85] text-[var(--sn-ink)]">{activeSlide.body}</p>
              {activeSlide.bullets?.length ? (
                <ul className="mt-6 space-y-3">
                  {activeSlide.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-[1.2rem] leading-8 text-[var(--sn-ink-2)]">
                      <SeniorIcon name="check" className={`mt-1 h-6 w-6 shrink-0 ${urgentTone ? 'text-[var(--sn-help)]' : 'text-[var(--sn-olive)]'}`} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
                <button
                  onClick={() => {
                    stopAndClearAudio();
                    speak(composeSlideSpeech(activeSlide), { voice: 'xiaoyi', emotion: needsHelp ? 'calm' : 'friendly' });
                  }}
                  className="sn-btn sn-btn-quiet"
                >
                  <SeniorIcon name="volume" />重听这一张
                </button>
                <span className="sn-small">也可以左右滑动</span>
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="建议卡片">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => goTo(index)}
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`第 ${index + 1} 张：${slide.eyebrow}`}
            className="flex min-h-[48px] items-center justify-center px-1"
          >
            {/* 48px tall hit area, small visual dot */}
            <span className={`block h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-10 bg-[var(--sn-teal)]' : 'w-2.5 bg-[var(--sn-line-strong)]'}`} />
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr_1fr]">
        <button onClick={() => goTo(activeIndex - 1)} disabled={isFirst} className="sn-btn sn-btn-quiet">
          <SeniorIcon name="arrow" className="rotate-180" />上一张
        </button>
        <button onClick={isLast ? handlePrimary : () => goTo(activeIndex + 1)} className="sn-btn sn-btn-primary sn-btn-lg">
          {isLast ? (activeSlide.id === 'family' ? (copied ? '已复制' : '复制给家人') : summary.next_action.label) : '下一张'}
          {!isLast ? <SeniorIcon name="arrow" /> : null}
        </button>
        <button onClick={handleNavigate} className={needsHelp ? 'sn-btn sn-btn-help' : 'sn-btn sn-btn-outline'}>
          {needsHelp ? '找人帮忙' : summary.next_action.label}
        </button>
      </div>
    </section>
  );
}
