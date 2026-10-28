import uuid
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/invitations", tags=["Invitaciones y Acceso Restringido"])


class InvitationCreateRequest(BaseModel):
    email: EmailStr
    role: str = "RESEARCHER"  # "ADMIN", "LEADER", "RESEARCHER", "GUEST"
    institution_name: str
    target_space_id: Optional[str] = "space-general"
    expires_in_days: int = 7


class InvitationDTO(BaseModel):
    id: str
    inviter_name: str
    email: str
    token: str
    role: str
    institution_name: str
    target_space_id: str
    target_space_name: str
    invite_url: str
    expires_at: str
    is_used: bool
    status: str  # "PENDING", "USED", "EXPIRED"
    created_at: str


class VerifyTokenResponse(BaseModel):
    valid: bool
    email: str
    role: str
    institution_name: str
    target_space_id: str
    target_space_name: str
    expires_at: str


class RegisterByInviteRequest(BaseModel):
    token: str
    full_name: str
    academic_title: str
    password: str
    avatar_url: Optional[str] = None


class UserRegisteredResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    institution_name: str
    academic_title: str
    message: str


# Base de datos simulada de invitaciones
mock_invitations_db: Dict[str, Dict[str, Any]] = {
    "inv-1": {
        "id": "inv-1",
        "inviter_name": "Dra. Elena Ramos",
        "email": "carlos.soto@ciencias.unam.mx",
        "token": "tok_inv_unam_nanocelulosa_987",
        "role": "RESEARCHER",
        "institution_name": "Universidad Nacional Autónoma",
        "target_space_id": "space-nanocelulosa",
        "target_space_name": "Línea 1: Nanocelulosa y Síntesis",
        "expires_at": (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z",
        "is_used": False,
        "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat() + "Z"
    },
    "inv-2": {
        "id": "inv-2",
        "inviter_name": "Dra. Elena Ramos",
        "email": "m.vega@biomedicas.cinvestav.mx",
        "token": "tok_inv_cinvestav_biomater_456",
        "role": "LEADER",
        "institution_name": "CINVESTAV",
        "target_space_id": "space-biomateriales",
        "target_space_name": "Línea 2: Biomateriales y Citotoxicidad",
        "expires_at": (datetime.utcnow() + timedelta(days=6)).isoformat() + "Z",
        "is_used": False,
        "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
    },
    "inv-3": {
        "id": "inv-3",
        "inviter_name": "Dra. Elena Ramos",
        "email": "pablo.morales@saludpublica.org",
        "token": "tok_inv_insp_farmaco_123",
        "role": "RESEARCHER",
        "institution_name": "Inst. Nal. de Salud Pública",
        "target_space_id": "space-farmacologia",
        "target_space_name": "Línea 3: Farmacología y Liberación",
        "expires_at": (datetime.utcnow() - timedelta(days=10)).isoformat() + "Z",
        "is_used": True,
        "created_at": (datetime.utcnow() - timedelta(days=15)).isoformat() + "Z"
    }
}


def _calc_status(inv: Dict[str, Any]) -> str:
    if inv["is_used"]:
        return "USED"
    exp = datetime.fromisoformat(inv["expires_at"].replace("Z", ""))
    if datetime.utcnow() > exp:
        return "EXPIRED"
    return "PENDING"


@router.get("", response_model=List[InvitationDTO])
async def list_invitations():
    """Lista todas las invitaciones generadas por la coordinación."""
    results = []
    for inv in mock_invitations_db.values():
        status = _calc_status(inv)
        dto = InvitationDTO(
            id=inv["id"],
            inviter_name=inv["inviter_name"],
            email=inv["email"],
            token=inv["token"],
            role=inv["role"],
            institution_name=inv["institution_name"],
            target_space_id=inv["target_space_id"],
            target_space_name=inv["target_space_name"],
            invite_url=f"http://localhost:4200/register?token={inv['token']}",
            expires_at=inv["expires_at"],
            is_used=inv["is_used"],
            status=status,
            created_at=inv["created_at"]
        )
        results.append(dto)

    results.sort(key=lambda x: x.created_at, reverse=True)
    return results


@router.post("", response_model=InvitationDTO)
async def create_invitation(request: InvitationCreateRequest):
    """
    Genera un token seguro y un enlace único de invitación para un investigador.
    """
    # Verificar si ya existe invitación pendiente para este email
    for inv in mock_invitations_db.values():
        if inv["email"].lower() == request.email.lower() and not inv["is_used"]:
            exp = datetime.fromisoformat(inv["expires_at"].replace("Z", ""))
            if datetime.utcnow() <= exp:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ya existe una invitación activa y vigente para {request.email}."
                )

    space_names = {
        "space-general": "Consorcio General",
        "space-nanocelulosa": "Línea 1: Nanocelulosa y Síntesis",
        "space-biomateriales": "Línea 2: Biomateriales y Citotoxicidad",
        "space-farmacologia": "Línea 3: Farmacología y Liberación"
    }
    space_name = space_names.get(request.target_space_id or "space-general", "Línea Temática")

    new_id = f"inv-{uuid.uuid4().hex[:8]}"
    token = f"tok_{secrets.token_urlsafe(24)}"
    now = datetime.utcnow()
    expires_at = (now + timedelta(days=request.expires_in_days)).isoformat() + "Z"

    record = {
        "id": new_id,
        "inviter_name": "Dra. Elena Ramos (Coordinación)",
        "email": request.email.lower(),
        "token": token,
        "role": request.role.upper(),
        "institution_name": request.institution_name,
        "target_space_id": request.target_space_id or "space-general",
        "target_space_name": space_name,
        "expires_at": expires_at,
        "is_used": False,
        "created_at": now.isoformat() + "Z"
    }

    mock_invitations_db[new_id] = record

    return InvitationDTO(
        **record,
        invite_url=f"http://localhost:4200/register?token={token}",
        status="PENDING"
    )


