/**
 * Relaxation exercises for companion mode, adapted from the standard-mode toolbox.
 * Each takes about five minutes and is split into timed steps that are read aloud one by one.
 */
import type { SeniorSummary } from '../types/senior';

export interface RelaxStep {
  text: string;
  seconds: number;
  /** show the breathing circle during this step */
  breathe?: boolean;
}

export interface RelaxExercise {
  id: string;
  title: string;
  /** one line on when it helps */
  suitableFor: string;
  intro: string;
  steps: RelaxStep[];
  completionText: string;
}

export const RELAX_EXERCISES: RelaxExercise[] = [
  {
    id: 'breathing_5min',
    title: '慢呼吸',
    suitableFor: '心里发紧、压力大的时候',
    intro: '我们一起做 5 分钟慢呼吸。跟着圆圈，变大时吸气，变小时呼气，不用很标准。',
    steps: [
      { text: '坐稳，双脚踩在地上，肩膀放松，双手放在腿上。', seconds: 30 },
      { text: '跟着圆圈呼吸：圆圈变大时，用鼻子慢慢吸气；圆圈变小时，用嘴慢慢呼气。', seconds: 120, breathe: true },
      { text: '呼气再放慢一点，就像轻轻吹凉一碗热汤。', seconds: 90, breathe: true },
      { text: '恢复平常的呼吸，感受一下，身体是不是比刚才松了一点。', seconds: 60 },
    ],
    completionText: '能停下来照顾身体，就已经很好。现在可以喝口水，慢慢来。',
  },
  {
    id: 'mindful_breath_5min',
    title: '正念呼吸',
    suitableFor: '脑子里事情多、静不下来的时候',
    intro: '我们做 5 分钟正念呼吸。只是安静地留意呼吸，走神了也没关系。',
    steps: [
      { text: '坐稳，可以闭上眼睛，也可以看着前方一个点。', seconds: 30 },
      { text: '把注意力放在鼻尖，感受空气进来时凉凉的，出去时暖暖的。', seconds: 90, breathe: true },
      { text: '走神是很正常的。发现自己在想别的事，就轻轻把注意力带回呼吸。', seconds: 90, breathe: true },
      { text: '每呼一口气，心里数一下，数到 10，再从 1 开始。', seconds: 60, breathe: true },
      { text: '慢慢睁开眼睛，看看四周，动一动手指。', seconds: 30 },
    ],
    completionText: '刚才这几分钟，您给了自己一点安静。走神了也算做到了。',
  },
  {
    id: 'body_relax_5min',
    title: '身体放松',
    suitableFor: '很累、身体发紧、睡不好的时候',
    intro: '我们做 5 分钟身体放松。先用力绷紧一处，再慢慢松开，感受放松的感觉。哪里不舒服就跳过。',
    steps: [
      { text: '坐稳，慢慢地呼吸三次。', seconds: 30 },
      { text: '双手握拳，用力 5 秒，再慢慢松开，感受手掌变松变暖。', seconds: 60 },
      { text: '把肩膀往上耸，靠近耳朵，停 5 秒，再慢慢放下来。', seconds: 60 },
      { text: '脚尖往上翘，绷紧小腿 5 秒，再慢慢放松。', seconds: 60 },
      { text: '从头到脚感觉一遍，哪里还紧，就对着那里慢慢呼一口气。', seconds: 60 },
      { text: '动一动手指和脚趾，慢慢回到平常的状态。', seconds: 30 },
    ],
    completionText: '身体松一点，心也会跟着慢下来。今天先不硬撑。',
  },
  {
    id: 'grounding_54321',
    title: '5-4-3-2-1 安心练习',
    suitableFor: '心慌、乱、突然很难受的时候',
    intro: '我们做 5 分钟安心练习，用看、摸、听、闻、尝，把注意力带回到眼前。',
    steps: [
      { text: '坐稳，慢慢呼一口气。', seconds: 20 },
      { text: '看一看：说出眼前的 5 样东西。', seconds: 60 },
      { text: '摸一摸：找到 4 种手能碰到的感觉，比如衣服、椅子、桌面。', seconds: 60 },
      { text: '听一听：留意 3 种声音，远的近的都可以。', seconds: 50 },
      { text: '闻一闻：找到 2 种气味，闻不到也没关系。', seconds: 40 },
      { text: '想一想：1 种喜欢的味道，或者 1 件让您安心的事。', seconds: 40 },
      { text: '告诉自己：我现在在这里，我是安全的。', seconds: 30 },
    ],
    completionText: '如果还是觉得很不安全，请马上联系身边可信任的人。',
  },
];

export const exerciseSeconds = (exercise: RelaxExercise) => exercise.steps.reduce((sum, step) => sum + step.seconds, 0);

/** Which exercise to mark as "今天推荐", from the daily summary (older exercise ids included). */
export function recommendRelaxExercise(summary?: SeniorSummary | null): RelaxExercise {
  const id = summary?.recommended_exercise?.id || summary?.recommendation?.tool_id || '';
  const byId: Record<string, string> = {
    breathing_3min: 'breathing_5min',
    breathing_5min: 'breathing_5min',
    mindful_breath_5min: 'mindful_breath_5min',
    worry_note: 'mindful_breath_5min',
    rest_15min: 'body_relax_5min',
    body_relax_5min: 'body_relax_5min',
    eye_rest_10min: 'body_relax_5min',
    sleep_wind_down: 'body_relax_5min',
    grounding_1min: 'grounding_54321',
    grounding_54321: 'grounding_54321',
  };
  let pick = byId[id];
  if (!pick) {
    const text = `${summary?.summary_title || ''} ${summary?.plain_summary || ''} ${summary?.recommendation?.reason || ''}`;
    if (summary?.risk_level === 'urgent' || summary?.risk_level === 'medical_emergency' || /慌|乱|害怕/.test(text)) pick = 'grounding_54321';
    else if (/睡|累|疲惫|没精神|乏|疼|痛/.test(text)) pick = 'body_relax_5min';
    else if (/担心|焦虑|挂念|惦记|想太多/.test(text)) pick = 'mindful_breath_5min';
    else pick = 'breathing_5min';
  }
  return RELAX_EXERCISES.find((e) => e.id === pick) || RELAX_EXERCISES[0];
}
