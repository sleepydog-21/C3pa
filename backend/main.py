from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_database
from app.api.v1.endpoints import rag, resources, annotations, spaces, posts, decisions, invitations, digests, chat, events, analytics, system, auth, notifications, triage

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar tablas y extensión vector de PostgreSQL
    try:
        await init_database()
        print("✓ Base de datos PostgreSQL y pgvector inicializadas con éxito.")
    except Exception as e:
        print(f"Aviso BD en arranque: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Backend para la Plataforma de Colaboración Científica Asíncrona con Asistente RAG y GPT Service.",
    lifespan=lifespan
)

# Configuración de CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routers de la API v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(rag.router, prefix=settings.API_V1_STR)
app.include_router(resources.router, prefix=settings.API_V1_STR)
app.include_router(annotations.router, prefix=settings.API_V1_STR)
app.include_router(spaces.router, prefix=settings.API_V1_STR)
app.include_router(posts.router, prefix=settings.API_V1_STR)
app.include_router(decisions.router, prefix=settings.API_V1_STR)
app.include_router(invitations.router, prefix=settings.API_V1_STR)
app.include_router(digests.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(system.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(triage.router, prefix=settings.API_V1_STR)



@app.get("/health", tags=["Estado"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "openai_model": settings.OPENAI_CHAT_MODEL,
        "embedding_model": settings.OPENAI_EMBEDDING_MODEL
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
