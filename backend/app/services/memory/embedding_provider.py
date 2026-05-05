"""
Embedding Provider — 可插拔向量嵌入服务

策略优先级:
1. ZhipuAI embedding-3 API（推荐，1024 维，零额外依赖）
2. 本地 sentence-transformers（可选，需大内存）
3. Hash 伪嵌入（兜底，128 维，无语义能力）

通过环境变量 EMBEDDING_PROVIDER 切换: "zhipuai" | "local" | "hash"
"""

import os
import hashlib
from abc import ABC, abstractmethod
from typing import Optional

import numpy as np


# =====================================================
# 抽象基类
# =====================================================

class BaseEmbeddingProvider(ABC):
    """嵌入服务基类"""

    @abstractmethod
    def embed_sync(self, text: str) -> list[float]:
        """同步生成单条文本嵌入"""
        ...

    @abstractmethod
    def embed_batch_sync(self, texts: list[str]) -> list[list[float]]:
        """同步批量嵌入"""
        ...

    @property
    @abstractmethod
    def dimension(self) -> int:
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...


# =====================================================
# 方案 A: ZhipuAI embedding-3（首选）
# =====================================================

class ZhipuAIEmbeddingProvider(BaseEmbeddingProvider):
    """
    智谱 AI embedding-3

    使用项目已有的 zhipuai SDK，零额外依赖。
    默认 1024 维（可通过 EMBEDDING_DIM 环境变量调整为 256/512/1024/1536/2048）。
    """

    def __init__(self):
        from zhipuai import ZhipuAI

        api_key = os.getenv("LLM_API_KEY", "")
        self._client = ZhipuAI(api_key=api_key, max_retries=0)
        self._dim = int(os.getenv("EMBEDDING_DIM", "1024"))
        self._model = os.getenv("EMBEDDING_MODEL", "embedding-3")

    @property
    def dimension(self) -> int:
        return self._dim

    @property
    def provider_name(self) -> str:
        return "zhipuai"

    def embed_sync(self, text: str) -> list[float]:
        truncated = text[:500]
        response = self._client.embeddings.create(
            model=self._model,
            input=truncated,
            dimensions=self._dim,
        )
        return response.data[0].embedding

    def embed_batch_sync(self, texts: list[str]) -> list[list[float]]:
        truncated = [t[:500] for t in texts]
        response = self._client.embeddings.create(
            model=self._model,
            input=truncated,
            dimensions=self._dim,
        )
        sorted_data = sorted(response.data, key=lambda d: d.index)
        return [d.embedding for d in sorted_data]


# =====================================================
# 方案 B: 本地 sentence-transformers（备选）
# =====================================================

class LocalEmbeddingProvider(BaseEmbeddingProvider):
    """
    本地 sentence-transformers

    模型: paraphrase-multilingual-MiniLM-L12-v2 (384 维, ~470 MB)
    适合开发环境，Render 生产实例可能内存不足。
    """

    MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIM = 384

    def __init__(self):
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(self.MODEL_NAME)

    @property
    def dimension(self) -> int:
        return self.EMBEDDING_DIM

    @property
    def provider_name(self) -> str:
        return "local"

    def embed_sync(self, text: str) -> list[float]:
        vec = self._model.encode(text[:500])
        return vec.tolist()

    def embed_batch_sync(self, texts: list[str]) -> list[list[float]]:
        vecs = self._model.encode([t[:500] for t in texts])
        return vecs.tolist()


# =====================================================
# 方案 C: Hash 伪嵌入（兜底）
# =====================================================

class HashEmbeddingProvider(BaseEmbeddingProvider):
    """
    Hash 伪嵌入 — 兜底方案

    移植自原 vector_store.py，字符级 hash + 3-gram 特征。
    无真实语义能力，仅保持向后兼容。
    """

    EMBEDDING_DIM = 128

    @property
    def dimension(self) -> int:
        return self.EMBEDDING_DIM

    @property
    def provider_name(self) -> str:
        return "hash"

    def embed_sync(self, text: str) -> list[float]:
        embedding = [0.0] * self.EMBEDDING_DIM

        for i, char in enumerate(text):
            idx = ord(char) % self.EMBEDDING_DIM
            embedding[idx] += 1.0 / (1 + i * 0.1)

        for i in range(len(text) - 2):
            trigram = text[i : i + 3]
            idx = hash(trigram) % self.EMBEDDING_DIM
            embedding[idx] += 0.5

        norm = float(np.sqrt(sum(x**2 for x in embedding)))
        if norm > 0:
            embedding = [x / norm for x in embedding]

        return embedding

    def embed_batch_sync(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_sync(t) for t in texts]


# =====================================================
# 工厂函数（单例）
# =====================================================

_provider_instance: Optional[BaseEmbeddingProvider] = None


def get_embedding_provider() -> BaseEmbeddingProvider:
    """
    获取嵌入服务实例（单例）

    优先级:
    1. 环境变量 EMBEDDING_PROVIDER 指定
    2. ZhipuAI（如果 zhipuai SDK 可用）
    3. Hash 兜底
    """
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_name = os.getenv("EMBEDDING_PROVIDER", "zhipuai")

    if provider_name == "local":
        try:
            _provider_instance = LocalEmbeddingProvider()
            print(f"EmbeddingProvider: local sentence-transformers ({_provider_instance.dimension}d)")
            return _provider_instance
        except Exception as e:
            print(f"Local embedding init failed: {e}, falling back")

    if provider_name in ("zhipuai", "local"):
        try:
            _provider_instance = ZhipuAIEmbeddingProvider()
            print(f"EmbeddingProvider: ZhipuAI embedding-3 ({_provider_instance.dimension}d)")
            return _provider_instance
        except Exception as e:
            print(f"ZhipuAI embedding init failed: {e}, falling back to hash")

    _provider_instance = HashEmbeddingProvider()
    print(f"EmbeddingProvider: hash fallback ({_provider_instance.dimension}d, no semantic)")
    return _provider_instance
