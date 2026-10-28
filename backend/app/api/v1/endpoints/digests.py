import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.gpt_service import gpt_service

router = APIRouter(prefix="/digests", tags=["Boletines Semanales Asistidos por IA"])


class GenerateDigestRequest(BaseModel):
    space_id: str = "space-biomed"
    space_name: Optional[str] = "Biomedicina y Oncología Molecular"
    days_back: int = 7


class UpdateDigestRequest(BaseModel):
    summary_markdown: str


class DigestItemDTO(BaseModel):
    id: str
    space_id: str
    space_name: str
    week_start_date: str
    week_end_date: str
    status: str  # "DRAFT", "PUBLISHED"
    metrics: Dict[str, Any]
    summary_markdown: str
    published_by: Optional[str] = None
    published_at: Optional[str] = None
    created_at: str


# Base de datos en memoria para el módulo de digests
MOCK_DIGESTS: List[Dict[str, Any]] = [
    {
        "id": "digest-1",
        "space_id": "space-biomed",
        "space_name": "Biomedicina y Oncología Molecular",
        "week_start_date": "2026-10-13",
        "week_end_date": "2026-10-19",
        "status": "PUBLISHED",
        "metrics": {
            "posts_count": 8,
            "comments_count": 24,
            "resources_count": 3,
            "active_users_count": 14,
            "decisions_count": 2
        },
        "summary_markdown": """# Boletín Semanal C3: Biomedicina y Oncología
**Período:** 13 de Octubre al 19 de Octubre de 2026  
**Línea:** Biomedicina y Oncología Molecular  

---

### 1. Resumen Ejecutivo
Durante la semana se consolidaron los protocolos de extracción celular para nanopartículas de oro dirigidas. Se integraron dos nuevos grupos de trabajo del CINVESTAV y la UNAM, permitiendo acelerar los ensayos de citotoxicidad in vitro con una reducción de ruido estadístico del 35%.

### 2. Avances por Línea
- **Nanovehículos de entrega dirigida:** Concluyó la caracterización fisicoquímica de los lotes BN-04 y BN-05 con índice de polidispersión < 0.12.
- **Microscopía Confocal:** Se cargaron 12 micrografías en alta resolución con anotaciones colaborativas del grupo del Dr. Méndez.

### 3. Acuerdos y Decisiones Clave Formalizadas
- **DEC-2026-08:** Estandarización de concentración de Doxorrubicina a 50 nM para todos los lotes de ensayo conjunto. Responsable: Dra. Elena Ramos.
- **DEC-2026-09:** Fecha de congelamiento de datos experimentales para el manuscrito preliminar: 15 de Noviembre de 2026.

### 4. Nuevos Recursos Indexados en la Biblioteca
1. *Méndez et al.* — "Targeted Gold Nanoparticles in Triple-Negative Breast Cancer: In Vitro Evaluation".
2. Protocolo de Transfección Celular v2.4 (PDF con 8 anotaciones activas).

### 5. Próximos Pasos (Semana en Curso)
- Replicación cruzada de ensayos en laboratorios asociados.
- Revisión de comentarios no resueltos en el manuscrito preliminar.""",
        "published_by": "Dra. Sofía Hernández (Coordinación)",
        "published_at": "2026-10-19T18:00:00Z",
        "created_at": "2026-10-19T10:00:00Z"
    }
]


@router.get("", response_model=List[DigestItemDTO])
@router.get("/", response_model=List[DigestItemDTO])
async def list_digests(space_id: Optional[str] = None):
    """
    Lista todos los boletines semanales generados, con opción de filtro por línea temática.
    """
    if space_id and space_id != "all":
        filtered = [d for d in MOCK_DIGESTS if d["space_id"] == space_id]
        return filtered
    return MOCK_DIGESTS


@router.get("/{digest_id}", response_model=DigestItemDTO)
async def get_digest(digest_id: str):
    """
    Obtiene el detalle completo de un boletín semanal.
    """
    for d in MOCK_DIGESTS:
        if d["id"] == digest_id:
            return d
    raise HTTPException(status_code=404, detail="Boletín no encontrado.")


