// Abre o SQLite. Os testes passam ':memory:' ou um arquivo temporário.
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const arquivoPadrao = path.join(__dirname, '..', '..', 'dados', 'laco.db');

function abrirBanco(arquivo = arquivoPadrao) {
  if (arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const banco = new Database(arquivo);
  // Sem isso o SQLite ignora as chaves estrangeiras
  banco.pragma('foreign_keys = ON');
  atualizarLogExclusoes(banco);
  return banco;
}

// Bancos criados antes da "exclusão pela família" não aceitam o tipo novo em log_exclusoes.
// Refaz só essa tabela (sem dado pessoal, ninguém aponta para ela), sem precisar rodar o seed.
function atualizarLogExclusoes(banco) {
  const tabela = banco.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'log_exclusoes'").get();
  if (!tabela || tabela.sql.includes('EXCLUSAO_PELA_FAMILIA')) return;
  banco.transaction(() => {
    banco.exec(`
      CREATE TABLE log_exclusoes_nova (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK (tipo IN ('PRE_CADASTRO_NAO_ATIVADO','EXCLUSAO_PELA_FAMILIA')),
        protocolo TEXT NOT NULL,
        motivo TEXT NOT NULL,
        excluido_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
      );
      INSERT INTO log_exclusoes_nova (id, tipo, protocolo, motivo, excluido_em) SELECT id, tipo, protocolo, motivo, excluido_em FROM log_exclusoes;
      DROP TABLE log_exclusoes;
      ALTER TABLE log_exclusoes_nova RENAME TO log_exclusoes;
    `);
  })();
}

module.exports = { abrirBanco, arquivoPadrao };
