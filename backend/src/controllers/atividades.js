// Atividades de casa e execuções (RF-60 a RF-63). Passam pela regra central de acesso.
const { agoraIso, formatar } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// "3x ao dia" -> 21 por semana; "2 vezes por semana" -> 2. Sem número reconhecível, 7 (uma vez por dia).
function esperadoPorSemana(frequencia) {
  const n = parseInt(String(frequencia || '').match(/\d+/)?.[0] || '1', 10);
  return /semana/i.test(frequencia || '') ? n : n * 7;
}

const hojeDia = () => agoraIso().slice(0, 10);

function criarControladorAtividades(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisarResponsaveis } = criarAvisos(banco);

  // Adesão das últimas 4 semanas: execuções ÷ esperado, no máximo 100%
  function adesao(ativ) {
    const desde = new Date();
    desde.setDate(desde.getDate() - 28);
    const feitas = banco
      .prepare('SELECT COUNT(*) AS n FROM execucoes_atividade WHERE atividade_id = ? AND data >= ?')
      .get(ativ.id, formatar(desde).slice(0, 10)).n;
    const esperado = esperadoPorSemana(ativ.frequencia) * 4;
    return Math.min(100, Math.round((feitas / esperado) * 100));
  }

  function montar(ativ, req) {
    const feitasHoje = banco
      .prepare('SELECT COUNT(*) AS n FROM execucoes_atividade WHERE atividade_id = ? AND data = ?')
      .get(ativ.id, hojeDia()).n;
    const base = { ...ativ, feitas_hoje: feitasHoje, esperadas_hoje: Math.ceil(esperadoPorSemana(ativ.frequencia) / 7) };
    // A adesão detalhada é para o profissional que criou a atividade
    return req.acessoComo === 'PROFISSIONAL' ? { ...base, adesao_4_semanas: adesao(ativ) } : base;
  }

  const SELECIONAR = `SELECT a.*, u.nome AS profissional_nome FROM atividades a JOIN usuarios u ON u.id = a.profissional_id`;

  // GET /criancas/:id/atividades — profissional vê só as que criou; família vê as ativas (e as encerradas com ?todas=1)
  function listar(req, res) {
    const ehProf = req.acessoComo === 'PROFISSIONAL';
    const todas = req.query?.todas === '1';
    const linhas = banco
      .prepare(
        `${SELECIONAR} WHERE a.crianca_id = ? ${ehProf ? 'AND a.profissional_id = ?' : ''} ${todas ? '' : "AND a.status = 'ATIVA'"} ORDER BY a.criada_em DESC, a.id DESC`
      )
      .all(...[req.params.id, ...(ehProf ? [req.usuario.id] : [])]);
    res.json({ dados: linhas.map((a) => montar(a, req)) });
  }

  // POST /criancas/:id/atividades
  function criar(req, res) {
    if (req.acessoComo !== 'PROFISSIONAL') return res.status(403).json({ erro: 'Só o profissional cria atividades.' });
    const titulo = texto(req.body?.titulo);
    const instrucoes = texto(req.body?.instrucoes);
    const frequencia = texto(req.body?.frequencia);
    const prazo = texto(req.body?.prazo);
    if (!titulo) return res.status(400).json({ erro: 'Dê um título para a atividade.' });
    if (titulo.length > 200 || instrucoes.length > 4000 || frequencia.length > 60) return res.status(400).json({ erro: 'Texto muito longo.' });
    if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return res.status(400).json({ erro: 'Prazo inválido.' });

    const id = banco
      .prepare('INSERT INTO atividades (crianca_id, profissional_id, titulo, instrucoes, frequencia, prazo) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.id, req.usuario.id, titulo, instrucoes || null, frequencia || null, prazo || null).lastInsertRowid;
    registrar(req, 'CRIAR_ATIVIDADE', { criancaId: req.params.id, recurso: 'atividade', recursoId: id });
    const crianca = banco.prepare('SELECT nome FROM criancas WHERE id = ?').get(req.params.id);
    avisarResponsaveis(req.params.id, `Nova atividade de casa para ${crianca.nome}: ${titulo}.`, '/familia/atividades');
    res.status(201).json({ dados: { id } });
  }

  // Descobre a criança da atividade para a regra central de acesso
  function carregarAtividade(req, res, next) {
    const a = banco.prepare('SELECT * FROM atividades WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json(NAO_ENCONTRADO);
    req.atividade = a;
    req.criancaId = a.crianca_id;
    next();
  }

  // PUT /atividades/:id — só quem criou; também serve para encerrar
  function atualizar(req, res) {
    if (req.acessoComo !== 'PROFISSIONAL' || req.atividade.profissional_id !== req.usuario.id) return res.status(404).json(NAO_ENCONTRADO);
    const b = req.body || {};
    const novo = {
      titulo: b.titulo === undefined ? req.atividade.titulo : texto(b.titulo),
      instrucoes: b.instrucoes === undefined ? req.atividade.instrucoes : texto(b.instrucoes),
      frequencia: b.frequencia === undefined ? req.atividade.frequencia : texto(b.frequencia),
      prazo: b.prazo === undefined ? req.atividade.prazo : texto(b.prazo) || null,
      status: b.status === undefined ? req.atividade.status : b.status,
    };
    if (!novo.titulo || !['ATIVA', 'ENCERRADA'].includes(novo.status)) return res.status(400).json({ erro: 'Confira o título e a situação.' });
    banco.prepare('UPDATE atividades SET titulo = ?, instrucoes = ?, frequencia = ?, prazo = ?, status = ? WHERE id = ?')
      .run(novo.titulo, novo.instrucoes, novo.frequencia, novo.prazo, novo.status, req.atividade.id);
    registrar(req, 'EDITAR_ATIVIDADE', { criancaId: req.atividade.crianca_id, recurso: 'atividade', recursoId: req.atividade.id });
    res.json({ dados: { id: req.atividade.id, ...novo } });
  }

  // POST /atividades/:id/execucoes — o responsável marca "como foi" (1 foi bem, 2 mais ou menos, 3 difícil)
  function registrarExecucao(req, res) {
    if (req.acessoComo !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Só a família marca a atividade como feita.' });
    if (req.atividade.status !== 'ATIVA') return res.status(409).json({ erro: 'Esta atividade foi encerrada.' });
    const comoFoi = Number(req.body?.como_foi);
    if (![1, 2, 3].includes(comoFoi)) return res.status(400).json({ erro: 'Diga como foi: bem, mais ou menos ou difícil.' });
    const observacao = texto(req.body?.observacao).slice(0, 1000);
    const id = banco
      .prepare('INSERT INTO execucoes_atividade (atividade_id, data, como_foi, observacao) VALUES (?, ?, ?, ?)')
      .run(req.atividade.id, hojeDia(), comoFoi, observacao || null).lastInsertRowid;
    registrar(req, 'REGISTRAR_EXECUCAO', { criancaId: req.atividade.crianca_id, recurso: 'execucao', recursoId: id });
    res.status(201).json({ dados: { id } });
  }

  // GET /atividades/:id/execucoes — profissional só das atividades que criou
  function listarExecucoes(req, res) {
    if (req.acessoComo === 'PROFISSIONAL' && req.atividade.profissional_id !== req.usuario.id) return res.status(404).json(NAO_ENCONTRADO);
    const linhas = banco
      .prepare('SELECT id, data, como_foi, observacao, registrada_em FROM execucoes_atividade WHERE atividade_id = ? ORDER BY data DESC, id DESC LIMIT 200')
      .all(req.atividade.id);
    res.json({ dados: linhas });
  }

  return { listar, criar, carregarAtividade, atualizar, registrarExecucao, listarExecucoes };
}

module.exports = criarControladorAtividades;
