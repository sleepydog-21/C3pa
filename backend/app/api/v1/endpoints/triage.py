import uuid
import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/triage", tags=["Centro de Triage y Resolución Científica"])

TRIAGE_REGISTRY_FILE = "/app/uploads/triage_registry.json" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../uploads/triage_registry.json"))

class TriageCommentDTO(BaseModel):
    id: str
    author_name: str
    author_avatar: Optional[str] = None
    content: str
    created_at: str

class TriageItemDTO(BaseModel):
    id: str
    item_type: str  # 'MENTION', 'UNRESOLVED_ANNOTATION', 'UNRESOLVED_IMAGE', 'THREAD_QUESTION'
    source_type: str  # 'PDF', 'IMAGE', 'FORUM_POST'
    source_title: str
    resource_id: Optional[str] = None
    target_tab: str  # 'pdf-viewer', 'annotator', 'feed', 'library'
    snippet_quoted: Optional[str] = None
    note_content: str
    author_name: str
    author_avatar: Optional[str] = None
    author_institution: Optional[str] = None
    created_at: str
    is_resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    mentions: List[str] = []
    comments: List[TriageCommentDTO] = []
    action_required: str
    priority: str = "normal"  # 'high', 'normal', 'urgent'

class ReplyTriageRequest(BaseModel):
    content: str
    resolve_after_reply: bool = False

class ResolveTriageRequest(BaseModel):
    resolution_note: Optional[str] = None

# Base de datos inicial de elementos de triage para revisión 1 a 1
MOCK_TRIAGE_ITEMS: Dict[str, Dict[str, Any]] = {
    "triage-1": {
        "id": "triage-1",
        "item_type": "MENTION",
        "source_type": "PDF",
        "source_title": "Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada (2026)",
        "resource_id": "paper-1",
        "target_tab": "pdf-viewer",
        "snippet_quoted": "La cristalinidad relativa se calculó en 78.4% mediante difracción de rayos X (XRD) utilizando la ecuación de Segal.",
        "note_content": "@Elena Ramos y @Carlos Méndez: ¿Verificaron si la cristalinidad fue medida antes o después del secado por punto crítico? Esto afecta la dispersión en agua.",
        "author_name": "Dr. Fernando Soto",
        "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "author_institution": "UAM - Física de Biomateriales",
        "created_at": "2026-10-27T16:30:00Z",
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "mentions": ["@Elena Ramos", "@Carlos Méndez"],
        "comments": [
            {
                "id": "tc-1",
                "author_name": "Dr. Carlos Méndez",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                "content": "Revisé la bitácora: se tomó la muestra liofilizada a -50°C, pero falta que Elena confirme si hubo tratamiento térmico.",
                "created_at": "2026-10-27T18:10:00Z"
            }
        ],
        "action_required": "Confirmar protocolo de secado y cristalografía para publicación final",
        "priority": "high"
    },
    "triage-2": {
        "id": "triage-2",
        "item_type": "UNRESOLVED_IMAGE",
        "source_type": "IMAGE",
        "source_title": "Micrografía SEM: Red Fibrilar de Nanocelulosa (10,000x)",
        "resource_id": "res-img-1",
        "target_tab": "annotator",
        "snippet_quoted": "Región central (39% × 31% del campo visual)",
        "note_content": "Se observa una aglomeración fibrilar anómala en este cuadrante. ¿Corresponde a precipitación de sales del medio HS o a una densidad localizada de nanocelulosa?",
        "author_name": "Dra. Sofía Alarcón",
        "author_avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
        "author_institution": "FacMed UNAM / Biotecnología",
        "created_at": "2026-10-28T10:15:00Z",
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "mentions": ["@Elena Ramos"],
        "comments": [],
        "action_required": "Determinar si se requiere lavado adicional con NaOH o si es red estructural",
        "priority": "urgent"
    },
    "triage-3": {
        "id": "triage-3",
        "item_type": "MENTION",
        "source_type": "FORUM_POST",
        "source_title": "Discusión Técnica: Parámetros del Biorreactor y Medio Hestrin-Schramm",
        "resource_id": "post-1",
        "target_tab": "feed",
        "snippet_quoted": "Biorreactor estabilizado a 28°C y 250 rpm con incremento de 34% en peso seco.",
        "note_content": "@Elena Ramos: Necesitamos tu visto bueno sobre si el volumen de inoculo al 10% v/v es reproducible en el CINVESTAV antes de correr los reactores de 20L.",
        "author_name": "Dr. Carlos Méndez",
        "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "author_institution": "UNAM - Modelado Metabólico",
        "created_at": "2026-10-28T11:45:00Z",
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "mentions": ["@Elena Ramos"],
        "comments": [],
        "action_required": "Validar escala de inóculo bacteriano para corrida mensual",
        "priority": "normal"
    },
    "triage-4": {
        "id": "triage-4",
        "item_type": "UNRESOLVED_ANNOTATION",
        "source_type": "PDF",
        "source_title": "Genome-Scale Metabolic Models of Komagataeibacter xylinus (2026)",
        "resource_id": "paper-2",
        "target_tab": "pdf-viewer",
        "snippet_quoted": "La tasa de secreción de celulosa se restringió mediante la reacción de intercambio EX_bcellulose_e.",
        "note_content": "¿El flujo máximo asignado de 0.85 mmol/gDW/h toma en cuenta la limitación de oxígeno disuelto en condiciones estáticas?",
        "author_name": "Dr. Alejandro Morales",
        "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "author_institution": "Consorcio C3 / Modelado",
        "created_at": "2026-10-26T14:00:00Z",
        "is_resolved": True,
        "resolved_by": "Dra. Elena Ramos",
        "resolved_at": "2026-10-27T09:30:00Z",
        "mentions": [],
        "comments": [
            {
                "id": "tc-4",
                "author_name": "Dra. Elena Ramos",
                "author_avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
                "content": "Se validó con datos experimentales de microaerofilia a 0.72 mmol/gDW/h. Se actualizó el modelo en el procesador.",
                "created_at": "2026-10-27T09:28:00Z"
            }
        ],
        "action_required": "Acuerdo consensuado e incorporado a la simulación",
        "priority": "normal"
    }
}

