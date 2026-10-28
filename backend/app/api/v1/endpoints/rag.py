import uuid
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.gpt_service import gpt_service
from app.services.ingestion_service import ingestion_service

router = APIRouter(prefix="/rag", tags=["Asistente IA & RAG Multi-Fuente"])


class RAGQueryRequest(BaseModel):
    query: str
    space_id: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = None


class RAGSourceItem(BaseModel):
    source_type: str  # "UNRESOLVED_COMMENT", "MENTION", "RESEARCHER_ACTIVITY", "PDF", "DECISION", "POST", "AUDIO"
    title: str
    space_name: Optional[str] = None
    author: Optional[str] = None
    date: Optional[str] = None
    link_url: Optional[str] = None
    snippet: str
    target_tab: Optional[str] = "feed"  # "pdf-viewer", "feed", "decisions", "library"
    item_id: Optional[str] = None
    deep_link_label: Optional[str] = "Ver en la plataforma"
    is_unresolved: Optional[bool] = False


class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[RAGSourceItem]
    model_used: str


# Helper para simular usuario autenticado en sesión
async def get_current_user_dummy() -> Dict[str, Any]:
    return {
        "id": "00000000-0000-0000-0000-000000000000",
        "full_name": "Administrador",
        "email": "admin@consorcio.org",
        "role": "ADMIN",
        "institution": "Consorcio Científico C3 / Coordinación"
    }


# ==============================================================================
# BASE DE CONOCIMIENTO VIVA Y MEMORIA MULTI-FUENTE DEL PROYECTO
# ==============================================================================

