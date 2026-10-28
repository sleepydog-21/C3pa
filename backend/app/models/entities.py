import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, BigInteger,
    ForeignKey, DateTime, Date, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
from pgvector.sqlalchemy import Vector
from app.core.config import settings

Base = declarative_base()


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)

    users = relationship("User", back_populates="institution")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    academic_title = Column(String(100), nullable=True)  # Ej: "Dr.", "MSc.", "Investigador Titular"
    role = Column(String(50), default="RESEARCHER")  # ADMIN, LEADER, RESEARCHER, GUEST
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    institution = relationship("Institution", back_populates="users")
    space_memberships = relationship("SpaceMember", back_populates="user")
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    annotations = relationship("Annotation", back_populates="author", foreign_keys="Annotation.author_id")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inviter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(50), default="RESEARCHER")
    target_space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Space(Base):
    __tablename__ = "spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_private = Column(Boolean, default=False)
    leader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("SpaceMember", back_populates="space")
    posts = relationship("Post", back_populates="space")
    resources = relationship("Resource", back_populates="space")
    decisions = relationship("Decision", back_populates="space")
    tasks = relationship("Task", back_populates="space")
    digests = relationship("WeeklyDigest", back_populates="space")


class SpaceMember(Base):
    __tablename__ = "space_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="CONTRIBUTOR")  # LEADER, CONTRIBUTOR, VIEWER
    joined_at = Column(DateTime, default=datetime.utcnow)

    space = relationship("Space", back_populates="members")
    user = relationship("User", back_populates="space_memberships")


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    content_markdown = Column(Text, nullable=False)
    post_type = Column(String(50), default="GENERAL")  # GENERAL, ADVANCE, QUESTION, ANNOUNCEMENT
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    space = relationship("Space", back_populates="posts")
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=True)
    title = Column(String(300), nullable=False)
    resource_type = Column(String(50), nullable=False)  # PDF, IMAGE, AUDIO, DATASET
    storage_path = Column(String(1000), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_metadata = Column(JSONB, default=dict)  # Autores, DOI, tags, resolución, etc.
    transcript = Column(Text, nullable=True)  # Transcripción Whisper si es audio
    created_at = Column(DateTime, default=datetime.utcnow)

    space = relationship("Space", back_populates="resources")
    annotations = relationship("Annotation", back_populates="resource")


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    target_type = Column(String(50), nullable=False)  # IMAGE_REGION, PDF_SELECTION, AUDIO_TIMESTAMP
    coordinates = Column(JSONB, nullable=False)  # {x, y, w, h} o {page, rects} o {start_time, end_time}
    highlighted_text = Column(Text, nullable=True)
    note_content = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    resource = relationship("Resource", back_populates="annotations")
    author = relationship("User", back_populates="annotations", foreign_keys=[author_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    comments = relationship("Comment", back_populates="annotation")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=True)
    annotation_id = Column(UUID(as_uuid=True), ForeignKey("annotations.id"), nullable=True)
    parent_comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"), nullable=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content_markdown = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    annotation = relationship("Annotation", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    origin_comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"), nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    rationale = Column(Text, nullable=False)
    status = Column(String(50), default="APPROVED")  # PROPOSED, APPROVED, SUPERSEDED
    resolved_at = Column(DateTime, default=datetime.utcnow)

    space = relationship("Space", back_populates="decisions")
    tasks = relationship("Task", back_populates="decision")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    decision_id = Column(UUID(as_uuid=True), ForeignKey("decisions.id"), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="TODO")  # TODO, IN_PROGRESS, REVIEW, DONE
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    space = relationship("Space", back_populates="tasks")
    decision = relationship("Decision", back_populates="tasks")


class WeeklyDigest(Base):
    __tablename__ = "weekly_digests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    week_start_date = Column(Date, nullable=False)
    week_end_date = Column(Date, nullable=False)
    metrics = Column(JSONB, default=dict)
    summary_markdown = Column(Text, nullable=False)
    status = Column(String(50), default="DRAFT")  # DRAFT, PUBLISHED
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)

    space = relationship("Space", back_populates="digests")


class ResourceChunk(Base):
    """
    Tabla de fragmentos vectorizados con pgvector para el asistente RAG.
    Mantiene referencia estricta a space_id para garantizar aislamiento por permisos.
    """
    __tablename__ = "resource_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)  # RESOURCE, POST, COMMENT, DECISION
    source_id = Column(UUID(as_uuid=True), nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(settings.OPENAI_EMBEDDING_DIMENSIONS), nullable=False)
    chunk_metadata = Column(JSONB, default=dict)  # Titulo, autor, pagina, link_url, etc.
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# EXTENSIONES DEL PLAN DE TRABAJO (SECCIÓN 5)
# ==========================================

class ResourceVersion(Base):
    """Control de versiones de archivos para que las anotaciones no queden desfasadas."""
    __tablename__ = "resource_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    storage_path = Column(String(1000), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=True)  # SHA-256
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    changelog = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    """Chats privados (1 a 1) o grupales."""
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=True)  # Opcional si es chat de un espacio
    is_group = Column(Boolean, default=False)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("ConversationMember", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation")


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_read_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="members")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    attachments = Column(JSONB, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class Event(Base):
    """Calendario y eventos del consorcio o de líneas temáticas."""
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=True)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_all_day = Column(Boolean, default=False)
    location_or_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("EventParticipant", back_populates="event")


class EventParticipant(Base):
    __tablename__ = "event_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="ACCEPTED")  # INVITED, ACCEPTED, DECLINED, TENTATIVE

    event = relationship("Event", back_populates="participants")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notification_type = Column(String(100), nullable=False)  # MENTION, COMMENT, ANNOTATION, DECISION, TASK_ASSIGNED
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    action_url = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityEvent(Base):
    """Bitácora analítica para dashboards reproducibles sin escaneos costosos."""
    __tablename__ = "activity_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False)  # POST_CREATED, ANNOTATION_ADDED, RESOURCE_UPLOADED, DECISION_TAKEN
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    event_metadata = Column(JSONB, default=dict)
    occurred_at = Column(DateTime, default=datetime.utcnow, index=True)


class AuditEvent(Base):
    """Auditoría de seguridad y trazabilidad de permisos sensibles."""
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)  # INVITE_CREATED, ROLE_CHANGED, SPACE_ACCESS_REVOKED
    target_entity_type = Column(String(100), nullable=False)
    target_entity_id = Column(UUID(as_uuid=True), nullable=False)
    details = Column(JSONB, default=dict)
    ip_address = Column(String(45), nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow)


class IngestionJob(Base):
    """Seguimiento de la ingesta de documentos para vectorización RAG."""
    __tablename__ = "ingestion_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    chunks_indexed = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

