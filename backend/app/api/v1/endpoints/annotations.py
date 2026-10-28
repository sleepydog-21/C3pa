import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/annotations", tags=["Anotaciones y Discusiones Científicas"])


class AuthorDTO(BaseModel):
    id: str
    full_name: str
    academic_title: Optional[str] = None
    avatar_url: Optional[str] = None


class CommentDTO(BaseModel):
    id: str
    annotation_id: str
    parent_comment_id: Optional[str] = None
    author: AuthorDTO
    content: str
    created_at: str
    replies: List["CommentDTO"] = []


class CreateAnnotationRequest(BaseModel):
    resource_id: str
    target_type: str  # "PDF_SELECTION", "IMAGE_REGION", "AUDIO_TIMESTAMP"
    coordinates: Dict[str, Any]
    highlighted_text: Optional[str] = None
    note_content: str


class AddCommentRequest(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None


class AnnotationDTO(BaseModel):
    id: str
    resource_id: str
    author: AuthorDTO
    target_type: str
    coordinates: Dict[str, Any]
    highlighted_text: Optional[str] = None
    note_content: str
    is_resolved: bool = False
    resolved_by: Optional[AuthorDTO] = None
    resolved_at: Optional[str] = None
    comments_count: int = 0
    comments: List[CommentDTO] = []
    created_at: str


# Helper usuario autenticado
async def get_current_user_dummy() -> AuthorDTO:
    return AuthorDTO(
        id="00000000-0000-0000-0000-000000000000",
        full_name="Administrador",
        academic_title="Coordinador General del Consorcio",
        institution_name="Consorcio Científico C3 / Coordinación",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    )


# Almacén en memoria de anotaciones iniciales
mock_annotations_db: Dict[str, Dict[str, Any]] = {
    "ann-pdf-1": {
        "id": "ann-pdf-1",
        "resource_id": "paper-1",
        "author": {
            "id": "u-carlos",
            "full_name": "Dr. Carlos Méndez",
            "academic_title": "Dr. en Ciencias Químicas",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
        },
        "target_type": "PDF_SELECTION",
        "coordinates": {"page": 2, "rects": [[120, 240, 480, 260]]},
        "highlighted_text": "La velocidad de agitación se mantuvo estrictamente en 250 rpm para asegurar la homogeneidad sin inducir cizallamiento celular excesivo.",
        "note_content": "¿Se evaluó si a 300 rpm se incrementa el rendimiento sin degradar la membrana?",
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "comments": [
            {
                "id": "c-1",
                "annotation_id": "ann-pdf-1",
                "parent_comment_id": None,
                "author": {
                    "id": "u-sofia",
                    "full_name": "Dra. Sofía Alarcón",
                    "academic_title": "M.Sc. Biotecnología",
                    "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80"
                },
                "content": "Hicimos una prueba preliminar a 300 rpm y observamos lisis prematura en el 18% del cultivo.",
                "created_at": "2026-10-22T11:20:00Z",
                "replies": [
                    {
                        "id": "c-2",
                        "annotation_id": "ann-pdf-1",
                        "parent_comment_id": "c-1",
                        "author": {
                            "id": "u-carlos",
                            "full_name": "Dr. Carlos Méndez",
                            "academic_title": "Dr. en Ciencias Químicas",
                            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                        },
                        "content": "Entendido. Entonces 250 rpm queda confirmado como el valor óptimo.",
                        "created_at": "2026-10-22T12:05:00Z",
                        "replies": []
                    }
                ]
            }
        ],
        "created_at": "2026-10-22T10:15:00Z"
    },
    "ann-pdf-2": {
        "id": "ann-pdf-2",
        "resource_id": "paper-1",
        "author": {
            "id": "u-ricardo",
            "full_name": "Dr. Ricardo Valenzuela",
            "academic_title": "Dr. en Farmacología",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
        },
        "target_type": "PDF_SELECTION",
        "coordinates": {"page": 3, "rects": [[100, 180, 500, 200]]},
        "highlighted_text": "El tiempo de elución del antibiótico demostró una liberación bifásica durante las primeras 72 horas.",
        "note_content": "Aclaración sobre la cinética de liberación para la solicitud de patente.",
        "is_resolved": True,
        "resolved_by": {
            "id": "00000000-0000-0000-0000-000000000001",
            "full_name": "Dra. Elena Ramos",
            "academic_title": "Investigadora Titular",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
        },
        "resolved_at": "2026-10-23T09:00:00Z",
        "comments": [
            {
                "id": "c-3",
                "annotation_id": "ann-pdf-2",
                "parent_comment_id": None,
                "author": {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "full_name": "Dra. Elena Ramos",
                    "academic_title": "Investigadora Titular",
                    "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                },
                "content": "Se verificó con el asesor legal y la redacción del párrafo cumple con el criterio de novedad.",
                "created_at": "2026-10-23T08:55:00Z",
                "replies": []
            }
        ],
        "created_at": "2026-10-21T16:00:00Z"
    }
}


@router.get("/resource/{resource_id}", response_model=List[AnnotationDTO])
async def get_annotations_by_resource(resource_id: str):
    """Retorna todas las anotaciones de un artículo o recurso con sus comentarios anidados."""
    results = [
        ann for ann in mock_annotations_db.values()
        if ann["resource_id"] == resource_id
    ]

    response_list = []
    for ann in results:
        # Calcular total de comentarios
        total_comments = len(ann.get("comments", []))
        for c in ann.get("comments", []):
            total_comments += len(c.get("replies", []))

        dto = AnnotationDTO(
            id=ann["id"],
            resource_id=ann["resource_id"],
            author=AuthorDTO(**ann["author"]),
            target_type=ann["target_type"],
            coordinates=ann["coordinates"],
            highlighted_text=ann.get("highlighted_text"),
            note_content=ann["note_content"],
            is_resolved=ann.get("is_resolved", False),
            resolved_by=AuthorDTO(**ann["resolved_by"]) if ann.get("resolved_by") else None,
            resolved_at=ann.get("resolved_at"),
            comments_count=total_comments,
            comments=[CommentDTO(**c) for c in ann.get("comments", [])],
            created_at=ann["created_at"]
        )
        response_list.append(dto)

    return response_list


@router.post("", response_model=AnnotationDTO)
async def create_annotation(
    request: CreateAnnotationRequest,
    current_user: AuthorDTO = Depends(get_current_user_dummy)
):
    """Crea una nueva anotación sobre un fragmento de PDF o imagen."""
    new_id = f"ann-{uuid.uuid4().hex[:8]}"
    record = {
        "id": new_id,
        "resource_id": request.resource_id,
        "author": current_user.model_dump(),
        "target_type": request.target_type,
        "coordinates": request.coordinates,
        "highlighted_text": request.highlighted_text,
        "note_content": request.note_content,
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "comments": [],
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    mock_annotations_db[new_id] = record

    return AnnotationDTO(
        **record,
        author=current_user,
        comments_count=0
    )


@router.post("/{annotation_id}/comments", response_model=CommentDTO)
async def add_comment_or_reply(
    annotation_id: str,
    request: AddCommentRequest,
    current_user: AuthorDTO = Depends(get_current_user_dummy)
):
    """
    Agrega un comentario a una anotación o una respuesta anidada a otro comentario.
    """
    if annotation_id not in mock_annotations_db:
        raise HTTPException(status_code=404, detail="Anotación no encontrada.")

    ann = mock_annotations_db[annotation_id]
    new_comment_id = f"c-{uuid.uuid4().hex[:8]}"
    created_at = datetime.utcnow().isoformat() + "Z"

    new_comment = {
        "id": new_comment_id,
        "annotation_id": annotation_id,
        "parent_comment_id": request.parent_comment_id,
        "author": current_user.model_dump(),
        "content": request.content,
        "created_at": created_at,
        "replies": []
    }

    if request.parent_comment_id:
        # Buscar el comentario padre para anidar la respuesta
        found = False
        for c in ann["comments"]:
            if c["id"] == request.parent_comment_id:
                c["replies"].append(new_comment)
                found = True
                break
        if not found:
            ann["comments"].append(new_comment)
    else:
        ann["comments"].append(new_comment)

    return CommentDTO(**new_comment)


@router.patch("/{annotation_id}/resolve", response_model=AnnotationDTO)
async def toggle_resolve_status(
    annotation_id: str,
    current_user: AuthorDTO = Depends(get_current_user_dummy)
):
    """
    Alterna el estado de una duda/anotación entre 'Resuelta' y 'Pendiente'.
    """
    if annotation_id not in mock_annotations_db:
        raise HTTPException(status_code=404, detail="Anotación no encontrada.")

    ann = mock_annotations_db[annotation_id]
    current_state = ann.get("is_resolved", False)
    new_state = not current_state

    ann["is_resolved"] = new_state
    if new_state:
        ann["resolved_by"] = current_user.model_dump()
        ann["resolved_at"] = datetime.utcnow().isoformat() + "Z"
    else:
        ann["resolved_by"] = None
        ann["resolved_at"] = None

    return AnnotationDTO(
        id=ann["id"],
        resource_id=ann["resource_id"],
        author=AuthorDTO(**ann["author"]),
        target_type=ann["target_type"],
        coordinates=ann["coordinates"],
        highlighted_text=ann.get("highlighted_text"),
        note_content=ann["note_content"],
        is_resolved=ann["is_resolved"],
        resolved_by=AuthorDTO(**ann["resolved_by"]) if ann.get("resolved_by") else None,
        resolved_at=ann.get("resolved_at"),
        comments_count=len(ann.get("comments", [])),
        comments=[CommentDTO(**c) for c in ann.get("comments", [])],
        created_at=ann["created_at"]
    )
