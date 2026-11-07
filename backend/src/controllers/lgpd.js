// LGPD: painel "quem acessou", exportação e solicitações do responsável (RF-71 a RF-75).
// Só o responsável da criança usa estas rotas. A observação "Só para mim" NUNCA entra na exportação (RN-05).
const crypto = require('node:crypto');
const { agoraIso } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const TIPOS_PEDIDO = ['EXCLUSAO', 'REVOGACAO'];

// Ações do log em português simples, para o painel dos pais
const ACOES = {
  VER_PERFIL: 'abriu o perfil',
  VER_REGISTROS: 'abriu o histórico de sessões',
  VER_LINHA_DO_TEMPO: 'abriu a linha do tempo',
  CRIAR_REGISTRO: 'registrou uma sessão',
  CRIAR_ADENDO: 'acrescentou um adendo a um registro',
  VER_ATIVIDADES: 'abriu as atividades',
  CRIAR_ATIVIDADE: 'criou uma atividade',
  EDITAR_ATIVIDADE: 'alterou uma atividade',
  VER_EXECUCOES: 'viu como foram as atividades',
  VER_CONSULTA: 'abriu uma consulta',
  CRIAR_CONSULTA: 'agendou uma consulta',
  REMARCAR_CONSULTA: 'remarcou uma consulta',
  CANCELAR_CONSULTA: 'cancelou uma consulta',
  MARCAR_REALIZADA: 'marcou uma consulta como realizada',
  MARCAR_FALTA: 'marcou uma falta',
  CONFIRMAR_POR_CONTATO: 'registrou uma confirmação por telefone',
  VERIFICAR_CONFLITO_AGENDA: 'verificou conflito de horário ao agendar',
  APROVAR_VINCULO: 'aprovou o acesso de um profissional',
  RECUSAR_VINCULO: 'recusou o pedido de um profissional',
  REVOGAR_VINCULO: 'retirou o acesso de um profissional',
  MUDAR_ESCOPO_VINCULO: 'mudou o que um profissional pode ver',
  GERAR_CONVITE_CLINICA: 'gerou um código para outra clínica',
  EDITAR_CRIANCA: 'editou os dados da criança',
  EXPORTAR_DADOS: 'baixou os dados da criança',
  VER_RESPONSAVEIS: 'viu a lista de responsáveis',
  VER_RESUMO_PARECER: 'viu o resumo do período para escrever um parecer',
  PUBLICAR_PARECER: 'publicou um parecer',
  GERAR_CONVITE_RESPONSAVEL: 'gerou um convite para outro responsável',
  ENTRAR_COMO_RESPONSAVEL: 'entrou como responsável',
  SAIR_DA_CRIANCA: 'saiu como responsável',
  SOLICITAR_EXCLUSAO: 'pediu a exclusão dos dados',
  REVOGAR_CONSENTIMENTO: 'revogou o consentimento',
};
// Do responsável, só as ações que mudam algo aparecem no painel (ver a própria tela não é "acesso")
const ACOES_DO_RESPONSAVEL = ['APROVAR_VINCULO', 'RECUSAR_VINCULO', 'REVOGAR_VINCULO', 'MUDAR_ESCOPO_VINCULO',
  'GERAR_CONVITE_CLINICA', 'GERAR_CONVITE_RESPONSAVEL', 'ENTRAR_COMO_RESPONSAVEL', 'SAIR_DA_CRIANCA', 'EDITAR_CRIANCA', 'EXPORTAR_DADOS', 'SOLICITAR_EXCLUSAO', 'REVOGAR_CONSENTIMENTO'];

