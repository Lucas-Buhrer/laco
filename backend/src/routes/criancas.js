const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const { criarAcessoCrianca } = require('../middlewares/acessoCrianca');
const criarControladorAtivacao = require('../controllers/ativacao');
const criarControladorCriancas = require('../controllers/criancas');
const criarControladorRegistros = require('../controllers/registros');
const criarControladorAtividades = require('../controllers/atividades');

// Montado em /api/criancas
function criarRotasCriancas(banco) {
  const rotas = express.Router();
  const ativacao = criarControladorAtivacao(banco);
  const c = criarControladorCriancas(banco);
  const reg = criarControladorRegistros(banco);
  const ativ = criarControladorAtividades(banco);
  const { exigirAcessoCrianca } = criarAcessoCrianca(banco);

  rotas.use(criarAutenticacao(banco));

  // Outro filho com o código da clínica; mesmo limite de tentativas da ativação (S-40)
  rotas.post('/adicionar', exigirPapel('RESPONSAVEL'), criarLimiteTentativas(10), ativacao.adicionarFilho);

  rotas.get('/', exigirPapel('RESPONSAVEL', 'PROFISSIONAL'), c.listar);

  // Daqui para baixo, tudo passa pela regra central de acesso
  rotas.get('/:id', exigirAcessoCrianca('VER_PERFIL'), c.obter);
  rotas.put('/:id', exigirAcessoCrianca('EDITAR_PERFIL'), c.atualizar);
  rotas.post('/:id/convites', exigirAcessoCrianca('GERAR_CONVITE'), c.criarConvite);

  // Registros de sessão e linha do tempo (T-31). O log de quem leu fica na própria regra de acesso.
  rotas.get('/:id/registros', exigirAcessoCrianca('VER_REGISTROS'), reg.listar);
  rotas.post('/:id/registros', exigirAcessoCrianca('CRIAR_REGISTRO'), reg.criar);
  rotas.get('/:id/linha-do-tempo', exigirAcessoCrianca('VER_LINHA_DO_TEMPO'), reg.linhaDoTempo);
  rotas.get('/:id/atividades', exigirAcessoCrianca('VER_ATIVIDADES'), ativ.listar);
  rotas.post('/:id/atividades', exigirAcessoCrianca('CRIAR_ATIVIDADE'), ativ.criar);

  return rotas;
}

module.exports = criarRotasCriancas;
