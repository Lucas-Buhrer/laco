// Ativação da conta do responsável com o código da clínica (RF-02, RF-27a, RN-14 a RN-17).
const bcrypt = require('bcryptjs');
const { hashCodigo } = require('../utils/codigos');
const { agoraIso, dataValida } = require('../utils/datas');
const { gerarToken } = require('../utils/token');

const SENHA_MINIMA = 8; // RN-13
const MAX_ERROS_POR_CODIGO = 5; // depois disso o código fica bloqueado (S-21)
const VERSAO_TERMO = '1.0-rascunho';
// Mesma mensagem para qualquer falha: não revela se foi o código ou a data (F-08)
const MSG_CODIGO = 'Código ou data de nascimento inválidos. Confira com a clínica.';
const PARENTESCOS = ['MAE', 'PAI', 'OUTRO'];

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function criarControladorAtivacao(banco) {
  // Confere código + data de nascimento. Devolve a linha do código, ou null se algo falhar.
  function conferirCodigo(codigo, nascimento) {
    const linha = banco
      .prepare(
        `SELECT ca.*, c.data_nascimento, c.status_cadastro, c.clinica_origem_id, c.nome AS crianca_nome
         FROM codigos_ativacao ca JOIN criancas c ON c.id = ca.crianca_id
         WHERE ca.codigo_hash = ?`
      )
      .get(hashCodigo(codigo));

    if (!linha) return null;
    if (linha.usado_em || linha.cancelado_em) return null;
    if (linha.expira_em < agoraIso()) return null;
    if (linha.status_cadastro !== 'PRE_CADASTRO') return null;
    if (linha.tentativas_falhas >= MAX_ERROS_POR_CODIGO) return null;

    if (linha.data_nascimento !== nascimento) {
      banco.prepare('UPDATE codigos_ativacao SET tentativas_falhas = tentativas_falhas + 1 WHERE id = ?').run(linha.id);
      return null;
    }
    return linha;
  }

  // Passos comuns a "criar conta" e "adicionar outro filho". Deve rodar dentro de uma transação.
  function ativarCrianca(linhaCodigo, responsavelId, parentesco, parentescoOutro) {
    const agora = agoraIso();
    banco.prepare("UPDATE criancas SET status_cadastro = 'ATIVA', inativado_em = NULL WHERE id = ?").run(linhaCodigo.crianca_id);
    banco.prepare('UPDATE codigos_ativacao SET usado_em = ? WHERE id = ?').run(agora, linhaCodigo.id);
    banco
      .prepare(`INSERT INTO responsaveis_crianca (crianca_id, responsavel_id, parentesco, parentesco_outro, entrou_em)
                VALUES (?, ?, ?, ?, ?)`)
      .run(linhaCodigo.crianca_id, responsavelId, parentesco, parentesco === 'OUTRO' ? parentescoOutro : null, agora);

    // RF-30: pedidos PENDENTES para os profissionais indicados. Ninguém ganha acesso até a família aprovar.
    const indicados = banco
      .prepare(
        `SELECT u.id, u.nome FROM pre_cadastro_profissionais p JOIN usuarios u ON u.id = p.profissional_id
         WHERE p.crianca_id = ? AND u.ativo = 1 AND u.papel = 'PROFISSIONAL' AND u.clinica_id = ?`
      )
      .all(linhaCodigo.crianca_id, linhaCodigo.clinica_origem_id);
    const novoVinculo = banco.prepare(
      `INSERT INTO vinculos (crianca_id, profissional_id, origem, solicitado_por, status, ver_historico_anterior,
                             ver_horarios_outras_clinicas, solicitado_em)
       VALUES (?, ?, 'CLINICA_ORIGEM', ?, 'PENDENTE', 0, 1, ?)`
    );
    const novoAviso = banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, criada_em) VALUES (?, ?, ?, ?)');
    for (const prof of indicados) {
      novoVinculo.run(linhaCodigo.crianca_id, prof.id, linhaCodigo.criado_por, agora);
      novoAviso.run(responsavelId, `${prof.nome} pediu acesso aos dados de ${linhaCodigo.crianca_nome}.`, '/familia/solicitacoes', agora);
    }
  }

  // Lê e valida parentesco; devolve mensagem de erro ou null
  function erroDeParentesco(parentesco, outro) {
    if (!PARENTESCOS.includes(parentesco)) return 'Escolha se você é mãe, pai ou outro.';
    if (parentesco === 'OUTRO' && !outro) return 'Escreva qual é o seu parentesco.';
    return null;
  }

  // POST /auth/ativar-conta (pública)
  function ativarConta(req, res) {
    const b = req.body || {};
    const codigo = texto(b.codigo);
    const nascimento = texto(b.data_nascimento);
    const nome = texto(b.nome);
    const email = texto(b.email).toLowerCase();
    const senha = typeof b.senha === 'string' ? b.senha : '';
    const parentesco = texto(b.parentesco);
    const parentescoOutro = texto(b.parentesco_outro);

    // Erros de preenchimento primeiro: não gastam tentativa do código
    if (b.aceitou_termo !== true) return res.status(400).json({ erro: 'É preciso aceitar o Termo de Consentimento.' });
    if (!nome || !email.includes('@')) return res.status(400).json({ erro: 'Preencha o seu nome e um e-mail válido.' });
    if (senha.length < SENHA_MINIMA) {
      return res.status(400).json({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
    }
    const erroParentesco = erroDeParentesco(parentesco, parentescoOutro);
    if (erroParentesco) return res.status(400).json({ erro: erroParentesco });
    if (!codigo || !dataValida(nascimento)) return res.status(400).json({ erro: MSG_CODIGO });

    const linha = conferirCodigo(codigo, nascimento);
    if (!linha) return res.status(400).json({ erro: MSG_CODIGO });

    // Só depois de provar que tem um código válido é que falamos do e-mail
    const jaTemConta = banco.prepare("SELECT 1 FROM usuarios WHERE papel = 'RESPONSAVEL' AND email = ?").get(email);
    if (jaTemConta) {
      return res.status(409).json({ erro: 'Este e-mail já tem conta. Entre no app e use "Adicionar outro filho".' });
    }

    const criar = banco.transaction(() => {
      const usuarioId = banco
        .prepare("INSERT INTO usuarios (papel, nome, email, senha_hash) VALUES ('RESPONSAVEL', ?, ?, ?)")
        .run(nome, email, bcrypt.hashSync(senha, 10)).lastInsertRowid;
      banco.prepare('INSERT INTO consentimentos (usuario_id, versao_termo, aceito_em) VALUES (?, ?, ?)')
        .run(usuarioId, VERSAO_TERMO, agoraIso());
      ativarCrianca(linha, usuarioId, parentesco, parentescoOutro);
      return usuarioId;
    });
    const usuarioId = criar();

    res.status(201).json({ dados: { token: gerarToken({ id: usuarioId }), crianca: { id: linha.crianca_id, nome: linha.crianca_nome } } });
  }

  // POST /criancas/adicionar (responsável já logado: outro filho, sem nova conta)
  function adicionarFilho(req, res) {
    const b = req.body || {};
    const codigo = texto(b.codigo);
    const nascimento = texto(b.data_nascimento);
    const parentesco = texto(b.parentesco);
    const parentescoOutro = texto(b.parentesco_outro);

    const erroParentesco = erroDeParentesco(parentesco, parentescoOutro);
    if (erroParentesco) return res.status(400).json({ erro: erroParentesco });
    if (!codigo || !dataValida(nascimento)) return res.status(400).json({ erro: MSG_CODIGO });

    const linha = conferirCodigo(codigo, nascimento);
    if (!linha) return res.status(400).json({ erro: MSG_CODIGO });

    banco.transaction(() => ativarCrianca(linha, req.usuario.id, parentesco, parentescoOutro))();
    res.status(201).json({ dados: { crianca: { id: linha.crianca_id, nome: linha.crianca_nome } } });
  }

  return { ativarConta, adicionarFilho };
}

module.exports = criarControladorAtivacao;
