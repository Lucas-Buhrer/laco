const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorPainel = require('../controllers/painel');

// Montado em /api/painel
function criarRotasPainel(banco) {
  const rotas = express.Router();
  const c = criarControladorPainel(banco);

  rotas.use(criarAutenticacao(banco));
  rotas.get('/profissional', exigirPapel('PROFISSIONAL'), c.profissional);
  rotas.get('/responsavel', exigirPapel('RESPONSAVEL'), c.responsavel);
  rotas.get('/clinica', exigirPapel('ADMIN_CLINICA', 'RECEPCAO'), c.clinica);

  return rotas;
}

module.exports = criarRotasPainel;
