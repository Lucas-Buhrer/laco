// Confere o token e carrega o usuário DO BANCO a cada requisição.
// Assim, quem foi desativado perde o acesso na hora, mesmo com token válido (RN-21, S-29).
const jwt = require('jsonwebtoken');
const ambiente = require('../config/ambiente');

function criarAutenticacao(banco) {
  const buscar = banco.prepare(
    'SELECT id, clinica_id, papel, nome, email, ativo, senha_temporaria FROM usuarios WHERE id = ?'
  );

  return function autenticacao(req, res, next) {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    if (!token) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });

    let dados;
    try {
      dados = jwt.verify(token, ambiente.segredoJwt); // confere assinatura e validade
    } catch {
      return res.status(401).json({ erro: 'Sua sessão acabou. Entre de novo.' });
    }

    const usuario = buscar.get(dados.id);
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Sua sessão acabou. Entre de novo.' });
    }

    req.usuario = usuario;
    next();
  };
}

module.exports = criarAutenticacao;
