#!/usr/bin/env bash
# Respaldo diario de la BD PostgreSQL (AWS RDS) hacia un bucket S3.
# Requisitos en el host: postgresql16 (pg_dump), aws-cli v2, archivo /srv/acme-erp/.env
set -euo pipefail
set -a; source /srv/acme-erp/.env; set +a

FECHA=$(date +%Y-%m-%d_%H%M)
ARCHIVO="/tmp/acme_erp_${FECHA}.sql.gz"

echo "[$(date)] Iniciando respaldo de ${DB_NAME} en ${DB_HOST}"
PGPASSWORD="${DB_PASS}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --no-owner --format=plain | gzip > "${ARCHIVO}"

aws s3 cp "${ARCHIVO}" "s3://${S3_BUCKET}/backups/" --region "${AWS_REGION}"

echo "[$(date)] Verificando objeto subido:"
aws s3 ls "s3://${S3_BUCKET}/backups/" --region "${AWS_REGION}" | tail -n 3

rm -f "${ARCHIVO}"
echo "[$(date)] Respaldo finalizado correctamente"
