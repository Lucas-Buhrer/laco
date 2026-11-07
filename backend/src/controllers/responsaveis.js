// Segundo responsável (RF-08, RF-09, RN-28 a RN-31).
// Até 2 responsáveis por criança, com o mesmo poder. Ninguém remove o outro: cada um só pode SAIR.
const bcrypt = require('bcryptjs');
const { gerarCodigo, hashCodigo } = require('../utils/codigos');
const { agoraIso, maisDias, dataValida } = require('../utils/datas');
const { gerarToken } = require('../utils/token');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const LIMITE_RESPONSAVEIS = 2;
const DIAS_VALIDADE_CONVITE = 7; // RN-28
const MAX_ERROS_POR_CONVITE = 5;
const SENHA_MINIMA = 8;
const VERSAO_TERMO = '1.0-rascunho';
const PARENTESCOS = ['MAE', 'PAI', 'OUTRO'];
// Mesma resposta para qualquer falha: não revela se foi o código ou a data
const MSG_CONVITE = 'Código ou data de nascimento inválidos. Peça um novo convite ao outro responsável.';

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function criarControladorResponsaveis(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisarOutroResponsavel } = criarAvisos(banco);

  const ativosDaCrianca = (criancaId) =>
    banco.prepare('SELECT COUNT(*) AS n FROM responsaveis_crianca WHERE crianca_id = ? AND saiu_em IS NULL').get(criancaId).n;

  // GET /criancas/:id/responsaveis — a família vê os dois; o profissional aprovado vê só nome e parentesco
  function listar(req, res) {
    const linhas = banco
      .prepare(
        `SELECT r.id, r.responsavel_id, u.nome, ${req.acessoComo === 'RESPONSAVEL' ? 'u.email,' : ''} r.parentesco, r.parentesco_outro, r.entrou_em
         FROM responsaveis_crianca r JOIN usuarios u ON u.id = r.responsavel_id
         WHERE r.crianca_id = ? AND r.saiu_em IS NULL ORDER BY r.entrou_em`
      )
      .all(req.params.id)
      .map(({ responsavel_id, ...resto }) => ({ ...resto, voce: req.acessoComo === 'RESPONSAVEL' && responsavel_id === req.usuario.id }));
    // Convite aberto: só quem é da família sabe que existe
    const convite = req.acessoComo === 'RESPONSAVEL'
      ? banco
          .prepare('SELECT expira_em FROM convites_responsavel WHERE crianca_id = ? AND usado_em IS NULL AND expira_em > ? ORDER BY id DESC LIMIT 1')
          .get(req.params.id, agoraIso())
      : undefined;
    res.json({ dados: { responsaveis: linhas, vagas: Math.max(0, LIMITE_RESPONSAVEIS - linhas.length), convite_aberto: convite || null } });
  }

  // POST /criancas/:id/convites-responsavel — gera o código (aparece só agora); um novo cancela o anterior
  function gerarConvite(req, res) {
    if (req.acessoComo !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Só a família gera este convite.' });
    if (ativosDaCrianca(req.params.id) >= LIMITE_RESPONSAVEIS) {
      return res.status(409).json({ erro: 'Esta criança já tem 2 responsáveis.' });
    }
    const codigo = gerarCodigo();
    const validoAte = maisDias(DIAS_VALIDADE_CONVITE);
    banco.transaction(() => {
      banco.prepare('UPDATE convites_responsavel SET usado_em = ? WHERE crianca_id = ? AND usado_em IS NULL').run(agoraIso(), req.params.id);
      banco
        .prepare('INSERT INTO convites_responsavel (crianca_id, codigo_hash, criado_por, expira_em) VALUES (?, ?, ?, ?)')
        .run(req.params.id, hashCodigo(codigo), req.usuario.id, validoAte);
      registrar(req, 'GERAR_CONVITE_RESPONSAVEL', { criancaId: req.params.id, recurso: 'convite_responsavel' });
    })();
    res.status(201).json({ dados: { codigo, valido_ate: validoAte } });
  }

  // Confere código + data de nascimento. Devolve { linha } ou { erro, status }.
  function conferirConvite(codigo, nascimento) {
    const linha = banco
      .prepare(
        `SELECT cv.*, c.data_nascimento, c.nome AS crianca_nome, c.status_cadastro FROM convites_responsavel cv
         JOIN criancas c ON c.id = cv.crianca_id WHERE cv.codigo_hash = ?`
      )
      .get(hashCodigo(codigo));
    if (!linha || linha.usado_em || linha.expira_em < agoraIso() || linha.status_cadastro !== 'ATIVA'
      || linha.tentativas_falhas >= MAX_ERROS_POR_CONVITE) {
      return { erro: MSG_CONVITE, status: 400 };
    }
    if (linha.data_nascimento !== nascimento) {
      banco.prepare('UPDATE convites_responsavel SET tentativas_falhas = tentativas_falhas + 1 WHERE id = ?').run(linha.id);
      return { erro: MSG_CONVITE, status: 400 };
    }
    // Só depois de provar o código é que falamos do limite (F-30)
    if (ativosDaCrianca(linha.crianca_id) >= LIMITE_RESPONSAVEIS) {
      return { erro: 'Esta criança já tem 2 responsáveis.', status: 409 };
    }
    return { linha };
  }

  // Coloca a pessoa como responsável (dentro de uma transação)
  function entrar(linha, usuario, parentesco, parentescoOutro) {
    banco
      .prepare('INSERT INTO responsaveis_crianca (crianca_id, responsavel_id, parentesco, parentesco_outro, entrou_em) VALUES (?, ?, ?, ?, ?)')
      .run(linha.crianca_id, usuario.id, parentesco, parentesco === 'OUTRO' ? parentescoOutro : null, agoraIso());
    banco.prepare('UPDATE convites_responsavel SET usado_em = ? WHERE id = ?').run(agoraIso(), linha.id);
    const req = { usuario: { id: usuario.id }, ip: null };
    registrar(req, 'ENTRAR_COMO_RESPONSAVEL', { criancaId: linha.crianca_id, recurso: 'responsavel' });
    avisarOutroResponsavel(linha.crianca_id, usuario.id, `${usuario.nome} entrou como responsável de ${linha.crianca_nome}.`, '/familia/responsaveis');
  }

  function erroDeParentesco(parentesco, outro) {
    if (!PARENTESCOS.includes(parentesco)) return 'Escolha se você é mãe, pai ou outro.';
    if (parentesco === 'OUTRO' && !outro) return 'Escreva qual é o seu parentesco.';
    return null;
  }

  // POST /responsaveis/aceitar-convite — quem já tem conta (logado)
  function aceitarConvite(req, res) {
    const parentesco = texto(req.body?.parentesco);
    const outro = texto(req.body?.parentesco_outro);
    const codigo = texto(req.body?.codigo);
    const nascimento = texto(req.body?.data_nascimento);
    const erroP = erroDeParentesco(parentesco, outro);
    if (erroP) return res.status(400).json({ erro: erroP });
    if (!codigo || !dataValida(nascimento)) return res.status(400).json({ erro: MSG_CONVITE });

    const r = conferirConvite(codigo, nascimento);
    if (r.erro) return res.status(r.status).json({ erro: r.erro });
    const jaE = banco
      .prepare('SELECT 1 FROM responsaveis_crianca WHERE crianca_id = ? AND responsavel_id = ? AND saiu_em IS NULL')
      .get(r.linha.crianca_id, req.usuario.id);
    if (jaE) return res.status(409).json({ erro: 'Você já é responsável por esta criança.' });

    banco.transaction(() => entrar(r.linha, req.usuario, parentesco, outro))();
    res.status(201).json({ dados: { crianca: { id: r.linha.crianca_id, nome: r.linha.crianca_nome } } });
  }

  // POST /auth/aceitar-convite-responsavel — quem ainda não tem conta (pública, com limite de tentativas)
  function criarContaPorConvite(req, res) {
    const b = req.body || {};
    const parentesco = texto(b.parentesco);
    const outro = texto(b.parentesco_outro);
    const codigo = texto(b.codigo);
    const nascimento = texto(b.data_nascimento);
    const nome = texto(b.nome);
    const email = texto(b.email).toLowerCase();
    const senha = typeof b.senha === 'string' ? b.senha : '';

    // Erros de preenchimento primeiro: não gastam tentativa do convite
    if (b.aceitou_termo !== true) return res.status(400).json({ erro: 'É preciso aceitar o Termo de Consentimento.' });
    if (!nome || !email.includes('@')) return res.status(400).json({ erro: 'Preencha o seu nome e um e-mail válido.' });
    if (senha.length < SENHA_MINIMA) return res.status(400).json({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
    const erroP = erroDeParentesco(parentesco, outro);
    if (erroP) return res.status(400).json({ erro: erroP });
    if (!codigo || !dataValida(nascimento)) return res.status(400).json({ erro: MSG_CONVITE });

    const r = conferirConvite(codigo, nascimento);
    if (r.erro) return res.status(r.status).json({ erro: r.erro });
    if (banco.prepare("SELECT 1 FROM usuarios WHERE papel = 'RESPONSAVEL' AND email = ?").get(email)) {
      return res.status(409).json({ erro: 'Este e-mail já tem conta. Entre no app e use o convite em "Responsáveis".' });
    }

    const usuarioId = banco.transaction(() => {
      const id = banco
        .prepare("INSERT INTO usuarios (papel, nome, email, senha_hash) VALUES ('RESPONSAVEL', ?, ?, ?)")
        .run(nome, email, bcrypt.hashSync(senha, 10)).lastInsertRowid;
      banco.prepare('INSERT INTO consentimentos (usuario_id, versao_termo, aceito_em) VALUES (?, ?, ?)').run(id, VERSAO_TERMO, agoraIso());
      entrar(r.linha, { id, nome }, parentesco, outro);
      return id;
    })();
    res.status(201).json({ dados: { token: gerarToken({ id: usuarioId }), crianca: { id: r.linha.crianca_id, nome: r.linha.crianca_nome } } });
  }

  // POST /criancas/:id/sair — perde o acesso; o outro responsável mantém (RF-09)
  function sair(req, res) {
    if (req.acessoComo !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Só a família usa isto.' });
    if (ativosDaCrianca(req.params.id) < 2) {
      return res.status(409).json({ erro: 'Você é o único responsável. Para encerrar, revogue o consentimento em Privacidade e dados.' });
    }
    const crianca = banco.prepare('SELECT nome FROM criancas WHERE id = ?').get(req.params.id);
    banco.transaction(() => {
      banco.prepare('UPDATE responsaveis_crianca SET saiu_em = ? WHERE crianca_id = ? AND responsavel_id = ? AND saiu_em IS NULL')
        .run(agoraIso(), req.params.id, req.usuario.id);
      registrar(req, 'SAIR_DA_CRIANCA', { criancaId: req.params.id, recurso: 'responsavel' });
      avisarOutroResponsavel(req.params.id, req.usuario.id, `${req.usuario.nome} saiu como responsável de ${crianca.nome}.`, '/familia/responsaveis');
    })();
    res.json({ dados: { ok: true } });
  }

  // PUT /criancas/:id/meu-parentesco — cada um corrige o próprio parentesco, inclusive o texto de "Outro"
  function mudarParentesco(req, res) {
    if (req.acessoComo !== 'RESPONSAVEL') return res.status(403).json({ erro: 'Só a família usa isto.' });
    const parentesco = texto(req.body?.parentesco);
    const outro = texto(req.body?.parentesco_outro);
    const erroP = erroDeParentesco(parentesco, outro);
    if (erroP) return res.status(400).json({ erro: erroP });
    banco
      .prepare('UPDATE responsaveis_crianca SET parentesco = ?, parentesco_outro = ? WHERE crianca_id = ? AND responsavel_id = ? AND saiu_em IS NULL')
      .run(parentesco, parentesco === 'OUTRO' ? outro : null, req.params.id, req.usuario.id);
    res.json({ dados: { parentesco, parentesco_outro: parentesco === 'OUTRO' ? outro : null } });
  }

  return { listar, gerarConvite, aceitarConvite, criarContaPorConvite, sair, mudarParentesco };
}

module.exports = criarControladorResponsaveis;
