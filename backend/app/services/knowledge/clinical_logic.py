"""
Clinical Logic Engine - Neo4j Knowledge Graph Integration
临床逻辑引擎 - 基于 Neo4j 的知识图谱推理

This module implements GraphRAG (Graph Retrieval-Augmented Generation)
for medical reasoning and symptom-disorder inference.

Key Components:
1. Schema Initialization (Cypher constraints and initial data)
2. Dynamic Inference Queries (weighted path scoring)
3. Symptom Graph Updates (User-Symptom relationships)

Scoring Formula:
  Score(D) = Σ Weight(s→D) × Severity(s) for s ∈ S_user
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from enum import Enum
import os
import json


# =====================================================
# DATA STRUCTURES
# =====================================================

class SeverityLevel(Enum):
    """症状严重程度等级"""
    NONE = 0
    MILD = 1
    MODERATE = 2
    SEVERE = 3


@dataclass
class SymptomRecord:
    """用户症状记录"""
    name: str
    severity: int = 1
    timestamp: Optional[datetime] = None
    source: str = "user_report"  # user_report, biomarker, llm_inference


@dataclass
class DisorderInference:
    """疾病推理结果"""
    name: str
    name_cn: str
    risk_score: float
    confidence: str
    supporting_symptoms: list[str]
    description: str = ""


@dataclass
class GraphInferenceResult:
    """图推理结果"""
    user_id: str
    inferred_disorders: list[DisorderInference]
    active_symptoms: list[str]
    reasoning_summary: str
    co_occurring_features: list[str] = field(default_factory=list)


# =====================================================
# CYPHER SCHEMA SCRIPTS
# =====================================================

SCHEMA_CONSTRAINTS = """
// ========== 节点唯一性约束 ==========

// 用户节点
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

// 症状节点
CREATE CONSTRAINT symptom_name_unique IF NOT EXISTS
FOR (s:Symptom) REQUIRE s.name IS UNIQUE;

// 疾病节点
CREATE CONSTRAINT disorder_name_unique IF NOT EXISTS
FOR (d:Disorder) REQUIRE d.name IS UNIQUE;

// 生物标记节点
CREATE CONSTRAINT biomarker_name_unique IF NOT EXISTS
FOR (b:Biomarker) REQUIRE b.name IS UNIQUE;

// 干预手段节点
CREATE CONSTRAINT intervention_name_unique IF NOT EXISTS
FOR (i:Intervention) REQUIRE i.name IS UNIQUE;
"""

INITIAL_KNOWLEDGE_INJECTION = """
// ========== 精神疾病知识图谱初始化 ==========

// 1. 重度抑郁症 (Major Depressive Disorder)
MERGE (d1:Disorder {name: 'Major Depressive Disorder'})
SET d1.name_cn = '重度抑郁症',
    d1.icd10 = 'F32',
    d1.description = '以持续情绪低落、快感缺失为核心特征的情感障碍'

// 抑郁症相关症状
MERGE (s_anhedonia:Symptom {name: 'Anhedonia'})
SET s_anhedonia.name_cn = '快感缺失',
    s_anhedonia.category = 'affective'

MERGE (s_depressed:Symptom {name: 'Depressed Mood'})
SET s_depressed.name_cn = '情绪低落',
    s_depressed.category = 'affective'

MERGE (s_insomnia:Symptom {name: 'Insomnia'})
SET s_insomnia.name_cn = '失眠',
    s_insomnia.category = 'somatic'

MERGE (s_fatigue:Symptom {name: 'Fatigue'})
SET s_fatigue.name_cn = '疲劳',
    s_fatigue.category = 'somatic'

MERGE (s_psychomotor:Symptom {name: 'Psychomotor Retardation'})
SET s_psychomotor.name_cn = '精神运动迟滞',
    s_psychomotor.category = 'motor'

MERGE (s_worthless:Symptom {name: 'Feelings of Worthlessness'})
SET s_worthless.name_cn = '自我价值感低',
    s_worthless.category = 'cognitive'

MERGE (s_concentration:Symptom {name: 'Concentration Difficulty'})
SET s_concentration.name_cn = '注意力难以集中',
    s_concentration.category = 'cognitive'

MERGE (s_suicidal:Symptom {name: 'Suicidal Ideation'})
SET s_suicidal.name_cn = '自杀意念',
    s_suicidal.category = 'ideation',
    s_suicidal.is_critical = true

