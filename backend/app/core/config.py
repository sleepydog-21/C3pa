from typing import List, Union, Optional
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "C3pa - Plataforma de Colaboración y Modelado Metabólico"
    API_V1_STR: str = "/api/v1"

    # Base de Datos
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/conect_db"

    # Seguridad
    SECRET_KEY: str = "secret-key-default-cambiar-en-produccion"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # OpenAI / C3 vLLM Service (OpenAI-compatible)
    OPENAI_BASE_URL: Optional[str] = "https://gptoss.c3.unam.mx/v1"
    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gptoss"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_EMBEDDING_DIMENSIONS: int = 1536

    # Storage
    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_DIR: str = "./uploads"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
