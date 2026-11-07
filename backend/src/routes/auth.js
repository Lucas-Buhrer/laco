const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const criarControladorAuth = require('../controllers/auth');
const criarControladorAtivacao = require('../controllers/ativacao');

function criarRotasAuth(banco) {
  const rotas = express.Router();
  const auth = criarControladorAuth(banco);
  const ativacao = criarControladorAtivacao(banco);
  const exigirLogin = criarAutenticacao(banco);

  // Login: na 6ª tentativa errada seguida responde 429 (F-04)
  const limiteLogin = criarLimiteTentativas(5);
  // Ativação de conta: tentar adivinhar códigos é o ataque mais provável (S-21)
  const limiteAtivacao = criarLimiteTentativas(10);

  rotas.post('/cadastro-clinica', auth.cadastroClinica);
  rotas.post('/login-responsavel', limiteLogin, auth.loginResponsavel);
  rotas.post('/login-clinica', limiteLogin, auth.loginClinica);
  rotas.post('/ativar-conta', limiteAtivacao, ativacao.ativarConta);
  rotas.get('/me', exigirLogin, auth.eu);
  rotas.post('/alterar-senha', exigirLogin, auth.alterarSenha);

  return rotas;
}

module.exports = criarRotasAuth;
