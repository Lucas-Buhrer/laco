// Pré-cadastro de crianças pela clínica. Devolve SÓ dados cadastrais (RN-17, doc 05 "exceção controlada").
const crypto = require('node:crypto');
const { gerarCodigo, hashCodigo } = require('../utils/codigos');
const { agoraIso, maisDias, dataValida } = require('../utils/datas');
const criarAuditoria = require('../middlewares/auditoria');

const PARENTESCOS = ['MAE', 'PAI', 'OUTRO'];
const DIAS_VALIDADE_CODIGO = 7; // RN-15

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function criarControladorPreCadastros(banco) {
  const { registrar } = criarAuditoria(banco);

  // Só os campos cadastrais: nunca nivel_suporte, comunicacao, sensibilidades etc.
  function paraLista(c) {
    let status = 'AGUARDANDO_ATIVACAO';
    if (c.status_cadastro === 'PRE_CADASTRO_INATIVO') status = 'INATIVO';
    if (c.status_cadastro === 'ATIVA') {
      const pendente = banco.prepare("SELECT 1 FROM vinculos WHERE crianca_id = ? AND status = 'PENDENTE'").get(c.id);
      status = pendente ? 'AGUARDANDO_APROVACAO' : 'ATIVA';
    }
    const codigo = banco
      .prepare('SELECT expira_em FROM codigos_ativacao WHERE crianca_id = ? AND usado_em IS NULL AND cancelado_em IS NULL ORDER BY id DESC LIMIT 1')
      .get(c.id);
    return {
      id: c.id,
      nome: c.nome,
      data_nascimento: c.data_nascimento,
      responsavel_nome: c.contato_responsavel_nome,
      parentesco: c.contato_responsavel_parentesco,
      parentesco_outro: c.contato_responsavel_parentesco_outro,
      email: c.contato_responsavel_email,
      telefone: c.contato_responsavel_telefone,
      status,
      codigo_valido_ate: codigo && codigo.expira_em >= agoraIso() ? codigo.expira_em : null,
      criada_em: c.criada_em,
    };
  }

  // Busca a criança SÓ se for da clínica de quem pediu (S-20, S-34)
  function buscarDaClinica(req, id) {
    return banco.prepare('SELECT * FROM criancas WHERE id = ? AND clinica_origem_id = ?').get(id, req.usuario.clinica_id);
  }

  // Cancela códigos abertos e cria um novo. Devolve o código em claro (só aparece agora).
  function gerarNovoCodigo(criancaId, usuarioId) {
    banco
      .prepare('UPDATE codigos_ativacao SET cancelado_em = ? WHERE crianca_id = ? AND usado_em IS NULL AND cancelado_em IS NULL')
      .run(agoraIso(), criancaId);
    const codigo = gerarCodigo();
    banco
      .prepare('INSERT INTO codigos_ativacao (crianca_id, codigo_hash, criado_por, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)')
      .run(criancaId, hashCodigo(codigo), usuarioId, agoraIso(), maisDias(DIAS_VALIDADE_CODIGO));
    return { codigo, valido_ate: maisDias(DIAS_VALIDADE_CODIGO) };
  }

  // GET /clinica/pre-cadastros
  function listar(req, res) {
    const criancas = banco
      .prepare('SELECT * FROM criancas WHERE clinica_origem_id = ? ORDER BY criada_em DESC')
      .all(req.usuario.clinica_id);
    res.json({ dados: criancas.map(paraLista) });
  }

  // POST /clinica/pre-cadastros
  function criar(req, res) {
    const b = req.body || {};
    const nome = texto(b.nome);
    const nascimento = texto(b.data_nascimento);
    const responsavelNome = texto(b.responsavel_nome);
    const parentesco = texto(b.parentesco);
    const parentescoOutro = texto(b.parentesco_outro);
    const email = texto(b.email).toLowerCase();
    const telefone = texto(b.telefone);
    const profissionais = Array.isArray(b.profissionais) ? b.profissionais : [];

    if (!nome || !responsavelNome) return res.status(400).json({ erro: 'Preencha o nome da criança e o do responsável.' });
    if (!dataValida(nascimento)) return res.status(400).json({ erro: 'Data de nascimento inválida.' });
    if (!PARENTESCOS.includes(parentesco)) return res.status(400).json({ erro: 'Escolha se o responsável é mãe, pai ou outro.' });
    if (parentesco === 'OUTRO' && !parentescoOutro) return res.status(400).json({ erro: 'Escreva qual é o parentesco.' });
    if (!email && !telefone) return res.status(400).json({ erro: 'Informe um e-mail ou um telefone do responsável.' });

    // Os profissionais indicados precisam ser desta clínica e estar ativos
    const buscarProf = banco.prepare(
      "SELECT id FROM usuarios WHERE id = ? AND clinica_id = ? AND papel = 'PROFISSIONAL' AND ativo = 1"
    );
    for (const id of profissionais) {
      if (!buscarProf.get(id, req.usuario.clinica_id)) {
        return res.status(400).json({ erro: 'Escolha apenas profissionais ativos da sua clínica.' });
      }
    }

    const criarTudo = banco.transaction(() => {
      const id = crypto.randomUUID();
      banco
        .prepare(`INSERT INTO criancas
          (id, clinica_origem_id, nome, data_nascimento, contato_responsavel_nome, contato_responsavel_parentesco,
           contato_responsavel_parentesco_outro, contato_responsavel_email, contato_responsavel_telefone, criada_por, criada_em)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, req.usuario.clinica_id, nome, nascimento, responsavelNome, parentesco,
          parentesco === 'OUTRO' ? parentescoOutro : null, email || null, telefone || null, req.usuario.id, agoraIso());
      const indicar = banco.prepare('INSERT OR IGNORE INTO pre_cadastro_profissionais (crianca_id, profissional_id) VALUES (?, ?)');
      for (const profId of profissionais) indicar.run(id, profId);
      const codigo = gerarNovoCodigo(id, req.usuario.id);
      registrar(req, 'CRIAR_PRE_CADASTRO', { criancaId: id, recurso: 'crianca', recursoId: id });
      return { id, codigo };
    });
    const { id, codigo } = criarTudo();

    const crianca = banco.prepare('SELECT * FROM criancas WHERE id = ?').get(id);
    res.status(201).json({ dados: { ...paraLista(crianca), codigo: codigo.codigo, codigo_valido_ate: codigo.valido_ate } });
  }

  // POST /clinica/pre-cadastros/:id/reemitir-codigo (também reativa um pré-cadastro inativo, RN-33)
  function reemitirCodigo(req, res) {
    const crianca = buscarDaClinica(req, req.params.id);
    if (!crianca || crianca.status_cadastro === 'ATIVA') return res.status(404).json({ erro: 'Não encontrado.' });

    const resultado = banco.transaction(() => {
      banco.prepare("UPDATE criancas SET status_cadastro = 'PRE_CADASTRO', inativado_em = NULL WHERE id = ?").run(crianca.id);
      registrar(req, 'REEMITIR_CODIGO', { criancaId: crianca.id, recurso: 'codigo_ativacao' });
      return gerarNovoCodigo(crianca.id, req.usuario.id);
    })();
    res.json({ dados: { codigo: resultado.codigo, codigo_valido_ate: resultado.valido_ate } });
  }

  // POST /clinica/pre-cadastros/:id/cancelar-codigo
  function cancelarCodigo(req, res) {
    const crianca = buscarDaClinica(req, req.params.id);
    if (!crianca || crianca.status_cadastro === 'ATIVA') return res.status(404).json({ erro: 'Não encontrado.' });

    banco
      .prepare('UPDATE codigos_ativacao SET cancelado_em = ? WHERE crianca_id = ? AND usado_em IS NULL AND cancelado_em IS NULL')
      .run(agoraIso(), crianca.id);
    registrar(req, 'CANCELAR_CODIGO', { criancaId: crianca.id, recurso: 'codigo_ativacao' });
    res.json({ dados: { ok: true } });
  }

  return { listar, criar, reemitirCodigo, cancelarCodigo };
}

module.exports = criarControladorPreCadastros;
