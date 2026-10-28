from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notificaciones Colegiadas"])

class NotificationItem(BaseModel):
    id: str
    recipient_email: str
    actor_name: str
    actor_avatar: str
    action_type: str  # 'mention', 'comment', 'agreement', 'paper_upload', 'deadline'
    title: str
    summary: str
    target_tab: str  # 'library', 'feed', 'decisions', 'calendar', 'viewer'
    target_id: Optional[str] = None
    created_at: str
    is_read: bool = False
    priority: str = "normal"  # 'low', 'normal', 'high'

# Almacén en memoria persistente para la sesión
MOCK_NOTIFICATIONS: List[dict] = [
    {
        "id": "notif-101",
        "recipient_email": "admin@consorcio-c3.org",
        "actor_name": "Dra. Sofía Alarcón",
        "actor_avatar": "👩‍🔬",
        "action_type": "mention",
        "title": "Mención en Debate Metodológico",
        "summary": "Te etiquetó en la discusión sobre los parámetros de intercambio en el modelo GEM de E. coli.",
        "target_tab": "feed",
        "target_id": "thread-1",
        "created_at": "Hace 25 minutos",
        "is_read": False,
        "priority": "high"
    },
    {
        "id": "notif-102",
        "recipient_email": "admin@consorcio-c3.org",
        "actor_name": "Dr. Carlos Méndez",
        "actor_avatar": "👨‍🔬",
        "action_type": "agreement",
        "title": "Nuevo Acuerdo Colegiado C3pa",
        "summary": "Formalizó el acuerdo 'Estandarización de Biomasa en Modelos FBA' en la línea Microbioma Humano.",
        "target_tab": "decisions",
        "target_id": "dec-02",
        "created_at": "Hace 2 horas",
        "is_read": False,
        "priority": "normal"
    },
    {
        "id": "notif-103",
        "recipient_email": "admin@consorcio-c3.org",
        "actor_name": "Dra. Elena Ramos",
        "actor_avatar": "🧬",
        "action_type": "paper_upload",
        "title": "Nuevo Artículo Incorporado",
        "summary": "Subió 'Genome-scale metabolic modeling of microbial communities' para revisión conjunta.",
        "target_tab": "library",
        "target_id": "res-paper-1",
        "created_at": "Ayer, 18:30",
        "is_read": True,
        "priority": "normal"
    },
    {
        "id": "notif-104",
        "recipient_email": "elena.ramos@consorcio-c3.org",
        "actor_name": "Administrador C3pa",
        "actor_avatar": "🏛️",
        "action_type": "deadline",
        "title": "Hito Próximo de Consorcio",
        "summary": "Recordatorio: La fecha límite para el entregable del modelo GEM C3-L1 vence el viernes.",
        "target_tab": "calendar",
        "target_id": "ev-01",
        "created_at": "Hace 4 horas",
        "is_read": False,
        "priority": "high"
    },
    {
        "id": "notif-105",
        "recipient_email": "carlos.mendez@consorcio-c3.org",
        "actor_name": "Dra. Elena Ramos",
        "actor_avatar": "🧬",
        "action_type": "comment",
        "title": "Nueva Respuesta en Anotación",
        "summary": "Respondió a tu duda técnica sobre el balance estequiométrico en la página 4.",
        "target_tab": "library",
        "target_id": "res-paper-2",
        "created_at": "Hace 1 hora",
        "is_read": False,
        "priority": "normal"
    }
]

def _get_user_email(user) -> str:
    if hasattr(user, "email"):
        return user.email
    if isinstance(user, dict):
        return user.get("email", "admin@c3pa.org")
    return "admin@c3pa.org"

@router.get("", response_model=List[NotificationItem])
async def get_user_notifications(
    current_user = Depends(get_current_user),
    only_unread: bool = Query(False, description="Filtrar solo notificaciones no leídas")
):
    """Devuelve las notificaciones dirigidas al usuario autenticado."""
    user_email = _get_user_email(current_user)
    results = [
        n for n in MOCK_NOTIFICATIONS 
        if n["recipient_email"] == user_email or "admin" in user_email
    ]
    if only_unread:
        results = [n for n in results if not n["is_read"]]
    return results

@router.get("/unread-count")
async def get_unread_count(current_user = Depends(get_current_user)):
    """Retorna el número de notificaciones no leídas para la insignia de la campana."""
    user_email = _get_user_email(current_user)
    unread = [
        n for n in MOCK_NOTIFICATIONS 
        if (n["recipient_email"] == user_email or "admin" in user_email) 
        and not n["is_read"]
    ]
    return {"unread_count": len(unread)}

@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """Marca una notificación como leída."""
    for n in MOCK_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["is_read"] = True
            return {"status": "ok", "message": "Notificación marcada como leída", "id": notification_id}
    raise HTTPException(status_code=404, detail="Notificación no encontrada")

@router.post("/mark-all-read")
async def mark_all_as_read(current_user = Depends(get_current_user)):
    """Marca todas las notificaciones del usuario actual como leídas."""
    user_email = _get_user_email(current_user)
    count = 0
    for n in MOCK_NOTIFICATIONS:
        if (n["recipient_email"] == user_email or "admin" in user_email) and not n["is_read"]:
            n["is_read"] = True
            count += 1
    return {"status": "ok", "marked_read": count}
