// Relatório de evolução e pareceres (RF-55 a RF-57, RN-34).
// O relatório é calculado na hora e usa só números e o campo "objetivos" dos registros: a observação
// (privada ou não) nunca entra, nem na tela nem na folha de impressão (F-40).
const { inicioDoEscopo } = require('../middlewares/acessoCrianca');
const { dataValida, formatar } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const MAX_DIAS_PERIODO = 366;
const MAX_TEXTO_PARECER = 6000;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const somarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return formatar(d).slice(0, 10); };
const inicioDaSemana = (iso) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return formatar(d).slice(0, 10); };

// "3x ao dia" -> 21 por semana; "2 vezes por semana" -> 2 (mesma regra das atividades)
function esperadoPorSemana(frequencia) {
  const n = parseInt(String(frequencia || '').match(/\d+/)?.[0] || '1', 10);
  return /semana/i.test(frequencia || '') ? n : n * 7;
}

// Valida o período ?inicio=&fim=; devolve { erro } ou { inicio, fim }
function lerPeriodo(inicio, fim) {
  if (!dataValida(inicio) || !dataValida(fim)) return { erro: 'Escolha o período do relatório.' };
  if (inicio > fim) return { erro: 'A data inicial vem antes da final.' };
  if (diasEntre(inicio, fim) > MAX_DIAS_PERIODO) return { erro: 'O período pode ter no máximo 1 ano.' };
  return { inicio, fim };
}

