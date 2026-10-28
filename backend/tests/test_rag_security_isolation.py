import unittest
from typing import List, Dict, Any
from app.services.ingestion_service import IngestionService
from app.api.v1.endpoints.rag import (
    search_activity_by_author,
    search_unresolved_comments,
    search_user_mentions,
    search_general_literature
)


class TestRAGSecurityIsolation(unittest.TestCase):
    """
    Batería de pruebas de aislamiento de seguridad RBAC para el Asistente RAG del Consorcio C3.
    Garantiza que la información confidencial entre líneas de investigación o espacios restringidos
    no sufra fuga de datos (data leakage) entre investigadores no autorizados.
    """

    def setUp(self):
        self.ingestion = IngestionService()
        # Sembrar chunks de dos espacios distintos:
        # Espacio A: Biomedicina (Línea 1)
        # Espacio B: Nanotecnología Privada (Línea 2)
        # Espacio C: Consorcio General (Transversal)
        dummy_vector_1 = [0.1] * 1536
        dummy_vector_2 = [0.9] * 1536

        self.ingestion.indexed_chunks = [
            {
                "id": "chunk-biomed-01",
                "resource_id": "res-biomed",
                "space_id": "space-biomed",
                "title": "Protocolo Oncológico Confidencial",
                "page_number": 1,
                "chunk_index": 0,
                "tokens_count": 450,
                "text": "Dosis de doxorrubicina fijada en 50 nM para líneas tumorales.",
                "embedding": dummy_vector_1,
                "author": "Dra. Elena Ramos"
            },
            {
                "id": "chunk-nanotech-private-01",
                "resource_id": "res-nano",
                "space_id": "space-nanotech-restricted",
                "title": "Patente Secreta de Nanocelulosa",
                "page_number": 1,
                "chunk_index": 0,
                "tokens_count": 480,
                "text": "Catalizador propietario de platino con pureza 99.999% no publicado.",
                "embedding": dummy_vector_1,
                "author": "Dr. Carlos Méndez"
            },
            {
                "id": "chunk-general-01",
                "resource_id": "res-gen",
                "space_id": "space-general",
                "title": "Estatutos y Buenas Prácticas del Consorcio",
                "page_number": 1,
                "chunk_index": 0,
                "tokens_count": 300,
                "text": "Guía de coautoría y publicación conjunta para los 80 miembros.",
                "embedding": dummy_vector_1,
                "author": "Coordinación C3"
            }
        ]

    def test_space_isolation_enforces_no_leakage(self):
        """
        Garantiza que un investigador con permiso exclusivo para 'space-biomed'
        JAMÁS reciba fragmentos de 'space-nanotech-restricted'.
        """
        query_vector = [0.1] * 1536
        authorized_space = "space-biomed"

        results = self.ingestion.search_similar_chunks(
            query_vector=query_vector,
            space_id=authorized_space,
            top_k=5
        )

        returned_space_ids = [c["space_id"] for c in results]

        # Validaciones de seguridad
        assert "space-nanotech-restricted" not in returned_space_ids, (
            "VULNERABILIDAD CRÍTICA: Se filtraron chunks de un espacio no autorizado"
        )
        assert "space-biomed" in returned_space_ids
        assert "space-general" in returned_space_ids  # Espacio general transversal permitido

    def test_user_mentions_are_strictly_addressed(self):
        """
        Valida que al consultar menciones para la 'Dra. Principal',
        no se expongan menciones que no le corresponden.
        """
        mentions = search_user_mentions(user_identifier="@Dra. Principal")
        for m in mentions:
            assert "@Dra. Principal".lower() in m["text"].lower()

    def test_unresolved_comments_flag_integrity(self):
        """
        Verifica que solo las dudas no resueltas (is_unresolved=True)
        sean devueltas al filtro de pendientes.
        """
        unresolved = search_unresolved_comments()
        for item in unresolved:
            assert item["is_unresolved"] is True
            assert "PENDIENTE" in item["text"]
            assert item["target_tab"] == "pdf-viewer"

    def test_author_activity_scoping(self):
        """
        Asegura que la búsqueda por autor devuelva únicamente registros atribuibles a ese autor o laboratorio.
        """
        activity = search_activity_by_author("Carlos Méndez")
        assert len(activity) > 0
        for item in activity:
            assert "Carlos Méndez".lower() in item["author"].lower()


if __name__ == "__main__":
    test = TestRAGSecurityIsolation()
    test.setup_method()
    test.test_space_isolation_enforces_no_leakage()
    test.test_user_mentions_are_strictly_addressed()
    test.test_unresolved_comments_flag_integrity()
    test.test_author_activity_scoping()
    print("✓ TODAS LAS PRUEBAS DE AISLAMIENTO RBAC Y SEGURIDAD RAG PASARON CON ÉXITO.")
