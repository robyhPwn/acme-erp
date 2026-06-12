# ACME ERP - EVA3 CI3051: Gestión de riesgos y rediseño On-Cloud

Rediseño seguro del ERP de ACME Limitada (ferreterías y distribución de energía, OIV).
Stack: frontend Node.js + Express en contenedor Docker sobre EC2, base de datos
PostgreSQL como PaaS en AWS RDS, respaldos diarios automatizados hacia S3,
autenticación con JWT + MFA (TOTP) y fortificación con Security Groups + Fail2ban.

Grupo 4: Benjamín Medina, Jacob Liguen, Roberto Fuentes.
Sección CI3051/IEC-N5-C1/D. Docente: Marcos Pozas S.

## Estructura del proyecto (Req. 2)

```
/srv/acme-erp/
├── docker-compose.yml          Orquestación del frontend (la BD es PaaS, no contenedor)
├── .env.example                Plantilla de variables (el .env real NUNCA se versiona)
├── frontend/                   Dockerfile, server.js, portal web (public/)
├── bd/init_db.sql              Esquema y semillas para RDS PostgreSQL
├── scripts/                    backup_rds_s3.sh, crontab.txt, generar_hash.js
├── security/                   security-groups.md, fail2ban/ (jail + filtro)
├── docs/diagramas/             Arquitectura por capas y DFD (Excalidraw)
├── docs/evidencias/            Capturas del despliegue
└── logs/                       auth.log (Fail2ban) y backup.log
```

## 1. Provisión en AWS (Learner Lab, us-east-1)

1. **RDS PostgreSQL (Req. 3):** Motor PostgreSQL 16, plantilla Free tier o Dev/Test,
   clase `db.t4g.micro`, almacenamiento gp3 20 GB, Single-AZ, **Public access: No**,
   VPC default, Security Group `SG-acme-rds`. Usuario maestro `erp_admin`.
   Crear la BD inicial `acme_erp`. Anotar el endpoint (DB_HOST).
2. **EC2 frontend:** Amazon Linux 2023, t3.small, IP elástica, Security Group
   `SG-acme-frontend` (ver `security/security-groups.md`).
3. **S3 (Req. 5):** bucket `acme-erp-backups-grupo4` con versionado activado y
   ACL habilitadas para el control de acceso a objetos. En Learner Lab la EC2 usa
   el rol `LabInstanceProfile` (LabRole), que ya tiene permisos sobre S3.

## 2. Despliegue en la EC2

```bash
sudo dnf install -y git docker postgresql16 fail2ban && sudo systemctl enable --now docker
sudo mkdir -p /srv/acme-erp && sudo chown ec2-user:ec2-user /srv/acme-erp
git clone https://github.com/USUARIO/acme-erp.git /srv/acme-erp && cd /srv/acme-erp

cp .env.example .env && nano .env        # endpoint RDS, password, JWT_SECRET, bucket

# Inicializar la BD en RDS (una sola vez)
set -a; source .env; set +a
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d acme_erp -f bd/init_db.sql
```

## 3. Ejecución del stack (Req. 6)

```bash
docker compose build                  # construcción de la imagen del frontend
docker compose up -d                  # despliegue
docker compose ps                     # verificación de contenedores activos
docker compose logs -f frontend       # revisión de logs del frontend
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d acme_erp -c "SELECT * FROM productos;"   # interacción con RDS
docker compose down                   # detención ordenada de los servicios
```

Portal: `http://IP_ELASTICA/` (admin / Acme2026!, cambiarla tras el primer ingreso).
Activar MFA: `POST /api/mfa/activar` con el token Bearer; escanear el QR devuelto
con Google Authenticator y desde ahí el login exige el código TOTP.

## 4. Respaldos diarios hacia S3 (Req. 5)

```bash
./scripts/backup_rds_s3.sh                       # prueba manual
crontab scripts/crontab.txt && crontab -l        # 1 respaldo diario a las 03:00
aws s3 ls s3://$S3_BUCKET/backups/               # verificación del almacenamiento
```

## 5. Fortificación con Fail2ban (Req. 7)

```bash
sudo cp security/fail2ban/jail.local /etc/fail2ban/jail.local
sudo cp security/fail2ban/filter-acme-auth.conf /etc/fail2ban/filter.d/acme-auth.conf
sudo systemctl enable --now fail2ban
sudo fail2ban-client status acme-auth            # jails activas y IPs baneadas
```

## 6. Control de versiones (Req. 2)

```bash
cd /srv/acme-erp
git init -b main && git add . && git commit -m "EVA3: rediseño seguro On-Cloud"
git remote add origin https://github.com/USUARIO/acme-erp.git
git push -u origin main
```

El repositorio se mantiene público (o con acceso de lectura para el docente)
para facilitar la revisión de avances.
