#!/usr/bin/env bash
# ==============================================================================
# CONECT — Script de Restauración y Recuperación ante Desastres
# Restaura PostgreSQL con pgvector y el repositorio documental (uploads)
# ==============================================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
CONTAINER_DB="conect_postgres"
DB_NAME="conect_db"
DB_USER="conect_user"

# Manejo de argumentos
AUTO_CONFIRM=false
TARGET_ARCHIVE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    *)
      TARGET_ARCHIVE="$1"
      shift
      ;;
  esac
done

echo "=========================================================="
echo "🔄 RESTAURACIÓN DE RESPALDO - CONSORCIO CONECT C3"
echo "=========================================================="

# 1. Identificar archivo de respaldo a restaurar
if [ -z "${TARGET_ARCHIVE}" ]; then
  # Buscar el respaldo más reciente
  LATEST_BACKUP=$(ls -1t "${BACKUP_DIR}"/conect_backup_*.tar.gz 2>/dev/null | head -n 1 || true)
  if [ -z "${LATEST_BACKUP}" ]; then
    echo "❌ Error: No se encontraron archivos de respaldo en ${BACKUP_DIR}."
    echo "   Uso: $0 [--yes] [ruta_al_archivo_backup.tar.gz]"
    exit 1
  fi
  TARGET_ARCHIVE="${LATEST_BACKUP}"
fi

if [ ! -f "${TARGET_ARCHIVE}" ]; then
  echo "❌ Error: El archivo de respaldo no existe: ${TARGET_ARCHIVE}"
  exit 1
fi

echo "📦 Respaldo seleccionado: $(basename "${TARGET_ARCHIVE}")"

# 2. Validación de integridad SHA-256 (opcional si existe el archivo .sha256)
SHA_FILE="${TARGET_ARCHIVE}.sha256"
if [ -f "${SHA_FILE}" ]; then
  echo "🔍 Verificando integridad SHA-256..."
  CURRENT_SHA=$(shasum -a 256 "${TARGET_ARCHIVE}" | awk '{print $1}')
  EXPECTED_SHA=$(awk '{print $1}' "${SHA_FILE}")
  if [ "${CURRENT_SHA}" != "${EXPECTED_SHA}" ]; then
    echo "❌ Error: La suma de verificación no coincide. Archivo posiblemente dañado o alterado."
    exit 1
  fi
  echo "   ✓ Integridad verificada correctamente."
fi

# 3. Extracción temporal
TMP_RESTORE_DIR=$(mktemp -d "/tmp/conect_restore_XXXXXX")
trap 'rm -rf "${TMP_RESTORE_DIR}"' EXIT

echo "📂 Descomprimiendo contenido del archivo..."
tar -xzf "${TARGET_ARCHIVE}" -C "${TMP_RESTORE_DIR}"

BACKUP_FOLDER=$(ls -1 "${TMP_RESTORE_DIR}" | head -n 1)
EXTRACTED_PATH="${TMP_RESTORE_DIR}/${BACKUP_FOLDER}"

# Mostrar manifiesto si está disponible
if [ -f "${EXTRACTED_PATH}/manifest.json" ]; then
  echo "----------------------------------------------------------"
  echo "📄 INFORMACIÓN DEL RESPALDO:"
  cat "${EXTRACTED_PATH}/manifest.json"
  echo "----------------------------------------------------------"
fi

# 4. Confirmación del usuario
if [ "${AUTO_CONFIRM}" != "true" ]; then
  echo "⚠️  ADVERTENCIA: Esta operación reemplazará los datos actuales de la base de datos y uploads."
  read -p "¿Deseas continuar con la restauración? (s/N): " -r RESPONSE
  if [[ ! "${RESPONSE}" =~ ^[sS]$ ]]; then
    echo "Operación cancelada por el usuario."
    exit 0
  fi
fi

# 5. Comprobar que el contenedor de PostgreSQL está activo
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_DB}$"; then
  echo "❌ Error: El contenedor de base de datos '${CONTAINER_DB}' no está corriendo."
  exit 1
fi

# 6. Restaurar Base de Datos PostgreSQL
echo "🗄️ 1/2 Restaurando base de datos (${DB_NAME})..."

# Asegurar extensión vector y limpiar esquemas
docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 || true

if [ -f "${EXTRACTED_PATH}/${DB_NAME}.dump" ]; then
  # Restauración con pg_restore (formato binario custom con reintento limpio)
  docker exec -i -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
    pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-acl < "${EXTRACTED_PATH}/${DB_NAME}.dump" 2>/dev/null || true
elif [ -f "${EXTRACTED_PATH}/${DB_NAME}.sql" ]; then
  # Restauración con psql (script SQL plano)
  docker exec -i -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
    psql -U "${DB_USER}" -d "${DB_NAME}" < "${EXTRACTED_PATH}/${DB_NAME}.sql" >/dev/null 2>&1
else
  echo "❌ Error: No se encontró archivo de volcado de base de datos en el respaldo."
  exit 1
fi

echo "   ✓ Base de datos restaurada."

# 7. Restaurar Archivos Multimedia (Uploads)
echo "📁 2/2 Restaurando archivos del repositorio documental..."
UPLOADS_TARGET="${PROJECT_DIR}/uploads"
mkdir -p "${UPLOADS_TARGET}"

if [ -d "${EXTRACTED_PATH}/uploads" ]; then
  cp -r "${EXTRACTED_PATH}/uploads/." "${UPLOADS_TARGET}/" || true
  FILE_COUNT=$(find "${UPLOADS_TARGET}" -type f | wc -l | tr -d ' ')
  echo "   ✓ ${FILE_COUNT} archivos restaurados en uploads."
fi

# 8. Verificación Post-Restauración
echo "🔍 Verificando salud del sistema restaurado..."
RESTORED_TABLES=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
RESTORED_USERS=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM users;" 2>/dev/null || echo "0")
RESTORED_PAPERS=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM resources;" 2>/dev/null || echo "0")
RESTORED_CHUNKS=$(docker exec -e PGPASSWORD=conect_password_secret "${CONTAINER_DB}" \
  psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT count(*) FROM resource_chunks;" 2>/dev/null || echo "0")

echo "=========================================================="
echo "✅ RESTAURACIÓN COMPLETADA CON ÉXITO"
echo "   Tablas públicas: ${RESTORED_TABLES}"
echo "   Investigadores:  ${RESTORED_USERS}"
echo "   Papers activos:  ${RESTORED_PAPERS}"
echo "   Chunks pgvector: ${RESTORED_CHUNKS}"
echo "=========================================================="
