// Registros de sessão, adendos e linha do tempo (RF-50 a RF-54, RN-04 a RN-06).
// Todas as rotas daqui passam antes pela regra central de acesso (req.acessoComo, req.vinculo).
const { inicioDoEscopo } = require('../middlewares/acessoCrianca');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };
const MAX_TEXTO = 4000;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function criarControladorRegistros(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisarResponsaveis } = criarAvisos(banco);

  // Monta o registro como cada leitor pode vê-lo. A observação PRIVADA só vai para quem a escreveu (RN-05).
  function paraLeitor(r, req) {
    const euSouAutor = req.acessoComo === 'PROFISSIONAL' && r.profissional_id === req.usuario.id;
    const mostrarObs = r.observacao && (r.observacao_visivel_familia === 1 || euSouAutor);
    const adendos = banco
      .prepare('SELECT a.id, a.texto, a.criado_em, u.nome AS profissional_nome FROM adendos_registro a JOIN usuarios u ON u.id = a.profissional_id WHERE a.registro_id = ? ORDER BY a.id')
      .all(r.id);
    return {
      id: r.id,
      crianca_id: r.crianca_id,
      consulta_id: r.consulta_id,
      profissional_nome: r.profissional_nome,
      resumo: r.resumo,
      objetivos: r.objetivos,
      humor: r.humor,
      observacao: mostrarObs ? r.observacao : null,
      observacao_visivel_familia: r.observacao_visivel_familia,
      // "Só para mim" aparece só para o autor, marcada como interna
      observacao_interna: Boolean(r.observacao) && r.observacao_visivel_familia !== 1 && euSouAutor,
      criado_em: r.criado_em,
      pode_adendo: euSouAutor,
      adendos,
    };
  }

  const SELECIONAR = `SELECT r.*, u.nome AS profissional_nome FROM registros_sessao r JOIN usuarios u ON u.id = r.profissional_id`;

  // Registros que o leitor pode ler: profissional respeita o corte do escopo (RN-04)
  function registrosVisiveis(req) {
    const corte = inicioDoEscopo(req);
    return banco
      .prepare(`${SELECIONAR} WHERE r.crianca_id = ? ${corte ? 'AND r.criado_em >= ?' : ''} ORDER BY r.criado_em DESC, r.id DESC`)
      .all(...(corte ? [req.params.id, corte] : [req.params.id]));
  }

  // GET /criancas/:id/registros
  function listar(req, res) {
    res.json({ dados: registrosVisiveis(req).map((r) => paraLeitor(r, req)) });
  }

  // POST /criancas/:id/registros — só profissional com vínculo aprovado
  function criar(req, res) {
    if (req.acessoComo !== 'PROFISSIONAL') return res.status(403).json({ erro: 'Só o profissional registra sessões.' });
    const b = req.body || {};
    const resumo = texto(b.resumo);
    const objetivos = texto(b.objetivos);
    const observacao = texto(b.observacao);
    const humor = b.humor === undefined || b.humor === null || b.humor === '' ? null : Number(b.humor);
    if (!resumo) return res.status(400).json({ erro: 'Escreva o resumo da sessão.' });
    if (resumo.length > MAX_TEXTO || objetivos.length > MAX_TEXTO || observacao.length > MAX_TEXTO) {
      return res.status(400).json({ erro: 'Texto muito longo.' });
    }
    if (humor !== null && !(Number.isInteger(humor) && humor >= 1 && humor <= 5)) {
      return res.status(400).json({ erro: 'O humor vai de 1 a 5.' });
    }
    // Observação: padrão "Só para mim". Só fica visível se o profissional escolher mostrar (RF-51).
    const visivel = b.observacao_visivel_familia === true ? 1 : 0;

    // A consulta, se vier, precisa ser desta criança e deste profissional
    let consultaId = null;
    if (b.consulta_id) {
      const consulta = banco.prepare('SELECT id FROM consultas WHERE id = ? AND crianca_id = ? AND profissional_id = ?')
        .get(b.consulta_id, req.params.id, req.usuario.id);
      if (!consulta) return res.status(400).json({ erro: 'Essa consulta não é sua ou não é desta criança.' });
      consultaId = consulta.id;
    }

    const id = banco
      .prepare(`INSERT INTO registros_sessao (crianca_id, profissional_id, consulta_id, resumo, objetivos, humor, observacao, observacao_visivel_familia)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.params.id, req.usuario.id, consultaId, resumo, objetivos || null, humor, observacao || null, visivel).lastInsertRowid;
    registrar(req, 'CRIAR_REGISTRO', { criancaId: req.params.id, recurso: 'registro_sessao', recursoId: id });
    const crianca = banco.prepare('SELECT nome FROM criancas WHERE id = ?').get(req.params.id);
    avisarResponsaveis(req.params.id, `${req.usuario.nome} registrou uma sessão de ${crianca.nome}.`, '/familia/linha-do-tempo');
    res.status(201).json({ dados: { id } });
  }

  // POST /registros/:id/adendos — correção por adendo; o registro original nunca muda (RN-06)
  function criarAdendo(req, res) {
    if (req.acessoComo !== 'PROFISSIONAL') return res.status(403).json({ erro: 'Só o profissional que fez o registro acrescenta adendos.' });
    if (req.registro.profissional_id !== req.usuario.id) return res.status(404).json(NAO_ENCONTRADO);
    const adendo = texto(req.body?.texto);
    if (!adendo || adendo.length > MAX_TEXTO) return res.status(400).json({ erro: 'Escreva o adendo (até 4000 letras).' });
    const id = banco.prepare('INSERT INTO adendos_registro (registro_id, profissional_id, texto) VALUES (?, ?, ?)')
      .run(req.registro.id, req.usuario.id, adendo).lastInsertRowid;
    registrar(req, 'CRIAR_ADENDO', { criancaId: req.registro.crianca_id, recurso: 'adendo', recursoId: id });
    res.status(201).json({ dados: { id } });
  }

  // GET /criancas/:id/linha-do-tempo — registros, consultas e atividades em ordem
  function linhaDoTempo(req, res) {
    const corte = inicioDoEscopo(req);
    const ehProf = req.acessoComo === 'PROFISSIONAL';
    const itens = [];

    for (const r of registrosVisiveis(req)) itens.push({ tipo: 'REGISTRO', data: r.criado_em, registro: paraLeitor(r, req) });

    // Profissional: só as próprias consultas (nunca de outra clínica, RN-25). Família: todas as dos filhos.
    const consultas = banco
      .prepare(
        `SELECT c.id, c.inicio, c.status, c.tipo, u.nome AS profissional_nome, cl.nome AS clinica_nome
         FROM consultas c JOIN usuarios u ON u.id = c.profissional_id JOIN clinicas cl ON cl.id = c.clinica_id
         WHERE c.crianca_id = ? AND c.status <> 'AGENDADA' ${ehProf ? 'AND c.profissional_id = ?' : ''} ${corte ? 'AND c.inicio >= ?' : ''}
         ORDER BY c.inicio DESC`
      )
      .all(...[req.params.id, ...(ehProf ? [req.usuario.id] : []), ...(corte ? [corte] : [])]);
    for (const c of consultas) itens.push({ tipo: 'CONSULTA', data: c.inicio, consulta: c });

    const atividades = banco
      .prepare(
        `SELECT a.id, a.titulo, a.criada_em, u.nome AS profissional_nome FROM atividades a JOIN usuarios u ON u.id = a.profissional_id
         WHERE a.crianca_id = ? ${ehProf ? 'AND a.profissional_id = ?' : ''} ${corte ? 'AND a.criada_em >= ?' : ''}`
      )
      .all(...[req.params.id, ...(ehProf ? [req.usuario.id] : []), ...(corte ? [corte] : [])]);
    for (const a of atividades) itens.push({ tipo: 'ATIVIDADE', data: a.criada_em, atividade: a });

    itens.sort((x, y) => (x.data < y.data ? 1 : -1));
    res.json({ dados: itens });
  }

  // Descobre a criança do registro para a regra central de acesso
  function carregarRegistro(req, res, next) {
    const r = banco.prepare('SELECT * FROM registros_sessao WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json(NAO_ENCONTRADO);
    req.registro = r;
    req.criancaId = r.crianca_id;
    next();
  }

  return { listar, criar, criarAdendo, linhaDoTempo, carregarRegistro };
}

module.exports = criarControladorRegistros;
