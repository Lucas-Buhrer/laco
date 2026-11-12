// Consultas e agenda (RF-40 a RF-49, RN-24 a RN-27, RN-35). Regras 4.3 e 4.3c do doc 05.
// Cada clínica só enxerga as próprias consultas. O único jeito de saber de outra clínica é o
// aviso de conflito, que responde só { conflito: true } na hora de agendar.
const { agoraIso, formatar } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };
const DURACAO_PADRAO = 50;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// 'AAAA-MM-DDTHH:MM' ou com segundos -> 'AAAA-MM-DDTHH:MM:SS'; null se inválido
function lerInicio(valor) {
  const t = texto(valor);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(t)) return null;
  const completo = t.length === 16 ? `${t}:00` : t;
  const d = new Date(completo);
  return Number.isNaN(d.getTime()) || formatar(d) !== completo ? null : completo;
}

const fimDe = (inicio, minutos) => formatar(new Date(new Date(inicio).getTime() + minutos * 60000));

// Dias de calendário entre hoje e a consulta (0 = hoje)
function diasAte(inicio) {
  const a = new Date(inicio);
  const h = new Date();
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((dia(a) - dia(h)) / 86400000);
}

// Responsável confirma até o fim do dia anterior (RN-35)
function prazoConfirmacao(inicio) {
  const d = new Date(inicio);
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 0);
  return formatar(d);
}

// Cor da agenda calculada na leitura (doc 05, 4.3c)
function corDaConsulta(c) {
  if (c.status !== 'AGENDADA') return null;
  // Horário já passou e ninguém marcou realizada/falta: a consulta NÃO muda sozinha (RN), só a cor avisa
  if (new Date(c.inicio) < new Date()) return 'PASSOU';
  if (c.presenca_confirmada) return 'VERDE';
  const dias = diasAte(c.inicio);
  if (dias >= 4) return 'AZUL';
  if (dias >= 2) return 'AMARELA';
  return 'VERMELHA';
}

