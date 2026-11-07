const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { abrirBanco } = require('../src/config/banco');
const { criarTabelas } = require('../src/database/criar');
const { popular } = require('../src/database/seed');
const { hashCodigo } = require('../src/utils/codigos');

function bancoComSeed() {
  const banco = abrirBanco(':memory:');
  criarTabelas(banco);
  const info = popular(banco);
  return { banco, info };
}

test('logins da demo existem e a senha é 123456', () => {
  const { banco } = bancoComSeed();
  const entradas = [
    ['ADMIN_CLINICA', 'email', 'admin@laco.test'],
    ['PROFISSIONAL', 'email', 'profissional@laco.test'],
    ['RESPONSAVEL', 'email', 'responsavel@laco.test'],
    ['RECEPCAO', 'codigo_usuario', 'recepcao'],
  ];
  for (const [papel, campo, valor] of entradas) {
    const u = banco.prepare(`SELECT * FROM usuarios WHERE ${campo} = ?`).get(valor);
    assert.strictEqual(u.papel, papel);
    assert.ok(bcrypt.compareSync('123456', u.senha_hash));
  }
});

test('Ana pendente, Carlos aprovado, e o Theo tem consulta na Horizonte', () => {
  const { banco } = bancoComSeed();
  const status = (email) => banco.prepare(
    `SELECT v.status FROM vinculos v JOIN usuarios u ON u.id = v.profissional_id WHERE u.email = ?`).get(email).status;
  assert.strictEqual(status('profissional@laco.test'), 'PENDENTE');
  assert.strictEqual(status('carlos@laco.test'), 'APROVADO');
  const conflito = banco.prepare(
    `SELECT COUNT(*) AS n FROM consultas c JOIN clinicas cl ON cl.id = c.clinica_id
     WHERE cl.codigo_acesso = 'HORIZONTE' AND c.status = 'AGENDADA'`).get().n;
  assert.strictEqual(conflito, 1);
});

test('consultas passadas têm um de cada estado', () => {
  const { banco } = bancoComSeed();
  const estados = banco.prepare("SELECT DISTINCT status FROM consultas WHERE inicio < datetime('now')").all().map((l) => l.status);
  for (const e of ['REALIZADA', 'FALTA', 'CANCELADA', 'REMARCADA']) assert.ok(estados.includes(e), e);
});

test('Davi tem código de ativação válido e Sofia está inativa', () => {
  const { banco, info } = bancoComSeed();
  const achou = banco.prepare('SELECT id FROM codigos_ativacao WHERE codigo_hash = ?').get(hashCodigo(info.codigoDavi));
  assert.ok(achou);
  const sofia = banco.prepare("SELECT status_cadastro FROM criancas WHERE nome = 'Sofia'").get();
  assert.strictEqual(sofia.status_cadastro, 'PRE_CADASTRO_INATIVO');
});

test('observação privada existe no banco (a API é que nunca a mostra)', () => {
  const { banco } = bancoComSeed();
  const n = banco.prepare('SELECT COUNT(*) AS n FROM registros_sessao WHERE observacao IS NOT NULL AND observacao_visivel_familia = 0').get().n;
  assert.ok(n > 0);
});
