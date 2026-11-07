const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const { criarAcessoCrianca } = require('../middlewares/acessoCrianca');
const criarControladorAtividades = require('../controllers/atividades');

// Montado em /api/atividades
function criarRotasAtividades(banco) {
  const rotas = express.Router();
  const c = criarControladorAtividades(banco);
  const { exigirAcessoCrianca } = criarAcessoCrianca(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('RESPONSAVEL', 'PROFISSIONAL'));
  rotas.put('/:id', c.carregarAtividade, exigirAcessoCrianca('EDITAR_ATIVIDADE'), c.atualizar);
  rotas.post('/:id/execucoes', c.carregarAtividade, exigirAcessoCrianca('REGISTRAR_EXECUCAO'), c.registrarExecucao);
  rotas.get('/:id/execucoes', c.carregarAtividade, exigirAcessoCrianca('VER_EXECUCOES'), c.listarExecucoes);

  return rotas;
}

module.exports = criarRotasAtividades;
