import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/posts", tags=["Muro Social y Publicaciones"])


class AuthorDTO(BaseModel):
    id: str
    full_name: str
    academic_title: Optional[str] = None
    avatar_url: Optional[str] = None
    institution_name: Optional[str] = None


class PostCommentDTO(BaseModel):
    id: str
    post_id: str
    author: AuthorDTO
    content_markdown: str
    created_at: str


class PostDTO(BaseModel):
    id: str
    space_id: str
    space_name: str
    author: AuthorDTO
    title: str
    content_markdown: str
    post_type: str  # "ADVANCE", "QUESTION", "ANNOUNCEMENT", "GENERAL"
    reactions: Dict[str, int]  # {"interesting": 4, "validated": 2, "key_idea": 3}
    user_reacted: List[str] = []
    comments_count: int
    comments: List[PostCommentDTO] = []
    created_at: str


class CreatePostRequest(BaseModel):
    space_id: str
    title: str
    content_markdown: str
    post_type: str = "ADVANCE"


class AddPostCommentRequest(BaseModel):
    content_markdown: str


class ReactionRequest(BaseModel):
    reaction_type: str  # "interesting", "key_idea", "validated"


# Helper usuario autenticado
async def get_current_user_dummy() -> AuthorDTO:
    return AuthorDTO(
        id="00000000-0000-0000-0000-000000000000",
        full_name="Administrador",
        academic_title="Coordinador General del Consorcio",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        institution_name="Consorcio Científico C3 / Coordinación"
    )


import os
import json

POSTS_REGISTRY_FILE = "/app/uploads/posts_registry.json" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../uploads/posts_registry.json"))

# Muro simulado con publicaciones científicas
mock_posts_db: Dict[str, Dict[str, Any]] = {
    "post-1": {
        "id": "post-1",
        "space_id": "space-nanocelulosa",
        "space_name": "Línea 1: Nanocelulosa y Síntesis",
        "author": {
            "id": "u-carlos",
            "full_name": "Dr. Carlos Méndez",
            "academic_title": "Dr. en Ciencias Químicas",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Centro de Investigaciones en Biomateriales"
        },
        "title": "Avance Semanal: Estandarización del medio de cultivo HS a escala 5L",
        "content_markdown": "Estimados colegas, logramos estabilizar el biorreactor a 28°C y 250 rpm de agitación. La producción de membrana celulósica se incrementó en un **34% en peso seco** respecto al lote piloto anterior. Dejamos el protocolo detallado en la biblioteca para que el grupo de biocompatibilidad pueda iniciar los ensayos el próximo lunes.",
        "post_type": "ADVANCE",
        "reactions": {"interesting": 6, "validated": 4, "key_idea": 2},
        "user_reacted": ["interesting"],
        "comments_count": 2,
        "comments": [
            {
                "id": "pc-1",
                "post_id": "post-1",
                "author": {
                    "id": "u-sofia",
                    "full_name": "Dra. Sofía Alarcón",
                    "academic_title": "M.Sc. Biotecnología",
                    "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
                    "institution_name": "Facultad de Medicina y Ciencias de la Salud"
                },
                "content_markdown": "¡Excelente resultado Carlos! Ya tenemos listas las placas de 24 pozos para evaluar proliferación celular en cuanto nos entreguen los discos de muestra.",
                "created_at": "2026-10-26T10:30:00Z"
            },
            {
                "id": "pc-2",
                "post_id": "post-1",
                "author": {
                    "id": "u-ricardo",
                    "full_name": "Dr. Ricardo Valenzuela",
                    "academic_title": "Dr. en Farmacología",
                    "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
                    "institution_name": "Instituto Nacional de Salud Pública"
                },
                "content_markdown": "¿Midieron el espesor promedio de la película hidratada? Nos interesa para calcular la capacidad de carga del fármaco.",
                "created_at": "2026-10-26T11:15:00Z"
            }
        ],
        "created_at": "2026-10-26T09:00:00Z"
    },
    "post-2": {
        "id": "post-2",
        "space_id": "space-general",
        "space_name": "Consorcio General",
        "author": {
            "id": "00000000-0000-0000-0000-000000000001",
            "full_name": "Dra. Elena Ramos",
            "academic_title": "Coordinadora General",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Inst. de Nanotecnología Aplicada"
        },
        "title": "📢 Convocatoria: Cierre del primer hito trimestral y compilación de boletín",
        "content_markdown": "Recordatorio a todos los líderes de línea y socios colaboradores: el próximo viernes generaremos el **Boletín Consolidado con el Asistente IA**. Por favor asegúrense de registrar sus acuerdos y subir los papers y fotografías experimentales correspondientes a este período.",
        "post_type": "ANNOUNCEMENT",
        "reactions": {"interesting": 8, "validated": 5, "key_idea": 1},
        "user_reacted": ["validated"],
        "comments_count": 1,
        "comments": [
            {
                "id": "pc-3",
                "post_id": "post-2",
                "author": {
                    "id": "u-carlos",
                    "full_name": "Dr. Carlos Méndez",
                    "academic_title": "Dr. en Ciencias Químicas",
                    "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                    "institution_name": "Centro de Investigaciones en Biomateriales"
                },
                "content_markdown": "Enterado Elena, nuestra línea tiene 3 acuerdos consensuados y 2 tareas listas para el reporte.",
                "created_at": "2026-10-25T16:00:00Z"
            }
        ],
        "created_at": "2026-10-25T14:00:00Z"
    },
    "post-3": {
        "id": "post-3",
        "space_id": "space-biomateriales",
        "space_name": "Línea 2: Biomateriales y Citotoxicidad",
        "author": {
            "id": "u-sofia",
            "full_name": "Dra. Sofía Alarcón",
            "academic_title": "M.Sc. Biotecnología",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Facultad de Medicina y Ciencias de la Salud"
        },
        "title": "❓ Pregunta Metodológica: Ensayo MTT vs Azul de Alamar en muestras de alta absorción",
        "content_markdown": "¿Alguien del grupo ha comparado la lectura de absorbancia con formazán en matrices porosas de celulosa? Notamos que el formazán insoluble tiende a atraparse mecánicamente en la red fibrilar, distorsionando la lectura del espectrofotómetro. Sugiero evaluar resazurina (Alamar Blue) para medir fluorescencia en medio líquido directo.",
        "post_type": "QUESTION",
        "reactions": {"interesting": 5, "validated": 2, "key_idea": 7},
        "user_reacted": ["key_idea"],
        "comments_count": 0,
        "comments": [],
        "created_at": "2026-10-24T18:20:00Z"
    }
}


