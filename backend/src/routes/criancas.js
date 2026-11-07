const express = require('express');
const criarLimiteTentativas = require('../middlewares/limite');
const criarAutenticacao = require('../middlewares/autenticacao');
const exigirPapel = require('../middlewares/papel');
const { criarAcessoCrianca } = require('../middlewares/acessoCrianca');
const criarControladorAtivacao = require('../controllers/ativacao');
const criarControladorCriancas = require('../controllers/criancas');
const criarControladorRegistros = require('../controllers/registros');
const criarControladorAtividades = require('../controllers/atividades');
const criarControladorLgpd = require('../controllers/lgpd');
const criarControladorResponsaveis = require('../controllers/responsaveis');

// Montado em /api/criancas
function criarRotasCriancas(banco) {
  const rotas = express.Router();
  const ativacao = criarControladorAtivacao(banco);
  const c = criarControladorCriancas(banco);
  const reg = criarControladorRegistros(banco);
  const ativ = criarControladorAtividades(banco);
  const lgpd = criarControladorLgpd(banco);
  const resp = criarControladorResponsaveis(banco);
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

  // LGPD (T-34): quem acessou e exportação, só para a família (a regra central deixa a família passar)
  rotas.get('/:id/acessos', exigirPapel('RESPONSAVEL'), exigirAcessoCrianca('VER_PAINEL_ACESSOS'), lgpd.acessos);
  rotas.get('/:id/exportar', exigirPapel('RESPONSAVEL'), exigirAcessoCrianca('EXPORTAR_PRE'), lgpd.exportar);

  // Segundo responsável (T-40). Não existe rota para um responsável remover o outro.
  rotas.get('/:id/responsaveis', exigirAcessoCrianca('VER_RESPONSAVEIS'), resp.listar);
  rotas.post('/:id/convites-responsavel', exigirPapel('RESPONSAVEL'), exigirAcessoCrianca('GERAR_CONVITE_RESPONSAVEL_PRE'), resp.gerarConvite);
  rotas.post('/:id/sair', exigirPapel('RESPONSAVEL'), exigirAcessoCrianca('SAIR_PRE'), resp.sair);
  rotas.put('/:id/meu-parentesco', exigirPapel('RESPONSAVEL'), exigirAcessoCrianca('MUDAR_PARENTESCO_PRE'), resp.mudarParentesco);

  return rotas;
}

module.exports = criarRotasCriancas;