def load_triage_from_disk():
    global MOCK_TRIAGE_ITEMS
    if os.path.exists(TRIAGE_REGISTRY_FILE):
        try:
            with open(TRIAGE_REGISTRY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    MOCK_TRIAGE_ITEMS.update(data)
        except Exception as e:
            print(f"Error cargando triage_registry: {e}")

def save_triage_to_disk():
    try:
        os.makedirs(os.path.dirname(TRIAGE_REGISTRY_FILE), exist_ok=True)
        with open(TRIAGE_REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(MOCK_TRIAGE_ITEMS, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error guardando triage_registry: {e}")

load_triage_from_disk()


@router.get("/items", response_model=List[TriageItemDTO])
async def list_triage_items(
    status: Optional[str] = "pending",  # 'pending', 'resolved', 'all'
    item_type: Optional[str] = None      # 'MENTION', 'UNRESOLVED_ANNOTATION', 'UNRESOLVED_IMAGE'
):
    """
    Lista todos los elementos del Centro de Triage para revisión 1 en 1.
    """
    items = list(MOCK_TRIAGE_ITEMS.values())

    if status == "pending":
        items = [i for i in items if not i["is_resolved"]]
    elif status == "resolved":
        items = [i for i in items if i["is_resolved"]]

    if item_type and item_type != "all":
        items = [i for i in items if i["item_type"] == item_type]

    # Ordenar: primero los de prioridad 'urgent' y 'high', luego por fecha
    priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
    items.sort(key=lambda x: (priority_order.get(x.get("priority", "normal"), 2), x["created_at"]), reverse=False)

    return [TriageItemDTO(**i) for i in items]


@router.get("/summary")
async def get_triage_summary():
    """
    Retorna métricas rápidas del buzón de triage (pendientes, menciones, resueltas).
    """
    items = list(MOCK_TRIAGE_ITEMS.values())
    pending = [i for i in items if not i["is_resolved"]]
    resolved = [i for i in items if i["is_resolved"]]
    mentions = [i for i in pending if i["item_type"] == "MENTION"]

    return {
        "total_pending": len(pending),
        "total_resolved": len(resolved),
        "direct_mentions_pending": len(mentions),
        "urgent_count": len([i for i in pending if i.get("priority") in ["urgent", "high"]]),
        "status": "inbox_zero" if len(pending) == 0 else "action_required"
    }


@router.post("/{item_id}/resolve", response_model=TriageItemDTO)
async def resolve_triage_item(item_id: str, payload: Optional[ResolveTriageRequest] = None):
    """
    Marca un elemento de triage como consensuado y resuelto por el usuario.
    """
    if item_id not in MOCK_TRIAGE_ITEMS:
        raise HTTPException(status_code=404, detail="Elemento de triage no encontrado.")

    item = MOCK_TRIAGE_ITEMS[item_id]
    item["is_resolved"] = True
    item["resolved_by"] = "Dra. Elena Ramos (Investigadora Titular)"
    item["resolved_at"] = datetime.utcnow().isoformat() + "Z"

    if payload and payload.resolution_note:
        item["comments"].append({
            "id": f"tc-{uuid.uuid4().hex[:6]}",
            "author_name": item["resolved_by"],
            "author_avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
            "content": f"✓ [Duda Resuelta]: {payload.resolution_note}",
            "created_at": datetime.utcnow().isoformat() + "Z"
        })

    save_triage_to_disk()
    return TriageItemDTO(**item)


@router.post("/{item_id}/reply", response_model=TriageItemDTO)
async def reply_triage_item(item_id: str, payload: ReplyTriageRequest):
    """
    Publica una respuesta aclaratoria en el hilo de la mención/duda.
    Opcionalmente puede marcarlo como resuelto al responder.
    """
    if item_id not in MOCK_TRIAGE_ITEMS:
        raise HTTPException(status_code=404, detail="Elemento de triage no encontrado.")

    item = MOCK_TRIAGE_ITEMS[item_id]
    new_comment = {
        "id": f"tc-{uuid.uuid4().hex[:6]}",
        "author_name": "Dra. Elena Ramos (Investigadora Titular)",
        "author_avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
        "content": payload.content.strip(),
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    item["comments"].append(new_comment)

    if payload.resolve_after_reply:
        item["is_resolved"] = True
        item["resolved_by"] = "Dra. Elena Ramos (Investigadora Titular)"
        item["resolved_at"] = datetime.utcnow().isoformat() + "Z"

    save_triage_to_disk()
    return TriageItemDTO(**item)


@router.patch("/{item_id}/reopen", response_model=TriageItemDTO)
async def reopen_triage_item(item_id: str):
    """
    Reabre una duda para continuar el debate colegiado.
    """
    if item_id not in MOCK_TRIAGE_ITEMS:
        raise HTTPException(status_code=404, detail="Elemento de triage no encontrado.")

    item = MOCK_TRIAGE_ITEMS[item_id]
    item["is_resolved"] = False
    item["resolved_by"] = None
    item["resolved_at"] = None
    save_triage_to_disk()
    return TriageItemDTO(**item)
