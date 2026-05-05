"""
PHQ-9 Stealth Assessment Module
隐形 PHQ-9 评估模块

This module implements stealth assessment for depression screening through
natural conversation, using Chain-of-Thought (CoT) prompting with LLMs.

Key components:
1. Dual-role System Prompt (Counselor + Assessor)
2. Trie-based Crisis Detection (Safety Layer)
3. AssessmentManager for Session State

PHQ-9 Dimensions:
1. Anhedonia (快感缺失)
2. Depressed Mood (情绪低落)
3. Sleep Disturbance (睡眠障碍)
4. Fatigue (疲劳)
5. Appetite Change (食欲改变)
6. Low Self-Esteem (自我评价过低)
7. Concentration Problems (专注力下降)
8. Psychomotor Changes (精神运动迟滞/激越)
9. Suicidal Ideation (自杀意念) [CRITICAL]
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import json
import os
import re


# =====================================================
# PHQ-9 DIMENSION DEFINITIONS
# =====================================================

class PHQ9Dimension(Enum):
    """PHQ-9 九个维度定义"""
    ANHEDONIA = 1           # 快感缺失：做事无兴趣
    DEPRESSED_MOOD = 2      # 情绪低落：感到低落、沮丧
    SLEEP = 3               # 睡眠障碍：入睡困难/早醒/嗜睡
    FATIGUE = 4             # 疲劳：感到疲惫、没有精力
    APPETITE = 5            # 食欲改变：食欲减退/暴食
    SELF_ESTEEM = 6         # 自我评价过低：自责、觉得自己失败
    CONCENTRATION = 7       # 专注力下降：难以集中注意力
    PSYCHOMOTOR = 8         # 精神运动变化：说话/动作慢，或坐立不安
    SUICIDAL = 9            # 自杀意念：想到死亡或自我伤害 [危险]


PHQ9_DIMENSION_NAMES = {
    1: ("Anhedonia", "快感缺失", "做事没有兴趣或乐趣"),
    2: ("Depressed Mood", "情绪低落", "感到心情低落、沮丧或绝望"),
    3: ("Sleep Disturbance", "睡眠障碍", "入睡困难、睡不安稳或睡眠过多"),
    4: ("Fatigue", "疲劳", "感到疲倦或没有精力"),
    5: ("Appetite Change", "食欲改变", "食欲不振或暴饮暴食"),
    6: ("Low Self-Esteem", "自我评价过低", "觉得自己是失败者或让家人失望"),
    7: ("Concentration Problems", "专注力下降", "难以集中注意力做事"),
    8: ("Psychomotor Changes", "精神运动变化", "说话或动作变慢，或坐立不安"),
    9: ("Suicidal Ideation", "自杀意念", "想到自己死了会更好或想伤害自己"),
}


# =====================================================
# SCORING DEFINITIONS
# =====================================================

class PHQ9Score(Enum):
    """PHQ-9 评分等级 (0-3)"""
    NOT_AT_ALL = 0          # 完全没有
    SEVERAL_DAYS = 1        # 有几天
    MORE_THAN_HALF = 2      # 超过一半时间
    NEARLY_EVERY_DAY = 3    # 几乎每天


class Confidence(Enum):
    """评分置信度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# =====================================================
# DATA STRUCTURES
# =====================================================

@dataclass
class PHQ9Update:
    """单个维度的评分更新"""
    symptom_id: int
    score: int
    confidence: str
    evidence: str = ""


@dataclass
class StealthAssessmentResult:
    """LLM 隐形评估结果"""
    thought_process: str            # CoT 思维链
    phq9_updates: list[PHQ9Update]  # 评分更新列表
    risk_flag: bool                 # 危机标记
    reply_to_user: str              # 给用户的回复
    raw_json: Optional[dict] = None


@dataclass
class SessionState:
    """会话状态"""
    session_id: str
    cumulative_scores: dict[int, int] = field(default_factory=lambda: {i: 0 for i in range(1, 10)})
    score_evidence: dict[int, str] = field(default_factory=dict)
    conversation_turns: int = 0
    risk_flags_triggered: list[str] = field(default_factory=list)
    is_crisis_mode: bool = False


# =====================================================
# TRIE-BASED CRISIS DETECTION
# =====================================================

class TrieNode:
    """Trie 树节点"""
    def __init__(self):
        self.children: dict[str, TrieNode] = {}
        self.is_end: bool = False
        self.keyword: str = ""


