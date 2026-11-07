// REGRA CENTRAL DE ACESSO (doc 05, seção 4). Toda rota /criancas/:id/... passa por aqui.
//
// 1. Sem login → 401 (feito antes, pelo middleware de autenticação).
// 2. Responsável ativo da criança → passa.
// 3. Profissional com vínculo APROVADO → passa, com o escopo em req.vinculo.
// 4. Qualquer outro caso (vínculo pendente/recusado/revogado/encerrado, admin, recepção,
//    responsável de outra criança, criança inexistente) → 404, para não revelar que a criança existe.
// 5. Acesso concedido → linha em log_acesso.
const criarAuditoria = require('./auditoria');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };

function criarAcessoCrianca(banco) {
  const { registrar } = criarAuditoria(banco);

  const buscarResponsavel = banco.prepare(
    'SELECT id FROM responsaveis_crianca WHERE crianca_id = ? AND responsavel_id = ? AND saiu_em IS NULL'
  );
  const buscarVinculoAprovado = banco.prepare(
    "SELECT * FROM vinculos WHERE crianca_id = ? AND profissional_id = ? AND status = 'APROVADO'"
  );

  // Uso: rotas.get('/:id', exigirLogin, exigirAcessoCrianca('VER_PERFIL'), controlador)
  function exigirAcessoCrianca(acao) {
    return function (req, res, next) {
      const criancaId = req.params.id;
      const usuario = req.usuario;

      if (usuario.papel === 'RESPONSAVEL' && buscarResponsavel.get(criancaId, usuario.id)) {
        req.acessoComo = 'RESPONSAVEL';
      } else if (usuario.papel === 'PROFISSIONAL') {
        const vinculo = buscarVinculoAprovado.get(criancaId, usuario.id);
        if (!vinculo) return res.status(404).json(NAO_ENCONTRADO);
        req.acessoComo = 'PROFISSIONAL';
        req.vinculo = vinculo;
      } else {
        // ADMIN_CLINICA e RECEPCAO nunca passam pela regra clínica (RN-23)
        return res.status(404).json(NAO_ENCONTRADO);
      }

      registrar(req, acao, { criancaId, recurso: 'crianca', recursoId: criancaId });
      next();
    };
  }

  return { exigirAcessoCrianca };
}

// RN-04: sem "ver histórico anterior", o profissional só vê o que foi criado depois da aprovação.
// Devolve a data mínima (texto) ou null quando não há corte. Usada pelas rotas de registros (T-31).
function inicioDoEscopo(req) {
  if (req.acessoComo !== 'PROFISSIONAL') return null;
  if (req.vinculo.ver_historico_anterior) return null;
  return req.vinculo.aprovado_em;
}

module.exports = { criarAcessoCrianca, inicioDoEscopo };