def load_posts_from_disk():
    global mock_posts_db
    if os.path.exists(POSTS_REGISTRY_FILE):
        try:
            with open(POSTS_REGISTRY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    mock_posts_db.update(data)
        except Exception as e:
            print(f"Error cargando posts_registry: {e}")

def save_posts_to_disk():
    try:
        os.makedirs(os.path.dirname(POSTS_REGISTRY_FILE), exist_ok=True)
        with open(POSTS_REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(mock_posts_db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error guardando posts_registry: {e}")

load_posts_from_disk()


@router.get("", response_model=List[PostDTO])
@router.get("/", response_model=List[PostDTO])
@router.get("/feed", response_model=List[PostDTO])
async def get_stream_feed(space_id: Optional[str] = None):
    """
    Retorna el flujo de publicaciones del muro social (Stream estilo HumHub).
    Si se especifica space_id, filtra por esa línea; si no, retorna el feed unificado.
    """
    posts = list(mock_posts_db.values())
    if space_id and space_id != "all":
        posts = [p for p in posts if p["space_id"] == space_id]

    posts.sort(key=lambda p: p["created_at"], reverse=True)
    return [PostDTO(**p) for p in posts]


@router.post("", response_model=PostDTO)
async def create_post(
    request: CreatePostRequest,
    current_user: AuthorDTO = Depends(get_current_user_dummy)
):
    """Crea una nueva publicación en el muro del espacio seleccionado."""
    space_name_map = {
        "space-general": "Consorcio General",
        "space-nanocelulosa": "Línea 1: Nanocelulosa y Síntesis",
        "space-biomateriales": "Línea 2: Biomateriales y Citotoxicidad",
        "space-farmacologia": "Línea 3: Farmacología y Liberación"
    }
    space_name = space_name_map.get(request.space_id, "Línea de Investigación")

    new_post_id = f"post-{uuid.uuid4().hex[:8]}"
    post_record = {
        "id": new_post_id,
        "space_id": request.space_id,
        "space_name": space_name,
        "author": current_user.model_dump(),
        "title": request.title,
        "content_markdown": request.content_markdown,
        "post_type": request.post_type.upper(),
        "reactions": {"interesting": 0, "validated": 0, "key_idea": 0},
        "user_reacted": [],
        "comments_count": 0,
        "comments": [],
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    mock_posts_db[new_post_id] = post_record
    save_posts_to_disk()
    return PostDTO(**post_record)


@router.post("/{post_id}/comments", response_model=PostCommentDTO)
async def add_post_comment(
    post_id: str,
    request: AddPostCommentRequest,
    current_user: AuthorDTO = Depends(get_current_user_dummy)
):
    """Agrega un comentario a una publicación del muro."""
    if post_id not in mock_posts_db:
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    post = mock_posts_db[post_id]
    comment_id = f"pc-{uuid.uuid4().hex[:8]}"
    comment_record = {
        "id": comment_id,
        "post_id": post_id,
        "author": current_user.model_dump(),
        "content_markdown": request.content_markdown,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    post["comments"].append(comment_record)
    post["comments_count"] = len(post["comments"])
    save_posts_to_disk()

    return PostCommentDTO(**comment_record)


@router.post("/{post_id}/reactions")
async def toggle_post_reaction(
    post_id: str,
    request: ReactionRequest,
    current_user: AuthorDTO = Depends(get_current_user_dummy)
):
    """Alterna una reacción científica en la publicación (interesting, validated, key_idea)."""
    if post_id not in mock_posts_db:
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    post = mock_posts_db[post_id]
    r_type = request.reaction_type.lower()
    if r_type not in post["reactions"]:
        post["reactions"][r_type] = 0

    if r_type in post["user_reacted"]:
        post["user_reacted"].remove(r_type)
        post["reactions"][r_type] = max(0, post["reactions"][r_type] - 1)
    else:
        post["user_reacted"].append(r_type)
        post["reactions"][r_type] += 1

    return {
        "reactions": post["reactions"],
        "user_reacted": post["user_reacted"]
    }
