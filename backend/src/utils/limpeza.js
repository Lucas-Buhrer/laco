// Pré-cadastros que a família não ativa (RF-28, RN-33):
// INATIVO aos 30 dias (a clínica é avisada e pode gerar novo código) e excluído aos 90.
// A exclusão grava só protocolo, data e motivo, nunca nome ou contato.
const crypto = require('node:crypto');
const { agoraIso, formatar } = require('./datas');

// Valores configuráveis, sujeitos à validação jurídica
const DIAS_PARA_INATIVAR = 30;
const DIAS_PARA_EXCLUIR = 90;

const diasAtras = (dias, agora) => {
  const d = new Date(agora);
  d.setDate(d.getDate() - dias);
  return formatar(d);
};

// Tabelas que apontam para a criança de um pré-cadastro
const TABELAS_DO_PRE_CADASTRO = ['codigos_ativacao', 'pre_cadastro_profissionais'];

// O relógio de 30/90 dias conta da criação OU do último código gerado (novo código recomeça a contagem)
const BASE = `MAX(c.criada_em, COALESCE((SELECT MAX(criado_em) FROM codigos_ativacao WHERE crianca_id = c.id), c.criada_em))`;

function executarLimpeza(banco, agora = agoraIso()) {
  const resultado = { inativados: 0, excluidos: 0 };

  banco.transaction(() => {
    // 1) Exclusão definitiva primeiro (quem passou de 90 dias, ativo ou já inativo)
    const paraExcluir = banco
      .prepare(`SELECT c.id FROM criancas c WHERE c.status_cadastro IN ('PRE_CADASTRO','PRE_CADASTRO_INATIVO') AND ${BASE} < ?`)
      .all(diasAtras(DIAS_PARA_EXCLUIR, agora));
    const registrar = banco.prepare('INSERT INTO log_exclusoes (tipo, protocolo, motivo, excluido_em) VALUES (?, ?, ?, ?)');
    for (const { id } of paraExcluir) {
      for (const tabela of TABELAS_DO_PRE_CADASTRO) banco.prepare(`DELETE FROM ${tabela} WHERE crianca_id = ?`).run(id);
      banco.prepare('DELETE FROM criancas WHERE id = ?').run(id);
      registrar.run('PRE_CADASTRO_NAO_ATIVADO', `EXC-${agora.slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        `Sem ativação em ${DIAS_PARA_EXCLUIR} dias`, agora);
      resultado.excluidos += 1;
    }

    // 2) Inativação (quem passou de 30 dias): a clínica é avisada uma vez
    const paraInativar = banco
      .prepare(`SELECT c.id, c.nome, c.clinica_origem_id, c.criada_por FROM criancas c WHERE c.status_cadastro = 'PRE_CADASTRO' AND ${BASE} < ?`)
      .all(diasAtras(DIAS_PARA_INATIVAR, agora));
    const inativar = banco.prepare("UPDATE criancas SET status_cadastro = 'PRE_CADASTRO_INATIVO', inativado_em = ? WHERE id = ?");
    const avisar = banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, criada_em) VALUES (?, ?, ?, ?)');
    for (const c of paraInativar) {
      inativar.run(agora, c.id);
      // Quem cadastrou e a administração da clínica
      const destinos = banco
        .prepare("SELECT id FROM usuarios WHERE ativo = 1 AND clinica_id = ? AND (papel = 'ADMIN_CLINICA' OR id = ?)")
        .all(c.clinica_origem_id, c.criada_por);
      for (const d of destinos) {
        avisar.run(d.id, `O pré-cadastro de ${c.nome} ficou inativo: a família não ativou em ${DIAS_PARA_INATIVAR} dias. Gere um novo código para reativar.`, '/clinica/pre-cadastros', agora);
      }
      resultado.inativados += 1;
    }
  })();

  return resultado;
}

module.exports = { executarLimpeza, DIAS_PARA_INATIVAR, DIAS_PARA_EXCLUIR, BASE };
