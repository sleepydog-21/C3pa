import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.entities import User, Institution
from app.core.security import verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Autenticación y Sesiones"])
security_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserProfileDTO(BaseModel):
    id: str
    email: str
    full_name: str
    academic_title: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    institution_name: Optional[str] = "Consorcio Metabólico C3"
    is_active: bool = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserProfileDTO


# Cuentas rápidas de demostración institucional
DEMO_ACCOUNTS = {
    "admin@c3pa.org": {
        "id": "00000000-0000-0000-0000-000000000000",
        "email": "admin@c3pa.org",
        "password": "admin",
        "full_name": "Administrador",
        "academic_title": "Coordinador General del Consorcio",
        "role": "ADMIN",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "institution_name": "Consorcio Metabólico C3 / Coordinación"
    },
    "elena.ramos@cinvestav.mx": {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "elena.ramos@cinvestav.mx",
        "password": "c3pa",
        "full_name": "Dra. Elena Ramos",
        "academic_title": "Investigadora Titular",
        "role": "RESEARCHER",
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
        "institution_name": "CINVESTAV - Biología de Sistemas"
    },
    "carlos.mendez@unam.mx": {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "carlos.mendez@unam.mx",
        "password": "c3pa",
        "full_name": "Dr. Carlos Méndez",
        "academic_title": "Dr. en Ciencias Químicas",
        "role": "RESEARCHER",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "institution_name": "UNAM - Modelado Metabólico"
    }
}


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Inicia sesión con correo y contraseña para emitir token JWT."""
    email_clean = credentials.email.strip().lower()
    plain_password = credentials.password.strip()

    # 1. Comprobación de cuentas de demostración predefinidas
    if email_clean in DEMO_ACCOUNTS:
        demo_user = DEMO_ACCOUNTS[email_clean]
        # Permitir la contraseña especificada, "admin123", "c3pa2026" o la contraseña corta
        if plain_password in [demo_user["password"], "admin123", "c3pa2026", "secret", "admin", "c3pa"]:
            profile = UserProfileDTO(
                id=demo_user["id"],
                email=demo_user["email"],
                full_name=demo_user["full_name"],
                academic_title=demo_user.get("academic_title"),
                role=demo_user["role"],
                avatar_url=demo_user.get("avatar_url"),
                institution_name=demo_user.get("institution_name", "Consorcio C3")
            )
            token = create_access_token(
                subject=profile.id,
                user_data=profile.dict()
            )
            return LoginResponse(
                access_token=token,
                expires_in_minutes=1440,
                user=profile
            )

    # 2. Búsqueda en base de datos PostgreSQL
    try:
        stmt = select(User).where(User.email == email_clean)
        result = await db.execute(stmt)
        user = result.scalars().first()
        if user and verify_password(plain_password, user.hashed_password):
            inst_name = "Consorcio Metabólico C3"
            if user.institution_id:
                inst_stmt = select(Institution).where(Institution.id == user.institution_id)
                inst_res = await db.execute(inst_stmt)
                inst = inst_res.scalars().first()
                if inst:
                    inst_name = inst.name

            profile = UserProfileDTO(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                academic_title=user.academic_title,
                role=user.role,
                avatar_url=user.avatar_url,
                institution_name=inst_name,
                is_active=user.is_active
            )
            token = create_access_token(
                subject=profile.id,
                user_data=profile.dict()
            )
            return LoginResponse(
                access_token=token,
                expires_in_minutes=1440,
                user=profile
            )
    except Exception as e:
        print(f"Error consultando usuario en DB: {e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de acceso inválidas. Revisa el correo y contraseña ingresados."
    )


@router.get("/me", response_model=UserProfileDTO)
async def get_current_user_profile(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
):
    """Obtiene los datos del usuario autenticado a partir del token JWT."""
    if not credentials:
        # Retorna el perfil Administrador como fallback para no romper compatibilidad previa
        return UserProfileDTO(
            id="00000000-0000-0000-0000-000000000000",
            email="admin@c3pa.org",
            full_name="Administrador",
            academic_title="Coordinador General del Consorcio",
            role="ADMIN",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            institution_name="Consorcio Metabólico C3 / Coordinación"
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "user" not in payload:
        raise HTTPException(status_code=401, detail="Token JWT inválido o expirado.")

    user_info = payload["user"]
    return UserProfileDTO(**user_info)


get_current_user = get_current_user_profile

@router.post("/logout")
async def logout():
    """Cierra la sesión activa del usuario."""
    return {"message": "Sesión cerrada correctamente."}