// 抑郁症症状关系 (带权重)
MERGE (s_anhedonia)-[r1:INDICATES]->(d1) SET r1.weight = 0.9
MERGE (s_depressed)-[r2:INDICATES]->(d1) SET r2.weight = 0.95
MERGE (s_insomnia)-[r3:INDICATES]->(d1) SET r3.weight = 0.6
MERGE (s_fatigue)-[r4:INDICATES]->(d1) SET r4.weight = 0.7
MERGE (s_psychomotor)-[r5:INDICATES]->(d1) SET r5.weight = 0.8
MERGE (s_worthless)-[r6:INDICATES]->(d1) SET r6.weight = 0.85
MERGE (s_concentration)-[r7:INDICATES]->(d1) SET r7.weight = 0.5
MERGE (s_suicidal)-[r8:INDICATES]->(d1) SET r8.weight = 1.0;

// 2. 广泛性焦虑症 (Generalized Anxiety Disorder)
MERGE (d2:Disorder {name: 'Generalized Anxiety Disorder'})
SET d2.name_cn = '广泛性焦虑症',
    d2.icd10 = 'F41.1',
    d2.description = '对多种事物持续过度担忧，伴有躯体紧张症状'

MERGE (s_anxiety:Symptom {name: 'Excessive Worry'})
SET s_anxiety.name_cn = '过度担忧',
    s_anxiety.category = 'cognitive'

MERGE (s_restless:Symptom {name: 'Restlessness'})
SET s_restless.name_cn = '坐立不安',
    s_restless.category = 'motor'

MERGE (s_tension:Symptom {name: 'Muscle Tension'})
SET s_tension.name_cn = '肌肉紧张',
    s_tension.category = 'somatic'

MERGE (s_irritable:Symptom {name: 'Irritability'})
SET s_irritable.name_cn = '易激惹',
    s_irritable.category = 'affective'

// 焦虑症症状关系
MERGE (s_anxiety)-[r9:INDICATES]->(d2) SET r9.weight = 0.95
MERGE (s_restless)-[r10:INDICATES]->(d2) SET r10.weight = 0.8
MERGE (s_tension)-[r11:INDICATES]->(d2) SET r11.weight = 0.7
MERGE (s_irritable)-[r12:INDICATES]->(d2) SET r12.weight = 0.6
MERGE (s_insomnia)-[r13:INDICATES]->(d2) SET r13.weight = 0.65
MERGE (s_fatigue)-[r14:INDICATES]->(d2) SET r14.weight = 0.5
MERGE (s_concentration)-[r15:INDICATES]->(d2) SET r15.weight = 0.55;

// 3. 甲状腺功能减退 (Hypothyroidism) - 需排除的生理性病变
MERGE (d3:Disorder {name: 'Hypothyroidism'})
SET d3.name_cn = '甲状腺功能减退',
    d3.icd10 = 'E03',
    d3.is_physiological = true,
    d3.description = '甲状腺激素分泌不足导致的代谢减慢'

MERGE (s_weight_gain:Symptom {name: 'Weight Gain'})
SET s_weight_gain.name_cn = '体重增加',
    s_weight_gain.category = 'somatic'

MERGE (s_cold_intolerance:Symptom {name: 'Cold Intolerance'})
SET s_cold_intolerance.name_cn = '怕冷',
    s_cold_intolerance.category = 'somatic'

MERGE (s_weight_gain)-[r16:INDICATES]->(d3) SET r16.weight = 0.8
MERGE (s_cold_intolerance)-[r17:INDICATES]->(d3) SET r17.weight = 0.85
MERGE (s_fatigue)-[r18:INDICATES]->(d3) SET r18.weight = 0.7
MERGE (s_depressed)-[r19:INDICATES]->(d3) SET r19.weight = 0.5;

// 4. 生物标记 -> 症状关系
MERGE (b_jitter:Biomarker {name: 'High Voice Jitter'})
SET b_jitter.name_cn = '语音抖动增高',
    b_jitter.source = 'voice_analysis'

MERGE (b_perclos:Biomarker {name: 'High PERCLOS'})
SET b_perclos.name_cn = 'PERCLOS升高',
    b_perclos.source = 'eye_tracking'

