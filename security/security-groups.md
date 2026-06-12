# Security Groups: minima exposicion a Internet (Req. 7)

## SG-acme-frontend (asociado a la instancia EC2 del frontend)
| Direccion | Protocolo | Puerto | Origen / Destino | Justificacion |
|---|---|---|---|---|
| Entrada | TCP | 80  | 0.0.0.0/0 | Portal ERP publico (HTTP) |
| Entrada | TCP | 443 | 0.0.0.0/0 | Reservado para TLS (mejora) |
| Entrada | TCP | 22  | IP_ADMIN/32 | SSH solo desde la IP del operador |
| Salida  | Todo | Todo | 0.0.0.0/0 | Acceso a RDS, S3 y repositorios |

## SG-acme-rds (asociado a la instancia RDS PostgreSQL)
| Direccion | Protocolo | Puerto | Origen | Justificacion |
|---|---|---|---|---|
| Entrada | TCP | 5432 | sg de SG-acme-frontend | Solo el frontend consulta la BD |

La regla de entrada del SG de RDS referencia al *Security Group* del frontend
(encadenamiento de SG), no a una IP: el puerto 5432 jamas se publica a Internet
y la instancia RDS se crea con "Public access: No".

## Creacion por AWS CLI (referencial)
```bash
aws ec2 create-security-group --group-name SG-acme-frontend --description "ERP frontend" --vpc-id VPC_ID
aws ec2 authorize-security-group-ingress --group-id SG_FRONT --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id SG_FRONT --protocol tcp --port 22 --cidr IP_ADMIN/32

aws ec2 create-security-group --group-name SG-acme-rds --description "RDS PostgreSQL" --vpc-id VPC_ID
aws ec2 authorize-security-group-ingress --group-id SG_RDS --protocol tcp --port 5432 --source-group SG_FRONT
```
