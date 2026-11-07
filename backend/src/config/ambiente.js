// Lê o .env uma vez e entrega as configurações para o resto do código.
require('dotenv').config();

module.exports = {
  porta: process.env.PORT || 3001,
  // Em produção o segredo vem do .env; este valor só serve para a demo local.
  segredoJwt: process.env.JWT_SECRET || 'troque-este-segredo',
  origemFront: process.env.FRONT_ORIGIN || 'http://localhost:5173',
};
