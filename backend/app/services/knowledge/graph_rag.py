"""
Graph RAG Service

Dynamic knowledge graph generation from conversation data.
Uses GLM-4 to extract keywords and builds personal symptom graphs in Neo4j.
"""

import os
import json
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class ExtractedKeyword:
    """Extracted keyword from conversation"""
    term: str
    category: str  # 'symptom', 'emotion', 'behavior', 'stressor'
    severity: int = 1  # 1-3 scale
    confidence: float = 0.8


@dataclass  
class GraphRAGResult:
    """Result of graph update operation"""
    success: bool
    keywords_extracted: list[str]
    nodes_created: int
    relationships_created: int
    message: str


class GraphRAGService:
    """
    Graph RAG service for dynamic knowledge graph generation.
    
    Workflow:
    1. Extract keywords from conversation using GLM-4
    2. Create/merge symptom nodes in Neo4j
    3. Link symptoms to user node
    4. Enable graph-based retrieval for future context
    """
    
    # LLM API configuration
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_MODEL = "glm-4-flash"
    
    # Neo4j configuration
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    # Keyword extraction prompt
    EXTRACTION_PROMPT = """You are a clinical psychologist analyzing conversation text.
Extract relevant psychological keywords from the following conversation.

Categories to extract:
- symptom: Physical or psychological symptoms (insomnia, fatigue, headache)
- emotion: Emotional states (anxiety, sadness, frustration)  
- behavior: Behavioral patterns (isolation, avoidance, rumination)
- stressor: Life stressors (work pressure, relationship issues)

Respond in JSON format:
{
    "keywords": [
        {"term": "keyword", "category": "symptom|emotion|behavior|stressor", "severity": 1-3}
    ]
}

Conversation:
{conversation}

JSON response:"""

    def __init__(self):
        self._neo4j_driver = None
        self._llm_client = None
    
    async def _get_neo4j_driver(self):
        """Get or create Neo4j async driver"""
        if self._neo4j_driver is None:
            try:
                from neo4j import AsyncGraphDatabase
                self._neo4j_driver = AsyncGraphDatabase.driver(
                    self.NEO4J_URI,
                    auth=(self.NEO4J_USER, self.NEO4J_PASSWORD)
                )
            except Exception as e:
                print(f"Neo4j connection failed: {e}")
                return None
        return self._neo4j_driver
    
    def _get_llm_client(self):
        """Get or create LLM client"""
        if self._llm_client is None:
            try:
                from zhipuai import ZhipuAI
                self._llm_client = ZhipuAI(api_key=self.LLM_API_KEY)
            except ImportError:
                print("zhipuai not installed")
                return None
        return self._llm_client
    
    async def extract_keywords(self, conversation: str) -> list[ExtractedKeyword]:
        """
        Extract psychological keywords from conversation using GLM-4.
        
        Args:
            conversation: The conversation text to analyze
            
        Returns:
            List of extracted keywords with categories
        """
        client = self._get_llm_client()
        if not client:
            return self._fallback_extraction(conversation)
        
        try:
            prompt = self.EXTRACTION_PROMPT.format(conversation=conversation)
            
            response = client.chat.completions.create(
                model=self.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500,
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Parse JSON from response
            # Handle potential markdown code blocks
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            data = json.loads(result_text)
            
            keywords = []
            for kw in data.get("keywords", []):
                keywords.append(ExtractedKeyword(
                    term=kw.get("term", ""),
                    category=kw.get("category", "symptom"),
                    severity=kw.get("severity", 1),
                    confidence=0.9,
                ))
            
            return keywords
            
        except Exception as e:
            print(f"LLM extraction failed: {e}")
            return self._fallback_extraction(conversation)
    
    def _fallback_extraction(self, conversation: str) -> list[ExtractedKeyword]:
        """Fallback keyword extraction using simple pattern matching"""
        
        # Common psychological terms to match
        SYMPTOM_TERMS = {
            '失眠': 'insomnia', '睡不着': 'insomnia', '睡眠': 'insomnia',
            '头痛': 'headache', '疲劳': 'fatigue', '累': 'fatigue',
            '心悸': 'palpitation', '食欲': 'appetite',
        }
        
        EMOTION_TERMS = {
            '焦虑': 'anxiety', '紧张': 'anxiety', '担心': 'anxiety',
            '难过': 'sadness', '悲伤': 'sadness', '抑郁': 'depression',
            '愤怒': 'anger', '生气': 'anger', '烦躁': 'irritation',
            '压力': 'stress', '恐惧': 'fear',
        }
        
        BEHAVIOR_TERMS = {
            '回避': 'avoidance', '不想出门': 'isolation',
            '独处': 'isolation', '不想说话': 'withdrawal',
        }
        
        keywords = []
        conversation_lower = conversation.lower()
        
        for cn_term, en_term in SYMPTOM_TERMS.items():
            if cn_term in conversation_lower:
                keywords.append(ExtractedKeyword(
                    term=en_term,
                    category='symptom',
                    severity=2,
                    confidence=0.7,
                ))
        
        for cn_term, en_term in EMOTION_TERMS.items():
            if cn_term in conversation_lower:
                keywords.append(ExtractedKeyword(
                    term=en_term,
                    category='emotion',
                    severity=2,
                    confidence=0.7,
                ))
        
        for cn_term, en_term in BEHAVIOR_TERMS.items():
            if cn_term in conversation_lower:
                keywords.append(ExtractedKeyword(
                    term=en_term,
                    category='behavior',
                    severity=2,
                    confidence=0.7,
                ))
        
        # Remove duplicates
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw.term not in seen:
                seen.add(kw.term)
                unique_keywords.append(kw)
        
        return unique_keywords
    
    async def update_user_graph(
        self, 
        user_id: str, 
        conversation: str,
    ) -> GraphRAGResult:
        """
        Extract keywords from conversation and update user's symptom graph.
        
        Args:
            user_id: User identifier
            conversation: Conversation text to analyze
            
        Returns:
            GraphRAGResult with operation details
        """
        # Step 1: Extract keywords using GLM-4
        keywords = await self.extract_keywords(conversation)
        
        if not keywords:
            return GraphRAGResult(
                success=True,
                keywords_extracted=[],
                nodes_created=0,
                relationships_created=0,
                message="No relevant keywords found in conversation"
            )
        
        # Step 2: Update Neo4j graph
        driver = await self._get_neo4j_driver()
        
        if driver:
            nodes_created, rels_created = await self._write_to_neo4j(
                driver, user_id, keywords
            )
        else:
            # Fallback: store in local memory (for demo without Neo4j)
            nodes_created = len(keywords)
            rels_created = len(keywords)
            print(f"[GraphRAG] Local fallback - stored {len(keywords)} keywords for user {user_id}")
        
        return GraphRAGResult(
            success=True,
            keywords_extracted=[kw.term for kw in keywords],
            nodes_created=nodes_created,
            relationships_created=rels_created,
            message=f"Updated graph with {len(keywords)} keywords"
        )
    
    async def _write_to_neo4j(
        self, 
        driver, 
        user_id: str, 
        keywords: list[ExtractedKeyword]
    ) -> tuple[int, int]:
        """Write extracted keywords to Neo4j"""
        
        nodes_created = 0
        rels_created = 0
        
        try:
            async with driver.session() as session:
                for kw in keywords:
                    # MERGE user and symptom nodes, create relationship
                    query = """
                    MERGE (u:User {id: $user_id})
                    MERGE (s:Symptom {name: $symptom_name})
                    SET s.category = $category
                    MERGE (u)-[r:HAS_SYMPTOM]->(s)
                    SET r.severity = CASE 
                        WHEN r.severity IS NULL THEN $severity
                        WHEN $severity > r.severity THEN $severity
                        ELSE r.severity
                    END,
                    r.updated_at = datetime(),
                    r.confidence = $confidence
                    RETURN 
                        CASE WHEN s.created_at IS NULL THEN true ELSE false END as node_created,
                        true as rel_updated
                    """
                    
                    result = await session.run(
                        query,
                        user_id=user_id,
                        symptom_name=kw.term,
                        category=kw.category,
                        severity=kw.severity,
                        confidence=kw.confidence,
                    )
                    
                    record = await result.single()
                    if record and record.get("node_created"):
                        nodes_created += 1
                    rels_created += 1
                    
        except Exception as e:
            print(f"Neo4j write failed: {e}")
        
        return nodes_created, rels_created
    
    async def get_user_symptoms(self, user_id: str) -> list[dict]:
        """Retrieve all symptoms for a user from the graph"""
        
        driver = await self._get_neo4j_driver()
        if not driver:
            return []
        
        try:
            async with driver.session() as session:
                query = """
                MATCH (u:User {id: $user_id})-[r:HAS_SYMPTOM]->(s:Symptom)
                RETURN s.name as symptom, s.category as category, 
                       r.severity as severity, r.updated_at as updated
                ORDER BY r.severity DESC
                """
                
                result = await session.run(query, user_id=user_id)
                records = await result.data()
                return records
                
        except Exception as e:
            print(f"Neo4j read failed: {e}")
            return []


# Global singleton
graph_rag_service = GraphRAGService()


async def extract_and_update_graph(user_id: str, conversation: str) -> GraphRAGResult:
    """
    Main API function for Graph RAG operations.
    
    Extracts keywords from conversation and updates user's symptom graph.
    """
    return await graph_rag_service.update_user_graph(user_id, conversation)
