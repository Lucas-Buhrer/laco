const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const criarControladorNotificacoes = require('../controllers/notificacoes');

// Montado em /api/notificacoes. Qualquer pessoa logada, só os próprios avisos.
function criarRotasNotificacoes(banco) {
  const rotas = express.Router();
  const c = criarControladorNotificacoes(banco);

  rotas.use(criarAutenticacao(banco));
  rotas.get('/', c.listar);
  rotas.post('/ler-todas', c.lerTodas);
  rotas.post('/:id/ler', c.ler);

  return rotas;
}

module.exports = criarRotasNotificacoes;
