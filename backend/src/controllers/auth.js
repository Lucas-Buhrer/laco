// Cadastro de clínica, logins, "quem sou eu" e troca de senha.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ambiente = require('../config/ambiente');

const SENHA_MINIMA = 8; // RN-13
const MSG_LOGIN = 'Dados de acesso incorretos.'; // genérica de propósito: não diz o que errou

// Hash de mentira, para o tempo de resposta ser parecido quando o usuário não existe
const HASH_FALSO = bcrypt.hashSync('nao-importa', 10);

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id }, ambiente.segredoJwt, { expiresIn: '8h' });
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Código curto da clínica (usado no login da equipe), sem letras parecidas
function gerarCodigoClinica(banco) {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (;;) {
    let codigo = '';
    for (let i = 0; i < 6; i++) codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    if (!banco.prepare('SELECT 1 FROM clinicas WHERE codigo_acesso = ?').get(codigo)) return codigo;
  }
}

function dadosPublicos(usuario, clinica) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    papel: usuario.papel,
    email: usuario.email,
    senha_temporaria: usuario.senha_temporaria,
    clinica: clinica ? { id: clinica.id, nome: clinica.nome, codigo_acesso: clinica.codigo_acesso } : null,
  };
}

function criarControladorAuth(banco) {
  // RF-01: cria a clínica e o primeiro admin
  function cadastroClinica(req, res) {
    const nomeClinica = texto(req.body?.nome_clinica);
    const nomeAdmin = texto(req.body?.nome_admin);
    const email = texto(req.body?.email).toLowerCase();
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    if (!nomeClinica || !nomeAdmin || !email.includes('@')) {
      return res.status(400).json({ erro: 'Preencha o nome da clínica, o seu nome e um e-mail válido.' });
    }
    if (senha.length < SENHA_MINIMA) {
      return res.status(400).json({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    // Clínica e admin nascem juntos: ou os dois, ou nenhum
    const criar = banco.transaction(() => {
      const codigo = gerarCodigoClinica(banco);
      const clinicaId = banco
        .prepare('INSERT INTO clinicas (nome, codigo_acesso, email_contato) VALUES (?, ?, ?)')
        .run(nomeClinica, codigo, email).lastInsertRowid;
      const adminId = banco
        .prepare(`INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash)
                  VALUES (?, 'ADMIN_CLINICA', ?, ?, ?)`)
        .run(clinicaId, nomeAdmin, email, senhaHash).lastInsertRowid;
      return { clinicaId, adminId, codigo };
    });
    const { adminId, codigo } = criar();

    res.status(201).json({ dados: { codigo_clinica: codigo, token: gerarToken({ id: adminId }) } });
  }

  // RF-03: responsável entra com e-mail + senha
  function loginResponsavel(req, res) {
    const email = texto(req.body?.email).toLowerCase();
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    const usuario = banco
      .prepare("SELECT * FROM usuarios WHERE papel = 'RESPONSAVEL' AND email = ? AND ativo = 1")
      .get(email);
    return responderLogin(res, usuario, senha, null);
  }

  // RF-03: equipe entra com código da clínica + (e-mail ou código de usuário) + senha
  function loginClinica(req, res) {
    const codigoClinica = texto(req.body?.codigo_clinica).toUpperCase();
    const identificador = texto(req.body?.identificador).toLowerCase();
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    const clinica = banco.prepare('SELECT * FROM clinicas WHERE codigo_acesso = ?').get(codigoClinica);
    // Conta pertence a UMA clínica: a busca já filtra pela clínica informada (RN-20, S-30)
    const usuario = clinica
      ? banco
          .prepare(`SELECT * FROM usuarios
                    WHERE clinica_id = ? AND ativo = 1 AND (email = ? OR codigo_usuario = ?)`)
          .get(clinica.id, identificador, identificador)
      : undefined;
    return responderLogin(res, usuario, senha, clinica);
  }

  function responderLogin(res, usuario, senha, clinica) {
    const confere = bcrypt.compareSync(senha, usuario ? usuario.senha_hash : HASH_FALSO);
    if (!usuario || !confere) return res.status(401).json({ erro: MSG_LOGIN });
    res.json({ dados: { token: gerarToken(usuario), usuario: dadosPublicos(usuario, clinica) } });
  }

  function eu(req, res) {
    const clinica = req.usuario.clinica_id
      ? banco.prepare('SELECT id, nome, codigo_acesso FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
      : null;
    res.json({ dados: dadosPublicos(req.usuario, clinica) });
  }

  // RF-05. A Recepção não tem essa rota: só o admin redefine a senha dela (S-42)
  function alterarSenha(req, res) {
    if (req.usuario.papel === 'RECEPCAO') return res.status(404).json({ erro: 'Não encontrado.' });

    const senhaAtual = typeof req.body?.senha_atual === 'string' ? req.body.senha_atual : '';
    const senhaNova = typeof req.body?.senha_nova === 'string' ? req.body.senha_nova : '';
    if (senhaNova.length < SENHA_MINIMA) {
      return res.status(400).json({ erro: `A senha nova precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
    }
    const atual = banco.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (!bcrypt.compareSync(senhaAtual, atual.senha_hash)) {
      return res.status(400).json({ erro: 'A senha atual não confere.' });
    }
    banco
      .prepare('UPDATE usuarios SET senha_hash = ?, senha_temporaria = 0 WHERE id = ?')
      .run(bcrypt.hashSync(senhaNova, 10), req.usuario.id);
    res.json({ dados: { ok: true } });
  }

  return { cadastroClinica, loginResponsavel, loginClinica, eu, alterarSenha };
}

module.exports = criarControladorAuth;
