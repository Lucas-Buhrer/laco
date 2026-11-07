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
  return banco;
}

module.exports = { abrirBanco, arquivoPadrao };
