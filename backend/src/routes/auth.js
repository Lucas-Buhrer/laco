const express = require('express');
const rateLimit = require('express-rate-limit');
const criarAutenticacao = require('../middlewares/autenticacao');
const criarControladorAuth = require('../controllers/auth');

function criarRotasAuth(banco) {
  const rotas = express.Router();
  const auth = criarControladorAuth(banco);
  const exigirLogin = criarAutenticacao(banco);

  // Limite de tentativas erradas (RNF-02, F-04): na 6ª tentativa errada seguida responde 429.
  // Login certo não conta. Um limitador por app, para cada teste começar zerado.
  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos e tente de novo.' }),
  });

  rotas.post('/cadastro-clinica', auth.cadastroClinica);
  rotas.post('/login-responsavel', limiteLogin, auth.loginResponsavel);
  rotas.post('/login-clinica', limiteLogin, auth.loginClinica);
  rotas.get('/me', exigirLogin, auth.eu);
  rotas.post('/alterar-senha', exigirLogin, auth.alterarSenha);

  return rotas;
}

module.exports = criarRotasAuth;
