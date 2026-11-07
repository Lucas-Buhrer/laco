// Avisos dentro do app (nada de e-mail/WhatsApp reais).
const { agoraIso } = require('./datas');

function criarAvisos(banco) {
  const inserir = banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, criada_em) VALUES (?, ?, ?, ?)');
  const outrosResponsaveis = banco.prepare(
    'SELECT responsavel_id FROM responsaveis_crianca WHERE crianca_id = ? AND saiu_em IS NULL AND responsavel_id <> ?'
  );
  const todosResponsaveis = banco.prepare(
    'SELECT responsavel_id FROM responsaveis_crianca WHERE crianca_id = ? AND saiu_em IS NULL'
  );

  function avisar(usuarioId, texto, link = null) {
    inserir.run(usuarioId, texto, link, agoraIso());
  }

  // RN-29: ação sensível de um responsável avisa o outro
  function avisarOutroResponsavel(criancaId, autorId, texto, link = null) {
    for (const { responsavel_id } of outrosResponsaveis.all(criancaId, autorId)) avisar(responsavel_id, texto, link);
  }

  function avisarResponsaveis(criancaId, texto, link = null) {
    for (const { responsavel_id } of todosResponsaveis.all(criancaId)) avisar(responsavel_id, texto, link);
  }

  return { avisar, avisarOutroResponsavel, avisarResponsaveis };
}

module.exports = criarAvisos;
