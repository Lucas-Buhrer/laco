// Cria as tabelas a partir do schema.sql.
// Uso: `node src/database/criar.js` apaga o banco antigo e cria um vazio.
const fs = require('node:fs');
const path = require('node:path');
const { abrirBanco, arquivoPadrao } = require('../config/banco');

function criarTabelas(banco) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  banco.exec(sql);
}

module.exports = { criarTabelas };

if (require.main === module) {
  // Recomeça do zero: apagar o arquivo é mais simples que migrar
  for (const sufixo of ['', '-wal', '-shm']) fs.rmSync(arquivoPadrao + sufixo, { force: true });
  const banco = abrirBanco();
  criarTabelas(banco);
  banco.close();
  console.log('Banco criado em', arquivoPadrao);
}
