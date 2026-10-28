import os
import uuid
import hashlib
import aiofiles
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException
from app.core.config import settings


class StorageService:
    """
    Servicio para almacenamiento de archivos científicos (PDFs, imágenes de alta resolución, audios).
    Organiza por carpetas según el espacio y tipo de recurso.
    Calcula checksum SHA-256 para trazabilidad y versionado.
    """

    def __init__(self):
        self.base_dir = Path(settings.LOCAL_STORAGE_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(
        self,
        upload_file: UploadFile,
        space_id: str,
        resource_type: str
    ) -> Tuple[str, int, str]:
        """
        Guarda el archivo en el sistema de almacenamiento.
        Retorna: (storage_path, file_size_bytes, sha256_checksum)
        """
        # Sanitizar extensión
        original_filename = upload_file.filename or "archivo"
        ext = Path(original_filename).suffix.lower()

        # Generar nombre único seguro
        unique_filename = f"{uuid.uuid4().hex}{ext}"

        # Carpeta destino: uploads/{space_id}/{resource_type}/
        target_dir = self.base_dir / str(space_id) / resource_type.lower()
        target_dir.mkdir(parents=True, exist_ok=True)

        destination_path = target_dir / unique_filename

        sha256_hash = hashlib.sha256()
        file_size = 0

        # Guardar en streaming asíncrono
        async with aiofiles.open(destination_path, "wb") as out_file:
            while chunk := await upload_file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                sha256_hash.update(chunk)
                await out_file.write(chunk)

        # Devolver path relativo seguro
        relative_path = str(destination_path.relative_to(self.base_dir))
        return relative_path, file_size, sha256_hash.hexdigest()

    def get_absolute_path(self, relative_path: str) -> Path:
        """Resuelve la ruta absoluta verificando que no salga del directorio de uploads."""
        full_path = (self.base_dir / relative_path).resolve()
        if not str(full_path).startswith(str(self.base_dir.resolve())):
            raise HTTPException(status_code=403, detail="Ruta de archivo no autorizada.")
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="El archivo físico no fue encontrado en el servidor.")
        return full_path


storage_service = StorageService()