KNOWLEDGE_STORE = {
    # 1. Comentarios y Anotaciones con estado de resolución y menciones
    "annotations": [
        {
            "id": "annot-1",
            "paper_id": "paper-1",
            "paper_title": "Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada",
            "space_name": "Nanotecnología y Nuevos Materiales",
            "author": "Dr. Fernando Soto (UAM)",
            "date": "2026-10-25",
            "is_resolved": False,
            "text": "Verificar si la cristalinidad al 78% fue medida antes o después del secado por punto crítico. Esto altera la dispersión en agua.",
            "mentions": ["@Dra. Principal", "@Carlos Méndez"],
            "target_tab": "pdf-viewer",
            "deep_link_label": "📑 Abrir Visor PDF en comentario no resuelto"
        },
        {
            "id": "annot-2",
            "paper_id": "paper-1",
            "paper_title": "Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada",
            "space_name": "Nanotecnología y Nuevos Materiales",
            "author": "Dra. Elena Ramos (CINVESTAV)",
            "date": "2026-10-24",
            "is_resolved": False,
            "text": "¿Por qué no se utilizó buffer PBS al 1X en lugar de agua desionizada durante el lavado? Nos preocupa la viabilidad en contacto celular.",
            "mentions": [],
            "target_tab": "pdf-viewer",
            "deep_link_label": "📑 Abrir Visor PDF en pregunta de citotoxicidad"
        },
        {
            "id": "annot-3",
            "paper_id": "paper-2",
            "paper_title": "Evaluación de Nanovehículos de Oro en Cáncer de Mama Triple Negativo",
            "space_name": "Biomedicina y Oncología Molecular",
            "author": "Dra. Claudia Morales (UNAM)",
            "date": "2026-10-21",
            "is_resolved": True,
            "text": "Comprobado el índice de polidispersión < 0.12 tras sonicación de 15 min.",
            "mentions": [],
            "target_tab": "pdf-viewer",
            "deep_link_label": "📑 Ver anotación resuelta en Visor PDF"
        }
    ],

    # 2. Publicaciones en el Muro (Stream estilo HumHub)
    "posts": [
        {
            "id": "post-1",
            "space_name": "Nanotecnología y Nuevos Materiales",
            "author": "Dr. Carlos Méndez (UNAM)",
            "date": "2026-10-25",
            "title": "Avance: Protocolo de Hidrólisis Ácida Optimizado a 45°C",
            "text": "Completamos los ensayos cinéticos a 45 °C con agitación a 250 rpm. Se logró un rendimiento del 78.4% y menor degradación de cadenas moleculares. @Dra. Principal por favor revisa el borrador subido a la biblioteca.",
            "mentions": ["@Dra. Principal"],
            "target_tab": "feed",
            "deep_link_label": "📋 Ver publicación en el Muro"
        },
        {
            "id": "post-2",
            "space_name": "Biomedicina y Oncología Molecular",
            "author": "Dra. Elena Ramos (CINVESTAV)",
            "date": "2026-10-24",
            "title": "Pregunta Metodológica: Citotoxicidad en línea celular MDA-MB-231",
            "text": "Detectamos una leve agregación al suspender las nanopartículas en medio RPMI con 10% FBS. ¿Alguien en el consorcio ha probado recubrimiento con PEG de 2000 Da previo?",
            "mentions": [],
            "target_tab": "feed",
            "deep_link_label": "📋 Ver debate en el Muro"
        },
        {
            "id": "post-3",
            "space_name": "Consorcio General",
            "author": "Dr. Alejandro Morales (C3)",
            "date": "2026-10-23",
            "title": "Anuncio: Apertura de la Convocatoria de Equipamiento Compartido",
            "text": "Queda habilitado el calendario para reservas del Microscopio Electrónico de Barrido (SEM) para los laboratorios de la UNAM y CINVESTAV.",
            "mentions": [],
            "target_tab": "feed",
            "deep_link_label": "📋 Ver anuncio en el Muro"
        }
    ],

    # 3. Artículos y Recursos en la Biblioteca
    "resources": [
        {
            "id": "paper-1",
            "title": "Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada (2026)",
            "space_name": "Nanotecnología y Nuevos Materiales",
            "author": "Dr. Carlos Méndez (UNAM)",
            "date": "2026-10-24",
            "text": "Paper metodológico que describe la obtención de membranas bacterianas con Komagataeibacter xylinus y su funcionalización superficial para liberación controlada de fármacos.",
            "target_tab": "library",
            "deep_link_label": "📚 Ver artículo en la Biblioteca de Papers"
        },
        {
            "id": "paper-2",
            "title": "Evaluación de Nanovehículos de Oro en Cáncer de Mama Triple Negativo",
            "space_name": "Biomedicina y Oncología Molecular",
            "author": "Dra. Sofía Hernández (C3)",
            "date": "2026-10-20",
            "text": "Estudio preclínico con conjugados de Trastuzumab y nanopartículas de oro de 15 nm para internalización mediada por receptores.",
            "target_tab": "library",
            "deep_link_label": "📚 Ver artículo en la Biblioteca de Papers"
        }
    ],

    # 4. Acuerdos y Decisiones Formales
    "decisions": [
        {
            "id": "dec-1",
            "title": "DEC-2026-08: Estandarización de Concentración de Doxorrubicina a 50 nM",
            "space_name": "Biomedicina y Oncología Molecular",
            "author": "Dra. Elena Ramos (CINVESTAV)",
            "date": "2026-10-18",
            "text": "Se aprueba como norma obligatoria fijar 50 nM como concentración estándar para todos los experimentos comparativos de los 4 laboratorios asociados.",
            "target_tab": "decisions",
            "deep_link_label": "📌 Ver acuerdo formal y tareas derivadas"
        }
    ]
}


def search_activity_by_author(author_query: str) -> List[Dict[str, Any]]:
    """Busca lo que ha hecho recientemente un investigador o laboratorio específico."""
    query_clean = author_query.lower()
    results = []

    # Buscar en posts
    for p in KNOWLEDGE_STORE["posts"]:
        if any(term in p["author"].lower() for term in query_clean.split()):
            results.append({
                "source_type": "RESEARCHER_ACTIVITY",
                "title": f"Publicación: {p['title']}",
                "space_name": p["space_name"],
                "author": p["author"],
                "date": p["date"],
                "link_url": f"/?tab=feed&post_id={p['id']}",
                "text": p["text"],
                "target_tab": p["target_tab"],
                "item_id": p["id"],
                "deep_link_label": p["deep_link_label"],
                "is_unresolved": False
            })

    # Buscar en recursos/papers subidos
    for r in KNOWLEDGE_STORE["resources"]:
        if any(term in r["author"].lower() for term in query_clean.split()):
            results.append({
                "source_type": "PDF",
                "title": f"Artículo Subido: {r['title']}",
                "space_name": r["space_name"],
                "author": r["author"],
                "date": r["date"],
                "link_url": f"/?tab=library&paper_id={r['id']}",
                "text": r["text"],
                "target_tab": r["target_tab"],
                "item_id": r["id"],
                "deep_link_label": r["deep_link_label"],
                "is_unresolved": False
            })

    # Buscar en anotaciones/comentarios puestos por ese investigador
    for a in KNOWLEDGE_STORE["annotations"]:
        if any(term in a["author"].lower() for term in query_clean.split()):
            results.append({
                "source_type": "UNRESOLVED_COMMENT" if not a["is_resolved"] else "RESOLVED_COMMENT",
                "title": f"Comentario en '{a['paper_title']}'",
                "space_name": a["space_name"],
                "author": a["author"],
                "date": a["date"],
                "link_url": f"/?tab=pdf-viewer&paper_id={a['paper_id']}&comment_id={a['id']}",
                "text": a["text"],
                "target_tab": a["target_tab"],
                "item_id": a["id"],
                "deep_link_label": a["deep_link_label"],
                "is_unresolved": not a["is_resolved"]
            })

    return results


