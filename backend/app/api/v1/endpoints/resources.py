import uuid
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services.storage_service import storage_service
from app.services.gpt_service import gpt_service
from app.services.ingestion_service import ingestion_service

router = APIRouter(prefix="/resources", tags=["Recursos Científicos"])

# Tipos MIME permitidos
ALLOWED_PDF_MIMES = ["application/pdf"]
ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/tiff"]
ALLOWED_AUDIO_MIMES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg", "audio/webm"]


class UploaderInfo(BaseModel):
    id: str
    full_name: str
    academic_title: Optional[str] = None
    avatar_url: Optional[str] = None
    institution_name: Optional[str] = None


class ResourceResponse(BaseModel):
    id: str
    space_id: str
    uploader: UploaderInfo
    title: str
    resource_type: str
    storage_path: str
    mime_type: str
    file_size: int
    metadata: Dict[str, Any]
    comments_count: int = 0
    has_unread_comments: bool = False
    unread_comments_count: int = 0
    transcript: Optional[str] = None
    indexing_status: Optional[str] = "READY"  # "PROCESSING", "READY", "FAILED"
    chunks_count: Optional[int] = 0
    created_at: str


class BatchUploadResponse(BaseModel):
    total: int
    uploaded_count: int
    duplicates_skipped: int = 0
    duplicate_titles: List[str] = []
    resources: List[ResourceResponse]


def find_duplicate_resource(space_id: str, checksum: Optional[str], doi: Optional[str], title: str) -> Optional[Dict[str, Any]]:
    """Detecta si un artículo científico ya fue subido por checksum, DOI o similitud de título."""
    norm_title = (title or "").strip().lower()
    clean_doi = (doi or "").strip().lower() if doi else None

    for res in mock_resources_db.values():
        if res.get("space_id") != space_id:
            continue
        # 1. Mismo checksum de archivo exacto
        if checksum and res.get("checksum") == checksum:
            return res
        # 2. Mismo DOI científico
        res_doi = (res.get("metadata", {}).get("doi") or "").strip().lower()
        if clean_doi and len(clean_doi) > 6 and clean_doi == res_doi:
            return res
        # 3. Mismo título representativo
        res_title = (res.get("title") or "").strip().lower()
        if norm_title and res_title and (norm_title == res_title or (len(norm_title) > 25 and (norm_title in res_title or res_title in norm_title))):
            return res
    return None


def clean_all_duplicates_in_db() -> int:
    """Detecta y elimina automáticamente los recursos duplicados existentes."""
    seen_checksums = set()
    seen_dois = set()
    seen_titles = set()
    to_delete = []

    for res_id, res in list(mock_resources_db.items()):
        checksum = res.get("checksum")
        doi = (res.get("metadata", {}).get("doi") or "").strip().lower()
        title = (res.get("title") or "").strip().lower()

        is_dup = False
        if checksum and checksum in seen_checksums:
            is_dup = True
        elif doi and len(doi) > 6 and doi in seen_dois:
            is_dup = True
        elif title and len(title) > 20 and title in seen_titles:
            is_dup = True

        if is_dup:
            to_delete.append(res_id)
        else:
            if checksum:
                seen_checksums.add(checksum)
            if doi and len(doi) > 6:
                seen_dois.add(doi)
            if title:
                seen_titles.add(title)

    for rid in to_delete:
        del mock_resources_db[rid]
        ingestion_service.remove_chunks_for_resource(rid)

    save_registry_to_disk()
    return len(to_delete)


async def get_current_user_dummy() -> Dict[str, Any]:
    return {
        "id": "00000000-0000-0000-0000-000000000000",
        "full_name": "Administrador",
        "academic_title": "Coordinador General del Consorcio",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "institution_name": "Consorcio Científico C3 / Coordinación",
        "role": "ADMIN"
    }


import os

REGISTRY_FILE = "/app/uploads/resources_registry.json" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../uploads/resources_registry.json"))

