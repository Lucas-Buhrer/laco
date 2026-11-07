const express = require('express');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const criarControladorConsultas = require('../controllers/consultas');

// Montado em /api/consultas. A regra de quem vê o quê está dentro do controlador (RN-24).
function criarRotasConsultas(banco) {
  const rotas = express.Router();
  const c = criarControladorConsultas(banco);
  const equipe = exigirPapel('PROFISSIONAL', 'RECEPCAO');

  rotas.use(criarAutenticacao(banco));

  rotas.get('/', exigirPapel('RESPONSAVEL', 'PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO'), c.listar);
  rotas.get('/opcoes', equipe, c.opcoes);
  rotas.post('/', equipe, c.criar);
  rotas.get('/:id', exigirPapel('RESPONSAVEL', 'PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO'), c.obter);
  rotas.put('/:id/remarcar', equipe, c.remarcar);
  rotas.post('/:id/cancelar', equipe, c.cancelar);
  rotas.post('/:id/realizada', exigirPapel('PROFISSIONAL'), c.realizada);
  rotas.post('/:id/falta', exigirPapel('PROFISSIONAL'), c.falta);
  rotas.post('/:id/confirmar-contato', equipe, c.confirmarPorContato);
  rotas.post('/:id/confirmar', exigirPapel('RESPONSAVEL'), c.confirmarPresenca);
  rotas.post('/:id/nao-poderei', exigirPapel('RESPONSAVEL'), c.naoPoderei);

  return rotas;
}

module.exports = criarRotasConsultas;
