"""
Memory Router — 向量记忆管理 API

POST  /memory/add      -> 添加记忆条目
POST  /memory/search   -> 语义检索记忆
GET   /memory/stats    -> 用户记忆统计
GET   /memory/status   -> 服务运行状态
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/memory", tags=["Memory"])


# ---- Pydantic 模型 ----

class MemoryAddRequest(BaseModel):
    user_id: str = Field(..., description="用户 ID")
    content: str = Field(..., description="记忆内容")
    role: str = Field(default="user", description="角色: user | assistant")
    metadata: Optional[dict] = Field(default=None, description="额外元数据")


class MemorySearchRequest(BaseModel):
    user_id: str = Field(..., description="用户 ID")
    query: str = Field(..., description="检索查询文本")
    days: int = Field(default=3, ge=1, le=90, description="检索天数范围")
    top_k: int = Field(default=5, ge=1, le=20, description="返回条数")


class MemoryEntryResponse(BaseModel):
    content: str
    role: str
    timestamp: str
    similarity: float = 0.0
    metadata: dict = {}


# ---- 路由 ----

@router.post("/add")
async def add_memory(body: MemoryAddRequest):
    """添加记忆条目（自动生成嵌入向量）"""
    from app.services.memory import vector_memory

    try:
        entry = await vector_memory.add_memory(
            user_id=body.user_id,
            content=body.content,
            role=body.role,
            metadata=body.metadata,
        )
        return {
            "success": True,
            "timestamp": entry.timestamp.isoformat(),
            "storage_tier": vector_memory.storage_tier,
            "embedding_provider": vector_memory.provider_name,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"记忆添加失败: {e}")


@router.post("/search")
async def search_memories(body: MemorySearchRequest):
    """语义检索记忆（向量相似度 top-K）"""
    from app.services.memory import vector_memory

    try:
        memories = await vector_memory.retrieve_relevant(
            user_id=body.user_id,
            query=body.query,
            days=body.days,
            top_k=body.top_k,
        )
        results = [
            MemoryEntryResponse(
                content=m.content,
                role=m.role,
                timestamp=m.timestamp.isoformat(),
                similarity=m.similarity,
                metadata=m.metadata,
            ).model_dump()
            for m in memories
        ]
        return {
            "success": True,
            "results": results,
            "total": len(results),
            "embedding_provider": vector_memory.provider_name,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"记忆检索失败: {e}")


@router.get("/stats/{user_id}")
async def get_memory_stats(user_id: str):
    """获取用户记忆统计"""
    from app.services.memory import vector_memory

    try:
        stats = await vector_memory.get_user_stats(user_id)
        return {"success": True, **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"统计获取失败: {e}")


@router.get("/status")
async def get_memory_status():
    """获取记忆服务运行状态（调试用）"""
    from app.services.memory import vector_memory

    return {
        "storage_tier": vector_memory.storage_tier,
        "embedding_provider": vector_memory.provider_name,
        "embedding_dim": vector_memory.embedding_dim,
        "embedding_status": vector_memory.embedding_status,
        "status": "healthy" if vector_memory._embedding_healthy else "degraded",
    }
