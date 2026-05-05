"""
Domain Layer - Core Business Entities and Value Objects

This module contains the domain models following DDD principles.
Domain entities represent the core business concepts of the
psychological assessment platform.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class AssessmentType(Enum):
    """Types of psychological assessments available in the platform."""
    
    CLOCK_DRAWING_TEST = "cdt"  # 画钟测验
    PHQ9 = "phq9"  # 患者健康问卷-9
    GAD7 = "gad7"  # 广泛性焦虑障碍量表-7
    MMSE = "mmse"  # 简易精神状态检查
    MOCA = "moca"  # 蒙特利尔认知评估


class AssessmentStatus(Enum):
    """Status of an assessment session."""
    
    PENDING = "pending"  # 待开始
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"  # 已完成
    CANCELLED = "cancelled"  # 已取消


@dataclass
class DigitizerPoint:
    """
    Represents a single point in a digitizer trace.
    Used for recording pen strokes during Clock Drawing Test.
    用于记录画钟测验时的笔触轨迹点
    """
    
    x: float
    y: float
    pressure: float
    timestamp: float


@dataclass
class User:
    """
    User entity representing a patient or clinician.
    用户实体，代表患者或临床医生
    """
    
    id: UUID
    username: str
    email: str
    full_name: str
    role: str  # "patient" or "clinician"
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def create(
        cls,
        username: str,
        email: str,
        full_name: str,
        role: str = "patient",
    ) -> "User":
        """Factory method to create a new user."""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            username=username,
            email=email,
            full_name=full_name,
            role=role,
            created_at=now,
        )


@dataclass
class Assessment:
    """
    Assessment entity representing a psychological test session.
    测评实体，代表一次心理测验会话
    """
    
    id: UUID
    user_id: UUID
    assessment_type: AssessmentType
    status: AssessmentStatus
    score: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime] = None
    raw_data: Optional[dict] = None  # Stores digitizer points for CDT

    @classmethod
    def create(
        cls,
        user_id: UUID,
        assessment_type: AssessmentType,
    ) -> "Assessment":
        """Factory method to create a new assessment session."""
        return cls(
            id=uuid4(),
            user_id=user_id,
            assessment_type=assessment_type,
            status=AssessmentStatus.PENDING,
            score=None,
            created_at=datetime.utcnow(),
        )

    def start(self) -> None:
        """Mark assessment as in progress."""
        self.status = AssessmentStatus.IN_PROGRESS

    def complete(self, score: float, raw_data: Optional[dict] = None) -> None:
        """Mark assessment as completed with score."""
        self.status = AssessmentStatus.COMPLETED
        self.score = score
        self.completed_at = datetime.utcnow()
        self.raw_data = raw_data

    def cancel(self) -> None:
        """Cancel the assessment."""
        self.status = AssessmentStatus.CANCELLED
