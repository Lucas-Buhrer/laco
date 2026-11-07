// Auditoria (RN-07, RF-71): todo acesso a dados de criança vira uma linha em log_acesso.
// A tabela é só de inserção: nenhuma rota atualiza ou apaga.

function criarAuditoria(banco) {
  const inserir = banco.prepare(
    `INSERT INTO log_acesso (usuario_id, crianca_id, acao, recurso, recurso_id, ip, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // Para usar dentro de controladores (ex.: regra central de acesso, T-17).
  // Guarda só ids e nomes de ação, nunca o conteúdo dos dados (RNF-04).
  function registrar(req, acao, { criancaId = null, recurso = null, recursoId = null } = {}) {
    inserir.run(
      req.usuario ? req.usuario.id : null,
      criancaId,
      acao,
      recurso,
      recursoId === null ? null : String(recursoId),
      req.ip,
      new Date().toISOString().slice(0, 19)
    );
  }

  // Para usar na definição da rota: auditar('VER_PERFIL', 'crianca').
  // Só registra se o acesso foi concedido (resposta abaixo de 400); o id da criança vem de :id.
  function auditar(acao, recurso) {
    return function (req, res, next) {
      res.on('finish', () => {
        if (res.statusCode >= 400) return;
        registrar(req, acao, { criancaId: req.params.id || null, recurso, recursoId: req.params.id || null });
      });
      next();
    };
  }

  return { registrar, auditar };
}

module.exports = criarAuditoria;
