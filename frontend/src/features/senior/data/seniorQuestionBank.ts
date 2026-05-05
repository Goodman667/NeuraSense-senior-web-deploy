import type { SeniorQuestionAnswer } from '../types/senior';

export type SeniorQuestionCategory =
  | 'sleep'
  | 'mood'
  | 'body'
  | 'worry'
  | 'social_support'
  | 'support_need'
  | 'safety_check';

export interface SeniorQuestionPrompt {
  id: SeniorQuestionCategory;
  text: string;
  speakText: string;
  helper: string;
  chips: string[];
}

const QUESTION_BANK: Record<SeniorQuestionCategory, Array<Omit<SeniorQuestionPrompt, 'id'>>> = {
  sleep: [
    {
      text: '昨晚睡得怎么样？比如睡得踏实，还是半夜醒了。',
      speakText: '昨晚睡得怎么样？可以说睡得踏实，或者半夜醒了。',
      helper: '睡眠会影响今天的精神和心情，说一两句就够。',
      chips: ['睡得还可以', '半夜醒了', '没睡好，很累'],
    },
    {
      text: '醒来以后，身体感觉轻松一点，还是还很累？',
      speakText: '醒来以后，身体感觉轻松一点，还是还很累？',
      helper: '不用回忆太细，只说醒来后的感觉。',
      chips: ['轻松一些', '还是很累', '起床很困难'],
    },
    {
      text: '昨晚有没有因为心里挂念事情，睡得不踏实？',
      speakText: '昨晚有没有因为心里挂念事情，睡得不踏实？',
      helper: '如果没有，也可以直接说没有。',
      chips: ['没有特别挂念', '有点惦记事', '一直睡不着'],
    },
  ],
  mood: [
    {
      text: '今天心里最明显的感觉是什么？一个词也可以。',
      speakText: '今天心里最明显的感觉是什么？一个词也可以。',
      helper: '比如平静、烦、累、孤单，或者还不错。',
      chips: ['还算平静', '有点烦', '很低落'],
    },
    {
      text: '从早上到现在，心情是变轻一点，还是一直压着？',
      speakText: '从早上到现在，心情是变轻一点，还是一直压着？',
      helper: '说变化就行，不需要解释原因。',
      chips: ['轻一点了', '一直压着', '说不清楚'],
    },
    {
      text: '今天有没有哪一刻让您舒服一点，或者更难受一点？',
      speakText: '今天有没有哪一刻让您舒服一点，或者更难受一点？',
      helper: '可以是一件小事，比如吃饭、通话、晒太阳。',
      chips: ['没有明显变化', '有人陪时好点', '一个人时难受'],
    },
  ],
  body: [
    {
      text: '今天身体和精神怎么样？有没有哪里不舒服？',
      speakText: '今天身体和精神怎么样？有没有哪里不舒服？',
      helper: '身体不舒服也会影响心情，这里可以直接说。',
      chips: ['身体还可以', '有点累', '有地方不舒服'],
    },
    {
      text: '现在身体最需要照顾的地方是哪儿？比如眼睛、头、胸口、胃，或者只是累。',
      speakText: '现在身体最需要照顾的地方是哪儿？比如眼睛，头，胸口，胃，或者只是累。',
      helper: '如果有明显疼痛、胸闷或摔倒，请优先联系家人或医生。',
      chips: ['只是有点累', '眼睛不舒服', '胸口不舒服'],
    },
    {
      text: '如果把身体舒服程度说一句话，您会怎么说？',
      speakText: '如果把身体舒服程度说一句话，您会怎么说？',
      helper: '比如“还可以”“有点疼”“没力气”。',
      chips: ['还可以', '没力气', '疼得明显'],
    },
  ],
  worry: [
    {
      text: '最近有没有特别挂念、担心，或者放不下的事？',
      speakText: '最近有没有特别挂念，担心，或者放不下的事？',
      helper: '不用说完整，先说最占心的一件事。',
      chips: ['没有特别担心', '担心家里事', '身体让我担心'],
    },
    {
      text: '现在脑子里最绕不开的是哪件事？可以只说一点点。',
      speakText: '现在脑子里最绕不开的是哪件事？可以只说一点点。',
      helper: '如果不想说细节，也可以说“有一件事”。',
      chips: ['没有绕不开的事', '一直惦记孩子', '担心病情'],
    },
    {
      text: '今天最占心的一件事是什么？如果没有，也可以说没有。',
      speakText: '今天最占心的一件事是什么？如果没有，也可以说没有。',
      helper: '这里是为了帮您把今天先做哪一步理清楚。',
      chips: ['没有', '睡眠和身体', '家人和生活'],
    },
  ],
  social_support: [
    {
      text: '今天有没有和家人、朋友或邻居说上几句话？',
      speakText: '今天有没有和家人，朋友或邻居说上几句话？',
      helper: '不用很多，哪怕一句问候也算。',
      chips: ['说过几句', '还没有', '想联系但没联系'],
    },
    {
      text: '今天一个人的时间多吗？会不会觉得有点孤单？',
      speakText: '今天一个人的时间多吗？会不会觉得有点孤单？',
      helper: '孤单不是丢人的事，说出来是为了更好地安排陪伴。',
      chips: ['还好', '有点孤单', '很想有人陪'],
    },
    {
      text: '如果今天想让一个人陪您一会儿，您最想联系谁？',
      speakText: '如果今天想让一个人陪您一会儿，您最想联系谁？',
      helper: '可以说女儿、老伴、朋友、邻居，或者暂时没有。',
      chips: ['想联系家人', '想找朋友', '暂时没人'],
    },
  ],
  support_need: [
    {
      text: '今天您希望我怎么陪您？聊聊天，放松一下，还是给一点建议？',
      speakText: '今天您希望我怎么陪您？聊聊天，放松一下，还是给一点建议？',
      helper: '这会决定稍后给您的第一张建议卡。',
      chips: ['聊聊天', '放松一下', '给一点建议'],
    },
    {
      text: '如果今天只做一件让自己舒服一点的事，您希望是什么？',
      speakText: '如果今天只做一件让自己舒服一点的事，您希望是什么？',
      helper: '可以是休息、打电话、散步、喝水、早睡。',
      chips: ['先休息', '给家人发消息', '做个短练习'],
    },
    {
      text: '接下来您更需要安静、陪伴、提醒休息，还是有人帮您联系一下？',
      speakText: '接下来您更需要安静，陪伴，提醒休息，还是有人帮您联系一下？',
      helper: '说最接近的一项就行。',
      chips: ['需要安静', '需要陪伴', '想联系家人'],
    },
  ],
  safety_check: [
    {
      text: '如果今天特别难受，您现在身边有没有一个可以联系的人？',
      speakText: '如果今天特别难受，您现在身边有没有一个可以联系的人？',
      helper: '这不是让您立刻联系，只是提前知道谁能帮到您。',
      chips: ['有家人', '有朋友邻居', '暂时没有'],
    },
    {
      text: '现在您是安全地坐着或待着吗？有没有让您担心安全的情况？',
      speakText: '现在您是安全地坐着或待着吗？有没有让您担心安全的情况？',
      helper: '如果有危险，先不要继续问答，先找身边的人。',
      chips: ['现在安全', '有点不稳', '需要人帮忙'],
    },
    {
      text: '如果等下更难受，您愿意先做哪一步：联系家人、打电话求助，还是先坐稳休息？',
      speakText: '如果等下更难受，您愿意先做哪一步？联系家人，打电话求助，还是先坐稳休息？',
      helper: '提前想好一步，等难受时就不用临时决定。',
      chips: ['联系家人', '打电话求助', '先坐稳休息'],
    },
  ],
};

