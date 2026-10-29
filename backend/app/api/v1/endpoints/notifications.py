import os
import json
import uuid
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notificaciones Colegiadas"])

NOTIFICATIONS_REGISTRY_FILE = "/app/uploads/notifications_registry.json" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../uploads/notifications_registry.json"))


class NotificationItem(BaseModel):
    id: str
    recipient_email: str
    actor_name: str
    actor_avatar: str
    action_type: str  # 'mention', 'comment', 'agreement', 'paper_upload', 'deadline'
    title: str
    summary: str
    target_tab: str  # 'library', 'feed', 'decisions', 'calendar', 'pdf-viewer', 'annotator'
    target_id: Optional[str] = None
    created_at: str
    is_read: bool = False
    priority: str = "normal"  # 'low', 'normal', 'high'
    # Campos extendidos para navegación lateral y contexto de mención
    source_location: Optional[str] = None
    snippet_quoted: Optional[str] = None
    comment_text: Optional[str] = None
    is_mention: bool = False
    is_resolved: bool = False
    action_required: Optional[str] = None


class MentionReplyRequest(BaseModel):
    content: str
    resolve_after_reply: bool = False


# Colección de notificaciones iniciales del consorcio
INITIAL_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "notif-m-1",
        "recipient_email": "elena.ramos@consorcio-c3.org",
        "actor_name": "Dr. Fernando Soto",
        "actor_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "action_type": "mention",
        "title": "Te etiquetó en el Paper de Nanocelulosa",
        "summary": "Pregunta de cristalografía: ¿Verificaron si la cristalinidad fue medida antes o después del secado por punto crítico?",
        "target_tab": "pdf-viewer",
        "target_id": "paper-1",
        "created_at": "Hace 15 minutos",
        "is_read": False,
        "priority": "high",
        "source_location": "Artículo PDF: Nanocelulosa Bacteriana (Pág. 2)",
        "snippet_quoted": "La cristalinidad relativa se calculó en 78.4% mediante difracción de rayos X (XRD) utilizando la ecuación de Segal.",
        "comment_text": "@Elena Ramos y @Carlos Méndez: ¿Verificaron si la cristalinidad fue medida antes o después del secado por punto crítico? Esto afecta la dispersión en agua.",
        "is_mention": True,
        "is_resolved": False,
        "action_required": "Aclarar protocolo de secado antes de enviar al journal"
    },
    {
        "id": "notif-m-2",
        "recipient_email": "elena.ramos@consorcio-c3.org",
        "actor_name": "Dra. Sofía Alarcón",
        "actor_avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
        "action_type": "mention",
        "title": "Duda en Micrografía SEM (10,000x)",
        "summary": "Te etiquetó sobre la aglomeración anómala en el cuadrante central.",
        "target_tab": "annotator",
        "target_id": "res-sem-01",
        "created_at": "Hace 40 minutos",
        "is_read": False,
        "priority": "high",
        "source_location": "Micrografía SEM: Red Fibrilar de Nanocelulosa",
        "snippet_quoted": "Región central [X: 39%, Y: 31%, W: 24%, H: 22%]",
        "comment_text": "@Elena Ramos: Se observa una aglomeración fibrilar anómala en este cuadrante. ¿Corresponde a precipitación de sales o densidad local de nanocelulosa?",
        "is_mention": True,
        "is_resolved": False,
        "action_required": "Indicar si se realiza lavado adicional con NaOH o Raman"
    },
    {
        "id": "notif-m-3",
        "recipient_email": "elena.ramos@consorcio-c3.org",
        "actor_name": "Dr. Carlos Méndez",
        "actor_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "action_type": "mention",
        "title": "Solicitud de Visto Bueno en Debate de Biorreactores",
        "summary": "Necesita confirmación sobre si el inóculo al 10% v/v es reproducible en CINVESTAV.",
        "target_tab": "feed",
        "target_id": "post-biorreactores",
        "created_at": "Hace 2 horas",
        "is_read": False,
        "priority": "normal",
        "source_location": "Foro de Investigación: Biorreactores y Medio HS",
        "snippet_quoted": "Prueba de escalamiento a biorreactores de tanque agitado de 20L.",
        "comment_text": "@Elena Ramos: Necesitamos tu visto bueno sobre si el volumen de inóculo al 10% v/v es reproducible en el CINVESTAV antes de correr los reactores de 20L.",
        "is_mention": True,
        "is_resolved": False,
        "action_required": "Dar visto bueno de escalamiento a CINVESTAV"
    },
    {
        "id": "notif-m-4",
        "recipient_email": "elena.ramos@consorcio-c3.org",
        "actor_name": "Dr. Ricardo Valenzuela",
        "actor_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "action_type": "comment",
        "title": "Consulta en tu Paper de Nanovehículos",
        "summary": "Preguntó sobre la concentración micromolar de fármaco en la curva de citotoxicidad.",
        "target_tab": "pdf-viewer",
        "target_id": "paper-2",
        "created_at": "Ayer, 19:40",
        "is_read": True,
        "priority": "normal",
        "source_location": "Artículo PDF: Nanovehículos de Oro (Pág. 4)",
        "snippet_quoted": "La curva de supervivencia celular tras 48h con dosis de 25 a 100 nM.",
        "comment_text": "@Elena: ¿Tienen los triplicados biológicos de la línea MDA-MB-231 para el anexo suplementario?",
        "is_mention": True,
        "is_resolved": True,
        "action_required": "Adjuntar archivos CSV de triplicados al repositorio"
    },
    {
        "id": "notif-102",
        "recipient_email": "admin@consorcio-c3.org",
        "actor_name": "Dr. Carlos Méndez",
        "actor_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "action_type": "agreement",
        "title": "Nuevo Acuerdo Colegiado C3pa",
        "summary": "Formalizó el acuerdo 'Estandarización de Biomasa en Modelos FBA' en la línea Microbioma Humano.",
        "target_tab": "decisions",
        "target_id": "dec-02",
        "created_at": "Hace 3 horas",
        "is_read": False,
        "priority": "normal",
        "source_location": "Módulo de Acuerdos Colegiados",
        "is_mention": False,
        "is_resolved": True
    }
]