class CrisisKeywordTrie:
    """
    危机关键词 Trie 树
    
    用于高效检测用户输入中的自杀/自伤相关关键词。
    时间复杂度: O(n) 其中 n 是输入文本长度
    """
    
    # 危机关键词列表 (中英文)
    CRISIS_KEYWORDS = [
        # 中文关键词
        "自杀", "自尽", "不想活", "想死", "死了算了", "死掉", 
        "结束生命", "结束自己", "一死了之", "去死", "寻死",
        "活着没意思", "活不下去", "不如死了", "杀死自己",
        "跳楼", "割腕", "服药自杀", "烧炭", "上吊",
        "遗书", "安排后事", "告别",
        # 英文关键词
        "kill myself", "suicide", "end my life", "want to die",
        "better off dead", "no reason to live", "suicidal",
        "self-harm", "cut myself", "overdose",
    ]
    
    def __init__(self):
        self.root = TrieNode()
        self._build_trie()
    
    def _build_trie(self):
        """构建 Trie 树"""
        for keyword in self.CRISIS_KEYWORDS:
            self._insert(keyword.lower())
    
    def _insert(self, word: str):
        """插入关键词"""
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True
        node.keyword = word
    
    def search_in_text(self, text: str) -> list[str]:
        """
        在文本中搜索危机关键词
        
        Returns:
            匹配到的关键词列表
        """
        text_lower = text.lower()
        found_keywords = []
        
        for i in range(len(text_lower)):
            node = self.root
            j = i
            while j < len(text_lower) and text_lower[j] in node.children:
                node = node.children[text_lower[j]]
                if node.is_end:
                    found_keywords.append(node.keyword)
                j += 1
        
        return list(set(found_keywords))
    
    def has_crisis_keywords(self, text: str) -> bool:
        """检查文本是否包含危机关键词"""
        return len(self.search_in_text(text)) > 0


# =====================================================
# CRISIS RESPONSE TEMPLATES
# =====================================================

CRISIS_RESPONSE = """我注意到你分享了一些让我非常担心的内容。你现在的感受一定很不容易，我很高兴你能够表达出来。

请记住，你并不孤单。如果你正在考虑伤害自己，请立即寻求帮助：

🆘 **24小时心理援助热线**
- 全国心理援助热线：400-161-9995
- 北京心理危机研究与干预中心：010-82951332
- 生命热线：400-821-1215

💙 无论发生什么，都有人愿意倾听你、帮助你。
你愿意告诉我现在是否安全吗？"""

CRISIS_RESPONSE_ENGLISH = """I noticed you shared something that really concerns me. What you're feeling must be very difficult, and I'm glad you felt you could express it.

Please remember, you're not alone. If you're thinking about hurting yourself, please reach out for help:

🆘 **Crisis Hotlines**
- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741

💙 No matter what's happening, there are people who want to listen and help.
Are you willing to tell me if you're safe right now?"""


# =====================================================
# SYSTEM PROMPT ENGINEERING
# =====================================================

