"""
Knowledge Graph Service

Neo4j-based knowledge graph service for medical/psychological knowledge queries.
Provides symptom-disease relationship queries and treatment recommendations.
"""

from dataclasses import dataclass, field
from typing import Optional
import os


@dataclass
class DiseaseInfo:
    """疾病信息"""
    name: str
    name_en: str = ""
    description: str = ""
    severity: str = "moderate"  # mild, moderate, severe
    category: str = "mental_health"


@dataclass
class RecommendationInfo:
    """建议信息"""
    content: str
    priority: int = 1  # 1-5, higher is more important
    category: str = "general"  # general, lifestyle, medical, therapy


@dataclass
class SymptomQueryResult:
    """
    症状查询结果
    """
    # 查询的症状列表
    symptoms: list[str]
    
    # 关联的疾病列表
    related_diseases: list[DiseaseInfo] = field(default_factory=list)
    
    # 建议列表
    recommendations: list[RecommendationInfo] = field(default_factory=list)
    
    # 是否需要紧急关注
    urgent_attention: bool = False
    
    # 中文描述
    summary: str = ""
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "symptoms": self.symptoms,
            "related_diseases": [
                {
                    "name": d.name,
                    "name_en": d.name_en,
                    "description": d.description,
                    "severity": d.severity,
                    "category": d.category,
                }
                for d in self.related_diseases
            ],
            "recommendations": [
                {
                    "content": r.content,
                    "priority": r.priority,
                    "category": r.category,
                }
                for r in self.recommendations
            ],
            "urgent_attention": self.urgent_attention,
            "summary": self.summary,
        }


