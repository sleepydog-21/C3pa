from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/spaces", tags=["Espacios y Líneas de Investigación"])


class MemberDTO(BaseModel):
    id: str
    full_name: str
    academic_title: Optional[str] = None
    avatar_url: Optional[str] = None
    institution_name: Optional[str] = None
    role: str  # "LEADER", "CONTRIBUTOR", "VIEWER"


class SpaceDTO(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    is_private: bool
    leader: Optional[MemberDTO] = None
    members_count: int
    posts_count: int
    color_accent: str


# Base de datos simulada de espacios del consorcio
mock_spaces_db: Dict[str, Dict[str, Any]] = {
    "space-general": {
        "id": "space-general",
        "name": "Consorcio General",
        "slug": "consorcio-general",
        "description": "Espacio transversal para anuncios institucionales, acuerdos globales y avances conjuntos de todos los grupos.",
        "is_private": False,
        "leader": {
            "id": "00000000-0000-0000-0000-000000000001",
            "full_name": "Dra. Elena Ramos",
            "academic_title": "Coordinadora General",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Inst. de Nanotecnología Aplicada",
            "role": "LEADER"
        },
        "members_count": 52,
        "posts_count": 28,
        "color_accent": "#38bdf8"
    },
    "space-nanocelulosa": {
        "id": "space-nanocelulosa",
        "name": "Línea 1: Nanocelulosa y Síntesis",
        "slug": "nanocelulosa-sintesis",
        "description": "Optimización de fermentación con Komagataeibacter xylinus y modificación superficial con nanocompuestos.",
        "is_private": False,
        "leader": {
            "id": "u-carlos",
            "full_name": "Dr. Carlos Méndez",
            "academic_title": "Dr. en Ciencias Químicas",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Centro de Investigaciones en Biomateriales",
            "role": "LEADER"
        },
        "members_count": 18,
        "posts_count": 14,
        "color_accent": "#10b981"
    },
    "space-biomateriales": {
        "id": "space-biomateriales",
        "name": "Línea 2: Biomateriales y Citotoxicidad",
        "slug": "biomateriales-citotoxicidad",
        "description": "Ensayos in vitro con líneas celulares endoteliales y caracterización de biocompatibilidad en andamios 3D.",
        "is_private": False,
        "leader": {
            "id": "u-sofia",
            "full_name": "Dra. Sofía Alarcón",
            "academic_title": "M.Sc. Biotecnología",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Facultad de Medicina y Ciencias de la Salud",
            "role": "LEADER"
        },
        "members_count": 14,
        "posts_count": 11,
        "color_accent": "#f59e0b"
    },
    "space-farmacologia": {
        "id": "space-farmacologia",
        "name": "Línea 3: Farmacología y Liberación",
        "slug": "farmacologia-liberacion",
        "description": "Carga y liberación controlada de antibióticos y analgésicos para aplicaciones dérmicas.",
        "is_private": False,
        "leader": {
            "id": "u-ricardo",
            "full_name": "Dr. Ricardo Valenzuela",
            "academic_title": "Dr. en Farmacología",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Instituto Nacional de Salud Pública",
            "role": "LEADER"
        },
        "members_count": 12,
        "posts_count": 9,
        "color_accent": "#a855f7"
    }
}


@router.get("", response_model=List[SpaceDTO])
async def list_spaces():
    """Lista todos los espacios / líneas de investigación activas en el consorcio."""
    return [SpaceDTO(**s) for s in mock_spaces_db.values()]


@router.get("/{space_id}", response_model=SpaceDTO)
async def get_space_detail(space_id: str):
    """Obtiene el detalle y estadísticas de una línea de investigación específica."""
    if space_id not in mock_spaces_db:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")
    return SpaceDTO(**mock_spaces_db[space_id])