function criarControladorLgpd(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisar, avisarOutroResponsavel } = criarAvisos(banco);

  const soResponsavel = (req, res) => {
    if (req.acessoComo !== 'RESPONSAVEL') {
      res.status(403).json({ erro: 'Só a família pode abrir isto.' });
      return false;
    }
    return true;
  };

  // GET /criancas/:id/acessos?profissional_id=
  function acessos(req, res) {
    if (!soResponsavel(req, res)) return;
    const marcas = ACOES_DO_RESPONSAVEL.map(() => '?').join(',');
    const filtroProf = req.query?.profissional_id ? 'AND l.usuario_id = ?' : '';
    const linhas = banco
      .prepare(
        `SELECT l.id, l.acao, l.criado_em, l.usuario_id, u.nome AS usuario_nome, u.papel, cl.nome AS clinica_nome
         FROM log_acesso l LEFT JOIN usuarios u ON u.id = l.usuario_id LEFT JOIN clinicas cl ON cl.id = u.clinica_id
         WHERE l.crianca_id = ? AND (u.papel <> 'RESPONSAVEL' OR l.acao IN (${marcas})) ${filtroProf}
         ORDER BY l.criado_em DESC, l.id DESC LIMIT 300`
      )
      .all(...[req.params.id, ...ACOES_DO_RESPONSAVEL, ...(filtroProf ? [Number(req.query.profissional_id)] : [])]);
    const dados = linhas.map((l) => ({
      id: l.id,
      quando: l.criado_em,
      quem: l.usuario_nome || 'Sistema',
      papel: l.papel,
      clinica: l.clinica_nome,
      acao: ACOES[l.acao] || 'acessou os dados',
      usuario_id: l.usuario_id,
    }));
    // Para o filtro "Todos / Carlos / Ana": quem já acessou
    const pessoas = banco
      .prepare(
        `SELECT DISTINCT u.id, u.nome FROM log_acesso l JOIN usuarios u ON u.id = l.usuario_id
         WHERE l.crianca_id = ? AND u.papel <> 'RESPONSAVEL' ORDER BY u.nome`
      )
      .all(req.params.id);
    res.json({ dados: { acessos: dados, profissionais: pessoas } });
  }

  const protocolo = () => `LACO-${agoraIso().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // GET /criancas/:id/exportar — tudo que o LAÇO guarda da criança, em JSON
  function exportar(req, res) {
    if (!soResponsavel(req, res)) return;
    const id = req.params.id;
    const crianca = banco
      .prepare('SELECT id, nome, data_nascimento, nivel_suporte, comunicacao, sensibilidades, observacoes FROM criancas WHERE id = ?')
      .get(id);
    const registros = banco
      .prepare('SELECT r.*, u.nome AS profissional_nome FROM registros_sessao r JOIN usuarios u ON u.id = r.profissional_id WHERE r.crianca_id = ? ORDER BY r.criado_em')
      .all(id)
      .map((r) => ({
        data: r.criado_em, profissional: r.profissional_nome, resumo: r.resumo, objetivos: r.objetivos, humor: r.humor,
        // observação privada fica de fora, sempre (RN-05)
        observacao: r.observacao_visivel_familia === 1 ? r.observacao : null,
        adendos: banco.prepare('SELECT texto, criado_em FROM adendos_registro WHERE registro_id = ? ORDER BY id').all(r.id),
      }));
    const atividades = banco
      .prepare('SELECT a.*, u.nome AS profissional_nome FROM atividades a JOIN usuarios u ON u.id = a.profissional_id WHERE a.crianca_id = ?')
      .all(id)
      .map((a) => ({
        titulo: a.titulo, instrucoes: a.instrucoes, frequencia: a.frequencia, prazo: a.prazo, status: a.status, profissional: a.profissional_nome,
        execucoes: banco.prepare('SELECT data, como_foi, observacao FROM execucoes_atividade WHERE atividade_id = ? ORDER BY data').all(a.id),
      }));
    const dados = {
      gerado_em: agoraIso(),
      crianca,
      responsaveis: banco
        .prepare('SELECT u.nome, r.parentesco, r.parentesco_outro FROM responsaveis_crianca r JOIN usuarios u ON u.id = r.responsavel_id WHERE r.crianca_id = ? AND r.saiu_em IS NULL')
        .all(id),
      acessos_de_profissionais: banco
        .prepare(`SELECT u.nome AS profissional, v.status, v.solicitado_em, v.aprovado_em, v.revogado_em, v.encerrado_em
                  FROM vinculos v JOIN usuarios u ON u.id = v.profissional_id WHERE v.crianca_id = ?`)
        .all(id),
      consultas: banco
        .prepare('SELECT c.inicio, c.duracao_min, c.tipo, c.status, u.nome AS profissional FROM consultas c JOIN usuarios u ON u.id = c.profissional_id WHERE c.crianca_id = ? ORDER BY c.inicio')
        .all(id),
      registros_de_sessao: registros,
      atividades,
      pareceres_publicados: banco
        .prepare('SELECT p.periodo_inicio, p.periodo_fim, p.texto, p.publicado_em, u.nome AS profissional FROM pareceres p JOIN usuarios u ON u.id = p.profissional_id WHERE p.crianca_id = ?')
        .all(id),
      consentimento: banco.prepare('SELECT versao_termo, aceito_em, revogado_em FROM consentimentos WHERE usuario_id = ?').all(req.usuario.id),
    };
    banco.transaction(() => {
      banco.prepare("INSERT INTO solicitacoes_lgpd (responsavel_id, crianca_id, tipo, protocolo, status, concluida_em) VALUES (?, ?, 'EXPORTACAO', ?, 'CONCLUIDA', ?)")
        .run(req.usuario.id, id, protocolo(), agoraIso());
      registrar(req, 'EXPORTAR_DADOS', { criancaId: id, recurso: 'exportacao' });
      avisarOutroResponsavel(id, req.usuario.id, `${req.usuario.nome} baixou os dados de ${crianca.nome}.`, '/familia/privacidade');
    })();
    res.json({ dados });
  }

  // POST /lgpd/solicitacoes — pedido de exclusão ou revogação do consentimento (pede confirmação no app)
  function solicitar(req, res) {
    const tipo = req.body?.tipo;
    const criancaId = req.body?.crianca_id;
    if (!TIPOS_PEDIDO.includes(tipo)) return res.status(400).json({ erro: 'Escolha o tipo do pedido.' });
    if (req.body?.confirmar !== true) return res.status(400).json({ erro: 'Confirme o pedido para continuar.' });
    const vinculoFamilia = banco
      .prepare('SELECT c.nome FROM responsaveis_crianca r JOIN criancas c ON c.id = r.crianca_id WHERE r.crianca_id = ? AND r.responsavel_id = ? AND r.saiu_em IS NULL')
      .get(criancaId, req.usuario.id);
    if (!vinculoFamilia) return res.status(404).json({ erro: 'Não encontrado.' });

    const agora = agoraIso();
    const codigo = protocolo();
    banco.transaction(() => {
      if (tipo === 'REVOGACAO') {
        // Encerra TODOS os acessos da criança (RF-75) e guarda a data da revogação
        const alvos = banco.prepare("SELECT id, profissional_id FROM vinculos WHERE crianca_id = ? AND status IN ('APROVADO','PENDENTE')").all(criancaId);
        const encerrar = banco.prepare("UPDATE vinculos SET status = 'ENCERRADO', encerrado_em = ?, motivo_encerramento = 'CONSENTIMENTO_REVOGADO' WHERE id = ?");
        for (const v of alvos) {
          encerrar.run(agora, v.id);
          avisar(v.profissional_id, `A família encerrou o seu acesso a ${vinculoFamilia.nome}.`);
        }
        banco.prepare('UPDATE consentimentos SET revogado_em = ? WHERE usuario_id = ? AND revogado_em IS NULL').run(agora, req.usuario.id);
      }
      banco
        .prepare("INSERT INTO solicitacoes_lgpd (responsavel_id, crianca_id, tipo, protocolo, status, concluida_em) VALUES (?, ?, ?, ?, ?, ?)")
        .run(req.usuario.id, criancaId, tipo, codigo, tipo === 'REVOGACAO' ? 'CONCLUIDA' : 'REGISTRADA', tipo === 'REVOGACAO' ? agora : null);
      registrar(req, tipo === 'REVOGACAO' ? 'REVOGAR_CONSENTIMENTO' : 'SOLICITAR_EXCLUSAO', { criancaId, recurso: 'lgpd' });
      avisarOutroResponsavel(criancaId, req.usuario.id,
        `${req.usuario.nome} ${tipo === 'REVOGACAO' ? 'revogou o consentimento' : 'pediu a exclusão dos dados'} de ${vinculoFamilia.nome}.`, '/familia/privacidade');
    })();
    res.status(201).json({ dados: { protocolo: codigo, tipo } });
  }

  // GET /lgpd/solicitacoes
  function listarSolicitacoes(req, res) {
    const linhas = banco
      .prepare(
        `SELECT s.id, s.tipo, s.protocolo, s.status, s.criada_em, s.concluida_em, c.nome AS crianca_nome
         FROM solicitacoes_lgpd s JOIN criancas c ON c.id = s.crianca_id WHERE s.responsavel_id = ? ORDER BY s.criada_em DESC, s.id DESC`
      )
      .all(req.usuario.id);
    res.json({ dados: linhas });
  }

  return { acessos, exportar, solicitar, listarSolicitacoes };
}

module.exports = criarControladorLgpd;
