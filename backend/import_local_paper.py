"""
Script CLI de importación inteligente de artículos científicos (PDF) locales hacia Conect.
Permite subir un PDF sin necesidad de escribir título ni autores: el sistema los detecta automáticamente.

Uso:
    python3 backend/import_local_paper.py ruta/al/paper.pdf
    (o especificando valores opcionales con --title o --authors si deseas sobreescribir)
"""

import sys
import os
import json
import argparse
import uuid
import mimetypes
from pathlib import Path
import urllib.request
import urllib.error


def build_multipart_request(url: str, fields: dict, file_field: str, file_path: Path) -> urllib.request.Request:
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()

    for name, value in fields.items():
        if value is not None:
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
            body.extend(f"{value}\r\n".encode("utf-8"))

    mime_type = mimetypes.guess_type(str(file_path))[0] or "application/pdf"
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
    with open(file_path, "rb") as f:
        body.extend(f.read())
    body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    return urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "Conect-CLI/1.0"
        },
        method="POST"
    )


def auto_detect_and_upload(
    file_path: str,
    override_title: str = None,
    override_authors: str = None,
    override_doi: str = None,
    override_tags: list = None,
    space_id: str = "space-general",
    base_api: str = "http://localhost:8000/api/v1/resources"
):
    pdf_path = Path(file_path).resolve()
    if not pdf_path.exists():
        print(f"❌ Error: El archivo '{file_path}' no existe en tu máquina.")
        return False

    print(f"📄 Analizando archivo: {pdf_path.name}...")

    # 1. Paso opcional: Consultar pre-detección de metadatos
    detected_title = override_title
    detected_authors = override_authors
    detected_doi = override_doi
    detected_tags = override_tags

    try:
        req_extract = build_multipart_request(f"{base_api}/extract-metadata", {}, "file", pdf_path)
        with urllib.request.urlopen(req_extract, timeout=20) as resp:
            extract_data = json.loads(resp.read().decode("utf-8"))
            print("✨ ¡Metadatos detectados automáticamente con IA!")
            if not detected_title:
                detected_title = extract_data.get("title")
                print(f"   • Título: {detected_title}")
            if not detected_authors:
                detected_authors = extract_data.get("authors")
                print(f"   • Autores: {detected_authors}")
            if not detected_doi and extract_data.get("doi"):
                detected_doi = extract_data.get("doi")
                print(f"   • DOI: {detected_doi}")
            if not detected_tags and extract_data.get("tags"):
                detected_tags = extract_data.get("tags")
                print(f"   • Tags: {', '.join(detected_tags)}")
    except Exception as e:
        print(f"⚠️ Nota: Extracción previa offline ({e}), el backend aplicará detección durante la carga.")

    # 2. Paso de subida e indexación
    metadata = {
        "authors": detected_authors or "Consorcio Científico C3",
        "doi": detected_doi,
        "tags": detected_tags or ["Biomateriales", "Caracterización"],
        "thumbnail_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80"
    }

    upload_fields = {
        "title": detected_title or "",
        "resource_type": "PDF",
        "space_id": space_id,
        "metadata_json": json.dumps(metadata)
    }

    print("📤 Subiendo documento y generando fragmentos semánticos para el RAG...")
    try:
        req_upload = build_multipart_request(f"{base_api}/upload", upload_fields, "file", pdf_path)
        with urllib.request.urlopen(req_upload, timeout=30) as resp_upload:
            uploaded = json.loads(resp_upload.read().decode("utf-8"))
            print("\n🎉 ¡Artículo incorporado e indexado con éxito!")
            print(f"   • Título final: {uploaded.get('title')}")
            print(f"   • Autores: {uploaded.get('metadata', {}).get('authors')}")
            print(f"   • Modo de extracción: {uploaded.get('metadata', {}).get('extraction_mode', 'AUTOMÁTICO')}")
            print(f"   • Estado RAG: {uploaded.get('indexing_status')}")
            print("   • Enlaces:")
            print("     -> Ver en biblioteca: http://localhost:4200 (Pestaña 'Biblioteca de Papers')")
            print("     -> Preguntar al RAG: http://localhost:4200 (Pestaña 'Asistente GPT')\n")
            return True
    except urllib.error.URLError as e:
        print(f"❌ Error al subir ({e}). Verifica que los contenedores estén activos con 'docker compose up -d'.")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Subir un paper PDF local con auto-detección de título y autores")
    parser.add_argument("file", help="Ruta al archivo PDF local")
    parser.add_argument("--title", default=None, help="(Opcional) Sobrescribir título detectado")
    parser.add_argument("--authors", default=None, help="(Opcional) Sobrescribir autores detectados")
    parser.add_argument("--doi", default=None, help="(Opcional) Sobrescribir DOI")
    parser.add_argument("--tags", default=None, help="(Opcional) Tags separados por coma")
    parser.add_argument("--space", default="space-general", help="Línea o espacio de investigación")

    args = parser.parse_args()
    tags_list = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else None

    auto_detect_and_upload(
        file_path=args.file,
        override_title=args.title,
        override_authors=args.authors,
        override_doi=args.doi,
        override_tags=tags_list,
        space_id=args.space
    )
