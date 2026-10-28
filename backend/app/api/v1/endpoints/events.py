import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.entities import Event, EventParticipant, User, Space

router = APIRouter(prefix="/events", tags=["Calendario y Cronograma Científico"])

ADMIN_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")

async def get_current_user_dummy() -> Dict[str, Any]:
    return {
        "id": ADMIN_USER_ID,
        "full_name": "Administrador",
        "academic_title": "Coordinador General",
        "institution_name": "Consorcio Científico C3 / Coordinación"
    }


class EventCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "MEETING"  # MEETING, SAMPLE_DELIVERY, DEADLINE, CONVOCATORIA
    space_id: Optional[str] = "space-general"
    start_time: str
    end_time: str
    is_all_day: bool = False
    location_or_url: Optional[str] = None
    responsible_name: Optional[str] = "Administrador"


class EventDTO(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    event_type: str
    space_id: Optional[str] = None
    space_name: Optional[str] = "Consorcio General"
    start_time: str
    end_time: str
    is_all_day: bool = False
    location_or_url: Optional[str] = None
    creator_name: str
    responsible_name: Optional[str] = None
    created_at: str


# Eventos semilla en memoria y persistibles en PostgreSQL
mock_events_db: List[Dict[str, Any]] = [
    {
        "id": "evt-1",
        "title": "Entrega de Lote 3B de Nanocelulosa para Citotoxicidad",
        "description": "El laboratorio del Dr. Carlos Méndez (UNAM) envía 5 muestras liofilizadas al equipo de la Dra. Sofía Hernández.",
        "event_type": "SAMPLE_DELIVERY",
        "space_id": "space-linea1",
        "space_name": "Línea 1: Nanocelulosa y Síntesis",
        "start_time": "2026-10-30T10:00:00Z",
        "end_time": "2026-10-30T12:00:00Z",
        "is_all_day": False,
        "location_or_url": "Laboratorio 204, Instituto de Materiales UNAM",
        "creator_name": "Dr. Carlos Méndez",
        "responsible_name": "Dr. Carlos Méndez",
        "created_at": "2026-10-22T09:00:00Z"
    },
    {
        "id": "evt-2",
        "title": "Comité Técnico Mensual: Evaluación de Avances y Acuerdos",
        "description": "Reunión colegiada de coordinación con todos los líderes de línea e investigadores principales.",
        "event_type": "MEETING",
        "space_id": "space-general",
        "space_name": "Consorcio General",
        "start_time": "2026-11-06T16:00:00Z",
        "end_time": "2026-11-06T18:00:00Z",
        "is_all_day": False,
        "location_or_url": "https://meet.consorcio.org/c3-mensual",
        "creator_name": "Administrador",
        "responsible_name": "Administrador",
        "created_at": "2026-10-20T14:30:00Z"
    },
    {
        "id": "evt-3",
        "title": "Fecha Límite: Cierre del Acuerdo DEC-2026-08 (Doxorrubicina 50 nM)",
        "description": "Cierre formal de la calibración espectrofotométrica y carga de gráficos al visor de datos.",
        "event_type": "DEADLINE",
        "space_id": "space-linea2",
        "space_name": "Línea 2: Biomateriales y Citotoxicidad",
        "start_time": "2026-11-15T23:59:00Z",
        "end_time": "2026-11-15T23:59:00Z",
        "is_all_day": True,
        "location_or_url": "Plataforma Conect - Acuerdos",
        "creator_name": "Administrador",
        "responsible_name": "Dra. Elena Ramos",
        "created_at": "2026-10-25T11:00:00Z"
    },
    {
        "id": "evt-4",
        "title": "Apertura de Convocatoria CONAHCYT Proyectos de Frontera",
        "description": "Envío de prepropuesta conjunta interdisciplinaria de biomateriales avanzados.",
        "event_type": "CONVOCATORIA",
        "space_id": "space-general",
        "space_name": "Consorcio General",
        "start_time": "2026-11-28T09:00:00Z",
        "end_time": "2026-11-28T18:00:00Z",
        "is_all_day": True,
        "location_or_url": "Portal Oficial Convocatorias",
        "creator_name": "Administrador",
        "responsible_name": "Administrador",
        "created_at": "2026-10-26T17:00:00Z"
    }
]


@router.get("", response_model=List[EventDTO])
async def list_events(
    space_id: Optional[str] = None,
    event_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """Lista todos los eventos y cronograma del consorcio."""
    events = list(mock_events_db)
    if space_id and space_id != "all":
        events = [e for e in events if e.get("space_id") == space_id or e.get("space_id") == "space-general"]
    if event_type and event_type != "ALL":
        events = [e for e in events if e.get("event_type") == event_type]

    events.sort(key=lambda x: x["start_time"])
    return [EventDTO(**e) for e in events]


@router.post("", response_model=EventDTO)
async def create_event(
    payload: EventCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """Crea un nuevo evento científico en el cronograma."""
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="El título del evento es obligatorio.")

    space_names = {
        "space-general": "Consorcio General",
        "space-linea1": "Línea 1: Nanocelulosa y Síntesis",
        "space-linea2": "Línea 2: Biomateriales y Citotoxicidad",
        "space-linea3": "Línea 3: Liberación Controlada de Fármacos"
    }

    event_id = "evt-" + str(uuid.uuid4())[:8]
    new_event = {
        "id": event_id,
        "title": payload.title.strip(),
        "description": payload.description or "",
        "event_type": payload.event_type,
        "space_id": payload.space_id or "space-general",
        "space_name": space_names.get(payload.space_id or "space-general", "Consorcio General"),
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "is_all_day": payload.is_all_day,
        "location_or_url": payload.location_or_url,
        "creator_name": current_user["full_name"],
        "responsible_name": payload.responsible_name or current_user["full_name"],
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    mock_events_db.append(new_event)

    # Persistir en PostgreSQL si es posible
    try:
        start_dt = datetime.fromisoformat(payload.start_time.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(payload.end_time.replace("Z", "+00:00"))
        db_event = Event(
            id=uuid.uuid4(),
            creator_id=ADMIN_USER_ID,
            title=new_event["title"],
            description=new_event["description"],
            start_time=start_dt,
            end_time=end_dt,
            is_all_day=payload.is_all_day,
            location_or_url=payload.location_or_url
        )
        db.add(db_event)
        await db.commit()
    except Exception:
        pass

    return EventDTO(**new_event)


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """Elimina un evento del cronograma."""
    global mock_events_db
    before = len(mock_events_db)
    mock_events_db = [e for e in mock_events_db if e["id"] != event_id]
    if len(mock_events_db) == before:
        raise HTTPException(status_code=404, detail="Evento no encontrado.")
    return {"message": "Evento eliminado con éxito.", "event_id": event_id}
