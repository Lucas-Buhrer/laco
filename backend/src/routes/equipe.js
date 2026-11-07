const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorEquipe = require('../controllers/equipe');

// Montado em /api/clinica. Equipe da própria clínica.
function criarRotasEquipe(banco) {
  const rotas = express.Router();
  const c = criarControladorEquipe(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO'));
  rotas.get('/profissionais', c.listarProfissionais);

  return rotas;
}

module.exports = criarRotasEquipe;
