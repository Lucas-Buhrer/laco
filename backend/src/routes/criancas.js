const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const { criarAcessoCrianca } = require('../middlewares/acessoCrianca');
const criarControladorAtivacao = require('../controllers/ativacao');
const criarControladorCriancas = require('../controllers/criancas');

// Montado em /api/criancas
function criarRotasCriancas(banco) {
  const rotas = express.Router();
  const ativacao = criarControladorAtivacao(banco);
  const c = criarControladorCriancas(banco);
  const { exigirAcessoCrianca } = criarAcessoCrianca(banco);

  rotas.use(criarAutenticacao(banco));

  // Outro filho com o código da clínica; mesmo limite de tentativas da ativação (S-40)
  rotas.post('/adicionar', exigirPapel('RESPONSAVEL'), criarLimiteTentativas(10), ativacao.adicionarFilho);

  rotas.get('/', exigirPapel('RESPONSAVEL', 'PROFISSIONAL'), c.listar);

  // Daqui para baixo, tudo passa pela regra central de acesso
  rotas.get('/:id', exigirAcessoCrianca('VER_PERFIL'), c.obter);
  rotas.put('/:id', exigirAcessoCrianca('EDITAR_PERFIL'), c.atualizar);
  rotas.post('/:id/convites', exigirAcessoCrianca('GERAR_CONVITE'), c.criarConvite);

  return rotas;
}

module.exports = criarRotasCriancas;