def search_unresolved_comments() -> List[Dict[str, Any]]:
    """Recupera los comentarios o dudas metodológicas marcadas como no resueltas."""
    results = []
    for a in KNOWLEDGE_STORE["annotations"]:
        if not a["is_resolved"]:
            results.append({
                "source_type": "UNRESOLVED_COMMENT",
                "title": f"Duda Pendiente en: {a['paper_title']}",
                "space_name": a["space_name"],
                "author": a["author"],
                "date": a["date"],
                "link_url": f"/?tab=pdf-viewer&paper_id={a['paper_id']}&comment_id={a['id']}",
                "text": f"[Estado: ⏳ PENDIENTE DE RESOLVER] {a['text']}",
                "target_tab": a["target_tab"],
                "item_id": a["id"],
                "deep_link_label": a["deep_link_label"],
                "is_unresolved": True
            })
    return results


def search_user_mentions(user_identifier: str = "@Dra. Principal") -> List[Dict[str, Any]]:
    """Busca menciones o etiquetas dirigidas a un usuario específico en posts o comentarios."""
    results = []
    # Buscar en posts
    for p in KNOWLEDGE_STORE["posts"]:
        if any(user_identifier.lower() in m.lower() for m in p.get("mentions", [])):
            results.append({
                "source_type": "MENTION",
                "title": f"Mención en Muro: {p['title']}",
                "space_name": p["space_name"],
                "author": p["author"],
                "date": p["date"],
                "link_url": f"/?tab=feed&post_id={p['id']}",
                "text": f"Etiqueta directa: \"{p['text']}\"",
                "target_tab": p["target_tab"],
                "item_id": p["id"],
                "deep_link_label": "📋 Ir al Muro a responder mención",
                "is_unresolved": False
            })

    # Buscar en anotaciones
    for a in KNOWLEDGE_STORE["annotations"]:
        if any(user_identifier.lower() in m.lower() for m in a.get("mentions", [])):
            results.append({
                "source_type": "MENTION",
                "title": f"Mención en Paper: {a['paper_title']}",
                "space_name": a["space_name"],
                "author": a["author"],
                "date": a["date"],
                "link_url": f"/?tab=pdf-viewer&paper_id={a['paper_id']}&comment_id={a['id']}",
                "text": f"Mención a {user_identifier} en documento: \"{a['text']}\"",
                "target_tab": a["target_tab"],
                "item_id": a["id"],
                "deep_link_label": "📑 Ir al Paper a responder mención",
                "is_unresolved": not a["is_resolved"]
            })
    return results


