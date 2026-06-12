// ============================================================================
// ACME ERP - Frontend Node.js + Express (EVA3 CI3051)
// Portal de autenticacion con acceso condicional (AAA): el acceso a los
// recursos del sitio exige un token JWT valido; las escrituras exigen ademas
// el rol "admin" (autorizacion). Se integra MFA con TOTP (RFC 6238).
// La capa de datos es PostgreSQL como PaaS (AWS RDS), conexion cifrada SSL.
// ============================================================================
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"],
      "upgrade-insecure-requests": null,
    },
  },
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Log de autenticacion para Fail2ban (Req. 7) -----------------------------
const LOG_DIR = '/var/log/acme';
fs.mkdirSync(LOG_DIR, { recursive: true });
const authLog = (linea) => {
  const registro = `${new Date().toISOString()} ${linea}\n`;
  fs.appendFile(path.join(LOG_DIR, 'auth.log'), registro, () => {});
  console.log(registro.trim());
};

// --- Conexion a AWS RDS PostgreSQL (Req. 3) ----------------------------------
// RDS exige SSL: en el PoC se acepta el certificado del servidor; en
// produccion se valida contra el bundle oficial rds-ca (global-bundle.pem).
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  max: 5
});

// --- Limite de intentos de login (mitiga fuerza bruta junto a Fail2ban) ------
const limiteLogin = rateLimit({ windowMs: 10 * 60 * 1000, max: 20 });

// --- Middlewares de acceso condicional ---------------------------------------
// Autenticacion: exige token JWT valido en el header Authorization (Bearer)
function autenticar(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}
// Autorizacion: condiciona el acceso al rol declarado en el token
function autorizar(...roles) {
  return (req, res, next) =>
    roles.includes(req.usuario.rol)
      ? next()
      : res.status(403).json({ error: 'Rol sin permisos para este recurso' });
}

// --- Endpoints ----------------------------------------------------------------
app.get('/salud', (_req, res) => res.json({ estado: 'ok' }));

// Login: usuario + password (+ codigo TOTP si el usuario tiene MFA activo)
app.post('/api/login', limiteLogin, async (req, res) => {
  const { usuario, password, totp } = req.body || {};
  const ip = req.ip;
  try {
    const r = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    const u = r.rows[0];
    const passwordOk = u && (await bcrypt.compare(password || '', u.password_hash));
    if (!passwordOk) {
      authLog(`AUTH_FAIL usuario=${usuario || 'desconocido'} ip=${ip}`);
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }
    if (u.mfa_secret) {
      const totpOk = speakeasy.totp.verify({
        secret: u.mfa_secret, encoding: 'base32', token: totp || '', window: 1
      });
      if (!totpOk) {
        authLog(`AUTH_FAIL usuario=${usuario} ip=${ip}`);
        return res.status(401).json({ error: 'Codigo MFA invalido' });
      }
    }
    const token = jwt.sign(
      { sub: u.id, usuario: u.usuario, rol: u.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRA || '1h' }
    );
    authLog(`AUTH_OK usuario=${usuario} ip=${ip}`);
    res.json({ token, expira: process.env.JWT_EXPIRA || '1h' });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Activar MFA: genera el secreto TOTP y un QR para Google Authenticator
app.post('/api/mfa/activar', autenticar, async (req, res) => {
  const secreto = speakeasy.generateSecret({ name: `ACME ERP (${req.usuario.usuario})` });
  await pool.query('UPDATE usuarios SET mfa_secret = $1 WHERE id = $2',
    [secreto.base32, req.usuario.sub]);
  const qr = await qrcode.toDataURL(secreto.otpauth_url);
  res.json({ mensaje: 'MFA activado: escanear el QR con Google Authenticator', qr });
});

// Recurso protegido de lectura (cualquier rol autenticado)
app.get('/api/productos', autenticar, async (_req, res) => {
  const r = await pool.query('SELECT * FROM productos ORDER BY id');
  res.json(r.rows);
});

// Recurso protegido de escritura (solo rol admin: acceso condicional)
app.post('/api/productos', autenticar, autorizar('admin'), async (req, res) => {
  const { nombre, precio, stock } = req.body || {};
  if (!nombre || precio == null || stock == null)
    return res.status(400).json({ error: 'Faltan campos: nombre, precio, stock' });
  const r = await pool.query(
    'INSERT INTO productos (nombre, precio, stock) VALUES ($1, $2, $3) RETURNING *',
    [nombre, precio, stock]
  );
  res.status(201).json(r.rows[0]);
});

// Perfil del usuario autenticado (demuestra los claims del token)
app.get('/api/perfil', autenticar, (req, res) => res.json(req.usuario));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`ACME ERP escuchando en :${PORT} | BD: ${process.env.PGHOST}`));
