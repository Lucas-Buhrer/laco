const jwt = require('jsonwebtoken');
const ambiente = require('../config/ambiente');

// Token de sessão: vale 8h (RF-04) e leva só o id; papel e clínica são lidos do banco a cada pedido
function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id }, ambiente.segredoJwt, { expiresIn: '8h' });
}

module.exports = { gerarToken };