function criarControladorConsultas(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisar, avisarResponsaveis } = criarAvisos(banco);

  const COLUNAS = `c.id, c.crianca_id, cr.nome AS crianca_nome, c.profissional_id, u.nome AS profissional_nome,
    u.especialidade, u.especialidade_outro, cl.nome AS clinica_nome, c.inicio, c.duracao_min, c.tipo, c.status,
    c.remarcada_para_id, c.presenca_confirmada, c.confirmada_por, c.aguardando_aprovacao`;
  const JUNTAS = `FROM consultas c JOIN criancas cr ON cr.id = c.crianca_id
    JOIN usuarios u ON u.id = c.profissional_id JOIN clinicas cl ON cl.id = c.clinica_id`;

  // Acrescenta cor, prazo e a nova data de uma consulta remarcada
  function enriquecer(linhas) {
    const novaData = banco.prepare('SELECT inicio FROM consultas WHERE id = ?');
    return linhas.map((c) => {
      const extra = { cor: corDaConsulta(c), dias_restantes: c.status === 'AGENDADA' ? diasAte(c.inicio) : null };
      if (c.remarcada_para_id) extra.remarcada_para = novaData.get(c.remarcada_para_id)?.inicio || null;
      return { ...c, ...extra, prazo_confirmacao: prazoConfirmacao(c.inicio) };
    });
  }

  // Vínculo APROVADO do profissional com a criança (ou undefined)
  const vinculoDe = (criancaId, profId, ...status) =>
    banco
      .prepare(`SELECT * FROM vinculos WHERE crianca_id = ? AND profissional_id = ? AND status IN (${status.map(() => '?').join(',')}) ORDER BY id DESC`)
      .get(criancaId, profId, ...status);

  // Monta o filtro de quem pode ver o quê. Devolve { onde, valores }.
  function filtroDeAcesso(usuario) {
    if (usuario.papel === 'RESPONSAVEL') {
      return {
        onde: 'c.crianca_id IN (SELECT crianca_id FROM responsaveis_crianca WHERE responsavel_id = ? AND saiu_em IS NULL)',
        valores: [usuario.id],
      };
    }
    if (usuario.papel === 'PROFISSIONAL') {
      // Só as próprias consultas, e só de criança com vínculo aprovado (RN-24, S-27)
      return {
        onde: `c.clinica_id = ? AND c.profissional_id = ?
               AND EXISTS (SELECT 1 FROM vinculos v WHERE v.crianca_id = c.crianca_id AND v.profissional_id = c.profissional_id AND v.status = 'APROVADO')`,
        valores: [usuario.clinica_id, usuario.id],
      };
    }
    // ADM e Recepção: toda a agenda da própria clínica, sem dado clínico
    return { onde: 'c.clinica_id = ?', valores: [usuario.clinica_id] };
  }

  // GET /consultas?dia=AAAA-MM-DD | de=&ate= | crianca_id=   (e GET /clinica/agenda)
  function listar(req, res) {
    const { onde, valores } = filtroDeAcesso(req.usuario);
    const filtros = [onde];
    const params = [...valores];
    const q = req.query || {};
    if (q.dia && /^\d{4}-\d{2}-\d{2}$/.test(q.dia)) {
      filtros.push('c.inicio >= ? AND c.inicio < ?');
      params.push(`${q.dia}T00:00:00`, `${q.dia}T23:59:59`);
    } else {
      if (q.de && /^\d{4}-\d{2}-\d{2}$/.test(q.de)) { filtros.push('c.inicio >= ?'); params.push(`${q.de}T00:00:00`); }
      if (q.ate && /^\d{4}-\d{2}-\d{2}$/.test(q.ate)) { filtros.push('c.inicio <= ?'); params.push(`${q.ate}T23:59:59`); }
    }
    if (q.crianca_id) { filtros.push('c.crianca_id = ?'); params.push(String(q.crianca_id)); }

    const linhas = banco.prepare(`SELECT ${COLUNAS} ${JUNTAS} WHERE ${filtros.join(' AND ')} ORDER BY c.inicio`).all(...params);
    res.json({ dados: enriquecer(linhas) });
  }

  // Carrega uma consulta SÓ se quem pede pode vê-la; senão undefined (vira 404)
  function consultaVisivel(req) {
    const { onde, valores } = filtroDeAcesso(req.usuario);
    const linha = banco.prepare(`SELECT ${COLUNAS}, c.clinica_id, c.criada_por ${JUNTAS} WHERE c.id = ? AND ${onde}`)
      .get(req.params.id, ...valores);
    return linha;
  }

  // Contato do responsável: só o cadastro feito pela própria clínica (dado cadastral, não clínico)
  function contatos(consulta, usuario) {
    if (usuario.papel === 'RESPONSAVEL') return [];
    const c = banco
      .prepare('SELECT contato_responsavel_nome AS nome, contato_responsavel_parentesco AS parentesco, contato_responsavel_telefone AS telefone FROM criancas WHERE id = ? AND clinica_origem_id = ?')
      .get(consulta.crianca_id, usuario.clinica_id);
    return c ? [c] : [];
  }

  // GET /consultas/:id
  function obter(req, res) {
    const consulta = consultaVisivel(req);
    if (!consulta) return res.status(404).json(NAO_ENCONTRADO);
    if (req.usuario.papel === 'PROFISSIONAL') registrar(req, 'VER_CONSULTA', { criancaId: consulta.crianca_id, recurso: 'consulta', recursoId: consulta.id });
    const [pronta] = enriquecer([consulta]);
    res.json({ dados: { ...pronta, contatos: contatos(consulta, req.usuario) } });
  }

  // GET /consultas/opcoes — combinações criança + profissional que o usuário pode agendar
  function opcoes(req, res) {
    const ehProf = req.usuario.papel === 'PROFISSIONAL';
    // Profissional: só vínculo aprovado dele. Recepção: aprovado ou pendente de qualquer profissional da clínica (RF-40).
    const linhas = banco
      .prepare(
        `SELECT v.id AS vinculo_id, v.crianca_id, cr.nome AS crianca_nome, v.profissional_id, u.nome AS profissional_nome,
                u.especialidade, u.especialidade_outro, v.status, v.origem
         FROM vinculos v JOIN criancas cr ON cr.id = v.crianca_id JOIN usuarios u ON u.id = v.profissional_id
         WHERE u.clinica_id = ? AND u.ativo = 1 AND ${ehProf ? "v.profissional_id = ? AND v.status = 'APROVADO'" : "v.status IN ('APROVADO','PENDENTE')"}
         ORDER BY cr.nome, u.nome`
      )
      .all(...(ehProf ? [req.usuario.clinica_id, req.usuario.id] : [req.usuario.clinica_id]));
    // Pedido ainda não aprovado, feito por código da família: não mostra nem o nome (F-18)
    res.json({
      dados: linhas.map((l) =>
        l.status !== 'APROVADO' && l.origem === 'CONVITE_RESPONSAVEL'
          ? { ...l, crianca_nome: 'Criança (aguardando a família)' }
          : l
      ),
    });
  }

  // Confere conflito de horário do MESMO profissional (RF-46). Devolve true se está ocupado.
  function profissionalOcupado(profId, inicio, duracao, ignorarId = 0) {
    const fim = fimDe(inicio, duracao);
    return Boolean(
      banco
        .prepare(
          `SELECT 1 FROM consultas WHERE profissional_id = ? AND status = 'AGENDADA' AND id <> ?
           AND inicio < ? AND datetime(inicio, '+' || duracao_min || ' minutes') > datetime(?)`
        )
        .get(profId, ignorarId, fim, inicio)
    );
  }

  // Regra 4.3: há consulta da criança em OUTRA clínica nesse intervalo? Só vale com vínculo aprovado e escopo ligado.
  function haConflitoEmOutraClinica(req, vinculo, criancaId, inicio, duracao) {
    if (!vinculo || vinculo.status !== 'APROVADO' || !vinculo.ver_horarios_outras_clinicas) return false;
    const fim = fimDe(inicio, duracao);
    const achou = banco
      .prepare(
        `SELECT 1 FROM consultas WHERE crianca_id = ? AND status = 'AGENDADA' AND clinica_id <> ?
         AND inicio < ? AND datetime(inicio, '+' || duracao_min || ' minutes') > datetime(?)`
      )
      .get(criancaId, req.usuario.clinica_id, fim, inicio);
    // Cada verificação fica no log que o responsável vê (S-31)
    registrar(req, 'VERIFICAR_CONFLITO_AGENDA', { criancaId, recurso: 'consulta' });
    return Boolean(achou);
  }

  function lerDuracao(valor) {
    const n = valor === undefined || valor === '' ? DURACAO_PADRAO : Number(valor);
    return Number.isInteger(n) && n >= 10 && n <= 240 ? n : null;
  }

  // Descobre profissional e vínculo; devolve { erro } ou { profId, vinculo }
  function resolverProfissionalEVinculo(req, criancaId) {
    if (req.usuario.papel === 'PROFISSIONAL') {
      const vinculo = vinculoDe(criancaId, req.usuario.id, 'APROVADO');
      return vinculo ? { profId: req.usuario.id, vinculo } : { naoEncontrado: true }; // S-26: sem revelar nada
    }
    // Recepção: escolhe o profissional ativo da clínica; aceita vínculo aprovado ou pendente (RF-40)
    const prof = banco
      .prepare("SELECT id FROM usuarios WHERE id = ? AND clinica_id = ? AND papel = 'PROFISSIONAL' AND ativo = 1")
      .get(req.body?.profissional_id, req.usuario.clinica_id);
    if (!prof) return { erro: 'Escolha um profissional ativo da sua clínica.' };
    const vinculo = vinculoDe(criancaId, prof.id, 'APROVADO', 'PENDENTE');
    return vinculo ? { profId: prof.id, vinculo } : { naoEncontrado: true }; // F-35
  }

  const mostrarData = (inicio) => {
    const d = new Date(inicio);
    return `${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // POST /consultas
  function criar(req, res) {
    const b = req.body || {};
    const criancaId = texto(b.crianca_id);
    const inicio = lerInicio(b.inicio);
    const duracao = lerDuracao(b.duracao_min);
    if (!inicio || duracao === null) return res.status(400).json({ erro: 'Escolha uma data e um horário válidos.' });
    if (inicio <= agoraIso()) return res.status(400).json({ erro: 'Escolha um horário que ainda não passou.' });

    const r = resolverProfissionalEVinculo(req, criancaId);
    if (r.naoEncontrado) return res.status(404).json(NAO_ENCONTRADO);
    if (r.erro) return res.status(400).json({ erro: r.erro });

    if (profissionalOcupado(r.profId, inicio, duracao)) {
      return res.status(409).json({ erro: 'Este profissional já tem consulta nesse horário.' });
    }
    // Aviso com confirmação, não bloqueio (RN-27). Resposta genérica: só { conflito: true } (RN-25).
    if (haConflitoEmOutraClinica(req, r.vinculo, criancaId, inicio, duracao) && b.confirmar_conflito !== true) {
      return res.status(409).json({ conflito: true });
    }

    const crianca = banco.prepare('SELECT nome FROM criancas WHERE id = ?').get(criancaId);
    const aguardando = r.vinculo.status === 'PENDENTE' ? 1 : 0;
    const id = banco.transaction(() => {
      const novoId = banco
        .prepare(`INSERT INTO consultas (crianca_id, profissional_id, clinica_id, criada_por, inicio, duracao_min, tipo, aguardando_aprovacao)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(criancaId, r.profId, req.usuario.clinica_id, req.usuario.id, inicio, duracao, texto(b.tipo) || null, aguardando).lastInsertRowid;
      registrar(req, 'CRIAR_CONSULTA', { criancaId, recurso: 'consulta', recursoId: novoId });
      avisarResponsaveis(criancaId, `Nova consulta de ${crianca.nome}: ${mostrarData(inicio)}.`, '/familia/agenda');
      return novoId;
    })();
    res.status(201).json({ dados: { id, aguardando_aprovacao: Boolean(aguardando) } });
  }

  // Quem pode mexer numa consulta (remarcar, cancelar, confirmar por contato): o profissional dela ou a Recepção
  function consultaDaClinica(req) {
    if (!['PROFISSIONAL', 'RECEPCAO'].includes(req.usuario.papel)) return undefined;
    return consultaVisivel(req);
  }

  // PUT /consultas/:id/remarcar — a antiga vira REMARCADA e aponta para a nova
  function remarcar(req, res) {
    const atual = consultaDaClinica(req);
    if (!atual) return res.status(404).json(NAO_ENCONTRADO);
    if (atual.status !== 'AGENDADA') return res.status(409).json({ erro: 'Só dá para remarcar uma consulta agendada.' });

    const inicio = lerInicio(req.body?.inicio);
    const duracao = lerDuracao(req.body?.duracao_min ?? atual.duracao_min);
    if (!inicio || duracao === null) return res.status(400).json({ erro: 'Escolha uma data e um horário válidos.' });
    if (inicio <= agoraIso()) return res.status(400).json({ erro: 'Escolha um horário que ainda não passou.' });
    if (profissionalOcupado(atual.profissional_id, inicio, duracao, atual.id)) {
      return res.status(409).json({ erro: 'Este profissional já tem consulta nesse horário.' });
    }
    const vinculo = vinculoDe(atual.crianca_id, atual.profissional_id, 'APROVADO', 'PENDENTE');
    if (haConflitoEmOutraClinica(req, vinculo, atual.crianca_id, inicio, duracao) && req.body?.confirmar_conflito !== true) {
      return res.status(409).json({ conflito: true });
    }

    const novoId = banco.transaction(() => {
      const id = banco
        .prepare(`INSERT INTO consultas (crianca_id, profissional_id, clinica_id, criada_por, inicio, duracao_min, tipo, aguardando_aprovacao)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(atual.crianca_id, atual.profissional_id, atual.clinica_id, req.usuario.id, inicio, duracao, atual.tipo, atual.aguardando_aprovacao).lastInsertRowid;
      banco.prepare("UPDATE consultas SET status = 'REMARCADA', remarcada_para_id = ? WHERE id = ?").run(id, atual.id);
      registrar(req, 'REMARCAR_CONSULTA', { criancaId: atual.crianca_id, recurso: 'consulta', recursoId: atual.id });
      avisarResponsaveis(atual.crianca_id, `A consulta de ${atual.crianca_nome} foi remarcada para ${mostrarData(inicio)}.`, '/familia/agenda');
      return id;
    })();
    res.json({ dados: { id: novoId } });
  }

  // POST /consultas/:id/cancelar
  function cancelar(req, res) {
    const atual = consultaDaClinica(req);
    if (!atual) return res.status(404).json(NAO_ENCONTRADO);
    if (atual.status !== 'AGENDADA') return res.status(409).json({ erro: 'Só dá para cancelar uma consulta agendada.' });

    const motivo = texto(req.body?.motivo).slice(0, 200);
    const recado = texto(req.body?.recado).slice(0, 300);
    banco.transaction(() => {
      banco.prepare("UPDATE consultas SET status = 'CANCELADA' WHERE id = ?").run(atual.id);
      registrar(req, 'CANCELAR_CONSULTA', { criancaId: atual.crianca_id, recurso: 'consulta', recursoId: atual.id });
      avisarResponsaveis(atual.crianca_id,
        `A consulta de ${atual.crianca_nome} (${mostrarData(atual.inicio)}) foi cancelada.${motivo ? ` Motivo: ${motivo}.` : ''}${recado ? ` ${recado}` : ''}`,
        '/familia/agenda');
    })();
    res.json({ dados: { id: atual.id, status: 'CANCELADA' } });
  }

  // POST /consultas/:id/realizada e /falta — só o profissional que atendeu, depois do horário (RF-42)
  function marcarSituacao(status) {
    return function (req, res) {
      if (req.usuario.papel !== 'PROFISSIONAL') return res.status(403).json({ erro: 'Só o profissional que atendeu marca isto.' });
      const atual = consultaVisivel(req);
      if (!atual) return res.status(404).json(NAO_ENCONTRADO);
      if (atual.status !== 'AGENDADA') return res.status(409).json({ erro: 'Esta consulta já tem uma situação final.' });
      if (atual.inicio > agoraIso()) return res.status(409).json({ erro: 'Disponível depois do horário da consulta.' });
      banco.prepare('UPDATE consultas SET status = ? WHERE id = ?').run(status, atual.id);
      registrar(req, status === 'REALIZADA' ? 'MARCAR_REALIZADA' : 'MARCAR_FALTA', { criancaId: atual.crianca_id, recurso: 'consulta', recursoId: atual.id });
      res.json({ dados: { id: atual.id, status } });
    };
  }

  // POST /consultas/:id/confirmar-contato — a clínica registra a confirmação feita por telefone (RN-35)
  function confirmarPorContato(req, res) {
    const atual = consultaDaClinica(req);
    if (!atual) return res.status(404).json(NAO_ENCONTRADO);
    if (atual.status !== 'AGENDADA') return res.status(409).json({ erro: 'Só dá para confirmar uma consulta agendada.' });
    banco.prepare("UPDATE consultas SET presenca_confirmada = 1, confirmada_em = ?, confirmada_por = 'CONTATO' WHERE id = ?").run(agoraIso(), atual.id);
    registrar(req, 'CONFIRMAR_POR_CONTATO', { criancaId: atual.crianca_id, recurso: 'consulta', recursoId: atual.id });
    res.json({ dados: { id: atual.id, presenca_confirmada: 1 } });
  }

  // POST /consultas/:id/confirmar — o responsável, até 1 dia antes (RF-44). Depois disso só falando com a clínica.
  function confirmarPresenca(req, res) {
    if (req.usuario.papel !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Você não tem permissão para isso.' });
    const atual = consultaVisivel(req);
    if (!atual) return res.status(404).json(NAO_ENCONTRADO);
    if (atual.status !== 'AGENDADA') return res.status(409).json({ erro: 'Esta consulta não está mais agendada.' });
    if (agoraIso() > prazoConfirmacao(atual.inicio)) {
      return res.status(409).json({ erro: 'O prazo para confirmar no app acabou. Fale com a clínica.' });
    }
    banco.prepare("UPDATE consultas SET presenca_confirmada = 1, confirmada_em = ?, confirmada_por = 'RESPONSAVEL' WHERE id = ?").run(agoraIso(), atual.id);
    registrar(req, 'CONFIRMAR_PRESENCA', { criancaId: atual.crianca_id, recurso: 'consulta', recursoId: atual.id });
    res.json({ dados: { id: atual.id, presenca_confirmada: 1 } });
  }

  // POST /consultas/:id/nao-poderei — o responsável avisa que não vai; a clínica é avisada e liga (RN-5: não cancela sozinha)
  function naoPoderei(req, res) {
    if (req.usuario.papel !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Você não tem permissão para isso.' });
    const atual = consultaVisivel(req);
    if (!atual) return res.status(404).json(NAO_ENCONTRADO);
    if (atual.status !== 'AGENDADA') return res.status(409).json({ erro: 'Esta consulta não está mais agendada.' });
    const equipe = banco
      .prepare("SELECT id FROM usuarios WHERE clinica_id = ? AND ativo = 1 AND (papel = 'RECEPCAO' OR id = ?)")
      .all(atual.clinica_id, atual.profissional_id);
    for (const u of equipe) avisar(u.id, `A família de ${atual.crianca_nome} avisou que não poderá ir à consulta de ${mostrarData(atual.inicio)}. Entre em contato.`, '/clinica/agenda');
    registrar(req, 'AVISAR_AUSENCIA', { criancaId: atual.crianca_id, recurso: 'consulta', recursoId: atual.id });
    res.json({ dados: { ok: true } });
  }

  return {
    listar, obter, opcoes, criar, remarcar, cancelar,
    realizada: marcarSituacao('REALIZADA'), falta: marcarSituacao('FALTA'),
    confirmarPorContato, confirmarPresenca, naoPoderei,
  };
}

module.exports = criarControladorConsultas;
module.exports.corDaConsulta = corDaConsulta;
module.exports.diasAte = diasAte;
