# Guion videocapsula EVA3 (7 a 10 min, YouTube no listado)

| # | Bloque | Tiempo | Habla | Contenido / pantalla |
|---|--------|--------|-------|----------------------|
| 1 | Presentacion y problematica | 0:00-0:50 | Benjamin | Integrantes, ACME como OIV, hallazgos del analisis de riesgos de la EVA2 (credenciales en claro, API sin auth, sin respaldos) |
| 2 | Arquitectura propuesta | 0:50-2:00 | Roberto | Diagrama por capas y DFD en Excalidraw: EC2 + RDS PaaS + S3, leyes 21.663 / 19.628-21.719 / 21.459 e ISO 27001 |
| 3 | RDS y conexion | 2:00-3:10 | Jacob | Consola RDS (Public access: No, SG encadenado), .env, psql al endpoint, init_db.sql |
| 4 | Despliegue del stack | 3:10-4:30 | Roberto | docker compose build / up -d / ps / logs -f, comentando cada comando |
| 5 | Portal AAA + MFA | 4:30-6:00 | Benjamin | Login fallido vs exitoso, token JWT, activar MFA con QR, acceso condicional por rol (vendedor no puede POST) |
| 6 | Respaldos a S3 | 6:00-7:00 | Jacob | backup_rds_s3.sh manual, crontab -l, aws s3 ls del bucket |
| 7 | Security Groups + Fail2ban | 7:00-8:20 | Roberto | Reglas SG en consola, fail2ban-client status, baneo tras 5 intentos, consumo desde navegador de equipo cliente |
| 8 | Costos y cierre | 8:20-9:30 | Los tres | Cuadro comparativo AWS/Azure/OCI, presupuesto en CLP, detencion ordenada (compose down), conclusiones |
