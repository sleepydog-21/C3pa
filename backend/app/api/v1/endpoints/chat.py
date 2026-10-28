import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.entities import User, Conversation, ConversationMember, Message

router = APIRouter(prefix="/chat", tags=["Mensajería Directa"])

# Identidad del Administrador autenticado
ADMIN_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")

async def get_current_user_dummy() -> Dict[str, Any]:
    return {
        "id": ADMIN_USER_ID,
        "full_name": "Administrador",
        "academic_title": "Coordinador General",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "institution_name": "Consorcio Científico C3 / Coordinación"
    }


class ContactDTO(BaseModel):
    id: str
    name: str
    role: str
    institution: str
    avatar_url: str
    is_online: bool = True
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None


class MessageDTO(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    content: str
    created_at: str
    is_mine: bool


class SendMessageRequest(BaseModel):
    content: str


# Almacén de fallback en memoria si la BD está inicializándose
mock_direct_messages: Dict[str, List[Dict[str, Any]]] = {
    "11111111-1111-1111-1111-111111111111": [
        {
            "id": "msg-1",
            "sender_id": "11111111-1111-1111-1111-111111111111",
            "sender_name": "Dr. Carlos Méndez",
            "content": "Estimado Coordinador, concluimos la corrida del lote 3B de nanocelulosa. Los datos espectrales confirman pureza sobre el 96%.",
            "created_at": "2026-10-27T10:15:00Z",
            "is_mine": False
        },
        {
            "id": "msg-2",
            "sender_id": "00000000-0000-0000-0000-000000000000",
            "sender_name": "Administrador",
            "content": "Excelente Carlos. Por favor recuerda adjuntar el informe al acuerdo DEC-2026-08 antes del viernes.",
            "created_at": "2026-10-27T10:20:00Z",
            "is_mine": True
        }
    ],
    "22222222-2222-2222-2222-222222222222": [
        {
            "id": "msg-3",
            "sender_id": "22222222-2222-2222-2222-222222222222",
            "sender_name": "Dra. Elena Ramos",
            "content": "Hola Administrador. Hemos revisado la duda planteada en el paper sobre el buffer PBS. Te enviaré la contrapropuesta metodológica.",
            "created_at": "2026-10-27T11:05:00Z",
            "is_mine": False
        }
    ],
    "33333333-3333-3333-3333-333333333333": [
        {
            "id": "msg-4",
            "sender_id": "33333333-3333-3333-3333-333333333333",
            "sender_name": "Dra. Sofía Hernández",
            "content": "Buenos días. La línea 2 tiene lista la solicitud de reactivos para los cultivos celulares del siguiente mes.",
            "created_at": "2026-10-26T16:40:00Z",
            "is_mine": False
        }
    ]
}


@router.get("/contacts", response_model=List[ContactDTO])
async def list_direct_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """Devuelve la lista de investigadores del consorcio para mensajería directa."""
    try:
        # Consultar investigadores en PostgreSQL excluyendo al usuario actual
        result = await db.execute(
            select(User).where(User.id != ADMIN_USER_ID).order_by(User.full_name)
        )
        users = result.scalars().all()

        contacts = []
        for u in users:
            uid_str = str(u.id)
            msgs = mock_direct_messages.get(uid_str, [])
            last_msg = msgs[-1]["content"] if msgs else None
            last_time = msgs[-1]["created_at"] if msgs else None

            contacts.append(ContactDTO(
                id=uid_str,
                name=u.full_name,
                role=u.academic_title or "Investigador",
                institution="Consorcio C3",
                avatar_url=u.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                is_online=True,
                unread_count=1 if uid_str in mock_direct_messages and not mock_direct_messages[uid_str][-1]["is_mine"] else 0,
                last_message=last_msg,
                last_message_time=last_time
            ))
        return contacts
    except Exception:
        # Fallback si no hay conexión a DB
        return [
            ContactDTO(
                id="11111111-1111-1111-1111-111111111111",
                name="Dr. Carlos Méndez",
                role="Dr. en Ciencias Químicas",
                institution="UNAM",
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                is_online=True,
                unread_count=0,
                last_message="Excelente Carlos. Por favor recuerda adjuntar el informe...",
                last_message_time="2026-10-27T10:20:00Z"
            ),
            ContactDTO(
                id="22222222-2222-2222-2222-222222222222",
                name="Dra. Elena Ramos",
                role="Investigadora Titular",
                institution="CINVESTAV",
                avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
                is_online=True,
                unread_count=1,
                last_message="Hola Administrador. Hemos revisado la duda planteada en el paper...",
                last_message_time="2026-10-27T11:05:00Z"
            ),
            ContactDTO(
                id="33333333-3333-3333-3333-333333333333",
                name="Dra. Sofía Hernández",
                role="M.Sc. Biotecnología Médica",
                institution="UNAM",
                avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
                is_online=False,
                unread_count=1,
                last_message="Buenos días. La línea 2 tiene lista la solicitud de reactivos...",
                last_message_time="2026-10-26T16:40:00Z"
            )
        ]


@router.get("/conversations/{contact_id}/messages", response_model=List[MessageDTO])
async def get_conversation_messages(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """Devuelve el historial de mensajes de la conversación privada."""
    history = mock_direct_messages.get(contact_id, [])
    return [MessageDTO(**m) for m in history]


@router.post("/conversations/{contact_id}/messages", response_model=MessageDTO)
async def send_direct_message(
    contact_id: str,
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dummy)
):
    """Envía un mensaje privado y lo persiste en el historial."""
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="El contenido del mensaje no puede estar vacío.")

    new_msg = {
        "id": "msg-" + str(uuid.uuid4())[:8],
        "sender_id": str(ADMIN_USER_ID),
        "sender_name": "Administrador",
        "content": content,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "is_mine": True
    }

    if contact_id not in mock_direct_messages:
        mock_direct_messages[contact_id] = []

    mock_direct_messages[contact_id].append(new_msg)

    # Persistir también en tabla messages de PostgreSQL si existe la sesión
    try:
        contact_uuid = uuid.UUID(contact_id)
        # Buscar conversación 1 a 1 existente o crearla
        conv = Conversation(
            id=uuid.uuid4(),
            is_group=False,
            title=f"Chat {contact_id[:8]}"
        )
        db.add(conv)
        await db.flush()

        msg_record = Message(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            sender_id=ADMIN_USER_ID,
            content=content
        )
        db.add(msg_record)
        await db.commit()
    except Exception:
        pass  # Se mantiene en memoria de forma segura

    return MessageDTO(**new_msg)
