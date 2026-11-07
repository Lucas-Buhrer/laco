const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorEquipe = require('../controllers/equipe');
const criarControladorConsultas = require('../controllers/consultas');
const criarControladorClinica = require('../controllers/clinica');

// Montado em /api/clinica. Equipe da própria clínica.
function criarRotasEquipe(banco) {
  const rotas = express.Router();
  const c = criarControladorEquipe(banco);
  const soAdmin = exigirPapel('ADMIN_CLINICA');
  const consultas = criarControladorConsultas(banco);
  const clinicaCtl = criarControladorClinica(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO'));

  // Dados da clínica e administradores (só o ADM)
  rotas.get('/', soAdmin, clinicaCtl.obter);
  rotas.put('/', soAdmin, clinicaCtl.atualizar);
  rotas.post('/administradores', soAdmin, clinicaCtl.adicionarAdministrador);

  // Todos da clínica podem listar (para indicar profissionais); só o ADM muda
  rotas.get('/profissionais', c.listarProfissionais);
  rotas.post('/profissionais', soAdmin, c.criarProfissional);
  rotas.put('/profissionais/:id', soAdmin, c.editarProfissional);
  rotas.post('/profissionais/:id/desativar', soAdmin, c.desativarProfissional);
  rotas.post('/profissionais/:id/reativar', soAdmin, c.reativarProfissional);

  // Agenda completa da clínica, sem dados clínicos (a recepção e o ADM; o profissional usa /consultas)
  rotas.get('/agenda', exigirPapel('ADMIN_CLINICA', 'RECEPCAO'), consultas.listar);

  rotas.get('/recepcao', soAdmin, c.listarRecepcao);
  rotas.post('/recepcao', soAdmin, c.criarRecepcao);
  rotas.post('/recepcao/:id/desativar', soAdmin, c.desativarRecepcao);
  rotas.post('/recepcao/:id/redefinir-senha', soAdmin, c.redefinirSenhaRecepcao);

  return rotas;
}

module.exports = criarRotasEquipe;