notifications_db: List[Dict[str, Any]] = list(INITIAL_NOTIFICATIONS)


def load_notifications_from_disk():
    global notifications_db
    if os.path.exists(NOTIFICATIONS_REGISTRY_FILE):
        try:
            with open(NOTIFICATIONS_REGISTRY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    notifications_db = data
        except Exception as e:
            print(f"Error cargando notifications_registry: {e}")

def save_notifications_to_disk():
    try:
        os.makedirs(os.path.dirname(NOTIFICATIONS_REGISTRY_FILE), exist_ok=True)
        with open(NOTIFICATIONS_REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(notifications_db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error guardando notifications_registry: {e}")

load_notifications_from_disk()


def create_mention_notification(
    recipient_email: str,
    actor_name: str,
    actor_avatar: str,
    comment_text: str,
    target_tab: str,
    target_id: str,
    source_location: str,
    snippet_quoted: Optional[str] = None
) -> Dict[str, Any]:
    """Crea y persiste una notificación de mención personal."""
    notif_id = f"notif-m-{uuid.uuid4().hex[:8]}"
    new_notif = {
        "id": notif_id,
        "recipient_email": recipient_email,
        "actor_name": actor_name,
        "actor_avatar": actor_avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "action_type": "mention",
        "title": f"Mención de {actor_name}",
        "summary": comment_text[:120] + ("..." if len(comment_text) > 120 else ""),
        "target_tab": target_tab,
        "target_id": target_id,
        "created_at": "Hace un momento",
        "is_read": False,
        "priority": "high",
        "source_location": source_location,
        "snippet_quoted": snippet_quoted,
        "comment_text": comment_text,
        "is_mention": True,
        "is_resolved": False,
        "action_required": "Responder o consensuar en el consorcio"
    }
    notifications_db.insert(0, new_notif)
    save_notifications_to_disk()
    return new_notif


def _get_user_email(user) -> str:
    if hasattr(user, "email"):
        return user.email
    if isinstance(user, dict):
        return user.get("email", "admin@c3pa.org")
    return "admin@c3pa.org"


@router.get("", response_model=List[NotificationItem])
async def get_user_notifications(
    current_user = Depends(get_current_user),
    only_unread: bool = Query(False, description="Filtrar solo notificaciones no leídas"),
    only_mentions: bool = Query(False, description="Filtrar solo menciones directas")
):
    """Devuelve las notificaciones dirigidas al usuario autenticado."""
    user_email = _get_user_email(current_user)
    # Usuario por defecto o Elena / Admin ven sus notificaciones
    results = [
        n for n in notifications_db 
        if n.get("recipient_email") == user_email or "admin" in user_email or "elena" in user_email.lower()
    ]
    if only_mentions:
        results = [n for n in results if n.get("is_mention", False)]
    if only_unread:
        results = [n for n in results if not n.get("is_read", False)]
    return results


@router.get("/mentions", response_model=List[NotificationItem])
async def get_user_mentions(
    current_user = Depends(get_current_user)
):
    """
    Retorna exclusivamente los lugares y comentarios donde se etiquetó al usuario
    (@Elena, @Carlos, etc.), estructurados para la navegación lateral (de 1 en 1).
    """
    user_email = _get_user_email(current_user)
    mentions = [
        n for n in notifications_db
        if n.get("is_mention", False) and (
            n.get("recipient_email") == user_email or "admin" in user_email or "elena" in user_email.lower()
        )
    ]
    return mentions


@router.get("/unread-count")
async def get_unread_count(current_user = Depends(get_current_user)):
    """Retorna el número de notificaciones no leídas para la insignia de la campana."""
    user_email = _get_user_email(current_user)
    unread = [
        n for n in notifications_db 
        if (n.get("recipient_email") == user_email or "admin" in user_email or "elena" in user_email.lower()) 
        and not n.get("is_read", False)
    ]
    mentions_unread = [n for n in unread if n.get("is_mention", False)]
    return {
        "unread_count": len(unread),
        "mentions_unread": len(mentions_unread)
    }


@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """Marca una notificación como leída."""
    for n in notifications_db:
        if n["id"] == notification_id:
            n["is_read"] = True
            save_notifications_to_disk()
            return {"status": "ok", "message": "Notificación marcada como leída", "id": notification_id}
    raise HTTPException(status_code=404, detail="Notificación no encontrada")


@router.post("/{notification_id}/resolve")
async def toggle_notification_resolve(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """Alterna el estado resuelto/pendiente de una mención o notificación."""
    for n in notifications_db:
        if n["id"] == notification_id:
            n["is_resolved"] = not n.get("is_resolved", False)
            n["is_read"] = True
            save_notifications_to_disk()
            return {"status": "ok", "id": notification_id, "is_resolved": n["is_resolved"]}
    raise HTTPException(status_code=404, detail="Notificación no encontrada")


@router.post("/{notification_id}/reply")
async def reply_to_mention_notification(
    notification_id: str,
    request: MentionReplyRequest,
    current_user = Depends(get_current_user)
):
    """Responde directamente a una mención desde el centro de notificaciones lateral."""
    for n in notifications_db:
        if n["id"] == notification_id:
            n["is_read"] = True
            if request.resolve_after_reply:
                n["is_resolved"] = True
            save_notifications_to_disk()
            return {
                "status": "ok",
                "message": "Respuesta enviada exitosamente",
                "notification_id": notification_id,
                "reply_content": request.content,
                "is_resolved": n.get("is_resolved", False)
            }
    raise HTTPException(status_code=404, detail="Notificación no encontrada")


@router.post("/mark-all-read")
async def mark_all_as_read(current_user = Depends(get_current_user)):
    """Marca todas las notificaciones del usuario actual como leídas."""
    user_email = _get_user_email(current_user)
    count = 0
    for n in notifications_db:
        if (n.get("recipient_email") == user_email or "admin" in user_email or "elena" in user_email.lower()) and not n.get("is_read", False):
            n["is_read"] = True
            count += 1
    save_notifications_to_disk()
    return {"status": "ok", "marked_read": count}