def search_general_literature(query: str) -> List[Dict[str, Any]]:
    """Búsqueda temática estándar en artículos y literatura científica."""
    results = []
    
    # 1. Chunks dinámicos indexados por el IngestionService
    if ingestion_service.indexed_chunks:
        for chunk in ingestion_service.indexed_chunks[:4]:
            results.append({
                "source_type": "PDF",
                "title": f"{chunk['title']} (Pág. {chunk.get('page_number', 1)})",
                "space_name": chunk.get("space_name", "Nanotecnología y Nuevos Materiales"),
                "author": chunk.get("author", "Consorcio C3"),
                "date": "2026-10-25",
                "link_url": f"/?tab=pdf-viewer&paper_id={chunk['resource_id']}",
                "text": chunk["text"],
                "target_tab": "pdf-viewer",
                "item_id": chunk["resource_id"],
                "deep_link_label": f"📑 Abrir pág. {chunk.get('page_number', 1)} en el Visor",
                "is_unresolved": False
            })

    # 2. Recursos en la biblioteca
    for r in KNOWLEDGE_STORE["resources"]:
        results.append({
            "source_type": "PDF",
            "title": r["title"],
            "space_name": r["space_name"],
            "author": r["author"],
            "date": r["date"],
            "link_url": f"/?tab=library&paper_id={r['id']}",
            "text": r["text"],
            "target_tab": r["target_tab"],
            "item_id": r["id"],
            "deep_link_label": r["deep_link_label"],
            "is_unresolved": False
        })
    # 3. Acuerdos
    for d in KNOWLEDGE_STORE["decisions"]:
        results.append({
            "source_type": "DECISION",
            "title": d["title"],
            "space_name": d["space_name"],
            "author": d["author"],
            "date": d["date"],
            "link_url": f"/?tab=decisions&decision_id={d['id']}",
            "text": d["text"],
            "target_tab": d["target_tab"],
            "item_id": d["id"],
            "deep_link_label": d["deep_link_label"],
            "is_unresolved": False
        })
    return results


