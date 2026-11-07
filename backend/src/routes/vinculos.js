const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorVinculos = require('../controllers/vinculos');

// Montado em /api/vinculos
function criarRotasVinculos(banco) {
  const rotas = express.Router();
  const v = criarControladorVinculos(banco);

  rotas.use(criarAutenticacao(banco));

  rotas.get('/', exigirPapel('RESPONSAVEL', 'PROFISSIONAL'), v.listar);
  // Pedir acesso com o código da família; limite contra adivinhar códigos
  rotas.post('/solicitar', exigirPapel('PROFISSIONAL', 'RECEPCAO'), criarLimiteTentativas(10), v.solicitarPorCodigo);

  // Só responsável decide. Admin, recepção e profissional recebem 403 (S-09, S-25, S-33)
  rotas.post('/:id/aprovar', exigirPapel('RESPONSAVEL'), v.aprovar);
  rotas.post('/:id/recusar', exigirPapel('RESPONSAVEL'), v.recusar);
  rotas.post('/:id/revogar', exigirPapel('RESPONSAVEL'), v.revogar);
  rotas.put('/:id/escopo', exigirPapel('RESPONSAVEL'), v.mudarEscopo);

  return rotas;
}

module.exports = criarRotasVinculos;