function criarControladorRelatorio(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisarResponsaveis } = criarAvisos(banco);

  // GET /criancas/:id/relatorio?inicio=AAAA-MM-DD&fim=AAAA-MM-DD — só a família
  function relatorio(req, res) {
    const p = lerPeriodo(req.query?.inicio, req.query?.fim);
    if (p.erro) return res.status(400).json({ erro: p.erro });
    const id = req.params.id;
    const de = `${p.inicio}T00:00:00`;
    const ate = `${p.fim}T23:59:59`;

    const contar = (status) =>
      banco.prepare('SELECT COUNT(*) AS n FROM consultas WHERE crianca_id = ? AND status = ? AND inicio >= ? AND inicio <= ?').get(id, status, de, ate).n;

    // Adesão: execuções ÷ esperado, mês a mês e no total. Esperado = frequência × dias em que a atividade existia.
    const atividades = banco.prepare('SELECT id, frequencia, criada_em FROM atividades WHERE crianca_id = ?').all(id);
    const execucoes = banco
      .prepare('SELECT e.data FROM execucoes_atividade e JOIN atividades a ON a.id = e.atividade_id WHERE a.crianca_id = ? AND e.data >= ? AND e.data <= ?')
      .all(id, p.inicio, p.fim);
    const meses = {};
    for (let dia = p.inicio; dia <= p.fim; dia = somarDias(dia, 1)) {
      const mes = dia.slice(0, 7);
      meses[mes] = meses[mes] || { mes, feitas: 0, esperado: 0 };
      for (const a of atividades) {
        if (a.criada_em.slice(0, 10) <= dia) meses[mes].esperado += esperadoPorSemana(a.frequencia) / 7;
      }
    }
    for (const e of execucoes) if (meses[e.data.slice(0, 7)]) meses[e.data.slice(0, 7)].feitas += 1;
    const porcento = (feitas, esperado) => (esperado > 0 ? Math.min(100, Math.round((feitas / esperado) * 100)) : null);
    const adesaoPorMes = Object.values(meses).map((m) => ({ mes: m.mes, percentual: porcento(m.feitas, m.esperado) }));
    const totalFeitas = Object.values(meses).reduce((s, m) => s + m.feitas, 0);
    const totalEsperado = Object.values(meses).reduce((s, m) => s + m.esperado, 0);

    // Humor médio por semana e objetivos trabalhados (os registros de sessão são sempre compartilhados com a família)
    const registros = banco
      .prepare('SELECT criado_em, humor, objetivos FROM registros_sessao WHERE crianca_id = ? AND criado_em >= ? AND criado_em <= ?')
      .all(id, de, ate);
    const semanas = {};
    const objetivos = new Set();
    let somaHumor = 0;
    let comHumor = 0;
    for (const r of registros) {
      if (r.humor) {
        const semana = inicioDaSemana(r.criado_em.slice(0, 10));
        semanas[semana] = semanas[semana] || { soma: 0, n: 0 };
        semanas[semana].soma += r.humor;
        semanas[semana].n += 1;
        somaHumor += r.humor;
        comHumor += 1;
      }
      (r.objetivos || '').split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => objetivos.add(o));
    }

    // Só pareceres PUBLICADOS cujo período toca o período do relatório
    const pareceres = banco
      .prepare(
        `SELECT p.id, p.periodo_inicio, p.periodo_fim, p.texto, p.publicado_em, u.nome AS profissional_nome, u.especialidade, u.especialidade_outro, cl.nome AS clinica_nome
         FROM pareceres p JOIN usuarios u ON u.id = p.profissional_id JOIN clinicas cl ON cl.id = u.clinica_id
         WHERE p.crianca_id = ? AND p.periodo_inicio <= ? AND p.periodo_fim >= ? ORDER BY p.publicado_em DESC`
      )
      .all(id, p.fim, p.inicio);

    const crianca = banco.prepare('SELECT nome FROM criancas WHERE id = ?').get(id);
    res.json({
      dados: {
        crianca: crianca.nome,
        pedido_por: req.usuario.nome,
        periodo: p,
        consultas_realizadas: contar('REALIZADA'),
        faltas: contar('FALTA'),
        adesao_percentual: porcento(totalFeitas, totalEsperado),
        adesao_por_mes: adesaoPorMes,
        humor_medio: comHumor ? Math.round((somaHumor / comHumor) * 10) / 10 : null,
        humor_por_semana: Object.entries(semanas).sort().map(([semana, v]) => ({ semana, media: Math.round((v.soma / v.n) * 10) / 10 })),
        objetivos: [...objetivos],
        pareceres,
      },
    });
  }

  // POST /criancas/:id/pareceres — o profissional publica; depois de publicado não se edita (novo parecer = correção)
  function publicarParecer(req, res) {
    if (req.acessoComo !== 'PROFISSIONAL') return res.status(403).json({ erro: 'Só o profissional escreve o parecer.' });
    const p = lerPeriodo(texto(req.body?.periodo_inicio), texto(req.body?.periodo_fim));
    if (p.erro) return res.status(400).json({ erro: p.erro });
    const corpo = texto(req.body?.texto);
    if (!corpo || corpo.length > MAX_TEXTO_PARECER) return res.status(400).json({ erro: 'Escreva o parecer (até 6000 letras).' });
    // Sem "histórico anterior" liberado, o período não pode começar antes da aprovação (RN-04)
    const corte = inicioDoEscopo(req);
    if (corte && p.inicio < corte.slice(0, 10)) {
      return res.status(400).json({ erro: `Você só pode escrever sobre o período a partir da aprovação (${corte.slice(0, 10).split('-').reverse().join('/')}).` });
    }

    const id = banco
      .prepare('INSERT INTO pareceres (crianca_id, profissional_id, periodo_inicio, periodo_fim, texto) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, req.usuario.id, p.inicio, p.fim, corpo).lastInsertRowid;
    registrar(req, 'PUBLICAR_PARECER', { criancaId: req.params.id, recurso: 'parecer', recursoId: id });
    const crianca = banco.prepare('SELECT nome FROM criancas WHERE id = ?').get(req.params.id);
    avisarResponsaveis(req.params.id, `${req.usuario.nome} publicou um parecer sobre ${crianca.nome}. Veja no relatório de evolução.`, '/familia/relatorio');
    res.status(201).json({ dados: { id } });
  }

  // GET /criancas/:id/pareceres — família: todos os publicados; profissional: só os próprios
  function listarPareceres(req, res) {
    const ehProf = req.acessoComo === 'PROFISSIONAL';
    const linhas = banco
      .prepare(
        `SELECT p.id, p.periodo_inicio, p.periodo_fim, p.texto, p.publicado_em, u.nome AS profissional_nome FROM pareceres p
         JOIN usuarios u ON u.id = p.profissional_id WHERE p.crianca_id = ? ${ehProf ? 'AND p.profissional_id = ?' : ''} ORDER BY p.publicado_em DESC`
      )
      .all(...[req.params.id, ...(ehProf ? [req.usuario.id] : [])]);
    res.json({ dados: linhas });
  }

  return { relatorio, publicarParecer, listarPareceres };
}

module.exports = criarControladorRelatorio;
