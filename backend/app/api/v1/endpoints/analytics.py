import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter(prefix="/analytics", tags=["Métricas y Analítica del Consorcio"])


class ConsortiumMetricsDTO(BaseModel):
    total_papers: int
    total_discussions: int
    total_decisions: int
    total_tasks_completed: int
    total_tasks_in_progress: int
    tasks_completion_rate: float
    active_researchers: int
    rag_indexed_chunks: int
    resolved_annotations_percent: float


class LineAnalyticsDTO(BaseModel):
    id: str
    name: str
    leader: str
    color: str
    advances_count: int
    papers_count: int
    decisions_count: int
    tasks_progress_percent: int


class TimelineActivityDTO(BaseModel):
    period: str
    advances: int
    discussions: int
    papers_uploaded: int
    decisions_agreed: int


class AnalyticsOverviewResponse(BaseModel):
    kpis: ConsortiumMetricsDTO
    lines_progress: List[LineAnalyticsDTO]
    weekly_trend: List[TimelineActivityDTO]


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """Retorna métricas consolidadas del avance científico del consorcio."""
    return AnalyticsOverviewResponse(
        kpis=ConsortiumMetricsDTO(
            total_papers=12,
            total_discussions=28,
            total_decisions=9,
            total_tasks_completed=14,
            total_tasks_in_progress=7,
            tasks_completion_rate=66.7,
            active_researchers=18,
            rag_indexed_chunks=148,
            resolved_annotations_percent=78.5
        ),
        lines_progress=[
            LineAnalyticsDTO(
                id="space-linea1",
                name="Línea 1: Nanocelulosa y Síntesis",
                leader="Dr. Carlos Méndez (UNAM)",
                color="#1e40af",
                advances_count=11,
                papers_count=5,
                decisions_count=4,
                tasks_progress_percent=75
            ),
            LineAnalyticsDTO(
                id="space-linea2",
                name="Línea 2: Biomateriales y Citotoxicidad",
                leader="Dra. Sofía Hernández (UNAM)",
                color="#059669",
                advances_count=9,
                papers_count=4,
                decisions_count=3,
                tasks_progress_percent=62
            ),
            LineAnalyticsDTO(
                id="space-linea3",
                name="Línea 3: Liberación Controlada de Fármacos",
                leader="Dr. Ricardo Valenzuela (UAM)",
                color="#d97706",
                advances_count=8,
                papers_count=3,
                decisions_count=2,
                tasks_progress_percent=58
            )
        ],
        weekly_trend=[
            TimelineActivityDTO(period="Semana 1 (Oct)", advances=3, discussions=5, papers_uploaded=2, decisions_agreed=1),
            TimelineActivityDTO(period="Semana 2 (Oct)", advances=5, discussions=8, papers_uploaded=4, decisions_agreed=2),
            TimelineActivityDTO(period="Semana 3 (Oct)", advances=7, discussions=12, papers_uploaded=3, decisions_agreed=3),
            TimelineActivityDTO(period="Semana 4 (Actual)", advances=9, discussions=16, papers_uploaded=3, decisions_agreed=3)
        ]
    )