STEALTH_ASSESSMENT_SYSTEM_PROMPT = """你是一个同时扮演两个角色的AI系统。你的输出将被解析为JSON格式。

## 角色 A：温暖的心理咨询师（用户可见）
- 基于罗杰斯人本主义疗法，提供无条件积极关注
- 回复温暖、共情、简短（2-3句话）
- 使用开放式问题鼓励用户继续倾诉
- 绝不提及"量表"、"评估"、"打分"等词汇
- 使用共情句式，如："我理解..."、"这听起来..."、"你的感受很重要..."

## 角色 B：临床评估员（用户不可见）
你需要根据用户输入，分析是否触及PHQ-9的9个标准维度：

1. **Anhedonia（快感缺失）**: 做事没有兴趣或乐趣
2. **Depressed Mood（情绪低落）**: 感到心情低落、沮丧或绝望
3. **Sleep（睡眠障碍）**: 入睡困难、睡不安稳或睡眠过多
4. **Fatigue（疲劳）**: 感到疲倦或没有精力
5. **Appetite（食欲改变）**: 食欲不振或暴饮暴食
6. **Self-Esteem（自我评价过低）**: 觉得自己是失败者或让家人失望
7. **Concentration（专注力下降）**: 难以集中注意力做事
8. **Psychomotor（精神运动变化）**: 说话/动作变慢，或坐立不安
9. **Suicidal（自杀意念）**: 想到自己死了会更好或想伤害自己 [危险]

### 评分标准 (0-3)
- 0 = 完全没有 (用户否认或未提及)
- 1 = 有几天 (偶尔、有时候、一点点)
- 2 = 超过一半时间 (经常、很多时候)
- 3 = 几乎每天 (每天、整天、一直)

### 程度副词映射
- "偶尔"/"有时"/"一点点" → 1分
- "经常"/"很多时候"/"总是觉得" → 2分
- "每天"/"整天"/"一直"/"无时无刻" → 3分

## 输出格式（必须严格遵守）
你必须输出一个有效的JSON对象，格式如下：

```json
{
  "thought_process": "你的思维链推理过程（中文）：分析用户说了什么，识别出哪些症状，判断严重程度",
  "phq9_updates": [
    {"symptom_id": 4, "score": 3, "confidence": "high"},
    {"symptom_id": 1, "score": 2, "confidence": "medium"}
  ],
  "risk_flag": false,
  "reply_to_user": "给用户的温暖回复（中文，2-3句话）"
}
```

### 规则
1. `phq9_updates` 只包含本轮对话中明确提到的症状，不要臆测
2. 如果用户内容不涉及任何PHQ-9维度，`phq9_updates` 为空数组 `[]`
3. 如果检测到任何自杀/自伤相关内容，`risk_flag` 必须为 `true`
4. `confidence` 只能是 "low"、"medium"、"high" 之一
5. 输出必须是合法的JSON，不要包含其他文字

## 示例

用户输入："最近每天都不想起床，感觉什么都没意思"

```json
{
  "thought_process": "用户提到'每天都不想起床'，对应症状4（疲劳）和症状3（睡眠），使用了'每天'一词，建议3分。'什么都没意思'对应症状1（快感缺失），程度较重，建议2-3分。",
  "phq9_updates": [
    {"symptom_id": 4, "score": 3, "confidence": "high"},
    {"symptom_id": 1, "score": 3, "confidence": "high"}
  ],
  "risk_flag": false,
  "reply_to_user": "听起来你最近真的很累，每天都提不起劲的感觉一定很不容易。这种情况持续多久了？"
}
```"""


# =====================================================
# ASSESSMENT MANAGER
# =====================================================

