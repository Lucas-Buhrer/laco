const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const { criarAcessoCrianca } = require('../middlewares/acessoCrianca');
const criarControladorRegistros = require('../controllers/registros');

// Montado em /api/registros. Não existe PUT nem DELETE: registro não se edita nem se apaga (RN-06).
function criarRotasRegistros(banco) {
  const rotas = express.Router();
  const c = criarControladorRegistros(banco);
  const { exigirAcessoCrianca } = criarAcessoCrianca(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('PROFISSIONAL'));
  rotas.post('/:id/adendos', c.carregarRegistro, exigirAcessoCrianca('CRIAR_ADENDO'), c.criarAdendo);

  return rotas;
}

module.exports = criarRotasRegistros;
