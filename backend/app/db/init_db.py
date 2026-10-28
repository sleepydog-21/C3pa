import uuid
from datetime import datetime, date
from sqlalchemy import text, select
from app.db.session import engine, AsyncSessionLocal
from app.models.entities import (
    Base, Institution, User, Space, SpaceMember,
    Resource, Post, Comment, Decision, Task, WeeklyDigest
)

async def init_database():
    """
    Crea las 22 tablas en PostgreSQL con pgvector e inserta los datos semilla del consorcio
    si no existen previamente.
    """
    async with engine.begin() as conn:
        # Asegurar extensión vector para pgvector
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # Crear todas las tablas declaradas
        await conn.run_sync(Base.metadata.create_all)

    # Sembrar datos base si la tabla de usuarios está vacía
    async with AsyncSessionLocal() as session:
        admin_check = await session.execute(
            select(User).where(User.id == uuid.UUID("00000000-0000-0000-0000-000000000000"))
        )
        if admin_check.scalar_one_or_none():
            return  # Ya inicializada

        # 1. Instituciones
        inst_unam = Institution(
            id=uuid.uuid4(),
            name="Universidad Nacional Autónoma de México (UNAM)",
            country="México"
        )
        inst_cinvestav = Institution(
            id=uuid.uuid4(),
            name="Centro de Investigación y de Estudios Avanzados (CINVESTAV)",
            country="México"
        )
        inst_c3 = Institution(
            id=uuid.uuid4(),
            name="Consorcio de Ciencias de la Complejidad (C3)",
            country="México"
        )
        session.add_all([inst_unam, inst_cinvestav, inst_c3])
        await session.flush()

        # 2. Usuario Administrador (Tú)
        admin_user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
            institution_id=inst_c3.id,
            email="admin@consorcio.org",
            hashed_password="scrypt:admin-session-secure",
            full_name="Administrador",
            academic_title="Coordinador General del Consorcio",
            role="ADMIN",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            is_active=True
        )

        # Investigadores del consorcio
        user_carlos = User(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            institution_id=inst_unam.id,
            email="carlos.mendez@biomateriales.unam.mx",
            hashed_password="scrypt:default-hash",
            full_name="Dr. Carlos Méndez",
            academic_title="Dr. en Ciencias Químicas",
            role="RESEARCHER",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            is_active=True
        )
        user_elena = User(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            institution_id=inst_cinvestav.id,
            email="elena.ramos@cinvestav.mx",
            hashed_password="scrypt:default-hash",
            full_name="Dra. Elena Ramos",
            academic_title="Investigadora Titular",
            role="RESEARCHER",
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
            is_active=True
        )
        user_sofia = User(
            id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
            institution_id=inst_unam.id,
            email="sofia.hernandez@medicina.unam.mx",
            hashed_password="scrypt:default-hash",
            full_name="Dra. Sofía Hernández",
            academic_title="M.Sc. Biotecnología Médica",
            role="RESEARCHER",
            avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
            is_active=True
        )
        session.add_all([admin_user, user_carlos, user_elena, user_sofia])
        await session.flush()

        # 3. Espacios / Líneas de Investigación
        space_general = Space(
            id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            name="Consorcio General",
            slug="consorcio-general",
            description="Espacio transversal para anuncios institucionales, actas y debates interdisciplinarios.",
            is_private=False,
            leader_id=admin_user.id
        )
        space_linea1 = Space(
            id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            name="Línea 1: Nanocelulosa y Síntesis",
            slug="nanocelulosa-sintesis",
            description="Optimización de medios de cultivo, escalamiento de biorreactores y caracterización fisicoquímica.",
            is_private=False,
            leader_id=user_carlos.id
        )
        space_linea2 = Space(
            id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            name="Línea 2: Biomateriales y Citotoxicidad",
            slug="biomateriales-citotoxicidad",
            description="Evaluación celular, andamios 3D y biocompatibilidad in vitro.",
            is_private=False,
            leader_id=user_sofia.id
        )
        session.add_all([space_general, space_linea1, space_linea2])
        await session.flush()

        # Miembros
        session.add_all([
            SpaceMember(space_id=space_general.id, user_id=admin_user.id, role="LEADER"),
            SpaceMember(space_id=space_general.id, user_id=user_carlos.id, role="CONTRIBUTOR"),
            SpaceMember(space_id=space_general.id, user_id=user_elena.id, role="CONTRIBUTOR"),
            SpaceMember(space_id=space_general.id, user_id=user_sofia.id, role="CONTRIBUTOR"),
            SpaceMember(space_id=space_linea1.id, user_id=user_carlos.id, role="LEADER"),
            SpaceMember(space_id=space_linea2.id, user_id=user_sofia.id, role="LEADER")
        ])

        # 4. Acuerdos y Tareas Semilla
        dec1 = Decision(
            id=uuid.uuid4(),
            space_id=space_linea1.id,
            recorded_by=admin_user.id,
            title="Estandarización de Concentración de Doxorrubicina a 50 nM",
            rationale="Se consensuó la concentración de trabajo para evitar citotoxicidad inespecífica según resultados del lote piloto.",
            status="APPROVED"
        )
        session.add(dec1)
        await session.flush()

        task1 = Task(
            id=uuid.uuid4(),
            space_id=space_linea1.id,
            decision_id=dec1.id,
            assigned_to=user_carlos.id,
            created_by=admin_user.id,
            title="Calibración espectrofotométrica lote 3B",
            description="Verificar curva patrón y coeficiente de correlación R2 >= 0.995.",
            status="IN_PROGRESS",
            due_date=date(2026, 11, 15)
        )
        task2 = Task(
            id=uuid.uuid4(),
            space_id=space_linea1.id,
            decision_id=dec1.id,
            assigned_to=user_elena.id,
            created_by=admin_user.id,
            title="Reporte de viabilidad con buffer PBS 1X",
            description="Subir matriz de datos y micrografías fluorescentes.",
            status="TODO",
            due_date=date(2026, 11, 20)
        )
        session.add_all([task1, task2])

        await session.commit()