class KnowledgeGraphService:
    """
    知识图谱服务
    
    使用 Neo4j 存储和查询心理健康相关知识：
    - 症状 (Symptom)
    - 疾病 (Disease)
    - 建议 (Recommendation)
    - 治疗方法 (Treatment)
    """
    
    # Neo4j 连接配置
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    # 预定义的症状-疾病映射（当 Neo4j 不可用时作为后备）
    SYMPTOM_DISEASE_MAP = {
        "失眠": [
            DiseaseInfo(
                name="失眠症",
                name_en="Insomnia",
                description="持续性睡眠困难，影响日间功能",
                severity="moderate"
            ),
            DiseaseInfo(
                name="焦虑症",
                name_en="Anxiety Disorder",
                description="过度担忧可能导致入睡困难",
                severity="moderate"
            ),
            DiseaseInfo(
                name="抑郁症",
                name_en="Depression",
                description="情绪低落常伴随睡眠问题",
                severity="moderate"
            ),
        ],
        "健忘": [
            DiseaseInfo(
                name="轻度认知障碍",
                name_en="Mild Cognitive Impairment",
                description="记忆力下降但未达痴呆程度",
                severity="mild"
            ),
            DiseaseInfo(
                name="注意力缺陷",
                name_en="Attention Deficit",
                description="注意力分散导致信息记忆困难",
                severity="mild"
            ),
            DiseaseInfo(
                name="焦虑症",
                name_en="Anxiety Disorder",
                description="过度焦虑影响注意力和记忆",
                severity="moderate"
            ),
        ],
        "焦虑": [
            DiseaseInfo(
                name="广泛性焦虑障碍",
                name_en="Generalized Anxiety Disorder",
                description="持续性过度担忧",
                severity="moderate"
            ),
            DiseaseInfo(
                name="惊恐障碍",
                name_en="Panic Disorder",
                description="反复发作的惊恐发作",
                severity="severe"
            ),
        ],
        "情绪低落": [
            DiseaseInfo(
                name="抑郁症",
                name_en="Major Depressive Disorder",
                description="持续性情绪低落，丧失兴趣",
                severity="severe"
            ),
            DiseaseInfo(
                name="心境恶劣",
                name_en="Dysthymia",
                description="慢性轻度抑郁",
                severity="moderate"
            ),
        ],
        "疲劳": [
            DiseaseInfo(
                name="慢性疲劳综合征",
                name_en="Chronic Fatigue Syndrome",
                description="持续性严重疲劳感",
                severity="moderate"
            ),
            DiseaseInfo(
                name="抑郁症",
                name_en="Depression",
                description="抑郁常伴随躯体疲劳感",
                severity="moderate"
            ),
        ],
    }
    
    # 症状-建议映射
    SYMPTOM_RECOMMENDATIONS = {
        "失眠": [
            RecommendationInfo(
                content="保持规律的睡眠时间，每天同一时间入睡和起床",
                priority=5,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="睡前1小时避免使用电子设备",
                priority=4,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="尝试放松技巧如渐进性肌肉放松或深呼吸",
                priority=3,
                category="therapy"
            ),
            RecommendationInfo(
                content="如症状持续超过2周，建议咨询专业医生",
                priority=5,
                category="medical"
            ),
        ],
        "健忘": [
            RecommendationInfo(
                content="使用记事本或手机应用记录重要事项",
                priority=4,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="进行认知训练游戏和活动",
                priority=3,
                category="therapy"
            ),
            RecommendationInfo(
                content="保证充足睡眠，睡眠对记忆巩固很重要",
                priority=4,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="建议进行认知功能评估",
                priority=5,
                category="medical"
            ),
        ],
        "焦虑": [
            RecommendationInfo(
                content="练习正念冥想，每天10-15分钟",
                priority=5,
                category="therapy"
            ),
            RecommendationInfo(
                content="规律运动，如散步或瑜伽",
                priority=4,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="减少咖啡因摄入",
                priority=3,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="如焦虑严重影响日常生活，请寻求专业帮助",
                priority=5,
                category="medical"
            ),
        ],
        "情绪低落": [
            RecommendationInfo(
                content="与信任的朋友或家人倾诉",
                priority=5,
                category="general"
            ),
            RecommendationInfo(
                content="保持日常活动，即使感觉没有动力",
                priority=4,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="每天安排一个小的愉快活动",
                priority=3,
                category="therapy"
            ),
            RecommendationInfo(
                content="如持续超过2周，强烈建议寻求心理咨询",
                priority=5,
                category="medical"
            ),
        ],
        "疲劳": [
            RecommendationInfo(
                content="检查睡眠质量和时长",
                priority=4,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="保持适度运动，增加身体能量",
                priority=3,
                category="lifestyle"
            ),
            RecommendationInfo(
                content="排除身体疾病原因，如贫血、甲状腺问题",
                priority=5,
                category="medical"
            ),
        ],
    }
    
    # 紧急关注的症状
    URGENT_SYMPTOMS = ["自杀", "自残", "伤害", "幻觉", "妄想", "不想活"]
    
    def __init__(self):
        """初始化服务"""
        self._driver = None
    
    async def connect(self) -> bool:
        """
        连接 Neo4j 数据库
        """
        try:
            from neo4j import AsyncGraphDatabase
            self._driver = AsyncGraphDatabase.driver(
                self.NEO4J_URI,
                auth=(self.NEO4J_USER, self.NEO4J_PASSWORD)
            )
            # 测试连接
            async with self._driver.session() as session:
                await session.run("RETURN 1")
            return True
        except Exception as e:
            print(f"Neo4j connection failed: {e}")
            self._driver = None
            return False
    
    async def close(self):
        """关闭连接"""
        if self._driver:
            await self._driver.close()
            self._driver = None
    
    async def query_by_symptoms(self, symptoms: list[str]) -> SymptomQueryResult:
        """
        根据症状查询相关疾病和建议
        
        Cypher 查询逻辑：
        MATCH (s:Symptom)-[:INDICATES]->(d:Disease)
        WHERE s.name IN $symptoms
        OPTIONAL MATCH (d)-[:TREATED_BY]->(t:Treatment)
        RETURN d, t
        
        Args:
            symptoms: 症状列表，如 ["失眠", "健忘"]
            
        Returns:
            SymptomQueryResult 查询结果
        """
        # 检查是否有紧急症状
        urgent = any(
            urgent_kw in symptom 
            for symptom in symptoms 
            for urgent_kw in self.URGENT_SYMPTOMS
        )
        
        # 尝试使用 Neo4j 查询
        if self._driver:
            try:
                return await self._query_neo4j(symptoms, urgent)
            except Exception as e:
                print(f"Neo4j query failed, using fallback: {e}")
        
        # 使用后备映射
        return self._query_fallback(symptoms, urgent)
    
    async def _query_neo4j(
        self, 
        symptoms: list[str], 
        urgent: bool
    ) -> SymptomQueryResult:
        """
        使用 Neo4j 执行查询
        """
        cypher_query = """
        MATCH (s:Symptom)-[:INDICATES]->(d:Disease)
        WHERE s.name IN $symptoms
        WITH d, count(s) as symptom_count
        ORDER BY symptom_count DESC
        LIMIT 10
        OPTIONAL MATCH (d)-[:TREATED_BY]->(t:Treatment)
        OPTIONAL MATCH (d)-[:RECOMMENDS]->(r:Recommendation)
        RETURN d.name as disease_name,
               d.name_en as disease_name_en,
               d.description as disease_desc,
               d.severity as severity,
               collect(DISTINCT r.content) as recommendations
        """
        
        diseases = []
        recommendations = []
        
        async with self._driver.session() as session:
            result = await session.run(cypher_query, symptoms=symptoms)
            async for record in result:
                diseases.append(DiseaseInfo(
                    name=record["disease_name"],
                    name_en=record["disease_name_en"] or "",
                    description=record["disease_desc"] or "",
                    severity=record["severity"] or "moderate"
                ))
                
                for rec in record["recommendations"]:
                    if rec:
                        recommendations.append(RecommendationInfo(
                            content=rec,
                            priority=3,
                            category="general"
                        ))
        
        return SymptomQueryResult(
            symptoms=symptoms,
            related_diseases=diseases,
            recommendations=recommendations,
            urgent_attention=urgent,
            summary=self._generate_summary(symptoms, diseases, urgent)
        )
    
    def _query_fallback(
        self, 
        symptoms: list[str], 
        urgent: bool
    ) -> SymptomQueryResult:
        """
        使用后备映射进行查询
        """
        diseases = []
        recommendations = []
        seen_diseases = set()
        seen_recommendations = set()
        
        for symptom in symptoms:
            # 查找匹配的症状
            for key in self.SYMPTOM_DISEASE_MAP:
                if key in symptom or symptom in key:
                    for disease in self.SYMPTOM_DISEASE_MAP[key]:
                        if disease.name not in seen_diseases:
                            diseases.append(disease)
                            seen_diseases.add(disease.name)
                    
                    if key in self.SYMPTOM_RECOMMENDATIONS:
                        for rec in self.SYMPTOM_RECOMMENDATIONS[key]:
                            if rec.content not in seen_recommendations:
                                recommendations.append(rec)
                                seen_recommendations.add(rec.content)
        
        # 按优先级排序建议
        recommendations.sort(key=lambda x: x.priority, reverse=True)
        
        return SymptomQueryResult(
            symptoms=symptoms,
            related_diseases=diseases,
            recommendations=recommendations[:8],  # 限制返回数量
            urgent_attention=urgent,
            summary=self._generate_summary(symptoms, diseases, urgent)
        )
    
    def _generate_summary(
        self, 
        symptoms: list[str], 
        diseases: list[DiseaseInfo],
        urgent: bool
    ) -> str:
        """
        生成中文摘要
        """
        if urgent:
            return (
                "⚠️ 检测到需要紧急关注的症状。"
                "请立即联系专业心理危机干预热线或就医。"
                "全国心理援助热线：400-161-9995"
            )
        
        if not diseases:
            return "未找到与这些症状明确相关的疾病信息。建议咨询专业医生进行评估。"
        
        symptom_str = "、".join(symptoms)
        disease_names = "、".join([d.name for d in diseases[:3]])
        
        return (
            f"根据您描述的症状（{symptom_str}），"
            f"可能与以下情况相关：{disease_names}。"
            f"这仅供参考，具体诊断需要专业医生评估。"
        )
    
    def get_cypher_examples(self) -> dict:
        """
        返回 Cypher 查询示例
        """
        return {
            "query_diseases_by_symptom": """
                // 根据症状查询相关疾病
                MATCH (s:Symptom {name: $symptom_name})-[:INDICATES]->(d:Disease)
                RETURN d.name, d.description, d.severity
            """,
            "query_treatments": """
                // 查询疾病的治疗方法
                MATCH (d:Disease {name: $disease_name})-[:TREATED_BY]->(t:Treatment)
                RETURN t.name, t.type, t.description
            """,
            "query_related_symptoms": """
                // 查询疾病的所有相关症状
                MATCH (d:Disease {name: $disease_name})<-[:INDICATES]-(s:Symptom)
                RETURN collect(s.name) as symptoms
            """,
            "create_symptom_disease_relation": """
                // 创建症状-疾病关系
                MERGE (s:Symptom {name: $symptom_name})
                MERGE (d:Disease {name: $disease_name})
                MERGE (s)-[:INDICATES {weight: $weight}]->(d)
            """,
        }
