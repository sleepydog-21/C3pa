#!/usr/bin/env bash
# ==============================================================================
# CONECT — Script de Respaldo Automatizado de Base de Datos y Almacenamiento
# Compatible con PostgreSQL 16 + pgvector y Archivos Multimedia
# ==============================================================================
set -euo pipefail

# Directorios de trabajo
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_NAME="conect_backup_${TIMESTAMP}"
TARGET_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
ARCHIVE_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Parámetros del contenedor
CONTAINER_DB="conect_postgres"
DB_NAME="conect_db"
DB_USER="conect_user"
RETENTION_COUNT=7

echo "=========================================================="
echo "🛡️  INICIANDO RESPALDO DEL CONSORCIO C3: ${TIMESTAMP}"
echo "=========================================================="

# 1. Asegurar directorio de respaldos
mkdir -p "${TARGET_DIR}"

# 2. Respaldo de Base de Datos PostgreSQL con pgvector
echo "📦 1/4 Extrayendo volcado de PostgreSQL con pgvector (${DB_NAME})..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_DB}$"; then
  echo "❌ Error: El contenedor de base de datos '${CONTAINER_DB}' no está en ejecución."
  rm -rf "${TARGET_DIR}"
  exit 1
fi

# Volcado binario custom (pg_dump -Fc) que preserva índices vectoriales y tipos
docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v > "${TARGET_DIR}/${DB_NAME}.dump" 2>/dev/null

# Volcado en texto plano SQL legible de respaldo
docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists > "${TARGET_DIR}/${DB_NAME}.sql" 2>/dev/null

DUMP_SIZE=$(du -h "${TARGET_DIR}/${DB_NAME}.dump" | awk '{print $1}')
echo "   ✓ Base de datos volcada con éxito (${DUMP_SIZE})."

# 3. Respaldo de Archivos Multimedia (Uploads: PDFs, Micrografías, Notas de Voz)
echo "📁 2/4 Copiando archivos del repositorio documental (uploads)..."
UPLOADS_SOURCE="${PROJECT_DIR}/uploads"
mkdir -p "${TARGET_DIR}/uploads"

if [ -d "${UPLOADS_SOURCE}" ]; then
  cp -r "${UPLOADS_SOURCE}/." "${TARGET_DIR}/uploads/" || true
  UPLOADS_COUNT=$(find "${UPLOADS_SOURCE}" -type f | wc -l | tr -d ' ')
  echo "   ✓ ${UPLOADS_COUNT} archivos respaldados."
else
  echo "   ⚠️ Directorio uploads no encontrado, creando entrada vacía."
fi

# 4. Generación de Manifiesto de Integridad
echo "📝 3/4 Generando manifiesto y suma de verificación SHA-256..."
DB_TABLES_COUNT=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
PAPERS_COUNT=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM resources;" 2>/dev/null || echo "0")
CHUNKS_COUNT=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM resource_chunks;" 2>/dev/null || echo "0")

cat <<EOF > "${TARGET_DIR}/manifest.json"
{
  "consorcio": "Conect C3",
  "backup_id": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": {
    "name": "${DB_NAME}",
    "user": "${DB_USER}",
    "public_tables": ${DB_TABLES_COUNT},
    "indexed_papers": ${PAPERS_COUNT},
    "pgvector_chunks": ${CHUNKS_COUNT}
  },
  "archive_contents": [
    "${DB_NAME}.dump",
    "${DB_NAME}.sql",
    "uploads/",
    "manifest.json"
  ]
}
EOF

# 5. Empaquetado y Compresión Tarball
echo "🗜️ 4/4 Empaquetando en archivo comprimido tar.gz..."
tar -czf "${ARCHIVE_FILE}" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
rm -rf "${TARGET_DIR}"

CHECKSUM=$(shasum -a 256 "${ARCHIVE_FILE}" | awk '{print $1}')
echo "${CHECKSUM}  $(basename "${ARCHIVE_FILE}")" > "${ARCHIVE_FILE}.sha256"
TOTAL_SIZE=$(du -h "${ARCHIVE_FILE}" | awk '{print $1}')

# 6. Rotación de Respaldos (conservar los últimos N)
echo "🧹 Rotación automática de respaldos (retención: últimos ${RETENTION_COUNT})..."
# Listar archivos de respaldo ordenados por fecha y eliminar los excedentes
BACKUP_LIST=$(ls -1t "${BACKUP_DIR}"/conect_backup_*.tar.gz 2>/dev/null || true)
BACKUP_COUNT=$(echo "${BACKUP_LIST}" | grep -v '^$' | wc -l | tr -d ' ')

if [ "${BACKUP_COUNT}" -gt "${RETENTION_COUNT}" ]; then
  EXCESS=$(tail -n +$((RETENTION_COUNT + 1)) <<< "${BACKUP_LIST}")
  for old_backup in ${EXCESS}; do
    echo "   🗑️ Eliminando respaldo antiguo: $(basename "${old_backup}")"
    rm -f "${old_backup}" "${old_backup}.sha256"
  done
fi

echo "=========================================================="
echo "✅ RESPALDO COMPLETADO EXITOSAMENTE"
echo "   Archivo:    ${ARCHIVE_FILE}"
echo "   Tamaño:     ${TOTAL_SIZE}"
echo "   Checksum:   ${CHECKSUM:0:16}..."
echo "   Tablas:     ${DB_TABLES_COUNT} tablas activas"
echo "   Chunks RAG: ${CHUNKS_COUNT} fragmentos vectorizados"
echo "=========================================================="
