import os
import glob
import subprocess
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/system", tags=["Administración y Mantenimiento del Sistema"])

BACKUP_DIR = "/app/../backups" if os.path.exists("/app/../backups") else "/Users/sleepydog/Documents/c3/conect/backups"


class BackupInfoDTO(BaseModel):
    filename: str
    size_mb: float
    created_at: str
    has_checksum: bool


class BackupListResponse(BaseModel):
    total_backups: int
    latest_backup: str | None
    backups: List[BackupInfoDTO]


@router.get("/backups", response_model=BackupListResponse)
async def list_backups():
    """Lista todos los respaldos generados del consorcio."""
    # Buscar en la ruta relativa montada o local
    possible_dirs = [
        "/app/backups",
        "/Users/sleepydog/Documents/c3/conect/backups",
        os.path.join(os.path.dirname(__file__), "../../../../../backups")
    ]
    target_dir = None
    for d in possible_dirs:
        if os.path.isdir(d):
            target_dir = d
            break

    if not target_dir:
        return BackupListResponse(total_backups=0, latest_backup=None, backups=[])

    files = glob.glob(os.path.join(target_dir, "conect_backup_*.tar.gz"))
    files.sort(key=os.path.getmtime, reverse=True)

    result: List[BackupInfoDTO] = []
    for f in files:
        basename = os.path.basename(f)
        size_bytes = os.path.getsize(f)
        mtime = os.path.getmtime(f)
        dt = datetime.fromtimestamp(mtime).isoformat()
        has_sha = os.path.isfile(f + ".sha256")
        result.append(
            BackupInfoDTO(
                filename=basename,
                size_mb=round(size_bytes / (1024 * 1024), 2),
                created_at=dt,
                has_checksum=has_sha
            )
        )

    return BackupListResponse(
        total_backups=len(result),
        latest_backup=result[0].filename if result else None,
        backups=result
    )


class LLMDiagnosticResponse(BaseModel):
    provider: str
    base_url: str | None
    api_key_masked: str
    configured_model: str
    active_model: str | None
    online: bool
    status_message: str
    checked_at: str


@router.get("/llm-status", response_model=LLMDiagnosticResponse)
async def check_llm_status():
    """Diagnóstico de conectividad con el servidor vLLM C3 (o OpenAI)."""
    from app.core.config import settings
    from app.services.gpt_service import gpt_service

    raw_key = settings.OPENAI_API_KEY or ""
    masked_key = f"{raw_key[:8]}...{raw_key[-4:]}" if len(raw_key) > 12 else ("configurada" if raw_key else "no-configurada")
    base_url = getattr(settings, "OPENAI_BASE_URL", None)

    online = False
    active_model = None
    status_message = "Desconocido"

    try:
        models_resp = await gpt_service.client.models.list()
        if models_resp.data and len(models_resp.data) > 0:
            active_model = models_resp.data[0].id
            online = True
            status_message = f"Conexión exitosa. {len(models_resp.data)} modelo(s) disponibles en vLLM."
    except Exception as e:
        online = False
        err_str = str(e)
        if "connect" in err_str.lower() or "timeout" in err_str.lower():
            status_message = (
                f"El servidor ({base_url or 'OpenAI'}) no respondió. "
                f"Como indicó Romel C3, el servicio puede estar abajo temporalmente o requerir red interna del C3 / VPN."
            )
        else:
            status_message = f"Error al verificar estado: {err_str[:120]}"

    return LLMDiagnosticResponse(
        provider="vLLM (OpenAI-compatible) C3 UNAM" if (base_url and "c3.unam.mx" in base_url) else "OpenAI",
        base_url=base_url,
        api_key_masked=masked_key,
        configured_model=settings.OPENAI_CHAT_MODEL,
        active_model=active_model or settings.OPENAI_CHAT_MODEL,
        online=online,
        status_message=status_message,
        checked_at=datetime.now().isoformat()
    )

