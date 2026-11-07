// Lê o .env da RAIZ do projeto (o back roda dentro de backend/, então o caminho precisa ser explícito).
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

// Nunca usar um segredo fixo no código: quem souber o valor forja tokens de qualquer usuário.
// Sem JWT_SECRET no .env, gera um aleatório a cada vez que o servidor sobe
// (efeito na demo: quem estava logado precisa entrar de novo após reiniciar).
let segredoJwt = process.env.JWT_SECRET;
if (!segredoJwt) {
  segredoJwt = crypto.randomBytes(32).toString('hex');
  // NODE_TEST_CONTEXT existe quando roda pelo `node --test`: não poluir a saída dos testes
  if (!process.env.NODE_TEST_CONTEXT) {
    console.warn('Aviso: JWT_SECRET não definido no .env. Usando um segredo temporário.');
  }
}

module.exports = {
  porta: process.env.PORT || 3001,
  segredoJwt,
  origemFront: process.env.FRONT_ORIGIN || 'http://localhost:5173',
};
