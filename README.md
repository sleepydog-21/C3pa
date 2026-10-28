# 🧬 C3pa — Plataforma de Colaboración y Modelado Metabólico

[![Repository](https://img.shields.io/badge/GitHub-sleepydog--21%2FC3pa-blue.svg?logo=github)](https://github.com/sleepydog-21/C3pa)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Angular](https://img.shields.io/badge/Angular-18.0-DD0031.svg?logo=angular)](https://angular.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791.svg?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2-2496ED.svg?logo=docker)](https://www.docker.com/)

**C3pa** es una plataforma científica integral de colaboración asíncrona, memoria colegiada y modelado metabólico (*Genome-Scale Metabolic Models - GEM*), diseñada para articular grupos interdisciplinarios de investigación en biología de sistemas, biopolímeros bacterianos (nanocelulosa), química analítica y computación de alto rendimiento en el marco del **Consorcio C3** (UNAM / CINVESTAV).

Inspirada en el marco pedagógico y funcional del **PLIIS** (*Programa de Liderazgo e Innovación Interprofesional en Salud* de la Facultad de Medicina, UNAM), C3pa traslada la colaboración interprofesional al ecosistema de la biología computacional y el modelado metabólico asistido por inteligencia artificial.

---

## 🏛️ Los Tres Pilares Fundamentales del Consorcio

```
                  ┌────────────────────────────────────────┐
                  │          🏛️ Ecosistema C3pa           │
                  │   Colaboración Científica Asíncrona    │
                  └──────────────────┬─────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
│     PILAR I      │       │     PILAR II     │        │    PILAR III     │
│   Modelado GEM   │       │   Memoria Viva   │        │    Gobernanza    │
│   & Microbioma   │       │   RAG & Whisper  │        │   & Trazabilidad │
│                  │       │                  │        │                  │
│ • Flujos FBA     │       │ • Búsqueda pgvec │        │ • Acuerdos actas │
│ • Celulosa Bact. │       │ • GPT-4o-mini    │        │ • Asignac. tareas│
│ • Procesador GEM │       │ • Dictado voz    │        │ • Calendario lab │
└──────────────────┘       └──────────────────┘        └──────────────────┘
```

1. **Pilar I: Modelado GEM & Microbioma (Bases Metabólicas Vivas)**  
   Integración directa con modelos de balance de flujos (*Flux Balance Analysis - FBA*) y librerías de genómica metabólica (`procesador`) para simular vías biosintéticas en consorcios microbianos (*Komagataeibacter xylinus*, microbioma y biomateriales).
2. **Pilar II: Memoria Científica Viva & RAG con Whisper**  
   Indexación semántica vectorial continua (`pgvector`) sobre literatura científica (PDFs, publicaciones, acuerdos y transcripciones). Incorpora **Dictado por Voz Universal** con OpenAI Whisper en todos los módulos de redacción.
3. **Pilar III: Gobernanza Colegiada & Trazabilidad Interinstitucional**  
   Registro formal de acuerdos de laboratorio con trazabilidad completa: derivación en tareas asignadas, fechas límite y calendario sincronizado entre instituciones socias.

---

## 🚀 Arquitectura y Tecnologías

- **Frontend:** [Angular 18](https://angular.dev/) (Standalone Components, Signals, Reactive Forms, Web Speech API nativa + Whisper fallback, CSS nativo de alta estética con paleta institucional UNAM).
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11, Uvicorn, Pydantic v2, AsyncPG, SQLAlchemy 2.0).
- **Motor de Inteligencia Artificial:** Integración OpenAI (`gpt-4o-mini`, `text-embedding-3-small`, `whisper-1`) con citas verificables a fragmentos de artículos y chunks indexados.
- **Base de Datos:** PostgreSQL 16 con extensión vectorial `pgvector` para búsqueda semántica por similitud de cosenos.
- **Proxy Reverso & Producción:** Nginx 1.25 con compresión Gzip, balanceo y enrutamiento SPA.
- **Contenedores:** Docker Compose multi-etapa con orquestación de red interna segura.

---

## 🛠️ Instalación y Despliegue Rápido

### Requisitos previos
- [Docker](https://docs.docker.com/get-docker/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- Clave de API de OpenAI (opcional para funciones RAG y Whisper en local)

### 1. Clonar el repositorio
```bash
git clone https://github.com/sleepydog-21/C3pa.git
cd C3pa
```

### 2. Configurar variables de entorno (opcional)
Copia o crea tu archivo `.env`:
```bash
OPENAI_API_KEY=tu_clave_de_openai_aqui
```

### 3. Levantar la plataforma con Docker Compose
```bash
docker compose up --build -d
```

Los servicios quedarán disponibles en:
- **Plataforma Web C3pa:** [http://localhost:4200](http://localhost:4200)
- **API FastAPI & Documentación Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Base de Datos PostgreSQL/pgvector:** `localhost:5432` (db: `conect_db`, user: `conect_user`)

---

## 👥 Cuentas de Acceso Rápido para Demostración

La plataforma incluye autenticación formal mediante tokens JWT y botones de acceso rápido para los diferentes perfiles del consorcio:

| Rol | Investigador / Perfil | Correo Institucional | Contraseña Demo |
| :--- | :--- | :--- | :--- |
| **Coordinador General** | Administrador del Consorcio | `admin@c3pa.org` | `admin` |
| **Investigadora Titular** | Dra. Elena Ramos (CINVESTAV • Biología de Sistemas) | `elena.ramos@cinvestav.mx` | `c3pa` |
| **Investigador Titular** | Dr. Carlos Méndez (UNAM • Modelado Metabólico) | `carlos.mendez@unam.mx` | `c3pa` |

---

## 📦 Estructura del Repositorio

```text
.
├── backend/                # API REST FastAPI, modelos ORM, pgvector y endpoints
│   ├── app/
│   │   ├── api/v1/         # Endpoints: auth, resources, rag, decisions, posts, chat, etc.
│   │   ├── core/           # Configuración central, seguridad y tokens JWT
│   │   ├── models/         # Modelos de base de datos SQLAlchemy
│   │   └── services/       # GPT Service, Ingesta, Storage y Respaldos
│   └── Dockerfile          # Contenedor de producción Python 3.11
├── frontend/               # Aplicación cliente Angular 18
│   ├── src/app/
│   │   ├── features/       # Ecosistema, Foro, Asistente RAG, Acuerdos, Calendario, etc.
│   │   ├── core/           # Servicios de autenticación, dock flotante y notificaciones
│   │   └── shared/         # Botón universal de dictado por voz y componentes comunes
│   ├── nginx.conf          # Configuración de proxy reverso y SPA
│   └── Dockerfile          # Build multi-etapa con Nginx
├── docs/                   # Especificación técnica formal, diagramas ERD y planes de trabajo
├── scripts/                # Scripts de respaldo automatizado y recuperación de desastres
├── uploads/                # Biblioteca persistente de artículos científicos indexados
├── docker-compose.yml      # Definición de servicios (PostgreSQL pgvector, backend, frontend)
└── README.md               # Esta documentación
```

---

## 🛡️ Respaldos y Recuperación de Desastres

El sistema incluye scripts automatizados para respaldos completos (Base de datos relacional + embeddings vectoriales + artículos PDF + metadatos):

```bash
# Crear un respaldo comprimido con verificación de integridad SHA256:
./scripts/backup.sh

# Restaurar un respaldo existente:
./scripts/restore.sh backups/conect_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## 📄 Licencia y Afiliaciones

Desarrollado para el **Consorcio C3** en colaboración entre grupos de investigación de la **Universidad Nacional Autónoma de México (UNAM)** y el **Centro de Investigación y de Estudios Avanzados (CINVESTAV)**.
