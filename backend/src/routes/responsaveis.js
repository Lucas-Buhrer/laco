const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorResponsaveis = require('../controllers/responsaveis');

// Montado em /api/responsaveis. Quem já tem conta aceita o convite aqui; quem não tem usa /auth/aceitar-convite-responsavel.
function criarRotasResponsaveis(banco) {
  const rotas = express.Router();
  const c = criarControladorResponsaveis(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('RESPONSAVEL'));
  // Tentar adivinhar códigos é o ataque provável: mesmo limite da ativação
  rotas.post('/aceitar-convite', criarLimiteTentativas(10), c.aceitarConvite);

  return rotas;
}

module.exports = criarRotasResponsaveis;
