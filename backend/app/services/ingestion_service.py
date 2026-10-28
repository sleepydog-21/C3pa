import uuid
import os
import re
from typing import List, Dict, Any, Optional
import pypdf
import tiktoken
from app.services.gpt_service import gpt_service
from app.services.storage_service import storage_service

# Codificador oficial para OpenAI text-embedding-3-small
TOKEN_ENCODER = tiktoken.get_encoding("cl100k_base")


class IngestionService:
    """
    Servicio de Ingesta Asíncrona para el Asistente RAG.
    1. Extrae texto de artículos científicos (PDF) conservando páginas.
    2. Segmenta en fragmentos semánticos (~500 tokens con overlap de 80 tokens).
    3. Calcula embeddings vectoriales de 1536 dimensiones con text-embedding-3-small.
    4. Almacena en la base vectorial con aislamiento estricto por space_id.
    """

    def __init__(self):
        # Almacén en memoria de chunks indexados para consultas del RAG
        # En producción se sincroniza directamente con PostgreSQL pgvector (tabla resource_chunks)
        self.indexed_chunks: List[Dict[str, Any]] = []

    def extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Lee el archivo PDF y extrae el texto página por página.
        Retorna lista de diccionarios: [{"page": 1, "text": "..."}]
        """
        pages_content = []
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

        reader = pypdf.PdfReader(file_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            # Normalizar espacios y saltos de línea huérfanos
            cleaned_text = re.sub(r"\s+", " ", text).strip()
            if cleaned_text:
                pages_content.append({
                    "page": i + 1,
                    "text": cleaned_text
                })

        return pages_content

    async def extract_paper_metadata(self, source: Any) -> Dict[str, Any]:
        """
        Extrae automáticamente título, autores, DOI, palabras clave y resumen
        a partir de la primera página del PDF y metadatos del documento.
        Usa GPT-4o-mini si está disponible, o heurísticas bibliométricas en modo offline.
        """
        import io
        import json
        from pathlib import Path
        from app.core.config import settings

        try:
            if isinstance(source, (str, Path)):
                reader = pypdf.PdfReader(str(source))
            elif isinstance(source, bytes):
                reader = pypdf.PdfReader(io.BytesIO(source))
            elif hasattr(source, "read"):
                content = await source.read() if hasattr(source.read, "__await__") else source.read()
                reader = pypdf.PdfReader(io.BytesIO(content))
            else:
                return {
                    "title": "Documento Científico",
                    "authors": "Consorcio Científico C3",
                    "doi": None,
                    "tags": ["General"],
                    "abstract": "",
                    "extraction_mode": "DEFAULT"
                }
        except Exception as e:
            return {
                "title": "Documento Científico",
                "authors": "Consorcio Científico C3",
                "doi": None,
                "tags": ["General"],
                "abstract": "",
                "error": str(e),
                "extraction_mode": "ERROR_FALLBACK"
            }

        # 1. Metadatos embebidos en el PDF
        doc_info = reader.metadata or {}
        embedded_title = doc_info.get("/Title") or doc_info.get("title")
        embedded_author = doc_info.get("/Author") or doc_info.get("author")

        # 2. Extraer texto de la primera y segunda página
        first_pages_text = ""
        for page in reader.pages[:2]:
            t = page.extract_text() or ""
            first_pages_text += t + "\n"

        first_pages_text_clean = first_pages_text.strip()

        # 3. Detección de DOI por regex científica
        doi_match = re.search(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", first_pages_text)
        detected_doi = doi_match.group(0).rstrip(".,;)") if doi_match else None

        # 4. Si OpenAI está configurado y activo, usar LLM para extracción bibliométrica perfecta
        if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-dummy") and len(first_pages_text_clean) > 50:
            try:
                system_prompt = (
                    "Eres un especialista en bibliometría e indexación científica. "
                    "Analiza el texto de la portada o primera página de un artículo científico y extrae los metadatos en JSON exacto:\n"
                    "{\n"
                    '  "title": "Título completo y formal del artículo",\n'
                    '  "authors": "Lista de autores (ej. Dr. Carlos Méndez, Dra. Elena Ramos)",\n'
                    '  "doi": "Código DOI si existe o null",\n'
                    '  "tags": ["2 a 4 áreas o temas clave en español (ej. Nanocelulosa, Biomateriales, Caracterización)"],\n'
                    '  "abstract": "Resumen sintético de 1 a 2 oraciones"\n'
                    "}"
                )
                response = await gpt_service.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Texto de cabecera del PDF:\n{first_pages_text_clean[:3500]}"}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                data = json.loads(response.choices[0].message.content)
                if data.get("title"):
                    return {
                        "title": data.get("title").strip(),
                        "authors": data.get("authors") or embedded_author or "Consorcio Científico C3",
                        "doi": data.get("doi") or detected_doi,
                        "tags": data.get("tags") or ["Biomateriales", "Caracterización"],
                        "abstract": data.get("abstract", "").strip(),
                        "extraction_mode": "AI_LLM"
                    }
            except Exception:
                pass  # Fallback a heurística local si falla la llamada LLM

        # 5. Extracción Heurística Bibliométrica (Offline / Local)
        lines = [line.strip() for line in first_pages_text_clean.split("\n") if line.strip()]

        # Filtrar cabeceras comunes de editoriales
        filtered_lines = []
        for l in lines:
            lower_l = l.lower()
            if any(h in lower_l for h in ["journal", "sciencedirect", "elsevier", "springer", "nature", "received:", "accepted:", "http", "vol.", "issn", "doi:"]):
                continue
            if len(l) > 10:
                filtered_lines.append(l)

        # Título: Primera línea sustancial o metadato del PDF
        heuristic_title = "Artículo Científico"
        if embedded_title and len(str(embedded_title).strip()) > 5 and not str(embedded_title).lower().startswith("microsoft word"):
            heuristic_title = str(embedded_title).strip()
        elif filtered_lines:
            if len(filtered_lines) > 1 and len(filtered_lines[0]) < 70 and not filtered_lines[0].endswith("."):
                heuristic_title = f"{filtered_lines[0]} {filtered_lines[1]}"
            else:
                heuristic_title = filtered_lines[0]

        # Autores: Buscar metadato de autor o líneas con patrones de nombres
        heuristic_authors = "Consorcio Científico C3"
        if embedded_author and len(str(embedded_author).strip()) > 3:
            heuristic_authors = str(embedded_author).strip()
        else:
            for l in filtered_lines[1:6]:
                if any(x in l for x in [",", "and", " & ", "y ", "et al", "Dra.", "Dr.", "PhD", "MSc"]) and len(l) < 160:
                    heuristic_authors = l
                    break

        # Tags temáticos según vocabulario del consorcio
        known_topics = {
            "nanocelulosa": "Nanocelulosa",
            "biomaterial": "Biomateriales",
            "hidrogel": "Biomateriales",
            "polímero": "Biomateriales",
            "farmacol": "Farmacología",
            "fármaco": "Farmacología",
            "liberación controlada": "Farmacología",
            "ensayo": "Ensayos Clínicos",
            "clínic": "Ensayos Clínicos",
            "citotoxic": "Metodología",
            "reolog": "Metodología",
            "caracteriza": "Caracterización",
            "espectroscop": "Caracterización",
            "microscop": "Caracterización"
        }
        detected_tags = set()
        text_lower = first_pages_text_clean.lower()
        for kw, tag in known_topics.items():
            if kw in text_lower:
                detected_tags.add(tag)

        final_tags = list(detected_tags) if detected_tags else ["Biomateriales", "Metodología"]

        return {
            "title": heuristic_title,
            "authors": heuristic_authors,
            "doi": detected_doi,
            "tags": final_tags,
            "abstract": (lines[2] if len(lines) > 2 else "")[:200],
            "extraction_mode": "HEURISTIC_PARSER"
        }

    def split_into_chunks(
        self,
        pages_content: List[Dict[str, Any]],
        target_chunk_tokens: int = 500,
        chunk_overlap_tokens: int = 80
    ) -> List[Dict[str, Any]]:
        """
        Segmenta el contenido de las páginas en chunks uniformes usando tiktoken.
        Mantiene el número de página de origen y trazabilidad científica.
        """
        chunks = []
        accumulated_text = ""
        current_page = 1

        for page in pages_content:
            page_text = page["text"]
            current_page = page["page"]
            accumulated_text += f" [Página {current_page}] " + page_text

        # Tokenizar todo el texto combinado
        tokens = TOKEN_ENCODER.encode(accumulated_text)
        total_tokens = len(tokens)
        step = target_chunk_tokens - chunk_overlap_tokens
        if step <= 0:
            step = target_chunk_tokens

        chunk_idx = 0
        for start_idx in range(0, total_tokens, step):
            end_idx = min(start_idx + target_chunk_tokens, total_tokens)
            chunk_tokens = tokens[start_idx:end_idx]
            chunk_text = TOKEN_ENCODER.decode(chunk_tokens).strip()

            # Estimar página principal examinando etiqueta [Página X]
            page_match = re.findall(r"\[Página\s+(\d+)\]", chunk_text)
            page_num = int(page_match[-1]) if page_match else 1

            if len(chunk_text) > 40:  # Ignorar fragmentos residuales insignificantes
                chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "tokens_count": len(chunk_tokens),
                    "text": chunk_text
                })
                chunk_idx += 1

            if end_idx >= total_tokens:
                break

        return chunks

    async def process_pdf_file(
        self,
        resource_id: str,
        relative_path: str,
        space_id: str,
        title: str,
        metadata: Optional[Dict[str, Any]] = None,
        uploader_name: Optional[str] = "Investigador C3"
    ) -> Dict[str, Any]:
        """
        Pipeline asíncrono completo invocado en BackgroundTasks:
        - Extrae texto
        - Segmenta en chunks
        - Calcula embeddings con OpenAI
        - Indexa para el Asistente RAG
        """
        abs_path = storage_service.get_absolute_path(relative_path)
        metadata = metadata or {}

        try:
            # 1. Extracción de páginas
            pages = self.extract_text_from_pdf(abs_path)
            if not pages:
                # Si el PDF es un escaneo de imágenes, registrar fragmento genérico
                pages = [{
                    "page": 1,
                    "text": f"Documento científico '{title}'. Autores: {metadata.get('authors', 'Consorcio C3')}. Tags: {', '.join(metadata.get('tags', []))}."
                }]

            # 2. Chunking semántico
            raw_chunks = self.split_into_chunks(pages, target_chunk_tokens=500, chunk_overlap_tokens=80)

            # 3. Cálculo de embeddings y persistencia
            processed_chunks = []
            for item in raw_chunks:
                chunk_id = str(uuid.uuid4())
                chunk_text = item["text"]

                # Generar embedding con OpenAI text-embedding-3-small
                embedding = await gpt_service.get_embedding(chunk_text)

                chunk_record = {
                    "id": chunk_id,
                    "resource_id": resource_id,
                    "space_id": space_id,
                    "title": title,
                    "page_number": item["page_number"],
                    "chunk_index": item["chunk_index"],
                    "tokens_count": item["tokens_count"],
                    "text": chunk_text,
                    "embedding": embedding,
                    "author": metadata.get("authors") or uploader_name,
                    "metadata": {
                        "doi": metadata.get("doi"),
                        "tags": metadata.get("tags", []),
                        "page": item["page_number"]
                    }
                }

                self.indexed_chunks.append(chunk_record)
                processed_chunks.append(chunk_record)

            # Persistencia en PostgreSQL con pgvector
            try:
                from app.db.session import AsyncSessionLocal
                from app.models.entities import ResourceChunk
                async with AsyncSessionLocal() as session:
                    sid = uuid.UUID(space_id) if len(space_id) == 36 else uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
                    rid = uuid.UUID(resource_id) if len(resource_id) == 36 else uuid.uuid4()
                    db_chunks = [
                        ResourceChunk(
                            id=uuid.UUID(c["id"]),
                            space_id=sid,
                            source_type="RESOURCE",
                            source_id=rid,
                            chunk_text=c["text"],
                            embedding=c["embedding"],
                            chunk_metadata={
                                "title": c["title"],
                                "page": c["page_number"],
                                "author": c["author"],
                                "tokens_count": c["tokens_count"],
                                "doi": c["metadata"].get("doi")
                            }
                        )
                        for c in processed_chunks
                    ]
                    session.add_all(db_chunks)
                    await session.commit()
            except Exception as db_err:
                print(f"Aviso guardado en pgvector: {db_err}")

            return {
                "status": "SUCCESS",
                "resource_id": resource_id,
                "total_pages": len(pages),
                "total_chunks": len(processed_chunks)
            }

        except Exception as e:
            # Fallback en caso de error de lectura o rate limit
            return {
                "status": "ERROR",
                "resource_id": resource_id,
                "error": str(e)
            }

    def search_similar_chunks(
        self,
        query_vector: List[float],
        space_id: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Búsqueda por similitud de coseno en los chunks indexados.
        Filtra estrictamente por espacio para aislamiento de seguridad.
        """
        import math

        def cosine_similarity(v1: List[float], v2: List[float]) -> float:
            dot = sum(a * b for a, b in zip(v1, v2))
            norm1 = math.sqrt(sum(a * a for a in v1))
            norm2 = math.sqrt(sum(b * b for b in v2))
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return dot / (norm1 * norm2)

        candidates = self.indexed_chunks
        if space_id and space_id != "all":
            candidates = [c for c in candidates if c["space_id"] == space_id or c["space_id"] == "space-general"]

        scored = []
        for c in candidates:
            sim = cosine_similarity(query_vector, c["embedding"])
            scored.append((sim, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def get_chunks_for_resource(self, resource_id: str) -> List[Dict[str, Any]]:
        """Devuelve los chunks indexados de un recurso específico."""
        return [c for c in self.indexed_chunks if c["resource_id"] == resource_id]

    def remove_chunks_for_resource(self, resource_id: str) -> int:
        """Elimina todos los fragmentos vectorizados de un recurso."""
        before = len(self.indexed_chunks)
        self.indexed_chunks = [c for c in self.indexed_chunks if c["resource_id"] != resource_id]
        return before - len(self.indexed_chunks)


# Instancia singleton del servicio de ingesta
ingestion_service = IngestionService()
