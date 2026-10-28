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
