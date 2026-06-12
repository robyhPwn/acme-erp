-- ============================================================
-- ACME ERP - Inicializacion de la BD acme_erp en AWS RDS (PaaS)
-- Ejecutar UNA vez desde la EC2 frontend:
--   PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d acme_erp -f bd/init_db.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    usuario       VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    rol           VARCHAR(20) NOT NULL DEFAULT 'consulta',
    mfa_secret    VARCHAR(64),
    creado_en     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    precio INTEGER NOT NULL CHECK (precio >= 0),
    stock  INTEGER NOT NULL CHECK (stock >= 0)
);

-- Usuario administrador inicial. Password: Acme2026!  (cambiarla tras el primer login)
-- El hash se genero con bcrypt (costo 10); regenerar con scripts/generar_hash.js
INSERT INTO usuarios (usuario, password_hash, rol)
VALUES ('admin', '$2b$10$WoN3/UVMvbCJpy1tSnl36.FaEf8K4M7J2cqa.o32WGwDFqMJj6QI2', 'admin')
ON CONFLICT (usuario) DO NOTHING;

-- Usuario de solo consulta para demostrar el acceso condicional por rol
INSERT INTO usuarios (usuario, password_hash, rol)
VALUES ('vendedor', '$2b$10$WoN3/UVMvbCJpy1tSnl36.FaEf8K4M7J2cqa.o32WGwDFqMJj6QI2', 'consulta')
ON CONFLICT (usuario) DO NOTHING;

INSERT INTO productos (nombre, precio, stock) VALUES
 ('Martillo carpintero 16 oz',        8990, 40),
 ('Taladro percutor 650W',           39990, 12),
 ('Set destornilladores 12 piezas',  12990, 25),
 ('Guantes dielectricos clase 0',    21990, 18),
 ('Tablero electrico 12 modulos',    27990,  9)
ON CONFLICT DO NOTHING;
