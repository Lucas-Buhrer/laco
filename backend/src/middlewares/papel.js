// Barra quem tem o papel errado (depois do login). Ex.: exigirPapel('RESPONSAVEL').
// Responde 403: a pessoa está logada, só não pode usar esta rota (S-08, S-09, S-25, S-33).
function exigirPapel(...papeisPermitidos) {
  return function (req, res, next) {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: 'Você não tem permissão para isso.' });
    }
    next();
  };
}

module.exports = exigirPapel;
