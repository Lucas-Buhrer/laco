// Crianças: lista, perfil, edição pelo responsável e convite para outra clínica.
// As rotas /:id passam ANTES pela regra central de acesso (middlewares/acessoCrianca.js).
const { gerarCodigo, hashCodigo } = require('../utils/codigos');
const { agoraIso, maisDias } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');

const DIAS_VALIDADE_CONVITE = 7; // RN-08
const TAMANHO_MAXIMO = 2000;

function criarControladorCriancas(banco) {
  const { registrar } = criarAuditoria(banco);

  // GET /criancas — responsável: seus filhos; profissional: só com vínculo aprovado (RF-22, RF-23)
  function listar(req, res) {
    if (req.usuario.papel === 'RESPONSAVEL') {
      const filhos = banco
        .prepare(
          `SELECT c.id, c.nome, c.data_nascimento, r.parentesco, r.parentesco_outro
           FROM responsaveis_crianca r JOIN criancas c ON c.id = r.crianca_id
           WHERE r.responsavel_id = ? AND r.saiu_em IS NULL ORDER BY c.nome`
        )
        .all(req.usuario.id);
      return res.json({ dados: filhos });
    }
    const vinculadas = banco
      .prepare(
        `SELECT c.id, c.nome, c.data_nascimento, v.aprovado_em,
                (SELECT MAX(x.inicio) FROM consultas x WHERE x.crianca_id = c.id AND x.profissional_id = v.profissional_id AND x.status = 'REALIZADA') AS ultima_sessao,
                (SELECT MIN(x.inicio) FROM consultas x WHERE x.crianca_id = c.id AND x.profissional_id = v.profissional_id AND x.status = 'AGENDADA' AND x.inicio >= ?) AS proxima_consulta
         FROM vinculos v JOIN criancas c ON c.id = v.crianca_id
         WHERE v.profissional_id = ? AND v.status = 'APROVADO' ORDER BY c.nome`
      )
      .all(agoraIso(), req.usuario.id);
    res.json({ dados: vinculadas });
  }

  // GET /criancas/:id
  function obter(req, res) {
    const c = banco
      .prepare(
        `SELECT id, nome, data_nascimento, nivel_suporte, comunicacao, sensibilidades, observacoes
         FROM criancas WHERE id = ?`
      )
      .get(req.params.id);
    // O profissional também fica sabendo do limite do próprio acesso (só o dele)
    if (req.acessoComo === 'PROFISSIONAL') {
      c.escopo = { ver_historico_anterior: req.vinculo.ver_historico_anterior, aprovado_em: req.vinculo.aprovado_em };
    }
    res.json({ dados: c });
  }

  // PUT /criancas/:id — só o responsável completa/edita (RF-21)
  function atualizar(req, res) {
    if (req.acessoComo !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Só a família pode editar estes dados.' });

    const atual = banco.prepare('SELECT * FROM criancas WHERE id = ?').get(req.params.id);
    const novo = {};
    for (const campo of ['nivel_suporte', 'comunicacao', 'sensibilidades', 'observacoes']) {
      const valor = req.body?.[campo];
      if (valor === undefined) novo[campo] = atual[campo];
      else if (typeof valor === 'string' && valor.length <= TAMANHO_MAXIMO) novo[campo] = valor.trim();
      else return res.status(400).json({ erro: 'Texto muito longo ou inválido.' });
    }
    banco
      .prepare('UPDATE criancas SET nivel_suporte = ?, comunicacao = ?, sensibilidades = ?, observacoes = ? WHERE id = ?')
      .run(novo.nivel_suporte, novo.comunicacao, novo.sensibilidades, novo.observacoes, req.params.id);
    registrar(req, 'EDITAR_CRIANCA', { criancaId: req.params.id, recurso: 'crianca', recursoId: req.params.id });
    res.json({ dados: { id: req.params.id, ...novo } });
  }

  // POST /criancas/:id/convites — código para um profissional de OUTRA clínica pedir acesso (RF-39)
  function criarConvite(req, res) {
    if (req.acessoComo !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Só a família pode gerar este código.' });

    const codigo = gerarCodigo();
    const validoAte = maisDias(DIAS_VALIDADE_CONVITE);
    banco
      .prepare('INSERT INTO convites_compartilhamento (crianca_id, codigo_hash, criado_por, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, hashCodigo(codigo), req.usuario.id, agoraIso(), validoAte);
    registrar(req, 'GERAR_CONVITE_CLINICA', { criancaId: req.params.id, recurso: 'convite' });
    res.status(201).json({ dados: { codigo, valido_ate: validoAte } });
  }

  return { listar, obter, atualizar, criarConvite };
}

module.exports = criarControladorCriancas;
