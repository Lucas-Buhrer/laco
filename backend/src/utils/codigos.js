// Códigos de ativação/convite: aleatórios, sem letras parecidas (0/O, 1/I) e guardados só como hash.
const crypto = require('node:crypto');

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function gerarCodigo() {
  let texto = '';
  for (let i = 0; i < 8; i++) texto += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return `${texto.slice(0, 4)}-${texto.slice(4)}`; // ex.: K7M2-Q9XP
}

// Hash simples e fixo: permite achar o código no banco. Seguro porque o código é aleatório
// e as tentativas são limitadas.
function hashCodigo(codigo) {
  const limpo = String(codigo).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(limpo).digest('hex');
}

module.exports = { gerarCodigo, hashCodigo };
