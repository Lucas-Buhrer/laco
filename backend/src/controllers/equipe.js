// Equipe da clínica: profissionais e Recepção (RF-10, RF-11, RF-14, RF-15).

function criarControladorEquipe(banco) {
  // GET /clinica/profissionais — sempre só da clínica de quem pede.
  // Admin vê também desativados e a situação; os demais só o necessário para indicar alguém.
  function listarProfissionais(req, res) {
    const ehAdmin = req.usuario.papel === 'ADMIN_CLINICA';
    const colunas = ehAdmin
      ? 'id, nome, email, especialidade, especialidade_outro, ativo, senha_temporaria, desativado_em'
      : 'id, nome, especialidade, especialidade_outro';
    const linhas = banco
      .prepare(`SELECT ${colunas} FROM usuarios WHERE clinica_id = ? AND papel = 'PROFISSIONAL' ${ehAdmin ? '' : 'AND ativo = 1'} ORDER BY nome`)
      .all(req.usuario.clinica_id);
    res.json({ dados: linhas });
  }

  return { listarProfissionais };
}

module.exports = criarControladorEquipe;
