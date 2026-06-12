// Genera un hash bcrypt para sembrar o rotar passwords de usuarios.
// Uso: node scripts/generar_hash.js 'MiPasswordSegura'
const bcrypt = require('bcryptjs');
const pass = process.argv[2];
if (!pass) { console.error('Uso: node generar_hash.js <password>'); process.exit(1); }
console.log(bcrypt.hashSync(pass, 10));
