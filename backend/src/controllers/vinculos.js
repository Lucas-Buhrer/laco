// Vínculos profissional ↔ criança: pedir, aprovar, recusar, revogar e mudar o escopo (RF-30 a RF-35, RF-39).
// Só os responsáveis da criança decidem (RN-02). A aprovação vale para UM profissional (RN-18).
const { hashCodigo } = require('../utils/codigos');
const { agoraIso } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');
const { expirarVinculos } = require('../utils/expiracao');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };
const MSG_CODIGO = 'Código inválido ou vencido. Peça um novo código à família.';

function criarControladorVinculos(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisar, avisarOutroResponsavel, avisarResponsaveis } = criarAvisos(banco);

  const ehResponsavelDa = banco.prepare(
    'SELECT 1 FROM responsaveis_crianca WHERE crianca_id = ? AND responsavel_id = ? AND saiu_em IS NULL'
  );
  const jaTemPedido = banco.prepare(
    "SELECT 1 FROM vinculos WHERE crianca_id = ? AND profissional_id = ? AND status IN ('PENDENTE','APROVADO')"
  );
  const novoVinculo = banco.prepare(
    `INSERT INTO vinculos (crianca_id, profissional_id, origem, solicitado_por, status, ver_historico_anterior,
                           ver_horarios_outras_clinicas, solicitado_em)
     VALUES (?, ?, ?, ?, 'PENDENTE', 0, 1, ?)`
  );
  const buscarProfissionalDaClinica = banco.prepare(
    "SELECT id, nome FROM usuarios WHERE id = ? AND clinica_id = ? AND papel = 'PROFISSIONAL' AND ativo = 1"
  );

  // GET /vinculos
  function listar(req, res) {
    expirarVinculos(banco);
    if (req.usuario.papel === 'RESPONSAVEL') {
      const linhas = banco
        .prepare(
          `SELECT v.id, v.crianca_id, c.nome AS crianca_nome, v.status, v.origem,
                  v.ver_historico_anterior, v.ver_horarios_outras_clinicas,
                  v.solicitado_em, v.respondido_em, v.aprovado_em, v.revogado_em, v.encerrado_em, v.motivo_encerramento,
                  u.nome AS profissional_nome, u.especialidade, u.especialidade_outro, cl.nome AS clinica_nome
           FROM vinculos v
           JOIN criancas c ON c.id = v.crianca_id
           JOIN usuarios u ON u.id = v.profissional_id
           JOIN clinicas cl ON cl.id = u.clinica_id
           JOIN responsaveis_crianca r ON r.crianca_id = v.crianca_id AND r.responsavel_id = ? AND r.saiu_em IS NULL
           ORDER BY v.solicitado_em DESC`
        )
        .all(req.usuario.id);
      return res.json({ dados: linhas });
    }

    // Profissional: os próprios pedidos. Pedido feito pelo código da família e ainda não aprovado
    // não mostra nada da criança, nem o nome (F-18).
    const linhas = banco
      .prepare(
        `SELECT v.id, v.crianca_id, c.nome AS crianca_nome, v.status, v.origem, v.solicitado_em, v.aprovado_em
         FROM vinculos v JOIN criancas c ON c.id = v.crianca_id
         WHERE v.profissional_id = ? ORDER BY v.solicitado_em DESC`
      )
      .all(req.usuario.id);
    const seguras = linhas.map((v) =>
      v.status !== 'APROVADO' && v.origem === 'CONVITE_RESPONSAVEL' ? { ...v, crianca_id: null, crianca_nome: null } : v
    );
    res.json({ dados: seguras });
  }

  // Carrega o vínculo SÓ se quem pede é responsável ativo da criança; senão null (vira 404)
  function vinculoDoResponsavel(req) {
    expirarVinculos(banco);
    const v = banco
      .prepare(
        `SELECT v.*, c.nome AS crianca_nome, u.nome AS profissional_nome
         FROM vinculos v JOIN criancas c ON c.id = v.crianca_id JOIN usuarios u ON u.id = v.profissional_id
         WHERE v.id = ?`
      )
      .get(req.params.id);
    if (!v || !ehResponsavelDa.get(v.crianca_id, req.usuario.id)) return null;
    return v;
  }

  // Lê um booleano do corpo; se não vier, usa o padrão
  function booleano(valor, padrao) {
    return typeof valor === 'boolean' ? (valor ? 1 : 0) : padrao;
  }

  // POST /vinculos/:id/aprovar  (corpo: ver_historico_anterior, ver_horarios_outras_clinicas)
  function aprovar(req, res) {
    const v = vinculoDoResponsavel(req);
    if (!v) return res.status(404).json(NAO_ENCONTRADO);
    if (v.status === 'EXPIRADO') return res.status(409).json({ erro: 'Este pedido expirou. O profissional pode pedir de novo.' });
    if (v.status !== 'PENDENTE') return res.status(409).json({ erro: 'Este pedido já foi respondido.' });

    const historico = booleano(req.body?.ver_historico_anterior, 0); // padrão: não compartilha
    const horarios = booleano(req.body?.ver_horarios_outras_clinicas, 1); // padrão: avisa conflito
    const agora = agoraIso();
    banco.transaction(() => {
      banco
        .prepare(`UPDATE vinculos SET status = 'APROVADO', ver_historico_anterior = ?, ver_horarios_outras_clinicas = ?,
                  respondido_em = ?, aprovado_em = ? WHERE id = ?`)
        .run(historico, horarios, agora, agora, v.id);
      // Consultas marcadas pela Recepção enquanto o pedido estava pendente deixam de "aguardar" a família
      banco.prepare('UPDATE consultas SET aguardando_aprovacao = 0 WHERE crianca_id = ? AND profissional_id = ?')
        .run(v.crianca_id, v.profissional_id);
      registrar(req, 'APROVAR_VINCULO', { criancaId: v.crianca_id, recurso: 'vinculo', recursoId: v.id });
      avisar(v.profissional_id, `A família aprovou o seu acesso a ${v.crianca_nome}.`, '/clinica/criancas');
      avisarOutroResponsavel(v.crianca_id, req.usuario.id,
        `${req.usuario.nome} aprovou o acesso de ${v.profissional_nome} a ${v.crianca_nome}.`, '/familia/acessos');
    })();
    res.json({ dados: { id: v.id, status: 'APROVADO' } });
  }

  // POST /vinculos/:id/recusar
  function recusar(req, res) {
    const v = vinculoDoResponsavel(req);
    if (!v) return res.status(404).json(NAO_ENCONTRADO);
    if (v.status !== 'PENDENTE') return res.status(409).json({ erro: 'Este pedido já foi respondido.' });

    banco.transaction(() => {
      banco.prepare("UPDATE vinculos SET status = 'RECUSADO', respondido_em = ? WHERE id = ?").run(agoraIso(), v.id);
      registrar(req, 'RECUSAR_VINCULO', { criancaId: v.crianca_id, recurso: 'vinculo', recursoId: v.id });
      avisarOutroResponsavel(v.crianca_id, req.usuario.id,
        `${req.usuario.nome} recusou o pedido de ${v.profissional_nome} para ${v.crianca_nome}.`, '/familia/acessos');
    })();
    res.json({ dados: { id: v.id, status: 'RECUSADO' } });
  }

  // POST /vinculos/:id/revogar — efeito imediato: a regra central lê o banco a cada pedido (RN-03)
  function revogar(req, res) {
    const v = vinculoDoResponsavel(req);
    if (!v) return res.status(404).json(NAO_ENCONTRADO);
    if (v.status !== 'APROVADO') return res.status(409).json({ erro: 'Este acesso não está ativo.' });

    banco.transaction(() => {
      banco.prepare("UPDATE vinculos SET status = 'REVOGADO', revogado_em = ? WHERE id = ?").run(agoraIso(), v.id);
      registrar(req, 'REVOGAR_VINCULO', { criancaId: v.crianca_id, recurso: 'vinculo', recursoId: v.id });
      avisar(v.profissional_id, `A família encerrou o seu acesso a ${v.crianca_nome}.`);
      avisarOutroResponsavel(v.crianca_id, req.usuario.id,
        `${req.usuario.nome} retirou o acesso de ${v.profissional_nome} a ${v.crianca_nome}.`, '/familia/acessos');
    })();
    res.json({ dados: { id: v.id, status: 'REVOGADO' } });
  }

  // PUT /vinculos/:id/escopo — vale na hora (RF-34, RF-49)
  function mudarEscopo(req, res) {
    const v = vinculoDoResponsavel(req);
    if (!v) return res.status(404).json(NAO_ENCONTRADO);
    if (v.status !== 'APROVADO') return res.status(409).json({ erro: 'Este acesso não está ativo.' });

    const historico = booleano(req.body?.ver_historico_anterior, v.ver_historico_anterior);
    const horarios = booleano(req.body?.ver_horarios_outras_clinicas, v.ver_horarios_outras_clinicas);
    banco.transaction(() => {
      banco.prepare('UPDATE vinculos SET ver_historico_anterior = ?, ver_horarios_outras_clinicas = ? WHERE id = ?')
        .run(historico, horarios, v.id);
      registrar(req, 'MUDAR_ESCOPO_VINCULO', { criancaId: v.crianca_id, recurso: 'vinculo', recursoId: v.id });
      avisarOutroResponsavel(v.crianca_id, req.usuario.id,
        `${req.usuario.nome} mudou o que ${v.profissional_nome} pode ver de ${v.crianca_nome}.`, '/familia/acessos');
    })();
    res.json({ dados: { id: v.id, ver_historico_anterior: historico, ver_horarios_outras_clinicas: horarios } });
  }

  // POST /vinculos/solicitar — com o código que a família gerou (RF-39, RN-19).
  // Profissional pede para si; a Recepção informa qual profissional (RF-40a).
  function solicitarPorCodigo(req, res) {
    const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim() : '';

    let profissionalId = req.usuario.id;
    if (req.usuario.papel === 'RECEPCAO') {
      const prof = buscarProfissionalDaClinica.get(req.body?.profissional_id, req.usuario.clinica_id);
      if (!prof) return res.status(400).json({ erro: 'Escolha um profissional ativo da sua clínica.' });
      profissionalId = prof.id;
    }
    if (!codigo) return res.status(400).json({ erro: MSG_CODIGO });

    const convite = banco
      .prepare(
        `SELECT cc.*, c.status_cadastro FROM convites_compartilhamento cc JOIN criancas c ON c.id = cc.crianca_id
         WHERE cc.codigo_hash = ?`
      )
      .get(hashCodigo(codigo));
    if (!convite || convite.usado_em || convite.expira_em < agoraIso() || convite.status_cadastro !== 'ATIVA') {
      return res.status(400).json({ erro: MSG_CODIGO });
    }
    if (jaTemPedido.get(convite.crianca_id, profissionalId)) {
      return res.status(409).json({ erro: 'Já existe um pedido ou acesso para este profissional.' });
    }

    const id = banco.transaction(() => {
      const agora = agoraIso();
      banco.prepare('UPDATE convites_compartilhamento SET usado_em = ? WHERE id = ?').run(agora, convite.id);
      const novoId = novoVinculo.run(convite.crianca_id, profissionalId, 'CONVITE_RESPONSAVEL', req.usuario.id, agora).lastInsertRowid;
      registrar(req, 'SOLICITAR_VINCULO', { criancaId: convite.crianca_id, recurso: 'vinculo', recursoId: novoId });
      const prof = banco.prepare('SELECT nome FROM usuarios WHERE id = ?').get(profissionalId);
      avisarResponsaveis(convite.crianca_id, `${prof.nome} pediu acesso aos dados do seu filho.`, '/familia/solicitacoes');
      return novoId;
    })();
    // Nenhum dado da criança na resposta: só depois da aprovação
    res.status(201).json({ dados: { id, status: 'PENDENTE' } });
  }

  // POST /clinica/pre-cadastros/:id/solicitar-vinculo — outro profissional da mesma clínica (RF-31)
  function solicitarMesmaClinica(req, res) {
    const crianca = banco
      .prepare("SELECT id, nome FROM criancas WHERE id = ? AND clinica_origem_id = ? AND status_cadastro = 'ATIVA'")
      .get(req.params.id, req.usuario.clinica_id);
    if (!crianca) return res.status(404).json(NAO_ENCONTRADO);

    const prof = buscarProfissionalDaClinica.get(req.body?.profissional_id, req.usuario.clinica_id);
    if (!prof) return res.status(400).json({ erro: 'Escolha um profissional ativo da sua clínica.' });
    if (jaTemPedido.get(crianca.id, prof.id)) {
      return res.status(409).json({ erro: 'Já existe um pedido ou acesso para este profissional.' });
    }

    const id = banco.transaction(() => {
      const novoId = novoVinculo.run(crianca.id, prof.id, 'MESMA_CLINICA', req.usuario.id, agoraIso()).lastInsertRowid;
      registrar(req, 'SOLICITAR_VINCULO', { criancaId: crianca.id, recurso: 'vinculo', recursoId: novoId });
      avisarResponsaveis(crianca.id, `${prof.nome} pediu acesso aos dados de ${crianca.nome}.`, '/familia/solicitacoes');
      return novoId;
    })();
    res.status(201).json({ dados: { id, status: 'PENDENTE' } });
  }

  return { listar, aprovar, recusar, revogar, mudarEscopo, solicitarPorCodigo, solicitarMesmaClinica };
}

module.exports = criarControladorVinculos;
