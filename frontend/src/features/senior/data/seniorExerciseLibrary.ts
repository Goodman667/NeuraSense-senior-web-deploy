import type { SeniorSummary } from '../types/senior';

export interface SeniorExercise {
  id: string;
  title: string;
  suitableFor: string;
  durationLabel: string;
  cardText: string;
  voiceGuide: string;
  steps: string[];
  completionText: string;
  caution?: string;
  playLabel: string;
  microQuest: string;
}

export const SENIOR_EXERCISES: SeniorExercise[] = [
  {
    id: 'breathing_3min',
    title: '3 分钟慢呼吸',
    suitableFor: '心里发紧、压力大、说不清楚哪里难受',
    durationLabel: '3 分钟',
    cardText: '坐稳，吸气不用太深，呼气慢一点。先让身体知道：现在可以慢下来。',
    voiceGuide: '我们做三分钟慢呼吸。先坐稳，肩膀放松。吸气时不用太用力，呼气时慢一点。做不好也没关系，只要比刚才慢一点就可以。',
    steps: ['坐稳，双脚放在地上', '轻轻吸气，再慢慢呼气', '连续做 6 次，做完就停'],
    completionText: '能停下来照顾身体，就已经很好。现在可以喝口水，先不急着做下一件事。',
    playLabel: '跟圆圈做 6 轮',
    microQuest: '找一口最轻的呼气',
  },
  {
    id: 'eye_rest_10min',
    title: '眼睛休息 10 分钟',
    suitableFor: '眼睛酸、疼、胀，或者昨晚没睡好还盯屏幕',
    durationLabel: '10 分钟',
    cardText: '把屏幕放远，闭眼或看远处。眼痛持续或加重时，请让家人陪您咨询医生。',
    voiceGuide: '现在先让眼睛休息十分钟。请把屏幕放远，闭上眼睛，或者看向远处。不要揉眼睛。如果疼痛持续或加重，请告诉家人，一起咨询医生。',
    steps: ['把手机或电脑放远', '闭眼，或看窗外远处', '十分钟后再决定要不要继续看屏幕'],
    completionText: '眼睛休息过后，如果还是明显疼，请不要硬撑，先告诉家人。',
    caution: '如果有明显眼痛、视力变化、胸闷或其他急症，请及时联系医生或急救资源。',
    playLabel: '离屏 10 分钟',
    microQuest: '找一个远处安静的点',
  },
  {
    id: 'rest_15min',
    title: '短休息 15 分钟',
    suitableFor: '没睡好、很累、没力气',
    durationLabel: '15 分钟',
    cardText: '今天先不硬撑。找个安全的位置坐下或躺下，短短休息一会儿。',
    voiceGuide: '现在做一个十五分钟短休息。请找一个安全舒服的位置。手机放远一点，不需要睡着，只要闭眼歇一会儿。',
    steps: ['找一个安全位置坐下或躺下', '把屏幕放远，闭眼休息', '十五分钟后喝一口水'],
    completionText: '短休息不是偷懒，是给今天留一点力气。',
    playLabel: '放下屏幕休息',
    microQuest: '只让身体歇一下',
  },
  {
    id: 'worry_note',
    title: '把担心写成一句话',
    suitableFor: '脑子里一直绕着一件事',
    durationLabel: '2 分钟',
    cardText: '只写一句：我现在最担心的是……写完先停，不急着解决。',
    voiceGuide: '我们把担心放小一点。请只写一句话：我现在最担心的是。写完以后先停下来，不需要马上解决。',
    steps: ['写下“我现在最担心的是……”', '只写一句，不写长篇', '写完问自己：今天能做最小的一步是什么'],
    completionText: '把担心写出来，就不用一直在脑子里转。',
    playLabel: '写一句就停',
    microQuest: '把担心缩成一句话',
  },
  {
    id: 'connection_message',
    title: '给家人发一句话',
    suitableFor: '孤单、想被陪、一个人扛着',
    durationLabel: '1 分钟',
    cardText: '不用解释很多，只发一句：我今天有点不舒服，想让你陪我说几句。',
    voiceGuide: '如果今天有点孤单，可以给家人发一句话。不用解释很多，只说：我今天有点不舒服，想让你陪我说几句。',
    steps: ['选一个可信任的人', '发一句简单的话', '等回复时先坐稳喝口水'],
    completionText: '愿意开口求陪伴，是很实际的一步。',
    playLabel: '发一句消息',
    microQuest: '选一个最容易联系的人',
  },
  {
    id: 'sleep_wind_down',
    title: '睡前慢下来',
    suitableFor: '晚上容易睡不着、心里挂念事',
    durationLabel: '5 分钟',
    cardText: '睡前把屏幕放远，灯光调暗，把明天再想的事写下一句。',
    voiceGuide: '睡前我们慢下来。把屏幕放远，灯光调暗。把明天再想的事写下一句，然后告诉自己，今天先到这里。',
    steps: ['睡前半小时减少看屏幕', '写下一句明天再处理的事', '做 6 次慢呼气'],
    completionText: '今晚不追求立刻睡着，先让身体进入休息节奏。',
    playLabel: '睡前慢下来',
    microQuest: '把明天的事放到纸上',
  },
  {
    id: 'grounding_1min',
    title: '1 分钟安心定位',
    suitableFor: '慌、乱、突然很难受',
    durationLabel: '1 分钟',
    cardText: '看见 3 样东西，摸到 2 个触感，听见 1 个声音。先回到现在。',
    voiceGuide: '我们做一分钟安心定位。请看见三样东西，摸到两个触感，听见一个声音。告诉自己，我现在在这里，先回到这一刻。',
    steps: ['说出眼前 3 样东西', '摸一摸 2 个安全的物品', '听见 1 个声音，慢慢呼气'],
    completionText: '如果还是很不安全，请立刻联系身边可信任的人。',
    playLabel: '回到这一刻',
    microQuest: '找到 3 个看得见的东西',
  },
];

export function getSeniorExerciseById(id?: string | null) {
  return SENIOR_EXERCISES.find(item => item.id === id) || null;
}

export function chooseSeniorExercise(summary?: SeniorSummary | null) {
  const explicit =
    getSeniorExerciseById(summary?.recommended_exercise?.id) ||
    getSeniorExerciseById(summary?.recommendation.tool_id);
  if (explicit) return explicit;

  const text = `${summary?.summary_title || ''} ${summary?.plain_summary || ''} ${summary?.risk_explanation || ''} ${summary?.recommendation.reason || ''}`;
  if (/眼|视力|屏幕/.test(text)) return getSeniorExerciseById('eye_rest_10min')!;
  if (/睡|累|疲惫|没精神|乏/.test(text)) return getSeniorExerciseById('rest_15min')!;
  if (/孤单|孤独|陪|家人|联系/.test(text)) return getSeniorExerciseById('connection_message')!;
  if (/担心|焦虑|挂念|惦记|压力/.test(text)) return getSeniorExerciseById('worry_note')!;
  if (summary?.risk_level === 'urgent' || summary?.risk_level === 'medical_emergency') return getSeniorExerciseById('grounding_1min')!;
  return getSeniorExerciseById('breathing_3min')!;
}