@router.post("/generate", response_model=DigestItemDTO)
async def generate_digest(req: GenerateDigestRequest):
    """
    Genera un nuevo borrador de boletín semanal asistido por GPT-4o-mini.
    Recopila métricas, publicaciones y decisiones recientes de la línea de investigación.
    """
    today = date.today()
    start_date = today - timedelta(days=req.days_back)
    week_range_str = f"{start_date.strftime('%d/%m/%Y')} al {today.strftime('%d/%m/%Y')}"

    # Recopilación de contexto sintetizado
    metrics = {
        "posts_count": 6,
        "comments_count": 19,
        "resources_count": 2,
        "active_users_count": 11,
        "decisions_count": 1
    }

    mock_discussions = [
        {"topic": "Optimización del pH en dispersión coloidal", "author": "Dr. Fernando Soto", "replies": 7},
        {"topic": "Comparativa de rendimientos espectroscópicos", "author": "Dra. Claudia Morales", "replies": 12}
    ]

    mock_decisions = [
        {"code": "DEC-2026-11", "title": "Aprobación de reactivos de grado analítico para fase 2", "responsible": "Dr. Alejandro Morales"}
    ]

    mock_resources = [
        {"title": "Paper: Síntesis de Nanocelulosa Bacteriana Modificada (2026)", "uploader": "Dra. Sofía Hernández"}
    ]

    try:
        generated_markdown = await gpt_service.generate_weekly_digest(
            space_name=req.space_name or "Consorcio Científico C3",
            week_range=week_range_str,
            metrics=metrics,
            discussions=mock_discussions,
            decisions=mock_decisions,
            resources=mock_resources
        )
    except Exception:
        # Fallback elegante con plantilla estructurada
        generated_markdown = f"""# Boletín Semanal C3: {req.space_name or 'Consorcio C3'}
**Período:** {week_range_str}  
**Línea:** {req.space_name or 'General'}  

---

### 1. Resumen Ejecutivo
Durante la última semana el consorcio mantuvo un ritmo acelerado con {metrics['posts_count']} publicaciones técnicas y {metrics['comments_count']} comentarios especializados, involucrando a {metrics['active_users_count']} investigadores de diversas instituciones aliadas.

### 2. Avances por Tema / Línea
- Intercambio continuo sobre optimización de formulaciones y calibración de instrumental analítico.
- Validación de datos experimentales preliminares en los foros asíncronos.

### 3. Acuerdos y Decisiones Clave
- **DEC-2026-11:** Aprobación de reactivos de grado analítico para la fase 2.

### 4. Nuevos Recursos en Biblioteca
- *Síntesis de Nanocelulosa Bacteriana Modificada (2026)* aportado por Dra. Sofía Hernández.

### 5. Próximos Pasos
- Completar las revisiones pendientes en la biblioteca de papers.
- Consolidar los resultados del ensayo piloto antes de la sesión mensual."""

    new_digest = {
        "id": f"digest-{uuid.uuid4().hex[:8]}",
        "space_id": req.space_id,
        "space_name": req.space_name or "Consorcio Científico C3",
        "week_start_date": start_date.isoformat(),
        "week_end_date": today.isoformat(),
        "status": "DRAFT",
        "metrics": metrics,
        "summary_markdown": generated_markdown,
        "published_by": None,
        "published_at": None,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    MOCK_DIGESTS.insert(0, new_digest)
    return new_digest


@router.put("/{digest_id}", response_model=DigestItemDTO)
async def update_digest(digest_id: str, req: UpdateDigestRequest):
    """
    Permite al coordinador editar el borrador antes de su publicación oficial.
    """
    for d in MOCK_DIGESTS:
        if d["id"] == digest_id:
            d["summary_markdown"] = req.summary_markdown
            return d
    raise HTTPException(status_code=404, detail="Boletín no encontrado.")


@router.post("/{digest_id}/publish", response_model=DigestItemDTO)
async def publish_digest(digest_id: str):
    """
    Publica formalmente el boletín semanal, haciéndolo visible a todos los miembros del consorcio.
    """
    for d in MOCK_DIGESTS:
        if d["id"] == digest_id:
            d["status"] = "PUBLISHED"
            d["published_by"] = "Dra. Sofía Hernández (Coordinación C3)"
            d["published_at"] = datetime.utcnow().isoformat() + "Z"
            return d
    raise HTTPException(status_code=404, detail="Boletín no encontrado.")