const QUESTION_PATTERNS: SeniorQuestionCategory[][] = [
  ['sleep', 'mood', 'body', 'social_support', 'support_need'],
  ['sleep', 'body', 'worry', 'social_support', 'safety_check'],
  ['mood', 'sleep', 'worry', 'body', 'support_need'],
  ['body', 'mood', 'social_support', 'worry', 'safety_check'],
];

function pickOne<T>(items: T[], salt = 0): T {
  const index = Math.floor((Math.random() + salt * 0.137) * items.length) % items.length;
  return items[index];
}

export function buildSeniorQuestionSet(previousAnswers: SeniorQuestionAnswer[] = []): SeniorQuestionPrompt[] {
  const answeredIds = new Set(previousAnswers.map(item => item.question_id));
  const pattern = pickOne(QUESTION_PATTERNS, previousAnswers.length);
  return pattern.map((category, index) => {
    const variants = QUESTION_BANK[category];
    const preferred = variants.filter(item => !answeredIds.has(`${category}:${item.text}`));
    const picked = pickOne(preferred.length ? preferred : variants, index + pattern.length);
    return { id: category, ...picked };
  });
}

export function getSeniorQuestionContext(answers: SeniorQuestionAnswer[]) {
  const covered = new Set(answers.map(item => item.question_id));
  return {
    covered_categories: Array.from(covered),
    has_safety_probe: covered.has('safety_check'),
    question_count: answers.length,
  };
}