@router.get("/verify/{token}", response_model=VerifyTokenResponse)
async def verify_invitation_token(token: str):
    """
    Valida públicamente si un token de invitación es auténtico y está vigente.
    Retorna la información predefinida del investigador.
    """
    found_inv = None
    for inv in mock_invitations_db.values():
        if inv["token"] == token:
            found_inv = inv
            break

    if not found_inv:
        raise HTTPException(status_code=404, detail="El token de invitación no existe o es inválido.")

    if found_inv["is_used"]:
        raise HTTPException(status_code=400, detail="Este enlace de invitación ya ha sido utilizado para registrar una cuenta.")

    exp = datetime.fromisoformat(found_inv["expires_at"].replace("Z", ""))
    if datetime.utcnow() > exp:
        raise HTTPException(status_code=400, detail="Este enlace de invitación ha expirado. Solicita una nueva invitación a la coordinación.")

    return VerifyTokenResponse(
        valid=True,
        email=found_inv["email"],
        role=found_inv["role"],
        institution_name=found_inv["institution_name"],
        target_space_id=found_inv["target_space_id"],
        target_space_name=found_inv["target_space_name"],
        expires_at=found_inv["expires_at"]
    )


@router.post("/register", response_model=UserRegisteredResponse)
async def register_by_invite(request: RegisterByInviteRequest):
    """
    Completa el registro de un nuevo investigador usando su token único.
    Activa la cuenta y marca la invitación como utilizada.
    """
    # 1. Validar token
    found_inv = None
    for inv in mock_invitations_db.values():
        if inv["token"] == request.token:
            found_inv = inv
            break

    if not found_inv:
        raise HTTPException(status_code=404, detail="Token de invitación no encontrado.")
    if found_inv["is_used"]:
        raise HTTPException(status_code=400, detail="La invitación ya fue utilizada previamente.")

    exp = datetime.fromisoformat(found_inv["expires_at"].replace("Z", ""))
    if datetime.utcnow() > exp:
        raise HTTPException(status_code=400, detail="La invitación ha caducado.")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")

    # 2. Marcar invitación como usada
    found_inv["is_used"] = True

    new_user_id = str(uuid.uuid4())

    return UserRegisteredResponse(
        id=new_user_id,
        full_name=request.full_name,
        email=found_inv["email"],
        role=found_inv["role"],
        institution_name=found_inv["institution_name"],
        academic_title=request.academic_title,
        message=f"¡Bienvenido/a al Consorcio Conect, {request.full_name}! Tu cuenta ha sido activada y tienes acceso asignado a {found_inv['target_space_name']}."
    )
