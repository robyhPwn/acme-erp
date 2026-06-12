#!/usr/bin/env bash
# Respaldo diario de la BD acme (RDS) hacia S3. Corre por cron a las 03:00.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; source .env; set +a

FECHA=$(date +%F_%H%M)
ARCHIVO="acme_${FECHA}.sql.gz"

echo "[backup] generando volcado de ${PGDATABASE} en ${PGHOST}..."
docker run --rm -e PGPASSWORD="$PGPASSWORD" postgres:18-alpine \
  pg_dump -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" -d "$PGDATABASE" | gzip > "/tmp/${ARCHIVO}"

echo "[backup] subiendo a s3://${S3_BUCKET}/${ARCHIVO}..."
aws s3 cp "/tmp/${ARCHIVO}" "s3://${S3_BUCKET}/${ARCHIVO}"

echo "[backup] verificando objeto en el bucket..."
aws s3 ls "s3://${S3_BUCKET}/${ARCHIVO}"

rm -f "/tmp/${ARCHIVO}"
echo "[backup] OK ${ARCHIVO}"