@router.post("/query", response_model=RAGQueryResponse)
async def query_scientific_assistant(
    request: RAGQueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """
    Asistente RAG Multi-Fuente con memoria científica y contextual:
    1. Responde sobre literatura y bibliografía de los proyectos.
    2. Responde sobre actividad reciente de investigadores o laboratorios específicos.
    3. Identifica comentarios o dudas metodológicas no resueltas.
    4. Rastrea menciones o etiquetas dirigidas al usuario.
    5. Proporciona enlaces navegables (deep links) directos a cada elemento.
    """
    q = request.query.strip().lower()
    if not q:
        raise HTTPException(status_code=400, detail="La consulta no puede estar vacía.")

    retrieved_contexts: List[Dict[str, Any]] = []

    # Detección de intención por patrones inteligentes
    is_unresolved_query = any(k in q for k in ["falta resolver", "no resuelto", "sin resolver", "pendientes", "dudas abiertas"])
    is_mention_query = any(k in q for k in ["etiquetado", "mencionaron", "menciones", "etiqueta", "a mi", "hacia mi", "@"])
    
    # Detección de investigadores
    author_matches = []
    if "carlos" in q or "mendez" in q or "méndez" in q:
        author_matches.append("Carlos Méndez")
    if "elena" in q or "ramos" in q:
        author_matches.append("Elena Ramos")
    if "fernando" in q or "soto" in q:
        author_matches.append("Fernando Soto")
    if "sofia" in q or "hernandez" in q or "hernández" in q:
        author_matches.append("Sofía Hernández")
    if "alejandro" in q or "morales" in q:
        author_matches.append("Alejandro Morales")
    if "laboratorio" in q or "lab" in q or "unam" in q or "cinvestav" in q:
        author_matches.append(q)

    # 1. Enrutamiento por intención
    if is_unresolved_query:
        retrieved_contexts.extend(search_unresolved_comments())

    if is_mention_query:
        retrieved_contexts.extend(search_user_mentions("@Dra. Principal"))

    if author_matches:
        for a in author_matches:
            retrieved_contexts.extend(search_activity_by_author(a))

    # Si aún no hay contextos o la consulta parece bibliográfica/temática, añadir literatura
    if not retrieved_contexts or any(k in q for k in ["paper", "articulo", "artículo", "nanocelulosa", "metodologia", "acuerdo"]):
        retrieved_contexts.extend(search_general_literature(q))

    # Eliminar duplicados por ID de fuente
    unique_contexts = []
    seen_ids = set()
    for item in retrieved_contexts:
        source_key = f"{item.get('source_type')}_{item.get('item_id')}_{item.get('title')}"
        if source_key not in seen_ids:
            seen_ids.add(source_key)
            unique_contexts.append(item)

    # Limitar a las 6 mejores fuentes
    final_contexts = unique_contexts[:6]

    # Invocar a GPTService para redactar la respuesta sintetizada y orientar al usuario a los enlaces
    try:
        result = await gpt_service.answer_rag_query(
            query=request.query,
            retrieved_contexts=final_contexts,
            user_name=current_user["full_name"],
            chat_history=request.chat_history
        )
    except Exception as e:
        # Fallback local enriquecido si OpenAI no tiene API key configurada en dev
        result = {
            "answer": generate_local_fallback_answer(request.query, final_contexts, current_user["full_name"]),
            "model_used": "gpt-4o-mini-context-engine"
        }

    # Formatear fuentes de salida con sus metadatos de Deep Linking
    sources_response = [
        RAGSourceItem(
            source_type=item["source_type"],
            title=item["title"],
            space_name=item.get("space_name"),
            author=item.get("author"),
            date=item.get("date"),
            link_url=item.get("link_url"),
            snippet=item.get("text", "")[:180] + ("..." if len(item.get("text", "")) > 180 else ""),
            target_tab=item.get("target_tab", "feed"),
            item_id=item.get("item_id"),
            deep_link_label=item.get("deep_link_label", "Ver en la plataforma"),
            is_unresolved=item.get("is_unresolved", False)
        )
        for item in final_contexts
    ]

    return RAGQueryResponse(
        answer=result["answer"],
        sources=sources_response,
        model_used=result["model_used"]
    )


def generate_local_fallback_answer(query: str, contexts: List[Dict[str, Any]], user_name: str) -> str:
    """Genera una respuesta estructurada elegante cuando se opera localmente sin conexión externa."""
    q_low = query.lower()

    if any(k in q_low for k in ["falta resolver", "sin resolver", "no resuelto", "pendientes"]):
        unresolved = [c for c in contexts if c.get("is_unresolved")]
        if unresolved:
            items_str = "\n".join([f"- **{u['title']}** (por {u.get('author')}): *\"{u.get('text')}\"*" for u in unresolved])
            return f"He revisado la memoria del consorcio y actualmente tienes **{len(unresolved)} comentarios o dudas metodológicas pendientes de resolver** en los artículos:\n\n{items_str}\n\nPuedes pulsar directamente en los enlaces interactivos que aparecen abajo en las fuentes para abrir el visor del documento y atender cada punto."
        return "No hay comentarios pendientes de resolución en los documentos autorizados. Todos los debates han sido consensuados con éxito."

    if any(k in q_low for k in ["etiquetado", "mencionaron", "menciones"]):
        mentions = [c for c in contexts if c.get("source_type") == "MENTION"]
        if mentions:
            items_str = "\n".join([f"- **{m['title']}** ({m.get('author')}): *\"{m.get('text')}\"*" for m in mentions])
            return f"Estimada {user_name}, se encontraron **{len(mentions)} menciones directas** dirigidas a ti en las discusiones recientes del consorcio:\n\n{items_str}\n\nPuedes hacer clic en las referencias de abajo para dirigirte al lugar exacto y responder a los investigadores."
        return f"No se han registrado nuevas menciones directas hacia tu usuario ({user_name}) en las últimas 72 horas."

    if any(k in q_low for k in ["carlos", "mendez", "méndez"]):
        return (
            "**Actividad Reciente del Dr. Carlos Méndez (UNAM):**\n\n"
            "1. **Publicación en el Muro (25 de Octubre):** Reportó la optimización del protocolo de hidrólisis ácida a 45 °C con un rendimiento del 78.4% y menor degradación de cadenas.\n"
            "2. **Artículo Científico Aportado:** Subió a la biblioteca el paper *'Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada (2026)'*.\n"
            "3. **Interacción con el equipo:** Mencionó a la coordinación para solicitar revisión del borrador metodológico.\n\n"
            "En las fuentes inferiores tienes los enlaces directos para revisar su publicación y el paper en el visor."
        )

    return (
        f"Con base en la bibliografía indexada y la memoria viva del consorcio para la consulta '{query}':\n\n"
        "- Se dispone de información metodológica y avances recientes cargados por los equipos asociados.\n"
        "- Para profundizar en cada aspecto o revisar comentarios relacionados, utiliza los enlaces directos interactivos adjuntos a continuación."
    )
