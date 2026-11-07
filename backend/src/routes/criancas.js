const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorAtivacao = require('../controllers/ativacao');

// Montado em /api/criancas. As rotas /criancas/:id com a regra central de acesso entram na T-17.
function criarRotasCriancas(banco) {
  const rotas = express.Router();
  const ativacao = criarControladorAtivacao(banco);

  // Mesmo limite de tentativas da ativação (S-40)
  rotas.post(
    '/adicionar',
    criarAutenticacao(banco),
    exigirPapel('RESPONSAVEL'),
    criarLimiteTentativas(10),
    ativacao.adicionarFilho
  );

  return rotas;
}

module.exports = criarRotasCriancas;
