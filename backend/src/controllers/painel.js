// Painéis iniciais (RF-80, RF-81). Cada papel recebe só números e listas do que já pode ver.
// O painel da clínica (ADM/Recepção) nunca traz dado clínico: só agenda e cadastro.
const { agoraIso } = require('../utils/datas');
const { corDaConsulta, diasAte } = require('./consultas');
const { expirarVinculos, criarLembretesDeConfirmacao } = require('../utils/expiracao');

function criarControladorPainel(banco) {
  const hoje = () => agoraIso().slice(0, 10);

  const consultasDoDia = (filtroExtra, params) =>
    banco
      .prepare(
        `SELECT c.id, c.inicio, c.duracao_min, c.tipo, c.status, c.presenca_confirmada, c.confirmada_por, c.aguardando_aprovacao,
                cr.nome AS crianca_nome, u.nome AS profissional_nome
         FROM consultas c JOIN criancas cr ON cr.id = c.crianca_id JOIN usuarios u ON u.id = c.profissional_id
         WHERE c.inicio >= ? AND c.inicio <= ? AND c.status <> 'REMARCADA' ${filtroExtra} ORDER BY c.inicio`
      )
      .all(`${hoje()}T00:00:00`, `${hoje()}T23:59:59`, ...params)
      .map((c) => ({ ...c, cor: corDaConsulta(c) }));

  // GET /painel/profissional
  function profissional(req, res) {
    expirarVinculos(banco);
    const uid = req.usuario.id;
    const agenda = consultasDoDia(
      `AND c.profissional_id = ? AND c.clinica_id = ?
       AND EXISTS (SELECT 1 FROM vinculos v WHERE v.crianca_id = c.crianca_id AND v.profissional_id = c.profissional_id AND v.status = 'APROVADO')`,
      [uid, req.usuario.clinica_id]
    );
    const aprovadas = banco.prepare("SELECT COUNT(*) AS n FROM vinculos WHERE profissional_id = ? AND status = 'APROVADO'").get(uid).n;
    // Pedidos aguardando os pais. Se o pedido veio de um código da família, não mostra nem o nome (F-18).
    const pedidos = banco
      .prepare(
        `SELECT v.id, v.origem, v.solicitado_em, c.nome AS crianca_nome FROM vinculos v JOIN criancas c ON c.id = v.crianca_id
         WHERE v.profissional_id = ? AND v.status = 'PENDENTE' ORDER BY v.solicitado_em DESC`
      )
      .all(uid)
      .map((p) => ({ id: p.id, solicitado_em: p.solicitado_em, crianca_nome: p.origem === 'CONVITE_RESPONSAVEL' ? null : p.crianca_nome }));
    res.json({ dados: { consultas_hoje: agenda, criancas_aprovadas: aprovadas, pedidos_pendentes: pedidos } });
  }

  // GET /painel/responsavel
  function responsavel(req, res) {
    expirarVinculos(banco);
    criarLembretesDeConfirmacao(banco, req.usuario.id);
    const uid = req.usuario.id;
    const filhos = banco
      .prepare(
        `SELECT c.id, c.nome FROM responsaveis_crianca r JOIN criancas c ON c.id = r.crianca_id
         WHERE r.responsavel_id = ? AND r.saiu_em IS NULL ORDER BY c.nome`
      )
      .all(uid);
    const idsFilhos = filhos.map((f) => f.id);
    const marcas = idsFilhos.map(() => '?').join(',') || "''";

    const proximas = banco
      .prepare(
        `SELECT c.id, c.inicio, c.tipo, c.presenca_confirmada, c.status, cr.nome AS crianca_nome, u.nome AS profissional_nome, cl.nome AS clinica_nome
         FROM consultas c JOIN criancas cr ON cr.id = c.crianca_id JOIN usuarios u ON u.id = c.profissional_id JOIN clinicas cl ON cl.id = c.clinica_id
         WHERE c.crianca_id IN (${marcas}) AND c.status = 'AGENDADA' AND c.inicio >= ? ORDER BY c.inicio LIMIT 5`
      )
      .all(...idsFilhos, `${hoje()}T00:00:00`);

    const atividades = banco
      .prepare(
        `SELECT a.id, a.titulo, a.frequencia, cr.nome AS crianca_nome,
                (SELECT COUNT(*) FROM execucoes_atividade e WHERE e.atividade_id = a.id AND e.data = ?) AS feitas_hoje
         FROM atividades a JOIN criancas cr ON cr.id = a.crianca_id
         WHERE a.crianca_id IN (${marcas}) AND a.status = 'ATIVA' ORDER BY a.titulo`
      )
      .all(hoje(), ...idsFilhos);

    const pedidos = banco
      .prepare(
        `SELECT v.id, u.nome AS profissional_nome, cr.nome AS crianca_nome FROM vinculos v
         JOIN usuarios u ON u.id = v.profissional_id JOIN criancas cr ON cr.id = v.crianca_id
         WHERE v.status = 'PENDENTE' AND v.crianca_id IN (${marcas}) ORDER BY v.solicitado_em DESC`
      )
      .all(...idsFilhos);

    const naoLidos = banco.prepare('SELECT COUNT(*) AS n FROM notificacoes WHERE usuario_id = ? AND lida = 0').get(uid).n;
    res.json({ dados: { filhos, proximas_consultas: proximas, atividades, pedidos_pendentes: pedidos, avisos_nao_lidos: naoLidos } });
  }

  // GET /painel/clinica — ADM e Recepção
  function clinica(req, res) {
    const cid = req.usuario.clinica_id;
    const agenda = consultasDoDia('AND c.clinica_id = ?', [cid]);

    const inicioSemana = `${hoje()}T00:00:00`;
    const fimSemana = new Date();
    fimSemana.setDate(fimSemana.getDate() + 7);
    const semana = banco
      .prepare("SELECT COUNT(*) AS n FROM consultas WHERE clinica_id = ? AND status = 'AGENDADA' AND inicio >= ? AND inicio < ?")
      .get(cid, inicioSemana, `${fimSemana.toISOString().slice(0, 10)}T00:00:00`).n;

    // Lista "Sem resposta": consultas agendadas, não confirmadas, faltando 3 dias ou menos (a clínica liga)
    const semResposta = banco
      .prepare(
        `SELECT c.id, c.inicio, cr.nome AS crianca_nome, u.nome AS profissional_nome, cr.contato_responsavel_telefone AS telefone
         FROM consultas c JOIN criancas cr ON cr.id = c.crianca_id JOIN usuarios u ON u.id = c.profissional_id
         WHERE c.clinica_id = ? AND c.status = 'AGENDADA' AND c.presenca_confirmada = 0 AND c.inicio >= ? ORDER BY c.inicio`
      )
      .all(cid, agoraIso())
      .filter((c) => diasAte(c.inicio) <= 3)
      .map((c) => ({ ...c, dias_restantes: diasAte(c.inicio), telefone: undefined }));

    const aAtivar = banco
      .prepare("SELECT COUNT(*) AS n FROM criancas WHERE clinica_origem_id = ? AND status_cadastro = 'PRE_CADASTRO'")
      .get(cid).n;
    const profissionais = banco
      .prepare("SELECT COUNT(*) AS n FROM usuarios WHERE clinica_id = ? AND papel = 'PROFISSIONAL' AND ativo = 1")
      .get(cid).n;
    res.json({ dados: { consultas_hoje: agenda, consultas_semana: semana, sem_resposta: semResposta, pre_cadastros_sem_ativacao: aAtivar, profissionais_ativos: profissionais } });
  }

  return { profissional, responsavel, clinica };
}

module.exports = criarControladorPainel;
