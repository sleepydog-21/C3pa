import logging
import hashlib
import random
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class GPTService:
    """
    Servicio integral para integración con OpenAI GPT:
    - Generación de embeddings semánticos para pgvector.
    - Respuestas conversacionales RAG con citas directas a publicaciones, acuerdos y documentos.
    - Transcripción de notas de voz vía Whisper.
    - Generación asistida de boletines semanales de avance científico.
    """

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self._cached_model: Optional[str] = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY no está configurada. El servicio GPT funcionará en modo mock/restringido.")
            client_kwargs = {
                "api_key": settings.OPENAI_API_KEY or "dummy-key",
                "timeout": 8.0,  # Timeout de 8s para no colgar peticiones si el servidor vLLM está inactivo
            }
            if getattr(settings, "OPENAI_BASE_URL", None) and settings.OPENAI_BASE_URL.strip():
                client_kwargs["base_url"] = settings.OPENAI_BASE_URL.strip()
            self._client = AsyncOpenAI(**client_kwargs)
        return self._client

    async def get_active_chat_model(self) -> str:
        """Determina el nombre del modelo activo en el servidor vLLM u OpenAI."""
        if self._cached_model:
            return self._cached_model
        try:
            models_resp = await self.client.models.list()
            if models_resp.data and len(models_resp.data) > 0:
                self._cached_model = models_resp.data[0].id
                return self._cached_model
        except Exception as e:
            logger.debug(f"Servidor vLLM/OpenAI no retornó lista de modelos ({e}). Usando configuración por defecto.")
        return settings.OPENAI_CHAT_MODEL or "gptoss"

    # ------------------------------------------------------------------
    # 1. GENERACIÓN DE EMBEDDINGS (pgvector)
    # ------------------------------------------------------------------
    def _generate_deterministic_embedding(self, text: str) -> List[float]:
        """Genera un vector unitario determinista de 1536 dimensiones para desarrollo local sin costo."""
        seed = int(hashlib.md5(text.encode("utf-8")).hexdigest()[:8], 16)
        rng = random.Random(seed)
        raw = [rng.uniform(-1.0, 1.0) for _ in range(settings.OPENAI_EMBEDDING_DIMENSIONS)]
        norm = (sum(x**2 for x in raw)) ** 0.5 or 1.0
        return [x / norm for x in raw]

    async def get_embedding(self, text: str) -> List[float]:
        """
        Genera el vector de embedding para un fragmento de texto usando text-embedding-3-small.
        """
        cleaned_text = text.replace("\n", " ").strip()
        if not cleaned_text:
            return [0.0] * settings.OPENAI_EMBEDDING_DIMENSIONS

        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-dummy"):
            return self._generate_deterministic_embedding(cleaned_text)

        try:
            response = await self.client.embeddings.create(
                input=[cleaned_text],
                model=settings.OPENAI_EMBEDDING_MODEL,
                dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"Error al conectar con OpenAI Embeddings ({e}). Usando vector determinista local.")
            return self._generate_deterministic_embedding(cleaned_text)

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Genera embeddings en lote para indexación rápida de documentos largos o múltiples publicaciones.
        """
        cleaned_texts = [t.replace("\n", " ").strip() or " " for t in texts]
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-dummy"):
            return [self._generate_deterministic_embedding(t) for t in cleaned_texts]

        try:
            response = await self.client.embeddings.create(
                input=cleaned_texts,
                model=settings.OPENAI_EMBEDDING_MODEL,
                dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.warning(f"Error al conectar con OpenAI Batch Embeddings ({e}). Usando vectores deterministas locales.")
            return [self._generate_deterministic_embedding(t) for t in cleaned_texts]

    # ------------------------------------------------------------------
    # 2. CONSULTAS RAG CON CONTROL DE PERMISOS Y CITAS
    # ------------------------------------------------------------------
    async def answer_rag_query(
        self,
        query: str,
        retrieved_contexts: List[Dict[str, Any]],
        user_name: str = "Investigador",
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Genera una respuesta científica fundamentada a partir de los fragmentos recuperados en los espacios autorizados.
        Cada fragmento contiene: text, source_type, title, space_name, author, date, link_url.
        """
        system_prompt = (
            "Eres el Asistente Científico y Memoria Central de 'Conect', la plataforma de colaboración asíncrona del consorcio.\n"
            "Tienes acceso tanto a la BIBLIOGRAFÍA E ARTÍCULOS del proyecto como a la ACTIVIDAD RECIENTE (publicaciones, notas de voz, comentarios en documentos, acuerdos y menciones de investigadores).\n\n"
            "CAPACIDADES CLAVE:\n"
            "1. ACTIVIDAD DE INVESTIGADORES Y LABORATORIOS: Si preguntan qué ha hecho recientemente un investigador o laboratorio (ej. Dr. Carlos Méndez, Dra. Elena Ramos, etc.), sintetiza sus publicaciones, notas de voz, papers aportados y comentarios clave.\n"
            "2. COMENTARIOS PENDIENTES / NO RESUELTOS: Si preguntan qué comentarios faltan resolver o qué dudas metodológicas están abiertas, enuméralos claramente indicando autor, documento, fragmento y estatus '⏳ Pendiente'. Recuerda que cada fuente incluye un enlace directo para ir a resolverlo.\n"
            "3. MENCIONES Y ETIQUETAS: Si preguntan dónde han etiquetado al usuario o qué mensajes le dirigen (@nombre), lista las menciones con el autor que lo convocó y el tema de discusión.\n"
            "4. BIBLIOGRAFÍA Y METODOLOGÍA: Basa tus respuestas técnicas en los fragmentos de artículos y protocolos del consorcio.\n\n"
            "REGLAS DE FORMATO:\n"
            "- Responde en español con tono profesional, colaborativo y estructurado con viñetas.\n"
            "- Al referirte a un comentario o recurso, menciona su título o autor para que el investigador pueda pulsar el enlace directo que aparece en las fuentes de abajo.\n"
            "- Diferencia siempre entre opiniones/comentarios abiertos y acuerdos formales adoptados."
        )

        # Construir bloque de contexto formateado
        context_blocks = []
        for idx, item in enumerate(retrieved_contexts, 1):
            source_info = (
                f"[ID {idx}] Tipo: {item.get('source_type')} | "
                f"Espacio: {item.get('space_name', 'General')} | "
                f"Título: {item.get('title', 'Sin título')} | "
                f"Autor: {item.get('author', 'Anónimo')} | "
                f"Fecha: {item.get('date', 'Desconocida')}"
            )
            context_blocks.append(f"{source_info}\nContenido:\n{item.get('text', '')}\n")

        formatted_context = "\n---\n".join(context_blocks) if context_blocks else "No se encontraron fragmentos relevantes en los espacios autorizados."

        messages = [{"role": "system", "content": system_prompt}]

        if chat_history:
            for msg in chat_history[-6:]:  # Conservar últimos 3 intercambios
                messages.append(msg)

        user_content = (
            f"Contexto disponible del proyecto:\n{formatted_context}\n\n"
            f"Pregunta del investigador ({user_name}): {query}"
        )
        messages.append({"role": "user", "content": user_content})

        try:
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-dummy"):
                raise ValueError("Modo local sin API key real")

            model_to_use = await self.get_active_chat_model()
            response = await self.client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=0.2,  # Baja temperatura para evitar alucinaciones
            )
            answer_text = response.choices[0].message.content
            model_label = f"{model_to_use} (vLLM C3)" if "c3.unam.mx" in (getattr(settings, "OPENAI_BASE_URL", "") or "") else model_to_use
        except Exception as e:
            logger.info(f"Generando respuesta local asistida (RAG offline / fallback): {e}")
            model_label = f"{settings.OPENAI_CHAT_MODEL} (offline fallback)"
            if retrieved_contexts:
                first_items = retrieved_contexts[:3]
                citations_summary = "\n".join([f"- **{it.get('title')}** ({it.get('author')}, {it.get('date')}): {it.get('text')[:180]}..." for it in first_items])
                answer_text = (
                    f"Basado en los registros y bibliografía del consorcio para tu consulta **\"{query}\"**, "
                    f"se identificaron **{len(retrieved_contexts)} fuentes relevantes** en el espacio autorizado:\n\n"
                    f"{citations_summary}\n\n"
                    f"👉 Puedes hacer clic en cualquiera de las tarjetas de fuentes adjuntas abajo para navegar directamente al documento o publicación original."
                )
            else:
                answer_text = f"No se encontraron fragmentos relevantes en los espacios autorizados para la consulta: '{query}'."

        return {
            "answer": answer_text,
            "sources": retrieved_contexts,
            "model_used": model_label
        }

    # ------------------------------------------------------------------
    # 3. TRANSCRIPCIÓN DE NOTAS DE VOZ (WHISPER)
    # ------------------------------------------------------------------
    async def transcribe_audio(self, file_content: bytes, filename: str = "audio.mp3") -> Dict[str, Any]:
        """
        Transcribe una nota de voz de un investigador usando OpenAI Whisper.
        Retorna el texto completo y segmentos con marcas de tiempo (timestamps).
        """
        from io import BytesIO

        audio_file = BytesIO(file_content)
        audio_file.name = filename

        transcription = await self.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            temperature=0.0
        )

        return {
            "text": transcription.text,
            "duration": getattr(transcription, "duration", None),
            "segments": getattr(transcription, "segments", [])
        }

    # ------------------------------------------------------------------
    # 4. GENERACIÓN DE BOLETINES SEMANALES
    # ------------------------------------------------------------------
    async def generate_weekly_digest(
        self,
        space_name: str,
        week_range: str,
        metrics: Dict[str, Any],
        discussions: List[Dict[str, Any]],
        decisions: List[Dict[str, Any]],
        resources: List[Dict[str, Any]]
    ) -> str:
        """
        Sintetiza la actividad de la semana para generar un borrador de boletín científico listo para revisión del coordinador.
        """
        prompt = (
            f"Eres el redactor técnico del consorcio de investigación para el espacio '{space_name}'.\n"
            f"Genera un Boletín Semanal de Trabajo para el período {week_range}.\n\n"
            f"MÉTRICAS CUANTITATIVAS:\n"
            f"- Publicaciones: {metrics.get('posts_count', 0)}\n"
            f"- Comentarios/Discusiones: {metrics.get('comments_count', 0)}\n"
            f"- Documentos aportados: {metrics.get('resources_count', 0)}\n"
            f"- Investigadores activos: {metrics.get('active_users_count', 0)}\n\n"
            f"NUEVOS RECURSOS Y ARTÍCULOS:\n{resources}\n\n"
            f"DISCUSIONES DESTACADAS:\n{discussions}\n\n"
            f"ACUERDOS Y DECISIONES FORMALES ADOPTADAS:\n{decisions}\n\n"
            "ESTRUCTURA DEL BOLETÍN:\n"
            "1. Resumen Ejecutivo (1 párrafo de síntesis)\n"
            "2. Avances por Tema / Línea\n"
            "3. Acuerdos y Decisiones Clave (con responsables si aplica)\n"
            "4. Nuevos Materiales Bibliográficos y Recursos\n"
            "5. Próximos Pasos para la Siguiente Semana\n"
            "Usa formato Markdown elegante y tono profesional académico."
        )

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

        return response.choices[0].message.content


# Instancia singleton para uso en toda la aplicación
gpt_service = GPTService()
