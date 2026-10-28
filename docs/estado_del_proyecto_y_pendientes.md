# Bitácora de Estado, Avance y Pendientes del Proyecto
## C3pa — Plataforma de Colaboración y Modelado Metabólico (Consorcio C3)

> **REGLA PERMANENTE DEL PROYECTO:**  
> Cada vez que se implemente, modifique o agregue una funcionalidad, este documento **DEBE actualizarse inmediatamente**, marcando lo realizado con su fecha y ruta de archivo (`file:///...`), y ajustando los pendientes para mantener el control estricto del avance y evitar olvidos.

---

## 1. Mapa de Rutas de la Base de Código

| Componente | Directorio / Archivo Principal | Descripción |
| :--- | :--- | :--- |
| **Especificación & ERD** | [docs/especificacion_sistema_y_erd.md](file:///Users/sleepydog/Documents/c3/conect/docs/especificacion_sistema_y_erd.md) | Requisitos, casos de uso, diagrama ERD original y arquitectura. |
| **Plan de Trabajo Oficial** | [docs/plan_trabajo_conect.md](file:///Users/sleepydog/Documents/c3/conect/docs/plan_trabajo_conect.md) | 6 Paquetes de trabajo (PT-01 a PT-06), riesgos, hitos y criterios de aceptación. |
| **Bitácora y Pendientes** | [docs/estado_del_proyecto_y_pendientes.md](file:///Users/sleepydog/Documents/c3/conect/docs/estado_del_proyecto_y_pendientes.md) | Este documento de seguimiento permanente. |
| **Backend (FastAPI)** | [backend/main.py](file:///Users/sleepydog/Documents/c3/conect/backend/main.py) | Punto de entrada del servidor FastAPI, middlewares y rutas v1. |
| **Configuración Backend** | [backend/app/core/config.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/core/config.py) | Pydantic Settings (.env, DB, OpenAI, CORS, Storage). |
| **Modelos de Base de Datos** | [backend/app/models/entities.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/models/entities.py) | Modelos SQLAlchemy (22 tablas: espacios, recursos, chunks pgvector, chat, etc.). |
| **Servicio OpenAI GPT** | [backend/app/services/gpt_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/gpt_service.py) | Embeddings (text-embedding-3-small), RAG con citas, Whisper para audio y boletines. |
| **Endpoints RAG** | [backend/app/api/v1/endpoints/rag.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/rag.py) | Consulta al asistente con filtrado de seguridad por espacios. |
| **Frontend (Angular 18)** | [frontend/src/app/app.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/app.component.ts) | Shell de la aplicación con pestañas temáticas y diseño oscuro. |
| **Modelos TypeScript** | [frontend/src/app/core/models/scientific.models.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/models/scientific.models.ts) | Tipos para investigadores, espacios, anotaciones, fuentes y audio. |
| **Componente Chat IA** | [frontend/src/app/features/assistant-rag/chat-assistant.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/assistant-rag/chat-assistant.component.ts) | Chatbot con fuentes citadas clicables. |
| **Componente Anotador Imagen** | [frontend/src/app/features/scientific-viewer/image-annotator.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/scientific-viewer/image-annotator.component.ts) | Delimitador de regiones en fotos/micrografías y debate lateral. |
| **Componente Reproductor Voz** | [frontend/src/app/features/scientific-viewer/audio-player.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/scientific-viewer/audio-player.component.ts) | Reproductor sincronizado con transcripción Whisper interactiva. |
| **Servicio Storage Backend** | [backend/app/services/storage_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/storage_service.py) | Almacenamiento streaming seguro con hash SHA-256 y versionado. |
| **Endpoints Recursos Backend** | [backend/app/api/v1/endpoints/resources.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/resources.py) | API multipart de subida (PDF, fotos, voz), transcripción Whisper y descarga. |
| **Servicio Recursos Angular** | [frontend/src/app/core/services/resource.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/resource.service.ts) | Servicio Angular HttpClient para subida y descarga de archivos. |
| **Componente Uploader Angular** | [frontend/src/app/features/resources/resource-uploader.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/resources/resource-uploader.component.ts) | Grabadora de voz en el navegador con MediaRecorder, drag & drop de PDFs y fotos con selector de tags. |
| **Componente Biblioteca Papers** | [frontend/src/app/features/library/paper-library.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/library/paper-library.component.ts) | Biblioteca visual de papers con portada 1ra página, burbuja de uploader, 3 puntitos de comentarios no leídos y filtros. |
| **Endpoints Anotaciones Backend** | [backend/app/api/v1/endpoints/annotations.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/annotations.py) | API para anotaciones sobre texto, comentarios con respuestas anidadas y toggle de estado resuelto. |
| **Servicio Anotaciones Angular** | [frontend/src/app/core/services/annotation.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/annotation.service.ts) | Servicio Angular HttpClient para anotaciones, hilos de comentarios y resolución. |
| **Componente Visor PDF Anotado** | [frontend/src/app/features/scientific-viewer/pdf-annotator.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/scientific-viewer/pdf-annotator.component.ts) | Visor de papers con resaltado de texto, botón flotante, panel lateral, respuestas anidadas y símbolo ✓ Resuelto. |
| **Endpoints Espacios Backend** | [backend/app/api/v1/endpoints/spaces.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/spaces.py) | API para listar y consultar líneas de investigación y espacios temáticos del consorcio. |
| **Endpoints Muro/Posts Backend** | [backend/app/api/v1/endpoints/posts.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/posts.py) | API del feed social académico (publicaciones, comentarios en posts y reacciones científicas). |
| **Servicio Feed Angular** | [frontend/src/app/core/services/feed.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/feed.service.ts) | Servicio Angular HttpClient para el muro social, espacios y reacciones. |
| **Componente Muro & Líneas** | [frontend/src/app/features/feed/stream-feed.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/feed/stream-feed.component.ts) | Muro social colaborativo estilo HumHub con selector de líneas, compositor de avances, reacciones y comentarios. |
| **Componente Acuerdos & Tareas** | [frontend/src/app/features/decisions/decisions-tasks.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/decisions/decisions-tasks.component.ts) | Tablero de acuerdos por línea, justificación científica, barra de progreso y gestión interactiva de tareas. |
| **Endpoints Invitaciones Backend** | [backend/app/api/v1/endpoints/invitations.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/invitations.py) | API de control de acceso por tokens únicos, verificación pública y activación de cuenta. |
| **Servicio Invitaciones Angular** | [frontend/src/app/core/services/invitation.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/invitation.service.ts) | Cliente HTTP para emisión, verificación y canje de tokens de invitación. |
| **Componente Gestor de Invitaciones** | [frontend/src/app/features/invitations/invitations-manager.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/invitations/invitations-manager.component.ts) | Panel de control para coordinadores: emisión con expiración, copiado de enlace y badges de estado. |
| **Componente Registro por Invitación** | [frontend/src/app/features/auth/register-by-invite.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/auth/register-by-invite.component.ts) | Pantalla de activación con validación criptográfica, bloqueo institucional y selección de avatar. |
| **Endpoints Boletín Semanal Backend** | [backend/app/api/v1/endpoints/digests.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/digests.py) | API para síntesis asistida por GPT-4o-mini, edición y publicación formal al consorcio. |
| **Servicio Boletín Angular** | [frontend/src/app/core/services/digest.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/digest.service.ts) | Cliente HTTP para historial, síntesis automática y difusión de boletines. |
| **Componente Boletín Semanal Angular** | [frontend/src/app/features/digest/weekly-digest.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/digest/weekly-digest.component.ts) | Interfaz completa con métricas semanales, síntesis por IA, editor Markdown en vivo y publicación. |
| **Servicio de Ingesta Asíncrona RAG** | [backend/app/services/ingestion_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/ingestion_service.py) | Extracción de páginas con pypdf, chunking con tiktoken (~500 tokens), embeddings y búsqueda vectorial. |
| **Docker Compose** | [docker-compose.yml](file:///Users/sleepydog/Documents/c3/conect/docker-compose.yml) | Orquestación contenerizada de PostgreSQL con pgvector 16, backend FastAPI y frontend Angular Nginx. |
| **CLI Importación Local** | [backend/import_local_paper.py](file:///Users/sleepydog/Documents/c3/conect/backend/import_local_paper.py) | Script CLI para importar papers PDF locales directamente al backend con chunking e indexación RAG inmediata. |
| **Servicio Chat Dock** | [frontend/src/app/core/services/chat-dock.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/chat-dock.service.ts) | Gestor reactivo de ventanas flotantes (Pop-up RAG y chats directos entre investigadores). |
| **Componente Dock Flotante** | [frontend/src/app/features/chat-dock/floating-chat-dock.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/chat-dock/floating-chat-dock.component.ts) | Bandeja inferior fija estilo Facebook Messenger con pop-up de RAG, chat con investigadores, minimizado y directorio de contactos. |
| **Campana de Notificaciones** | [frontend/src/app/features/notifications/notification-bell.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/notifications/notification-bell.component.ts) | Botón de campana con contador numérico de pendientes, popover interactivo y marcado como leídas. |
| **Botón Universal de Audio** | [frontend/src/app/shared/components/voice-input-btn.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/shared/components/voice-input-btn.component.ts) | Micrófono interactivo con Web Speech API y OpenAI Whisper para dictado por voz en todos los inputs y textareas. |

---

## 2. Estado por Paquetes de Trabajo

### PT-01. Diseño, Arquitectura y Entorno
- [x] Especificación técnica de requisitos y diseño inicial ([docs/especificacion_sistema_y_erd.md](file:///Users/sleepydog/Documents/c3/conect/docs/especificacion_sistema_y_erd.md)).
- [x] Plan de trabajo oficial estructurado a 20 semanas ([docs/plan_trabajo_conect.md](file:///Users/sleepydog/Documents/c3/conect/docs/plan_trabajo_conect.md)).
- [x] Definición del Stack: **FastAPI + PostgreSQL (`pgvector`) + Storage + Angular (TypeScript)**.
- [x] Configuración centralizada de entorno con Pydantic Settings ([backend/app/core/config.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/core/config.py)).
- [x] Extensión completa de 22 entidades SQLAlchemy en [backend/app/models/entities.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/models/entities.py).
- [x] **Entorno Local Contenerizado con Docker Compose (Completado):**
  - Orquestador [docker-compose.yml](file:///Users/sleepydog/Documents/c3/conect/docker-compose.yml) con 3 servicios: `conect_postgres` (`pgvector/pgvector:pg16`), `conect_backend` (FastAPI en puerto `8000`), y `conect_frontend` (Angular 18 servido en puerto `4200` con proxy Nginx).
  - Healthchecks automáticos activos y volumen persistente de base de datos `postgres_data`.
- [ ] *Pendiente:* Configurar Alembic para migraciones automáticas de base de datos.

### PT-02. Núcleo Colaborativo (MVP)
- [x] Sistema integral de carga y almacenamiento de recursos científicos ([backend/app/api/v1/endpoints/resources.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/resources.py) y [resource-uploader.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/resources/resource-uploader.component.ts)).
  - **Auto-detección Inteligente de Metadatos (Completado):** Análisis instantáneo de la primera página del PDF para extraer título formal, autores/laboratorio, código DOI y áreas temáticas/tags de forma desasistida (mediante GPT-4o-mini o heurística bibliométrica offline).
  - Carga "cero-fricción": el investigador solo arrastra el PDF y el sistema rellena todos los campos automáticamente.
  - Soporte CLI directo ([backend/import_local_paper.py](file:///Users/sleepydog/Documents/c3/conect/backend/import_local_paper.py)) para subir artículos desde terminal sin necesidad de escribir parámetros.
- [x] **Biblioteca Visual de Papers Científicos** ([frontend/src/app/features/library/paper-library.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/library/paper-library.component.ts)):
  - Previsualización de la primera página del paper (portada científica).
  - Burbuja del uploader con avatar, nombre e institución de quien compartió el artículo.
  - Indicador de 3 puntitos brillantes (•••) para avisar de comentarios nuevos pendientes de leer.
  - Filtro dinámico por Tags temáticos (`#Nanocelulosa`, `#Biomateriales`, etc.) con contador en tiempo real.
  - Selector de ordenamiento: Más nuevos primero, más comentados/debatidos y prioritarios con comentarios sin leer.
- [x] **Muro Social Académico y Espacios (Stream estilo HumHub)** ([frontend/src/app/features/feed/stream-feed.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/feed/stream-feed.component.ts)):
  - Navegación lateral por Líneas de Investigación (Consorcio General, Nanocelulosa, Biomateriales, Farmacología).
  - Compositor de publicaciones con tipos: 📌 Avance Semanal, ❓ Pregunta Metodológica, 📢 Anuncio Oficial.
  - Tarjetas de publicaciones en el feed con avatar, institución académica y fecha.
  - Reacciones científicas interactivas: 👍 Interesante, 🔬 Validado, 💡 Idea Clave.
  - Hilos de comentarios desplegables por publicación con respuesta directa.
- [x] **Sistema de Invitaciones y Control de Acceso Restringido (Completado):**
  - Generación de invitaciones con tokens únicos criptográficos (`tok_...`) con vencimiento configurable (3, 7, 14, 30 días) en [backend/app/api/v1/endpoints/invitations.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/invitations.py).
  - Panel de gestión para coordinadores con copiado rápido de URL al portapapeles y filtros de estado (`🟢 Activa`, `✓ Registrado`, `🔴 Expirada`) en [frontend/src/app/features/invitations/invitations-manager.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/invitations/invitations-manager.component.ts).
  - Pantalla modal de registro seguro asistido por invitación con preasignación blindada de institución, línea temática inicial y selección de avatar científico en [frontend/src/app/features/auth/register-by-invite.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/auth/register-by-invite.component.ts).
- [ ] *Pendiente:* Mensajería privada entre pares de investigadores.

### PT-03. Herramientas Científicas Especializadas
- [x] Prototipo Angular del visor de imágenes con cajas de anotación contextuales ([image-annotator.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/scientific-viewer/image-annotator.component.ts)).
- [x] Prototipo Angular del reproductor de audio sincronizado con Whisper ([audio-player.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/scientific-viewer/audio-player.component.ts)).
- [x] **Visor de PDF Científico con Anotaciones y Discusión Profunda** ([frontend/src/app/features/scientific-viewer/pdf-annotator.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/scientific-viewer/pdf-annotator.component.ts)):
  - Conexión directa desde la biblioteca de papers ("📖 Abrir Visor & Discusión").
  - Selección de texto en vivo con mouse y botón flotante *"💬 Anotar fragmento seleccionado"*.
  - Resaltado persistente de fragmentos en el texto del documento (amarillo para pendientes, verde para resueltos).
  - **Hilos de respuestas anidadas:** Botón *"Responder"* en cada comentario para mantener la conversación estructurada y contextualizada.
  - **Símbolo de "✓ Resuelto":** Botón de estado para marcar dudas consensuadas, mostrando quién lo resolvió y fecha, con opción de reabrirlo.
  - Filtro de anotaciones por estado: "Todas", "⏳ Pendientes" y "✓ Resueltas".
- [x] Endpoints para persistir anotaciones, respuestas anidadas y alternar estado resuelto ([backend/app/api/v1/endpoints/annotations.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/annotations.py)).
- [x] **Módulo de Formalización de Acuerdos y Tareas Derivadas** ([frontend/src/app/features/decisions/decisions-tasks.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/decisions/decisions-tasks.component.ts) y [backend/app/api/v1/endpoints/decisions.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/decisions.py)):
  - Registro de acuerdos por línea temática con título, justificación científica y discusión de origen.
  - Tareas derivadas con asignación a investigador, fechas límites y porcentaje de cumplimiento.
  - Checkboxes interactivos y selectores para alternar estado de tareas (`Por hacer` -> `En progreso` -> `Completada`).
  - Barra métrica de resumen global y progreso acumulado del consorcio.
- [ ] *Pendiente:* Calendario y eventos colaborativos.

### PT-04. Inteligencia Artificial y Asistente RAG
- [x] Integración de OpenAI GPT Service ([backend/app/services/gpt_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/gpt_service.py)).
  - Generación de embeddings con `text-embedding-3-small`.
  - Transcripción de audios/notas de voz con Whisper.
  - Generación de respuestas con citas trazables a las fuentes.
  - Generación automática de borradores de boletines semanales.
- [x] Endpoint de consulta RAG Multi-Fuente en [backend/app/api/v1/endpoints/rag.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/rag.py):
  - Memoria viva de actividad reciente por investigador o laboratorio (posts, papers subidos, comentarios).
  - Rastreo y filtrado inteligente de comentarios/dudas metodológicas no resueltas (`is_unresolved = True`).
  - Detección de menciones y etiquetas (`@usuario`) en notas y publicaciones.
  - Generación de Deep Links con metadatos de navegación directa a visores, publicaciones y acuerdos.
- [x] Componente de chat interactivo en Angular con Deep Links y badges contextuales ([chat-assistant.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/assistant-rag/chat-assistant.component.ts)):
  - Tarjetas de fuentes clicables que navegan a la pestaña y documento exacto con un solo clic.
  - Badges visuales: `⏳ No Resuelto`, `🏷️ Mención Directa`, `🔬 Actividad Lab`, `📄 Paper / Doc`.
  - Chips de consultas rápidas para preguntas de laboratorios, comentarios pendientes y menciones.
- [x] **Pipeline Asíncrono de Ingesta Automática de PDFs (Completado):**
  - Extracción de texto por páginas con `pypdf` en [backend/app/services/ingestion_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/ingestion_service.py).
  - Chunking semántico de ~500 tokens con overlap de 80 tokens usando `tiktoken` (`cl100k_base`).
  - Cálculo de embeddings con OpenAI `text-embedding-3-small` (1536 dimensiones) y persistencia vectorizada aislada por `space_id`.
  - Tarea en segundo plano `BackgroundTasks` en [backend/app/api/v1/endpoints/resources.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/resources.py) que no bloquea la subida del usuario.
  - Endpoints `GET /{resource_id}/chunks` y `POST /{resource_id}/reindex` para auditoría científica y reindexación bajo demanda.
  - Badges interactivos en la Biblioteca de Papers ([paper-library.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/library/paper-library.component.ts)) con modal para inspeccionar fragmentos, páginas y conteo de tokens.
- [x] **Batería de Pruebas de Aislamiento de Seguridad RBAC para RAG (Completado):**
  - Suite unitaria [backend/tests/test_rag_security_isolation.py](file:///Users/sleepydog/Documents/c3/conect/backend/tests/test_rag_security_isolation.py) ejecutada y aprobada al 100% (4/4 tests).
  - Valida: aislamiento multi-espacio sin fugas de datos (`test_space_isolation_enforces_no_leakage`), filtro estricto de menciones dirigidas (`test_user_mentions_are_strictly_addressed`), integridad de comentarios no resueltos (`test_unresolved_comments_flag_integrity`) y alcance acotado de actividad por autor/laboratorio (`test_author_activity_scoping`).
- [ ] *Pendiente:* Conexión directa del pipeline de ingesta a la tabla real de PostgreSQL usando el operador `<=>` de `pgvector`.

- [x] **Subida Local y Auto-detección Inteligente de Metadatos de Papers (Completado):**
  - Detección automática de Título, Autores, DOI y Tags temáticos desde la portada del PDF usando GPT-4o-mini o heurística bibliométrica offline en [backend/app/services/ingestion_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/ingestion_service.py).
  - Endpoint `POST /api/v1/resources/extract-metadata` y auto-rellenado en dropzone de subida web ([resource-uploader.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/resources/resource-uploader.component.ts)).
  - Script CLI autónomo [backend/import_local_paper.py](file:///Users/sleepydog/Documents/c3/conect/backend/import_local_paper.py) para indexar cualquier paper local directamente con auto-detección y chunking RAG.
- [x] **Carga Masiva y Múltiple de Artículos Científicos en Lote (Completado):**
  - Endpoint `POST /api/v1/resources/upload-batch` en [resources.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/resources.py) que recibe múltiples archivos PDF simultáneos, almacena cada documento, auto-detecta metadatos y despacha tareas RAG asíncronas en segundo plano.
  - Dropzone multi-archivo con soporte drag-and-drop y selección de archivos simultáneos en [resource-uploader.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/resources/resource-uploader.component.ts).
  - Cola interactiva de subida con tabla de edición rápida de títulos y autores detectados por IA, barras de progreso y carga con un solo clic.
  - Acceso directo desde la cabecera de la Biblioteca de Artículos ([paper-library.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/library/paper-library.component.ts)).
- [x] **Detección Automática de Duplicados, Limpieza y Eliminación de Artículos (Completado):**
  - Prevención automática de duplicados al cargar mediante cotejo de Checksum SHA-256 de archivo, DOI normalizado y título en [backend/app/api/v1/endpoints/resources.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/resources.py).
  - Al subir en lote (`POST /upload-batch`), los artículos duplicados se omiten automáticamente sin error, informando al usuario cuántos duplicados fueron filtrados (`duplicates_skipped`).
  - Endpoint de purga general de duplicados `POST /api/v1/resources/deduplicate` que preserva la copia original más antigua y purga fragmentos RAG redundantes en [backend/app/services/ingestion_service.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/services/ingestion_service.py).
  - Endpoint `DELETE /api/v1/resources/{resource_id}` para eliminar artículos individuales y sus fragmentos vectoriales.
  - Botón institucional `🧹 Eliminar Duplicados` en la cabecera de la Biblioteca de Artículos y botón `🗑️ Eliminar` en cada tarjeta de artículo.
  - Sincronización reactiva en tiempo real mediante `allPapersSignal` en [resource.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/resource.service.ts) y redirección automática hacia la Biblioteca tras la subida exitosa.

### PT-05. Dashboards y Boletines
- [x] Modelo de datos para `ActivityEvent` y `WeeklyDigest`.
- [x] Método `generate_weekly_digest()` en `GPTService`.
- [x] **Generador del Boletín Semanal Asistido por IA (Completado):**
  - Endpoints RESTful para generación con GPT-4o-mini, edición y publicación formal en [backend/app/api/v1/endpoints/digests.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/digests.py).
  - Servicio Angular HttpClient en [frontend/src/app/core/services/digest.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/digest.service.ts).
  - Módulo completo de visualización con métricas de actividad (publicaciones, debates, documentos, investigadores activos, acuerdos), alternancia entre vista previa estilizada y edición en vivo de Markdown, y difusión oficial al consorcio en [frontend/src/app/features/digest/weekly-digest.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/digest/weekly-digest.component.ts).
- [x] **Dashboard de Analítica y Métricas de Rendimiento del Consorcio (Completado):**
  - Endpoint RESTful consolidado `GET /api/v1/analytics/overview` en [backend/app/api/v1/endpoints/analytics.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/analytics.py) con métricas de papers, debates, acuerdos, porcentaje de resolución de anotaciones, fragmentos vectorizados y avance por línea temática.
  - Servicio Angular en [frontend/src/app/core/services/analytics.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/analytics.service.ts).
  - Componente de visualización ejecutiva en [frontend/src/app/features/analytics/consortium-analytics.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/analytics/consortium-analytics.component.ts) con tarjetas KPI, barras de avance por líneas, tabla de tendencia semanal y monitoreo de aislamiento/salud del motor RAG.

### PT-06. Integración, Despliegue y Experiencia de Usuario
- [x] **Entorno Local Contenerizado con Docker Compose (Completado):**
  - Despliegue multicontenedor con `conect_postgres` (pgvector 16), `conect_backend` (FastAPI) y `conect_frontend` (Angular 18 + Nginx).
- [x] **Persistencia Real en PostgreSQL y pgvector (Completado):**
  - Creación de 23 tablas en PostgreSQL vivo (`conect_db`), extensión `vector` activa y chunking con `Vector(1536)` en `resource_chunks`.
  - Migración y siembra de datos del consorcio (instituciones, líneas, usuarios e hitos) en [backend/app/db/init_db.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/db/init_db.py) y motor asíncrono en [backend/app/db/session.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/db/session.py).
- [x] **Mensajería Directa 1 a 1 Persistente (Completado):**
  - Endpoints `/api/v1/chat/contacts` y `/api/v1/chat/conversations/{contact_id}/messages` en [backend/app/api/v1/endpoints/chat.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/chat.py).
  - Sincronización HTTP real y persistencia en el dock flotante de chats en [chat-dock.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/chat-dock.service.ts).
- [x] **Calendario Científico y Cronograma de Hitos (Completado):**
  - Endpoints RESTful para gestión y filtrado por línea en [backend/app/api/v1/endpoints/events.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/events.py).
  - Servicio Angular en [calendar.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/calendar.service.ts).
  - Componente de línea de tiempo cronológica, filtros por categoría técnica y modal de agendamiento en [scientific-calendar.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/calendar/scientific-calendar.component.ts).
- [x] **Identidad Institucional del Usuario como Administrador / Coordinador General (Completado):**
  - Sesión activa identificada formalmente como `Administrador` / `Coordinador General` en la cabecera superior y en todos los servicios de autoría y auditoría.
- [x] **Dock de Chats Flotantes Inferior Estilo Facebook Messenger (Completado):**
  - Widget emergente en la esquina inferior derecha que convive con cualquier pantalla (Muro, Biblioteca, Acuerdos, Boletines).
  - Pop-up del **Asistente Conect (RAG)** minimizable con consultas instantáneas, chips de dudas no resueltas y fuentes vinculadas.
  - Conversaciones directas 1 a 1 con investigadores del consorcio (ej. Dr. Carlos Méndez, Dra. Elena Ramos, Dra. Sofía Alarcón) accionables desde la barra lateral o el botón de contactos.
  - Píldoras minimizables compactas con punto de estado online, contador de no leídos y persistencia en tiempo real.
  - Servicio de orquestación en [chat-dock.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/chat-dock.service.ts) y componente visual en [floating-chat-dock.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/chat-dock/floating-chat-dock.component.ts).
- [x] **Rediseño a Formato Foro Académico / GitHub Discussions (Completado):**
  - Eliminación de la estructura de muro social / tarjetas de posts tipo Facebook.
  - Implementación de un tablero de **Foro & Discusiones Científicas** ([stream-feed.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/feed/stream-feed.component.ts)) con:
    - Tabla estructurada de hilos técnicos clasificados por categoría formal (`Avance Experimental`, `Consulta Técnica/Metodológica`, `Convocatoria`).
    - Filtro por línea temática y buscador en vivo por palabras clave, títulos, contenido o investigadores.
    - Metadatos formales por fila: Título del avance, afiliación institucional del autor, línea de investigación, número de réplicas y fecha.
    - Vista dedicada de Documento Científico / Dossier al hacer clic en un hilo, con respaldos experimentales colegiados, hilo de réplicas técnicas por pares y formulario de contribución con evidencia metodológica.
    - Paleta sobria institucional (azul marino Oxford `#1e3a8a`, fondos neutros `#f8fafc`, tipografía científica limpia).
- [x] **Scripts Automatizados de Respaldo y Restauración ante Desastres (Completado):**
  - Script [`scripts/backup.sh`](file:///Users/sleepydog/Documents/c3/conect/scripts/backup.sh) con volcado binario y SQL de PostgreSQL 16 con extensión `pgvector` y empaquetado del repositorio multimedia (`uploads/`).
  - Generación de manifiesto JSON con metadatos y cálculo automático de suma de verificación criptográfica SHA-256 (`.sha256`).
  - Política de rotación automática (retención configurable de los últimos N respaldos).
  - Script [`scripts/restore.sh`](file:///Users/sleepydog/Documents/c3/conect/scripts/restore.sh) con validación previa de integridad SHA-256, restauración de base de datos y archivos multimedia, y diagnóstico de verificación de salud post-restauración.
  - Ejemplo de programación desatendida mediante cron en [`scripts/cron_backup.example`](file:///Users/sleepydog/Documents/c3/conect/scripts/cron_backup.example).
  - Endpoint de auditoría en la API `GET /api/v1/system/backups` en [backend/app/api/v1/endpoints/system.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/system.py).
- [x] **Autenticación Formal JWT y Control de Sesión (Punto 1 - Completado):**
  - Módulo criptográfico [backend/app/core/security.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/core/security.py) con hashing de contraseñas mediante bcrypt y generación/decodificación de tokens de acceso JWT (HMAC-SHA256) con expiración configurable.
  - Endpoints RESTful de autenticación en [backend/app/api/v1/endpoints/auth.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/auth.py) (`POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`) con validación de credenciales institucionales, generación de claims de rol (`admin`, `researcher`, `coordinator`) y dependencia de seguridad FastAPI `get_current_user`.
  - Servicio Angular reactivo con señales en [frontend/src/app/core/services/auth.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/auth.service.ts) con almacenamiento seguro en `localStorage`, cálculo de estado `isLoggedIn` y cierre de sesión sincronizado.
  - Pantalla institucional de acceso [frontend/src/app/features/auth/login.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/auth/login.component.ts) con formulario de credenciales, feedback de errores, selector de accesos directos colegiados (Administrador, Dra. Elena Ramos, Dr. Carlos Méndez) y estética sobria C3pa.
  - Integración en [frontend/src/app/app.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/app.component.ts) con renderizado condicional de la aplicación completa o de la pantalla de Login, botón superior `🚪 Salir` para desloguearse y actualización dinámica del perfil de usuario activo.
- [x] **Campana de Notificaciones Colegiadas en Tiempo Real (Punto 2 - Completado):**
  - Endpoints RESTful en [backend/app/api/v1/endpoints/notifications.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/notifications.py) (`GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /{id}/read`, `POST /mark-all-read`) para menciones directas en debates, acuerdos formalizados, artículos compartidos y plazos de hitos.
  - Servicio Angular reactivo [frontend/src/app/core/services/notification.service.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/core/services/notification.service.ts) con cálculo automático de contador de no leídos (`unreadCount`) y actualización optimista.
  - Componente de cabecera [frontend/src/app/features/notifications/notification-bell.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/features/notifications/notification-bell.component.ts) con botón de campana 🔔, insignia numérica pulsante de pendientes, panel desplegable (popover) con tabs "Todas" y "No leídas", botón "✓ Marcar todas como leídas" y navegación contextual directa a la sección correspondiente.
- [x] **Soporte de Dictado por Voz y Audio Universal en todos los Espacios de Escritura (Completado):**
  - Endpoint de backend rápido `POST /api/v1/resources/transcribe-quick` en [backend/app/api/v1/endpoints/resources.py](file:///Users/sleepydog/Documents/c3/conect/backend/app/api/v1/endpoints/resources.py) conectado al modelo OpenAI Whisper (`whisper-1`) para transcripción científica de alta fidelidad.
  - Componente modular reutilizable [frontend/src/app/shared/components/voice-input-btn.component.ts](file:///Users/sleepydog/Documents/c3/conect/frontend/src/app/shared/components/voice-input-btn.component.ts) con soporte híbrido: Web Speech API nativa (dictado en tiempo real sin latencia) y fallback/complemento con OpenAI Whisper mediante grabación de audio de micrófono (`MediaRecorder`), onda de audio sonora interactiva, contador de segundos y feedback visual.
  - Integrado transversalmente en **TODOS los espacios donde se puede escribir**:
    1. **Foro & Discusiones Científicas:** En el buscador del foro, en el título del nuevo hilo, en el desarrollo técnico (textarea) y en el formulario de réplica técnica.
    2. **Asistente Inteligente (RAG):** En la barra de consulta y diálogo con la memoria viva del consorcio.
    3. **Dock Flotante de Chats (Messenger):** En la ventana pop-up del asistente RAG y en los chats directos 1 a 1 entre investigadores.
    4. **Visor de PDF & Anotaciones:** En el modal de nueva observación sobre texto seleccionado y en las respuestas anidadas a comentarios.
    5. **Visor de Imágenes / Micrografías:** En la creación de nueva nota sobre una región delimitada y en las respuestas al debate.
    6. **Acuerdos & Tareas:** En el título del acuerdo, origen, justificación científica (rationale) y en cada tarea técnica asignada.
    7. **Boletín Semanal:** En el editor Markdown en vivo para dictar notas y adiciones al reporte oficial.
    8. **Subir Materiales:** En la grabadora de voz institucional existente.
- [ ] *Pendiente:* Batería de Pruebas Automatizadas E2E y de Concurrencia (Punto 3).
- [ ] *Pendiente:* Manual de Usuario para Investigadores y Guía de Despliegue en Producción (Punto 5).