class AssessmentManager:
    """
    PHQ-9 隐形评估管理器
    
    负责:
    1. 会话状态管理
    2. 危机关键词检测
    3. LLM 响应解析
    4. 累积评分更新（最高分原则）
    """
    
    def __init__(self, session_id: str = "default"):
        self.session_id = session_id
        self.state = SessionState(session_id=session_id)
        self.crisis_detector = CrisisKeywordTrie()
        self.llm_provider = os.environ.get("LLM_PROVIDER", "openai")
        self.llm_api_key = os.environ.get("LLM_API_KEY", "")
        self.llm_model = os.environ.get("LLM_MODEL", "gpt-4")
    
    def process_user_input(self, user_input: str) -> StealthAssessmentResult:
        """
        处理用户输入，执行隐形评估
        
        Args:
            user_input: 用户的文本输入
            
        Returns:
            StealthAssessmentResult 包含评分更新和回复
        """
        self.state.conversation_turns += 1
        
        # Step 1: 危机关键词前置过滤
        crisis_keywords = self.crisis_detector.search_in_text(user_input)
        if crisis_keywords:
            return self._handle_crisis(user_input, crisis_keywords)
        
        # Step 2: 调用 LLM 进行隐形评估
        llm_result = self._call_llm(user_input)
        
        # Step 3: 更新累积评分
        self._update_cumulative_scores(llm_result)
        
        # Step 4: 检查 LLM 返回的 risk_flag
        if llm_result.risk_flag:
            self.state.is_crisis_mode = True
            self.state.risk_flags_triggered.append(f"turn_{self.state.conversation_turns}")
        
        return llm_result
    
    def _handle_crisis(self, user_input: str, keywords: list[str]) -> StealthAssessmentResult:
        """处理危机情况 - 绕过 LLM，直接返回危机响应"""
        self.state.is_crisis_mode = True
        self.state.risk_flags_triggered.append(f"keywords: {', '.join(keywords)}")
        
        # 更新第9项（自杀意念）为最高分
        self.state.cumulative_scores[9] = 3
        self.state.score_evidence[9] = f"危机关键词检测: {', '.join(keywords)}"
        
        return StealthAssessmentResult(
            thought_process=f"[系统] 检测到危机关键词: {', '.join(keywords)}。触发安全协议。",
            phq9_updates=[PHQ9Update(symptom_id=9, score=3, confidence="high", evidence=user_input[:100])],
            risk_flag=True,
            reply_to_user=CRISIS_RESPONSE,
        )
    
    def _call_llm(self, user_input: str) -> StealthAssessmentResult:
        """
        调用 LLM 进行隐形评估
        
        使用 Chain-of-Thought prompting 确保推理透明
        """
        # 构建消息
        messages = [
            {"role": "system", "content": STEALTH_ASSESSMENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_input}
        ]
        
        try:
            # 尝试调用实际 LLM API
            response_json = self._make_llm_request(messages)
            return self._parse_llm_response(response_json)
        except Exception as e:
            # 回退到模板响应
            return self._generate_fallback_response(user_input, str(e))
    
    def _make_llm_request(self, messages: list[dict]) -> dict:
        """
        发送 LLM API 请求
        
        支持 OpenAI 和兼容 API
        """
        # 如果没有 API key，使用回退逻辑
        if not self.llm_api_key:
            raise ValueError("No LLM API key configured")
        
        import httpx
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.llm_api_key}",
        }
        
        payload = {
            "model": self.llm_model,
            "messages": messages,
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
        }
        
        # 确定 API endpoint
        if self.llm_provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
        elif self.llm_provider == "zhipuai":
            url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
        else:
            url = os.environ.get("LLM_API_URL", "https://open.bigmodel.cn/api/paas/v4/chat/completions")
        
        response = httpx.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        return json.loads(content)
    
    def _parse_llm_response(self, response_json: dict) -> StealthAssessmentResult:
        """解析 LLM JSON 响应"""
        phq9_updates = []
        for update in response_json.get("phq9_updates", []):
            phq9_updates.append(PHQ9Update(
                symptom_id=update.get("symptom_id", 0),
                score=update.get("score", 0),
                confidence=update.get("confidence", "low"),
                evidence=update.get("evidence", ""),
            ))
        
        return StealthAssessmentResult(
            thought_process=response_json.get("thought_process", ""),
            phq9_updates=phq9_updates,
            risk_flag=response_json.get("risk_flag", False),
            reply_to_user=response_json.get("reply_to_user", "我在听，请继续说。"),
            raw_json=response_json,
        )
    
    def _generate_fallback_response(self, user_input: str, error: str) -> StealthAssessmentResult:
        """
        当 LLM 不可用时的回退响应
        
        使用基于规则的简单分析
        """
        phq9_updates = []
        
        # 简单关键词匹配
        keyword_map = {
            1: ["没意思", "无聊", "不想做", "没兴趣", "什么都不想"],
            2: ["难过", "低落", "沮丧", "绝望", "心情不好", "不开心"],
            3: ["睡不着", "失眠", "睡不好", "早醒", "嗜睡", "睡太多"],
            4: ["累", "疲惫", "没精力", "没力气", "疲劳", "不想起床"],
            5: ["吃不下", "不想吃", "暴食", "没胃口", "食欲"],
            6: ["失败", "没用", "对不起", "让人失望", "自责"],
            7: ["注意力", "集中", "分心", "发呆", "走神"],
            8: ["动作慢", "说话慢", "烦躁", "坐不住", "焦虑"],
        }
        
        for symptom_id, keywords in keyword_map.items():
            for keyword in keywords:
                if keyword in user_input:
                    # 检测程度副词
                    score = 1
                    if any(w in user_input for w in ["每天", "整天", "一直", "总是"]):
                        score = 3
                    elif any(w in user_input for w in ["经常", "很多", "总"]):
                        score = 2
                    
                    phq9_updates.append(PHQ9Update(
                        symptom_id=symptom_id,
                        score=score,
                        confidence="medium",
                        evidence=keyword,
                    ))
                    break
        
        # 生成共情回复
        empathy_templates = [
            "我理解你的感受，这些确实不容易。能告诉我更多吗？",
            "谢谢你愿意分享这些。你现在的感受一定很不容易。",
            "我听到你说的了。这种感觉持续多久了？",
            "你的感受很重要。能具体说说是什么让你有这种感觉吗？",
        ]
        
        import random
        reply = random.choice(empathy_templates)
        
        return StealthAssessmentResult(
            thought_process=f"[回退模式] LLM错误: {error}. 使用规则匹配。",
            phq9_updates=phq9_updates,
            risk_flag=False,
            reply_to_user=reply,
        )
    
    def _update_cumulative_scores(self, result: StealthAssessmentResult):
        """
        更新累积评分

        采用最高分原则：如果新分数更高，则更新
        """
        for update in result.phq9_updates:
            symptom_id = update.symptom_id
            if 1 <= symptom_id <= 9:
                current_score = self.state.cumulative_scores.get(symptom_id, 0)
                if update.score > current_score:
                    self.state.cumulative_scores[symptom_id] = update.score
                    self.state.score_evidence[symptom_id] = update.evidence

    def update_score_with_confidence(
        self,
        symptom_id: int,
        new_score: int,
        confidence: float,
        evidence: str = "",
        confidence_threshold: float = 0.6,
    ) -> bool:
        """
        基于置信度的评分更新（供多模态嵌入式评估服务使用）

        与 _update_cumulative_scores 不同，此方法允许在高置信度时
        向上或向下更新分数。PHQ-9 第 9 项（自杀意念）只能通过
        文本/规则触发，此方法拒绝对其操作。

        Args:
            symptom_id: PHQ-9 维度 (1-9)
            new_score: 新分数 (0-3)
            confidence: 置信度 (0.0-1.0)
            evidence: 证据描述
            confidence_threshold: 最低置信度阈值

        Returns:
            是否成功更新
        """
        # 安全约束：第 9 项禁止通过此方法更新
        if symptom_id == 9:
            return False

        if not (1 <= symptom_id <= 8):
            return False

        if not (0 <= new_score <= 3):
            return False

        if confidence < confidence_threshold:
            return False

        current_score = self.state.cumulative_scores.get(symptom_id, 0)

        # 允许双向更新，但降分需要更高置信度
        if new_score > current_score:
            self.state.cumulative_scores[symptom_id] = new_score
            self.state.score_evidence[symptom_id] = evidence
            return True
        elif new_score < current_score and confidence >= confidence_threshold + 0.15:
            # 降分需要额外 15% 置信度
            self.state.cumulative_scores[symptom_id] = new_score
            self.state.score_evidence[symptom_id] = evidence
            return True

        return False

    def get_current_scores(self) -> dict[int, int]:
        """获取当前所有维度的评分（供外部服务读取）"""
        return dict(self.state.cumulative_scores)

    def get_score_evidence(self) -> dict[int, str]:
        """获取当前所有维度的证据（供外部服务读取）"""
        return dict(self.state.score_evidence)
    
    def get_total_score(self) -> int:
        """获取 PHQ-9 总分 (0-27)"""
        return sum(self.state.cumulative_scores.values())
    
    def get_severity_level(self) -> str:
        """
        获取抑郁严重程度等级
        
        PHQ-9 评分解释:
        0-4: 无抑郁
        5-9: 轻度抑郁
        10-14: 中度抑郁
        15-19: 中重度抑郁
        20-27: 重度抑郁
        """
        total = self.get_total_score()
        if total <= 4:
            return "无抑郁"
        elif total <= 9:
            return "轻度抑郁"
        elif total <= 14:
            return "中度抑郁"
        elif total <= 19:
            return "中重度抑郁"
        else:
            return "重度抑郁"
    
    def get_assessment_summary(self) -> dict:
        """获取评估摘要"""
        return {
            "session_id": self.session_id,
            "total_score": self.get_total_score(),
            "severity_level": self.get_severity_level(),
            "dimension_scores": {
                PHQ9_DIMENSION_NAMES[i][1]: self.state.cumulative_scores[i]
                for i in range(1, 10)
            },
            "conversation_turns": self.state.conversation_turns,
            "risk_flags_triggered": self.state.risk_flags_triggered,
            "is_crisis_mode": self.state.is_crisis_mode,
        }
    
    def reset_session(self):
        """重置会话状态"""
        self.state = SessionState(session_id=self.session_id)


# =====================================================
# EXPORTS
# =====================================================

__all__ = [
    "PHQ9Dimension",
    "PHQ9Score",
    "PHQ9Update",
    "StealthAssessmentResult",
    "SessionState",
    "CrisisKeywordTrie",
    "AssessmentManager",
    "STEALTH_ASSESSMENT_SYSTEM_PROMPT",
    "CRISIS_RESPONSE",
]
