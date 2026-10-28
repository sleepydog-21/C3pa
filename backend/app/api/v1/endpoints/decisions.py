import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/decisions", tags=["Acuerdos Formales y Tareas"])


class UserMiniDTO(BaseModel):
    id: str
    full_name: str
    academic_title: Optional[str] = None
    avatar_url: Optional[str] = None
    institution_name: Optional[str] = None


class TaskDTO(BaseModel):
    id: str
    decision_id: str
    space_id: str
    title: str
    description: Optional[str] = None
    assigned_to: UserMiniDTO
    status: str  # "TODO", "IN_PROGRESS", "DONE"
    due_date: Optional[str] = None
    created_at: str


class DecisionDTO(BaseModel):
    id: str
    space_id: str
    space_name: str
    title: str
    rationale: str
    status: str  # "PROPOSED", "APPROVED", "SUPERSEDED"
    recorded_by: UserMiniDTO
    origin_discussion_title: Optional[str] = None
    tasks_count: int
    tasks_done_count: int
    tasks: List[TaskDTO] = []
    resolved_at: str


class CreateTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: str
    assigned_to_name: str
    due_date: Optional[str] = None


class CreateDecisionRequest(BaseModel):
    space_id: str
    title: str
    rationale: str
    origin_discussion_title: Optional[str] = None
    initial_tasks: List[CreateTaskRequest] = []


class UpdateTaskStatusRequest(BaseModel):
    status: str  # "TODO", "IN_PROGRESS", "DONE"


# Helper usuario autenticado
async def get_current_user_dummy() -> UserMiniDTO:
    return UserMiniDTO(
        id="00000000-0000-0000-0000-000000000000",
        full_name="Administrador",
        academic_title="Coordinador General",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        institution_name="Consorcio Científico C3 / Coordinación"
    )