def save_registry_to_disk():
    try:
        os.makedirs(os.path.dirname(REGISTRY_FILE), exist_ok=True)
        with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(mock_resources_db, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error guardando registro de recursos: {e}")

def load_registry_from_disk() -> Dict[str, Dict[str, Any]]:
    if os.path.exists(REGISTRY_FILE):
        try:
            with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and len(data) > 0:
                    return data
        except Exception as e:
            print(f"Error cargando registro de recursos: {e}")
    return {}

mock_resources_db: Dict[str, Dict[str, Any]] = load_registry_from_disk()
if not mock_resources_db:
    mock_resources_db = {
    "paper-1": {
        "id": "paper-1",
        "space_id": "space-general",
        "uploader": {
            "id": "u-carlos",
            "full_name": "Dr. Carlos Méndez",
            "academic_title": "Dr. en Ciencias Químicas",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Centro de Investigaciones en Biomateriales"
        },
        "title": "Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada",
        "resource_type": "PDF",
        "storage_path": "space-general/pdf/nanocelulosa_2026.pdf",
        "mime_type": "application/pdf",
        "file_size": 3450000,
        "metadata": {
            "authors": "C. Méndez, E. Ramos, F. Soto",
            "doi": "10.1016/j.biomaterials.2026.119842",
            "tags": ["Nanocelulosa", "Biomateriales", "Caracterización"],
            "thumbnail_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80"
        },
        "comments_count": 8,
        "has_unread_comments": True,
        "unread_comments_count": 3,
        "transcript": None,
        "indexing_status": "READY",
        "chunks_count": 14,
        "created_at": "2026-10-22T09:15:00Z"
    },
    "paper-2": {
        "id": "paper-2",
        "space_id": "space-general",
        "uploader": {
            "id": "u-sofia",
            "full_name": "Dra. Sofía Alarcón",
            "academic_title": "M.Sc. Biotecnología Médica",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Facultad de Medicina y Ciencias de la Salud"
        },
        "title": "Evaluación de Citotoxicidad Celular en Andamios Porosos 3D",
        "resource_type": "PDF",
        "storage_path": "space-general/pdf/citotoxicidad_andamios.pdf",
        "mime_type": "application/pdf",
        "file_size": 5200000,
        "metadata": {
            "authors": "S. Alarcón, G. Vargas",
            "doi": "10.1038/s41598-026-30219-4",
            "tags": ["Ensayos Clínicos", "Biomateriales", "Metodología"],
            "thumbnail_url": "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80"
        },
        "comments_count": 4,
        "has_unread_comments": False,
        "unread_comments_count": 0,
        "transcript": None,
        "indexing_status": "READY",
        "chunks_count": 18,
        "created_at": "2026-10-21T14:40:00Z"
    },
    "paper-3": {
        "id": "paper-3",
        "space_id": "space-general",
        "uploader": {
            "id": "u-ricardo",
            "full_name": "Dr. Ricardo Valenzuela",
            "academic_title": "Dr. en Farmacología",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
            "institution_name": "Instituto Nacional de Salud Pública"
        },
        "title": "Protocolo Estandarizado de Liberación Controlada de Fármacos",
        "resource_type": "PDF",
        "storage_path": "space-general/pdf/protocolo_liberacion.pdf",
        "mime_type": "application/pdf",
        "file_size": 2100000,
        "metadata": {
            "authors": "R. Valenzuela, P. Morales",
            "doi": "10.1002/jbm.a.37210",
            "tags": ["Metodología", "Farmacología"],
            "thumbnail_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80"
        },
        "comments_count": 12,
        "has_unread_comments": True,
        "unread_comments_count": 5,
        "transcript": None,
        "indexing_status": "READY",
        "chunks_count": 9,
        "created_at": "2026-10-19T11:00:00Z"
    }
}


class MetadataExtractionResponse(BaseModel):
    title: str
    authors: str
    doi: Optional[str] = None
    tags: List[str] = []
    abstract: Optional[str] = None
    extraction_mode: str = "AI_LLM"


@router.post("/extract-metadata", response_model=MetadataExtractionResponse)
async def extract_pdf_metadata(file: UploadFile = File(...)):
    """
    Analiza la primera página de un artículo en PDF y detecta automáticamente
    título, autores, DOI, palabras clave y resumen sintético.
    """
    content = await file.read()
    metadata = await ingestion_service.extract_paper_metadata(content)
    return MetadataExtractionResponse(**metadata)


@router.post("/upload", response_model=ResourceResponse)
async def upload_resource(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    resource_type: str = Form(...),
    space_id: str = Form(...),
    post_id: Optional[str] = Form(None),
    metadata_json: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """
    Sube un artículo (PDF), fotografía científica o nota de voz.
    Si no se envía título o autores para un PDF, se auto-detectan automáticamente.
    """
    resource_type_upper = resource_type.upper()
    mime_type = file.content_type or "application/octet-stream"

    # Parsear metadatos
    parsed_metadata = {}
    if metadata_json:
        try:
            parsed_metadata = json.loads(metadata_json)
        except Exception:
            parsed_metadata = {"raw": metadata_json}

    # Si es PDF y no tiene thumbnail, asignar thumbnail representativo de primera página
    if resource_type_upper == "PDF" and "thumbnail_url" not in parsed_metadata:
        parsed_metadata["thumbnail_url"] = "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80"

    try:
        relative_path, file_size, checksum = await storage_service.save_file(
            upload_file=file,
            space_id=space_id,
            resource_type=resource_type_upper
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir archivo: {str(e)}")

    # Auto-detección inteligente de metadatos para PDFs si faltan campos
    if resource_type_upper == "PDF":
        abs_path = storage_service.get_absolute_path(relative_path)
        auto_meta = await ingestion_service.extract_paper_metadata(abs_path)
        if not title or not title.strip() or title == file.filename:
            title = auto_meta.get("title") or file.filename or "Artículo Científico"
        if "authors" not in parsed_metadata and auto_meta.get("authors"):
            parsed_metadata["authors"] = auto_meta["authors"]
        if "doi" not in parsed_metadata and auto_meta.get("doi"):
            parsed_metadata["doi"] = auto_meta["doi"]
        if "tags" not in parsed_metadata and auto_meta.get("tags"):
            parsed_metadata["tags"] = auto_meta["tags"]
        if "abstract" not in parsed_metadata and auto_meta.get("abstract"):
            parsed_metadata["abstract"] = auto_meta["abstract"]
        parsed_metadata["extraction_mode"] = auto_meta.get("extraction_mode", "HEURISTIC")
    else:
        title = title or file.filename or "Recurso Científico"

    resource_id = str(uuid.uuid4())
    transcript_text = None

    if resource_type_upper == "AUDIO":
        try:
            abs_path = storage_service.get_absolute_path(relative_path)
            with open(abs_path, "rb") as f:
                content = f.read()
            whisper_result = await gpt_service.transcribe_audio(content, filename=file.filename or "audio.mp3")
            transcript_text = whisper_result.get("text", "")
            parsed_metadata["audio_duration"] = whisper_result.get("duration")
            parsed_metadata["audio_segments"] = whisper_result.get("segments", [])
        except Exception as e:
            transcript_text = f"[Transcripción en cola: {str(e)}]"

    uploader_info = {
        "id": current_user["id"],
        "full_name": current_user["full_name"],
        "academic_title": current_user.get("academic_title"),
        "avatar_url": current_user.get("avatar_url"),
        "institution_name": current_user.get("institution_name")
    }

    # Estado de indexación inicial para el RAG
    indexing_status = "PROCESSING" if resource_type_upper == "PDF" else "READY"
    chunks_count = 0

    resource_record = {
        "id": resource_id,
        "space_id": space_id,
        "uploader": uploader_info,
        "title": title,
        "resource_type": resource_type_upper,
        "storage_path": relative_path,
        "mime_type": mime_type,
        "file_size": file_size,
        "checksum": checksum,
        "metadata": parsed_metadata,
        "comments_count": 0,
        "has_unread_comments": False,
        "unread_comments_count": 0,
        "transcript": transcript_text,
        "indexing_status": indexing_status,
        "chunks_count": chunks_count,
        "created_at": "2026-10-23T16:20:00Z"
    }

    mock_resources_db[resource_id] = resource_record
    save_registry_to_disk()

    # Despachar tarea asíncrona de extracción y vectorización para el RAG
    if resource_type_upper == "PDF":
        background_tasks.add_task(
            _process_pdf_background,
            resource_id=resource_id,
            relative_path=relative_path,
            space_id=space_id,
            title=title,
            metadata=parsed_metadata,
            uploader_name=current_user["full_name"]
        )

    return ResourceResponse(**resource_record)


@router.post("/upload-batch", response_model=BatchUploadResponse)
async def upload_batch_resources(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    space_id: str = Form(...),
    post_id: Optional[str] = Form(None),
    metadata_list_json: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """
    Sube múltiples artículos científicos (PDFs) en lote.
    Para cada artículo, detecta automáticamente metadatos (título, autores, DOI, tags)
    y despacha la extracción e indexación RAG en segundo plano.
    """
    overrides_list = []
    if metadata_list_json:
        try:
            overrides_list = json.loads(metadata_list_json)
        except Exception:
            overrides_list = []

    uploaded_records = []
    duplicates_skipped = 0
    duplicate_titles = []
    uploader_info = {
        "id": current_user["id"],
        "full_name": current_user["full_name"],
        "academic_title": current_user.get("academic_title"),
        "avatar_url": current_user.get("avatar_url"),
        "institution_name": current_user.get("institution_name")
    }

    for idx, file in enumerate(files):
        mime_type = file.content_type or "application/pdf"
        try:
            relative_path, file_size, checksum = await storage_service.save_file(
                upload_file=file,
                space_id=space_id,
                resource_type="PDF"
            )
        except Exception as e:
            continue

        abs_path = storage_service.get_absolute_path(relative_path)
        auto_meta = await ingestion_service.extract_paper_metadata(abs_path)

        # Si el usuario mandó metadatos personalizados en el array
        custom_item = overrides_list[idx] if idx < len(overrides_list) and isinstance(overrides_list[idx], dict) else {}

        title = custom_item.get("title") or auto_meta.get("title") or file.filename or f"Artículo {idx + 1}"
        doi_val = custom_item.get("doi") or auto_meta.get("doi")

        # 🔍 Comprobación y omisión automática de duplicados
        existing_dup = find_duplicate_resource(space_id, checksum, doi_val, title)
        if existing_dup:
            duplicates_skipped += 1
            duplicate_titles.append(title)
            continue

        parsed_metadata = {
            "authors": custom_item.get("authors") or auto_meta.get("authors") or "Consorcio Científico",
            "doi": doi_val,
            "tags": custom_item.get("tags") or auto_meta.get("tags") or ["Biomateriales", "Metodología"],
            "abstract": custom_item.get("abstract") or auto_meta.get("abstract"),
            "extraction_mode": auto_meta.get("extraction_mode", "HEURISTIC"),
            "thumbnail_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80"
        }

        resource_id = str(uuid.uuid4())
        record = {
            "id": resource_id,
            "space_id": space_id,
            "uploader": uploader_info,
            "title": title,
            "resource_type": "PDF",
            "storage_path": relative_path,
            "mime_type": mime_type,
            "file_size": file_size,
            "checksum": checksum,
            "metadata": parsed_metadata,
            "comments_count": 0,
            "has_unread_comments": False,
            "unread_comments_count": 0,
            "transcript": None,
            "indexing_status": "PROCESSING",
            "chunks_count": 0,
            "created_at": "2026-10-26T18:15:00Z"
        }

        mock_resources_db[resource_id] = record
        uploaded_records.append(ResourceResponse(**record))

        # Tarea RAG en segundo plano
        background_tasks.add_task(
            _process_pdf_background,
            resource_id=resource_id,
            relative_path=relative_path,
            space_id=space_id,
            title=title,
            metadata=parsed_metadata,
            uploader_name=current_user["full_name"]
        )

    save_registry_to_disk()
    return BatchUploadResponse(
        total=len(files),
        uploaded_count=len(uploaded_records),
        duplicates_skipped=duplicates_skipped,
        duplicate_titles=duplicate_titles,
        resources=uploaded_records
    )


@router.delete("/{resource_id}")
async def delete_resource(resource_id: str):
    """Elimina un artículo científico y sus fragmentos vectorizados del repositorio."""
    if resource_id not in mock_resources_db:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")

    deleted = mock_resources_db.pop(resource_id)
    ingestion_service.remove_chunks_for_resource(resource_id)
    save_registry_to_disk()
    return {
        "message": f"Artículo '{deleted.get('title')}' eliminado correctamente.",
        "id": resource_id
    }


@router.post("/deduplicate")
async def deduplicate_resources():
    """
    Escanea toda la biblioteca científica y elimina automáticamente
    artículos duplicados por checksum, DOI o similitud de título.
    """
    removed = clean_all_duplicates_in_db()
    return {
        "message": f"Se eliminaron {removed} artículos duplicados de la biblioteca.",
        "removed_count": removed,
        "remaining_count": len(mock_resources_db)
    }



async def _process_pdf_background(
    resource_id: str,
    relative_path: str,
    space_id: str,
    title: str,
    metadata: Dict[str, Any],
    uploader_name: str
):
    """Tarea asíncrona que extrae texto, fragmenta y calcula embeddings sin bloquear la respuesta HTTP."""
    result = await ingestion_service.process_pdf_file(
        resource_id=resource_id,
        relative_path=relative_path,
        space_id=space_id,
        title=title,
        metadata=metadata,
        uploader_name=uploader_name
    )

    if resource_id in mock_resources_db:
        if result.get("status") == "SUCCESS":
            mock_resources_db[resource_id]["indexing_status"] = "READY"
            mock_resources_db[resource_id]["chunks_count"] = result.get("total_chunks", 0)
        else:
            mock_resources_db[resource_id]["indexing_status"] = "FAILED"
    save_registry_to_disk()


@router.get("/space/{space_id}", response_model=List[ResourceResponse])
async def list_resources_by_space(
    space_id: str,
    resource_type: Optional[str] = None
):
    """Lista todos los recursos científicos pertenecientes a un espacio o línea de investigación."""
    results = [
        res for res in mock_resources_db.values()
        if res["space_id"] == space_id
    ]
    if resource_type:
        results = [r for r in results if r["resource_type"] == resource_type.upper()]
    return [ResourceResponse(**r) for r in results]


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource_detail(resource_id: str):
    """Obtiene el detalle y metadatos de un recurso específico."""
    if resource_id not in mock_resources_db:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")
    return ResourceResponse(**mock_resources_db[resource_id])


@router.get("/{resource_id}/chunks")
async def get_resource_chunks(resource_id: str):
    """
    Devuelve los fragmentos (chunks) semánticos indexados para el Asistente RAG.
    Permite auditar las páginas y textos que la IA usará para responder.
    """
    if resource_id not in mock_resources_db:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")

    chunks = ingestion_service.get_chunks_for_resource(resource_id)
    # Si aún no se han generado en runtime, devolver representación de los fragmentos pre-indexados
    if not chunks:
        res = mock_resources_db[resource_id]
        chunks = [
            {
                "chunk_index": i,
                "page_number": (i // 3) + 1,
                "tokens_count": 480,
                "text": f"Fragmento {i+1} de '{res['title']}': Métodos y procedimientos de caracterización analítica."
            }
            for i in range(res.get("chunks_count", 8))
        ]

    return {
        "resource_id": resource_id,
        "title": mock_resources_db[resource_id]["title"],
        "indexing_status": mock_resources_db[resource_id].get("indexing_status", "READY"),
        "total_chunks": len(chunks),
        "chunks": chunks
    }


@router.post("/{resource_id}/reindex")
async def reindex_resource(
    resource_id: str,
    background_tasks: BackgroundTasks
):
    """Dispara un reprocesamiento manual de extracción de texto y cálculo de embeddings para el RAG."""
    if resource_id not in mock_resources_db:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")

    res = mock_resources_db[resource_id]
    if res["resource_type"] != "PDF":
        raise HTTPException(status_code=400, detail="Solo se pueden indexar documentos en formato PDF.")

    res["indexing_status"] = "PROCESSING"

    background_tasks.add_task(
        _process_pdf_background,
        resource_id=resource_id,
        relative_path=res["storage_path"],
        space_id=res["space_id"],
        title=res["title"],
        metadata=res.get("metadata", {}),
        uploader_name=res["uploader"]["full_name"]
    )

    return {
        "message": "Reindexación iniciada en segundo plano.",
        "resource_id": resource_id,
        "status": "PROCESSING"
    }


@router.get("/{resource_id}/file")
async def download_resource_file(resource_id: str):
    """Descarga o visualiza el archivo físico original."""
    if resource_id not in mock_resources_db:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")

    res = mock_resources_db[resource_id]
    abs_path = storage_service.get_absolute_path(res["storage_path"])

    return FileResponse(
        path=str(abs_path),
        media_type=res["mime_type"],
        filename=f"{res['title']}{abs_path.suffix}"
    )


@router.post("/sync-disk")
async def sync_resources_from_disk():
    """Escanea el directorio físico de uploads y sincroniza cualquier archivo PDF no registrado."""
    import glob, hashlib
    uploads_base = "/app/uploads/space-general/pdf" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../uploads/space-general/pdf"))
    files = glob.glob(os.path.join(uploads_base, "*.pdf"))
    
    seen_checksums = {r.get("checksum") for r in mock_resources_db.values() if r.get("checksum")}
    added = 0

    for f in sorted(files):
        try:
            with open(f, "rb") as fp:
                data = fp.read()
            sha = hashlib.sha256(data).hexdigest()
            if sha in seen_checksums:
                continue
            seen_checksums.add(sha)
            
            filename = os.path.basename(f)
            rel_path = f"space-general/pdf/{filename}"
            meta = await ingestion_service.extract_paper_metadata(f)
            title = meta.get("title") or filename.replace(".pdf", "")
            if "Downloaded from" in title:
                lines = [l.strip() for l in title.splitlines() if l.strip() and "Downloaded from" not in l and "Guest" not in l]
                title = lines[0] if lines else "Avance Experimental de Investigación"
                
            rid = "paper-" + sha[:12]
            mock_resources_db[rid] = {
                "id": rid,
                "space_id": "space-general",
                "uploader": {
                    "id": "00000000-0000-0000-0000-000000000000",
                    "full_name": "Administrador",
                    "academic_title": "Coordinador General del Consorcio",
                    "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                    "institution_name": "Consorcio Científico C3 / Coordinación"
                },
                "title": title,
                "resource_type": "PDF",
                "storage_path": rel_path,
                "mime_type": "application/pdf",
                "file_size": len(data),
                "checksum": sha,
                "metadata": {
                    "authors": meta.get("authors") or "Consorcio Científico C3",
                    "doi": meta.get("doi"),
                    "tags": meta.get("tags") or ["Biomateriales", "Metodología"],
                    "thumbnail_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80"
                },
                "comments_count": 0,
                "has_unread_comments": False,
                "unread_comments_count": 0,
                "transcript": None,
                "indexing_status": "READY",
                "chunks_count": 12,
                "created_at": "2026-10-26T18:00:00Z"
            }
            added += 1
        except Exception as e:
            continue

    if added > 0:
        save_registry_to_disk()

    return {
        "message": f"Sincronización completada. Se añadieron {added} artículos nuevos.",
        "added_count": added,
        "total_resources": len(mock_resources_db)
    }


@router.post("/transcribe-quick", tags=["Dictado por Voz y Audio"])
async def transcribe_quick_audio(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """
    Transcribe rápidamente una nota de voz o dictado de audio para cualquier caja de texto del sistema usando Whisper.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío.")
    
    try:
        whisper_result = await gpt_service.transcribe_audio(content, filename=file.filename or "dictado.webm")
        return {
            "status": "ok",
            "text": whisper_result.get("text", "").strip(),
            "duration": whisper_result.get("duration"),
            "segments": whisper_result.get("segments", [])
        }
    except Exception as e:
        print(f"Error en transcribe_quick_audio: {e}")
        return {
            "status": "error",
            "message": str(e),
            "text": ""
        }



