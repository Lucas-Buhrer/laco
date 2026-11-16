const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorLgpd = require('../controllers/lgpd');

// Montado em /api/lgpd. Só o responsável.
function criarRotasLgpd(banco) {
  const rotas = express.Router();
  const c = criarControladorLgpd(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('RESPONSAVEL'));
  rotas.post('/solicitacoes', c.solicitar);
  rotas.get('/solicitacoes', c.listarSolicitacoes);
  rotas.post('/excluir-crianca', c.excluirCrianca);

  return rotas;
}

module.exports = criarRotasLgpd;