# Base de datos simulada de acuerdos y tareas
mock_decisions_db: Dict[str, Dict[str, Any]] = {
    "dec-1": {
        "id": "dec-1",
        "space_id": "space-nanocelulosa",
        "space_name": "Línea 1: Nanocelulosa y Síntesis",
        "title": "Adopción de 250 rpm y 28°C como parámetros estándar de fermentación en biorreactor 5L",
        "rationale": "Los ensayos comparativos a 300 rpm generaron un 18% de lisis celular por cizallamiento. A 250 rpm se obtuvo el rendimiento óptimo de 3.4 g/L sin daño estructural en la red fibrilar.",
        "status": "APPROVED",
        "recorded_by": {
            "id": "u-carlos",
            "full_name": "Dr. Carlos Méndez",
            "academic_title": "Líder Nanocelulosa",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Centro de Investigaciones en Biomateriales"
        },
        "origin_discussion_title": "Discusión sobre velocidad de agitación en artículo de caracterización",
        "tasks": [
            {
                "id": "task-1",
                "decision_id": "dec-1",
                "space_id": "space-nanocelulosa",
                "title": "Actualizar el Protocolo Operativo Estándar (POE) de fermentación en la biblioteca",
                "description": "Subir la versión 2.1 del PDF con los parámetros aprobados.",
                "assigned_to": {
                    "id": "u-carlos",
                    "full_name": "Dr. Carlos Méndez",
                    "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                },
                "status": "DONE",
                "due_date": "2026-10-24",
                "created_at": "2026-10-22T10:00:00Z"
            },
            {
                "id": "task-2",
                "decision_id": "dec-1",
                "space_id": "space-nanocelulosa",
                "title": "Producir lote experimental de 30 discos de membrana para el grupo de citotoxicidad",
                "description": "Entregar muestras acondicionadas y esterilizadas en autoclave.",
                "assigned_to": {
                    "id": "u-carlos",
                    "full_name": "Dr. Carlos Méndez",
                    "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                },
                "status": "IN_PROGRESS",
                "due_date": "2026-10-29",
                "created_at": "2026-10-22T10:00:00Z"
            }
        ],
        "resolved_at": "2026-10-22T12:00:00Z"
    },
    "dec-2": {
        "id": "dec-2",
        "space_id": "space-biomateriales",
        "space_name": "Línea 2: Biomateriales y Citotoxicidad",
        "title": "Sustitución del ensayo MTT por Alamar Blue en matrices de celulosa",
        "rationale": "El formazán insoluble producido en el ensayo MTT queda atrapado mecánicamente en la red porosa de la celulosa, provocando falsos negativos de viabilidad celular. La resazurina en solución líquida resuelve el artefacto de medición.",
        "status": "APPROVED",
        "recorded_by": {
            "id": "u-sofia",
            "full_name": "Dra. Sofía Alarcón",
            "academic_title": "Líder Biomateriales",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Facultad de Medicina y Ciencias de la Salud"
        },
        "origin_discussion_title": "Pregunta Metodológica en el Muro Social sobre absorbancia de formazán",
        "tasks": [
            {
                "id": "task-3",
                "decision_id": "dec-2",
                "space_id": "space-biomateriales",
                "title": "Adquirir kit de reactivo Resazurina / Alamar Blue para los 3 laboratorios asociados",
                "description": "Coordinar compra centralizada con el presupuesto del consorcio.",
                "assigned_to": {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "full_name": "Dra. Elena Ramos",
                    "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                },
                "status": "TODO",
                "due_date": "2026-10-31",
                "created_at": "2026-10-25T15:00:00Z"
            }
        ],
        "resolved_at": "2026-10-25T15:00:00Z"
    }
}


@router.get("", response_model=List[DecisionDTO])
@router.get("/", response_model=List[DecisionDTO])
@router.get("/space/{space_id}", response_model=List[DecisionDTO])
@router.get("/spaces/{space_id}", response_model=List[DecisionDTO])
async def list_decisions(space_id: Optional[str] = None):
    """Retorna los acuerdos formales del consorcio con sus tareas derivadas y avance."""
    decisions = list(mock_decisions_db.values())
    if space_id and space_id != "all":
        decisions = [d for d in decisions if d["space_id"] == space_id]

    results = []
    for d in decisions:
        tasks_list = [TaskDTO(**t) for t in d.get("tasks", [])]
        tasks_done = len([t for t in tasks_list if t.status == "DONE"])
        dto = DecisionDTO(
            id=d["id"],
            space_id=d["space_id"],
            space_name=d["space_name"],
            title=d["title"],
            rationale=d["rationale"],
            status=d["status"],
            recorded_by=UserMiniDTO(**d["recorded_by"]),
            origin_discussion_title=d.get("origin_discussion_title"),
            tasks_count=len(tasks_list),
            tasks_done_count=tasks_done,
            tasks=tasks_list,
            resolved_at=d["resolved_at"]
        )
        results.append(dto)

    results.sort(key=lambda x: x.resolved_at, reverse=True)
    return results


@router.post("", response_model=DecisionDTO)
async def create_decision(
    request: CreateDecisionRequest,
    current_user: UserMiniDTO = Depends(get_current_user_dummy)
):
    """Formaliza un nuevo acuerdo consensuado y genera sus tareas derivadas."""
    space_names = {
        "space-general": "Consorcio General",
        "space-nanocelulosa": "Línea 1: Nanocelulosa y Síntesis",
        "space-biomateriales": "Línea 2: Biomateriales y Citotoxicidad",
        "space-farmacologia": "Línea 3: Farmacología y Liberación"
    }
    space_name = space_names.get(request.space_id, "Línea de Investigación")
    new_dec_id = f"dec-{uuid.uuid4().hex[:8]}"

    tasks_records = []
    now_iso = datetime.utcnow().isoformat() + "Z"

    for t in request.initial_tasks:
        task_id = f"task-{uuid.uuid4().hex[:8]}"
        tasks_records.append({
            "id": task_id,
            "decision_id": new_dec_id,
            "space_id": request.space_id,
            "title": t.title,
            "description": t.description,
            "assigned_to": {
                "id": t.assigned_to_id,
                "full_name": t.assigned_to_name,
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            },
            "status": "TODO",
            "due_date": t.due_date,
            "created_at": now_iso
        })

    record = {
        "id": new_dec_id,
        "space_id": request.space_id,
        "space_name": space_name,
        "title": request.title,
        "rationale": request.rationale,
        "status": "APPROVED",
        "recorded_by": current_user.model_dump(),
        "origin_discussion_title": request.origin_discussion_title,
        "tasks": tasks_records,
        "resolved_at": now_iso
    }

    mock_decisions_db[new_dec_id] = record

    tasks_dto = [TaskDTO(**t) for t in tasks_records]
    return DecisionDTO(
        id=new_dec_id,
        space_id=request.space_id,
        space_name=space_name,
        title=request.title,
        rationale=request.rationale,
        status="APPROVED",
        recorded_by=current_user,
        origin_discussion_title=request.origin_discussion_title,
        tasks_count=len(tasks_dto),
        tasks_done_count=0,
        tasks=tasks_dto,
        resolved_at=now_iso
    )


@router.patch("/tasks/{task_id}/status", response_model=TaskDTO)
async def update_task_status(
    task_id: str,
    request: UpdateTaskStatusRequest
):
    """Actualiza el estado de una tarea derivada de un acuerdo (TODO, IN_PROGRESS, DONE)."""
    for d in mock_decisions_db.values():
        for t in d.get("tasks", []):
            if t["id"] == task_id:
                t["status"] = request.status.upper()
                return TaskDTO(**t)

    raise HTTPException(status_code=404, detail="Tarea no encontrada.")