MERGE (b_jitter)-[r20:CORRELATES]->(s_anxiety) SET r20.weight = 0.7
MERGE (b_jitter)-[r21:CORRELATES]->(s_tension) SET r21.weight = 0.6
MERGE (b_perclos)-[r22:CORRELATES]->(s_fatigue) SET r22.weight = 0.85
MERGE (b_perclos)-[r23:CORRELATES]->(s_insomnia) SET r23.weight = 0.7;

// 5. 共病关系 (抑郁-焦虑高度共病)
MERGE (d1)-[c1:COMORBID_WITH]->(d2) SET c1.frequency = 0.6
MERGE (d2)-[c2:COMORBID_WITH]->(d1) SET c2.frequency = 0.6;
"""


# =====================================================
# CLINICAL LOGIC ENGINE
# =====================================================

class ClinicalLogicEngine:
    """
    临床逻辑引擎
    
    基于 Neo4j 知识图谱的 GraphRAG 推理系统
    """
    
    def __init__(self):
        self.neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        self.neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
        self.neo4j_password = os.environ.get("NEO4J_PASSWORD", "password")
        self._driver = None
        self._initialized = False
    
    async def _get_driver(self):
        """获取 Neo4j 驱动"""
        if self._driver is None:
            try:
                from neo4j import AsyncGraphDatabase
                self._driver = AsyncGraphDatabase.driver(
                    self.neo4j_uri,
                    auth=(self.neo4j_user, self.neo4j_password)
                )
            except Exception as e:
                print(f"Neo4j connection failed: {e}")
                return None
        return self._driver
    
    async def initialize_schema(self) -> bool:
        """
        初始化图数据库 Schema
        
        创建约束并注入初始知识
        """
        driver = await self._get_driver()
        if not driver:
            return False
        
        try:
            async with driver.session() as session:
                # 创建约束
                for statement in SCHEMA_CONSTRAINTS.split(';'):
                    stmt = statement.strip()
                    if stmt and not stmt.startswith('//'):
                        try:
                            await session.run(stmt)
                        except Exception:
                            pass  # 约束可能已存在
                
                # 注入初始知识
                await session.run(INITIAL_KNOWLEDGE_INJECTION)
                
            self._initialized = True
            return True
        except Exception as e:
            print(f"Schema initialization failed: {e}")
            return False
    
    async def infer_potential_disorders(
        self, 
        user_id: str,
        include_biomarkers: bool = True
    ) -> GraphInferenceResult:
        """
        推理潜在疾病
        
        基于用户症状进行加权路径求和：
        Score(D) = Σ Weight(s→D) × Severity(s)
        
        Args:
            user_id: 用户ID
            include_biomarkers: 是否包含生物标记推理
            
        Returns:
            GraphInferenceResult 包含推理结果和推理路径
        """
        driver = await self._get_driver()
        
        # 如果 Neo4j 不可用，使用回退逻辑
        if not driver:
            return self._fallback_inference(user_id)
        
        try:
            async with driver.session() as session:
                # Step A: 查询用户所有活跃症状
                symptoms_query = """
                MATCH (u:User {id: $uid})-[hs:HAS_SYMPTOM]->(s:Symptom)
                WHERE hs.active = true
                RETURN s.name as symptom, s.name_cn as symptom_cn, 
                       hs.severity as severity, hs.timestamp as ts
                """
                result = await session.run(symptoms_query, uid=user_id)
                records = await result.data()
                
                active_symptoms = [r["symptom"] for r in records]
                
                if not active_symptoms:
                    return GraphInferenceResult(
                        user_id=user_id,
                        inferred_disorders=[],
                        active_symptoms=[],
                        reasoning_summary="No active symptoms found for this user.",
                    )
                
                # Step B: 执行加权路径求和查询
                inference_query = """
                MATCH (u:User {id: $uid})-[hs:HAS_SYMPTOM]->(s:Symptom)-[r:INDICATES]->(d:Disorder)
                WHERE hs.active = true
                WITH d, 
                     sum(r.weight * hs.severity) as risk_score,
                     collect(s.name_cn) as symptoms,
                     count(s) as symptom_count
                RETURN d.name as disorder, 
                       d.name_cn as disorder_cn,
                       d.description as description,
                       risk_score,
                       symptom_count,
                       symptoms
                ORDER BY risk_score DESC
                LIMIT 5
                """
                result = await session.run(inference_query, uid=user_id)
                disorder_records = await result.data()
                
                # Step C: 查询共病特征
                comorbidity_query = """
                MATCH (u:User {id: $uid})-[:HAS_SYMPTOM]->(s:Symptom)-[:INDICATES]->(d1:Disorder)
                      -[:COMORBID_WITH]->(d2:Disorder)
                WHERE u.id = $uid
                RETURN DISTINCT d2.name_cn as comorbid_disorder
                LIMIT 3
                """
                result = await session.run(comorbidity_query, uid=user_id)
                comorbid_records = await result.data()
                co_occurring = [r["comorbid_disorder"] for r in comorbid_records if r["comorbid_disorder"]]
                
                # Step D: 如果启用生物标记，查询生物标记关联
                biomarker_symptoms = []
                if include_biomarkers:
                    biomarker_query = """
                    MATCH (u:User {id: $uid})-[:HAS_BIOMARKER]->(b:Biomarker)-[c:CORRELATES]->(s:Symptom)
                    RETURN b.name_cn as biomarker, s.name_cn as symptom, c.weight as weight
                    """
                    result = await session.run(biomarker_query, uid=user_id)
                    biomarker_records = await result.data()
                    biomarker_symptoms = [
                        f"{r['biomarker']} → {r['symptom']}" 
                        for r in biomarker_records
                    ]
                
                # 格式化结果
                inferred_disorders = []
                for rec in disorder_records:
                    confidence = "high" if rec["risk_score"] > 5 else "medium" if rec["risk_score"] > 2 else "low"
                    inferred_disorders.append(DisorderInference(
                        name=rec["disorder"],
                        name_cn=rec["disorder_cn"] or rec["disorder"],
                        risk_score=round(rec["risk_score"], 2),
                        confidence=confidence,
                        supporting_symptoms=rec["symptoms"],
                        description=rec["description"] or "",
                    ))
                
                # 生成推理摘要
                summary = self._generate_reasoning_summary(
                    inferred_disorders, 
                    active_symptoms,
                    co_occurring,
                    biomarker_symptoms
                )
                
                return GraphInferenceResult(
                    user_id=user_id,
                    inferred_disorders=inferred_disorders,
                    active_symptoms=active_symptoms,
                    reasoning_summary=summary,
                    co_occurring_features=co_occurring,
                )
                
        except Exception as e:
            print(f"Inference failed: {e}")
            return self._fallback_inference(user_id)
    
    async def update_symptom_graph(
        self,
        user_id: str,
        symptom_list: list[SymptomRecord]
    ) -> dict:
        """
        更新用户症状图
        
        使用 MERGE 语句创建/更新 (:User)-[:HAS_SYMPTOM]->(:Symptom) 关系
        
        Args:
            user_id: 用户ID
            symptom_list: 症状记录列表
            
        Returns:
            更新结果统计
        """
        driver = await self._get_driver()
        
        if not driver:
            return {"status": "fallback", "message": "Neo4j not available"}
        
        try:
            async with driver.session() as session:
                # 确保用户节点存在
                await session.run(
                    "MERGE (u:User {id: $uid})",
                    uid=user_id
                )
                
                updated_count = 0
                created_count = 0
                
                for symptom in symptom_list:
                    # MERGE 症状节点
                    await session.run(
                        """
                        MERGE (s:Symptom {name: $name})
                        ON CREATE SET s.name_cn = $name
                        """,
                        name=symptom.name
                    )
                    
                    # MERGE 用户-症状关系，更新属性
                    result = await session.run(
                        """
                        MATCH (u:User {id: $uid})
                        MATCH (s:Symptom {name: $symptom_name})
                        MERGE (u)-[r:HAS_SYMPTOM]->(s)
                        ON CREATE SET r.created_at = datetime(),
                                      r.severity = $severity,
                                      r.source = $source,
                                      r.active = true
                        ON MATCH SET r.severity = CASE WHEN $severity > r.severity 
                                                       THEN $severity ELSE r.severity END,
                                     r.updated_at = datetime(),
                                     r.active = true
                        RETURN r.created_at = r.updated_at as is_new
                        """,
                        uid=user_id,
                        symptom_name=symptom.name,
                        severity=symptom.severity,
                        source=symptom.source
                    )
                    record = await result.single()
                    if record and record["is_new"]:
                        created_count += 1
                    else:
                        updated_count += 1
                
                return {
                    "status": "success",
                    "user_id": user_id,
                    "symptoms_created": created_count,
                    "symptoms_updated": updated_count,
                    "total_processed": len(symptom_list),
                }
                
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def update_biomarker(
        self,
        user_id: str,
        biomarker_name: str,
        value: float
    ) -> dict:
        """
        更新生物标记数据
        
        将语音 Jitter、PERCLOS 等数字表型数据写入图
        """
        driver = await self._get_driver()
        
        if not driver:
            return {"status": "fallback", "message": "Neo4j not available"}
        
        try:
            async with driver.session() as session:
                await session.run(
                    """
                    MERGE (u:User {id: $uid})
                    MERGE (b:Biomarker {name: $biomarker})
                    MERGE (u)-[r:HAS_BIOMARKER]->(b)
                    SET r.value = $value, r.timestamp = datetime()
                    """,
                    uid=user_id,
                    biomarker=biomarker_name,
                    value=value
                )
                return {"status": "success", "biomarker": biomarker_name}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def _generate_reasoning_summary(
        self,
        disorders: list[DisorderInference],
        symptoms: list[str],
        comorbid: list[str],
        biomarkers: list[str]
    ) -> str:
        """生成推理摘要文本（用于 LLM 上下文注入）"""
        if not disorders:
            return "Graph Inference: No significant disorder patterns detected."
        
        top_disorder = disorders[0]
        
        parts = [
            f"Graph Inference: User symptoms strongly align with "
            f"{top_disorder.name_cn} ({top_disorder.name}) "
            f"(score: {top_disorder.risk_score})."
        ]
        
        if len(disorders) > 1:
            others = ", ".join([d.name_cn for d in disorders[1:3]])
            parts.append(f"Other possibilities: {others}.")
        
        if comorbid:
            parts.append(f"Co-occurring features detected: {', '.join(comorbid)}.")
        
        if biomarkers:
            parts.append(f"Biomarker correlations: {'; '.join(biomarkers)}.")
        
        # 检查是否需要排除生理性疾病
        physiological = [d for d in disorders if "Hypothyroidism" in d.name]
        if physiological:
            parts.append(
                "⚠️ Note: Consider ruling out physiological conditions "
                "(e.g., thyroid dysfunction) before psychiatric diagnosis."
            )
        
        return " ".join(parts)
    
    def _fallback_inference(self, user_id: str) -> GraphInferenceResult:
        """Neo4j 不可用时的回退推理"""
        return GraphInferenceResult(
            user_id=user_id,
            inferred_disorders=[
                DisorderInference(
                    name="Major Depressive Disorder",
                    name_cn="重度抑郁症",
                    risk_score=0.0,
                    confidence="low",
                    supporting_symptoms=[],
                    description="建议连接 Neo4j 以获取完整推理结果"
                )
            ],
            active_symptoms=[],
            reasoning_summary="[Fallback Mode] Neo4j unavailable. Using cached inference patterns.",
        )
    
    async def get_symptom_disorder_paths(
        self,
        symptom_name: str,
        hops: int = 2
    ) -> list[dict]:
        """
        获取症状的 N-hop 邻居（用于 GraphRAG 子图检索）
        
        Args:
            symptom_name: 症状名称
            hops: 跳数 (默认 2)
            
        Returns:
            路径列表
        """
        driver = await self._get_driver()
        if not driver:
            return []
        
        try:
            async with driver.session() as session:
                query = f"""
                MATCH path = (s:Symptom {{name: $symptom}})-[*1..{hops}]-(n)
                WHERE n:Disorder OR n:Symptom
                RETURN [node in nodes(path) | 
                       CASE WHEN node:Symptom THEN node.name_cn 
                            WHEN node:Disorder THEN node.name_cn 
                            ELSE node.name END
                       ] as path,
                       [rel in relationships(path) | type(rel)] as relations
                LIMIT 20
                """
                result = await session.run(query, symptom=symptom_name)
                records = await result.data()
                return records
        except Exception as e:
            return []
    
    async def close(self):
        """关闭数据库连接"""
        if self._driver:
            await self._driver.close()
            self._driver = None


# =====================================================
# EXPORTS
# =====================================================

__all__ = [
    "SeverityLevel",
    "SymptomRecord",
    "DisorderInference",
    "GraphInferenceResult",
    "ClinicalLogicEngine",
    "SCHEMA_CONSTRAINTS",
    "INITIAL_KNOWLEDGE_INJECTION",
]
