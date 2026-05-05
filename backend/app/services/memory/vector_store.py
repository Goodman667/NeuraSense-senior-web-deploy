"""
Vector Memory Store Service (v2)

三层降级架构:
  Tier-1  Supabase pgvector   — 生产环境
  Tier-2  InMemory + NumPy    — 开发环境 / Supabase 不可用
  Tier-3  JSON 文件 + Hash    — 离线兜底

公开接口与 v1 完全兼容，counselor.py 无需修改。
"""

import json
import os
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field

import numpy as np

from .embedding_provider import get_embedding_provider, BaseEmbeddingProvider


# =====================================================
# 数据模型（保持与 v1 兼容）
# =====================================================

@dataclass
class MemoryEntry:
    """记忆条目"""
    user_id: str
    content: str
    role: str  # 'user' or 'assistant'
    timestamp: datetime
    embedding: list[float] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    similarity: float = 0.0

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "content": self.content,
            "role": self.role,
            "timestamp": self.timestamp.isoformat(),
            "embedding": self.embedding,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "MemoryEntry":
        return cls(
            user_id=data["user_id"],
            content=data["content"],
            role=data["role"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            embedding=data.get("embedding", []),
            metadata=data.get("metadata", {}),
        )


# =====================================================
# 存储后端抽象
# =====================================================

class BaseMemoryStorage(ABC):
    """存储后端基类"""

    @property
    @abstractmethod
    def tier_name(self) -> str:
        ...

    @abstractmethod
    async def store(
        self, user_id: str, content: str, role: str,
        embedding: list[float], metadata: dict,
    ) -> MemoryEntry:
        ...

    @abstractmethod
    async def search(
        self, user_id: str, query_embedding: list[float],
        days: int, top_k: int,
    ) -> list[MemoryEntry]:
        ...

    @abstractmethod
    async def get_recent(self, user_id: str, limit: int) -> list[MemoryEntry]:
        ...

    @abstractmethod
    async def get_stats(self, user_id: str) -> dict:
        ...


# =====================================================
# Tier-1: Supabase pgvector
# =====================================================

class PgVectorStorage(BaseMemoryStorage):
    """Supabase pgvector 存储"""

    def __init__(self, supabase_client):
        self._sb = supabase_client

    @property
    def tier_name(self) -> str:
        return "pgvector"

    async def store(
        self, user_id: str, content: str, role: str,
        embedding: list[float], metadata: dict,
    ) -> MemoryEntry:
        now = datetime.utcnow()
        record = {
            "user_id": user_id,
            "content": content,
            "role": role,
            "embedding": embedding,
            "metadata": metadata,
            "created_at": now.isoformat(),
        }
        self._sb.table("memory_vectors").insert(record).execute()
        return MemoryEntry(
            user_id=user_id,
            content=content,
            role=role,
            timestamp=now,
            embedding=embedding,
            metadata=metadata,
        )

    async def search(
        self, user_id: str, query_embedding: list[float],
        days: int, top_k: int,
    ) -> list[MemoryEntry]:
        result = self._sb.rpc("match_memories", {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_days": days,
            "match_count": top_k,
        }).execute()
        entries = []
        for row in (result.data or []):
            entries.append(MemoryEntry(
                user_id=row["user_id"],
                content=row["content"],
                role=row["role"],
                timestamp=datetime.fromisoformat(row["created_at"]),
                metadata=row.get("metadata", {}),
                similarity=row.get("similarity", 0.0),
            ))
        return entries

    async def get_recent(self, user_id: str, limit: int) -> list[MemoryEntry]:
        result = (
            self._sb.table("memory_vectors")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        entries = []
        for row in (result.data or []):
            entries.append(MemoryEntry(
                user_id=row["user_id"],
                content=row["content"],
                role=row["role"],
                timestamp=datetime.fromisoformat(row["created_at"]),
                metadata=row.get("metadata", {}),
            ))
        entries.reverse()
        return entries

    async def get_stats(self, user_id: str) -> dict:
        result = (
            self._sb.table("memory_vectors")
            .select("created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return {"total_memories": 0, "days_active": 0}
        dates = [datetime.fromisoformat(r["created_at"]).date() for r in rows]
        return {
            "total_memories": len(rows),
            "days_active": len(set(dates)),
            "first_interaction": rows[0]["created_at"],
            "last_interaction": rows[-1]["created_at"],
        }


# =====================================================
# Tier-2: InMemory + NumPy
# =====================================================

class InMemoryVectorStorage(BaseMemoryStorage):
    """内存 NumPy 向量存储（开发环境）"""

    MAX_PER_USER = 500

    def __init__(self, embedding_dim: int):
        self._dim = embedding_dim
        self._entries: dict[str, list[MemoryEntry]] = {}
        self._vectors: dict[str, list[list[float]]] = {}

    @property
    def tier_name(self) -> str:
        return "in_memory"

    async def store(
        self, user_id: str, content: str, role: str,
        embedding: list[float], metadata: dict,
    ) -> MemoryEntry:
        if user_id not in self._entries:
            self._entries[user_id] = []
            self._vectors[user_id] = []

        entry = MemoryEntry(
            user_id=user_id,
            content=content,
            role=role,
            timestamp=datetime.now(),
            embedding=embedding,
            metadata=metadata,
        )
        self._entries[user_id].append(entry)
        self._vectors[user_id].append(embedding)

        # 限制数量
        if len(self._entries[user_id]) > self.MAX_PER_USER:
            self._entries[user_id] = self._entries[user_id][-self.MAX_PER_USER:]
            self._vectors[user_id] = self._vectors[user_id][-self.MAX_PER_USER:]

        return entry

    async def search(
        self, user_id: str, query_embedding: list[float],
        days: int, top_k: int,
    ) -> list[MemoryEntry]:
        if user_id not in self._entries:
            return []

        cutoff = datetime.now() - timedelta(days=days)
        entries = self._entries[user_id]
        vectors = self._vectors[user_id]

        # 过滤时间范围
        indices = [i for i, e in enumerate(entries) if e.timestamp >= cutoff]
        if not indices:
            return []

        # NumPy 批量余弦相似度
        filtered_vecs = np.array([vectors[i] for i in indices], dtype=np.float32)
        query_vec = np.array(query_embedding, dtype=np.float32).reshape(1, -1)

        # 处理维度不匹配（provider 切换时）
        if filtered_vecs.shape[1] != query_vec.shape[1]:
            # 维度不匹配，按时间倒序返回
            result = [entries[i] for i in indices]
            result.sort(key=lambda e: e.timestamp, reverse=True)
            return result[:top_k]

        dot = filtered_vecs @ query_vec.T
        norms = np.linalg.norm(filtered_vecs, axis=1, keepdims=True) * np.linalg.norm(query_vec)
        sims = (dot / (norms + 1e-8)).flatten()

        # top-k
        top_indices = np.argsort(sims)[::-1][:top_k]
        results = []
        for idx in top_indices:
            original_idx = indices[idx]
            entry = entries[original_idx]
            entry.similarity = float(sims[idx])
            results.append(entry)
        return results

    async def get_recent(self, user_id: str, limit: int) -> list[MemoryEntry]:
        if user_id not in self._entries:
            return []
        return self._entries[user_id][-limit:]

    async def get_stats(self, user_id: str) -> dict:
        if user_id not in self._entries:
            return {"total_memories": 0, "days_active": 0}
        entries = self._entries[user_id]
        if not entries:
            return {"total_memories": 0, "days_active": 0}
        unique_days = len(set(e.timestamp.date() for e in entries))
        return {
            "total_memories": len(entries),
            "days_active": unique_days,
            "first_interaction": entries[0].timestamp.isoformat(),
            "last_interaction": entries[-1].timestamp.isoformat(),
        }


# =====================================================
# Tier-3: JSON 文件（兜底，移植自 v1）
# =====================================================

class JsonFileStorage(BaseMemoryStorage):
    """JSON 文件存储（离线兜底）"""

    STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "memory")
    MAX_PER_USER = 500

    def __init__(self):
        os.makedirs(self.STORAGE_DIR, exist_ok=True)
        self._memories: dict[str, list[MemoryEntry]] = {}
        self._load_all()

    @property
    def tier_name(self) -> str:
        return "json_file"

    def _user_file(self, user_id: str) -> str:
        safe_id = hashlib.md5(user_id.encode()).hexdigest()[:16]
        return os.path.join(self.STORAGE_DIR, f"memory_{safe_id}.json")

    def _load_all(self):
        if not os.path.exists(self.STORAGE_DIR):
            return
        for fname in os.listdir(self.STORAGE_DIR):
            if fname.startswith("memory_") and fname.endswith(".json"):
                fpath = os.path.join(self.STORAGE_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    uid = data.get("user_id", "unknown")
                    self._memories[uid] = [MemoryEntry.from_dict(e) for e in data.get("entries", [])]
                except Exception as e:
                    print(f"Failed to load {fname}: {e}")

    def _save(self, user_id: str):
        fpath = self._user_file(user_id)
        entries = self._memories.get(user_id, [])
        data = {
            "user_id": user_id,
            "updated_at": datetime.now().isoformat(),
            "entries": [e.to_dict() for e in entries],
        }
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    async def store(
        self, user_id: str, content: str, role: str,
        embedding: list[float], metadata: dict,
    ) -> MemoryEntry:
        if user_id not in self._memories:
            self._memories[user_id] = []
        entry = MemoryEntry(
            user_id=user_id,
            content=content,
            role=role,
            timestamp=datetime.now(),
            embedding=embedding,
            metadata=metadata,
        )
        self._memories[user_id].append(entry)
        if len(self._memories[user_id]) > self.MAX_PER_USER:
            self._memories[user_id] = self._memories[user_id][-self.MAX_PER_USER:]
        self._save(user_id)
        return entry

    async def search(
        self, user_id: str, query_embedding: list[float],
        days: int, top_k: int,
    ) -> list[MemoryEntry]:
        if user_id not in self._memories:
            return []
        cutoff = datetime.now() - timedelta(days=days)
        recent = [m for m in self._memories[user_id] if m.timestamp >= cutoff]
        if not recent:
            return []

        # 余弦相似度（纯 Python）
        scored = []
        for m in recent:
            if m.embedding and len(m.embedding) == len(query_embedding):
                dot = sum(a * b for a, b in zip(query_embedding, m.embedding))
                n1 = np.sqrt(sum(a ** 2 for a in query_embedding))
                n2 = np.sqrt(sum(b ** 2 for b in m.embedding))
                sim = dot / (n1 * n2) if n1 > 0 and n2 > 0 else 0.0
                m.similarity = sim
                scored.append((sim, m))
            else:
                scored.append((0.0, m))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:top_k]]

    async def get_recent(self, user_id: str, limit: int) -> list[MemoryEntry]:
        if user_id not in self._memories:
            return []
        return self._memories[user_id][-limit:]

    async def get_stats(self, user_id: str) -> dict:
        if user_id not in self._memories:
            return {"total_memories": 0, "days_active": 0}
        entries = self._memories[user_id]
        if not entries:
            return {"total_memories": 0, "days_active": 0}
        unique_days = len(set(e.timestamp.date() for e in entries))
        return {
            "total_memories": len(entries),
            "days_active": unique_days,
            "first_interaction": entries[0].timestamp.isoformat(),
            "last_interaction": entries[-1].timestamp.isoformat(),
        }


# =====================================================
# VectorMemoryStore — 统一对外接口
# =====================================================

class VectorMemoryStore:
    """
    向量记忆存储服务 (v2)

    三层降级: pgvector → InMemory+NumPy → JSON
    公开接口与 v1 完全兼容。
    """

    _instance: Optional["VectorMemoryStore"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._embedder: BaseEmbeddingProvider = get_embedding_provider()
        self._storage: BaseMemoryStorage = self._init_storage()
        self._embedding_healthy: bool = True
        self._embedding_fail_count: int = 0
        self._initialized = True

    # ------ 属性 ------

    @property
    def provider_name(self) -> str:
        return self._embedder.provider_name

    @property
    def storage_tier(self) -> str:
        return self._storage.tier_name

    @property
    def embedding_dim(self) -> int:
        return self._embedder.dimension

    @property
    def embedding_status(self) -> str:
        if self._embedding_healthy:
            return "healthy"
        return f"degraded (failures: {self._embedding_fail_count})"

    # ------ 初始化存储 ------

    def _init_storage(self) -> BaseMemoryStorage:
        # Tier-1: pgvector
        try:
            from app.services.database.supabase_client import (
                is_supabase_available,
                get_supabase_client,
            )
            if is_supabase_available():
                client = get_supabase_client()
                # 探测表是否存在
                client.table("memory_vectors").select("id").limit(1).execute()
                store = PgVectorStorage(client)
                print(f"VectorMemory: Supabase pgvector (Tier-1, {self._embedder.dimension}d)")
                return store
        except Exception as e:
            print(f"pgvector init failed: {e}")

        # Tier-2: InMemory
        try:
            store = InMemoryVectorStorage(self._embedder.dimension)
            print(f"VectorMemory: InMemory+NumPy (Tier-2, {self._embedder.dimension}d)")
            return store
        except Exception as e:
            print(f"InMemory init failed: {e}")

        # Tier-3: JSON
        store = JsonFileStorage()
        print(f"VectorMemory: JSON file (Tier-3)")
        return store

    # ------ 公开接口（与 v1 签名完全相同）------

    async def add_memory(
        self,
        user_id: str,
        content: str,
        role: str = "user",
        metadata: Optional[dict] = None,
    ) -> MemoryEntry:
        try:
            embedding = self._embedder.embed_sync(content)
            self._embedding_healthy = True
        except Exception as e:
            self._embedding_fail_count += 1
            self._embedding_healthy = False
            print(f"Embedding failed ({self._embedding_fail_count}x), using zero vector: {e}")
            embedding = [0.0] * self._embedder.dimension

        return await self._storage.store(
            user_id=user_id,
            content=content,
            role=role,
            embedding=embedding,
            metadata=metadata or {},
        )

    async def retrieve_relevant(
        self,
        user_id: str,
        query: str,
        days: int = 3,
        top_k: int = 5,
    ) -> list[MemoryEntry]:
        try:
            query_embedding = self._embedder.embed_sync(query)
            self._embedding_healthy = True
        except Exception as e:
            self._embedding_fail_count += 1
            self._embedding_healthy = False
            print(f"Query embedding failed ({self._embedding_fail_count}x), falling back to recent: {e}")
            return await self._storage.get_recent(user_id, top_k)

        return await self._storage.search(
            user_id=user_id,
            query_embedding=query_embedding,
            days=days,
            top_k=top_k,
        )

    async def get_recent_context(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list[MemoryEntry]:
        return await self._storage.get_recent(user_id, limit)

    def format_context_for_prompt(self, memories: list[MemoryEntry]) -> str:
        if not memories:
            return ""
        parts = []
        for m in memories:
            role_label = "\u7528\u6237" if m.role == "user" else "\u54a8\u8be2\u5e08"
            time_str = m.timestamp.strftime("%Y-%m-%d %H:%M")
            sim_tag = f" (相关度{m.similarity:.0%})" if m.similarity > 0 else ""
            parts.append(f"[{time_str}]{sim_tag} {role_label}: {m.content[:200]}")
        return "\n".join(parts)

    async def get_user_stats(self, user_id: str) -> dict:
        stats = await self._storage.get_stats(user_id)
        stats["storage_tier"] = self._storage.tier_name
        stats["embedding_provider"] = self._embedder.provider_name
        stats["embedding_dim"] = self._embedder.dimension
        return stats


# =====================================================
# 全局单例（保持 v1 兼容导出）
# =====================================================

vector_memory = VectorMemoryStore()
