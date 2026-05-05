"""
Knowledge Graph Module

This module provides knowledge graph services using Neo4j for:
- Medical knowledge queries
- Symptom-disease relationships
- Treatment recommendations
- Clinical logic inference (GraphRAG)
- Dynamic graph generation from conversations
"""

from .graph_service import KnowledgeGraphService, SymptomQueryResult
from .clinical_logic import (
    ClinicalLogicEngine,
    SymptomRecord,
    DisorderInference,
    GraphInferenceResult,
    SeverityLevel,
    SCHEMA_CONSTRAINTS,
    INITIAL_KNOWLEDGE_INJECTION,
)
from .graph_rag import (
    GraphRAGService,
    ExtractedKeyword,
    GraphRAGResult,
    graph_rag_service,
    extract_and_update_graph,
)

__all__ = [
    "KnowledgeGraphService",
    "SymptomQueryResult",
    "ClinicalLogicEngine",
    "SymptomRecord",
    "DisorderInference",
    "GraphInferenceResult",
    "SeverityLevel",
    "SCHEMA_CONSTRAINTS",
    "INITIAL_KNOWLEDGE_INJECTION",
    # Graph RAG
    "GraphRAGService",
    "ExtractedKeyword",
    "GraphRAGResult",
    "graph_rag_service",
    "extract_and_update_graph",
]
