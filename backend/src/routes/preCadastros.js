const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorPreCadastros = require('../controllers/preCadastros');
const criarControladorVinculos = require('../controllers/vinculos');

// Montado em /api/clinica/pre-cadastros. Só a equipe da clínica (nunca o responsável).
function criarRotasPreCadastros(banco) {
  const rotas = express.Router();
  const c = criarControladorPreCadastros(banco);
  const vinculos = criarControladorVinculos(banco);

  rotas.use(criarAutenticacao(banco), exigirPapel('PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO'));
  rotas.get('/', c.listar);
  rotas.post('/', c.criar);
  rotas.post('/:id/reemitir-codigo', c.reemitirCodigo);
  rotas.post('/:id/cancelar-codigo', c.cancelarCodigo);
  // Pedir que outro profissional da clínica acompanhe uma criança já ativa (RF-31)
  rotas.post('/:id/solicitar-vinculo', vinculos.solicitarMesmaClinica);

  return rotas;
}

module.exports = criarRotasPreCadastros;
