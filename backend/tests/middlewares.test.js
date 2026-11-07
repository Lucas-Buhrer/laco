const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { abrirBanco } = require('../src/config/banco');
const { criarTabelas } = require('../src/database/criar');
const { popular } = require('../src/database/seed');
const criarAutenticacao = require('../src/middlewares/autenticacao');
const exigirPapel = require('../src/middlewares/papel');
const criarAuditoria = require('../src/middlewares/auditoria');
const { naoEncontrado, tratarErro } = require('../src/middlewares/erros');
const { iniciar } = require('./ajuda');

// App mínimo só para testar os middlewares, com rotas de mentira
function appDeTeste() {
  const banco = abrirBanco(':memory:');
  criarTabelas(banco);
  popular(banco);
  const { auditar } = criarAuditoria(banco);
  const login = criarAutenticacao(banco);

  const app = express();
  app.use(express.json());
  app.get('/so-responsavel', login, exigirPapel('RESPONSAVEL'), (req, res) => res.json({ dados: 'ok' }));
  app.get('/crianca/:id', login, auditar('VER_PERFIL', 'crianca'), (req, res) =>
    req.params.id === 'proibida' ? res.status(404).json({ erro: 'Não encontrado.' }) : res.json({ dados: 'ok' })
  );
  app.get('/quebra', (req, res, next) => next(new Error('segredo-interno-123')));
  app.use(naoEncontrado);
  app.use(tratarErro);

  const servidor = app.listen(0);
  const url = `http://localhost:${servidor.address().port}`;
  return { banco, url, fechar: () => servidor.close() };
}

async function tokenDe(api, rota, corpo) {
  const r = await api.chamar('POST', rota, corpo);
  return r.corpo.dados.token;
}

test('S-08: papel errado dá 403, papel certo passa', async () => {
  const api = iniciar();
  const mini = appDeTeste();
  // os dois apps usam o mesmo segredo, então o token do app principal vale no mini
  const resp = await tokenDe(api, '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  const prof = await tokenDe(api, '/api/auth/login-clinica', { codigo_clinica: 'AURORA', identificador: 'carlos@laco.test', senha: '123456' });
  const chamar = (token) => fetch(mini.url + '/so-responsavel', { headers: { Authorization: `Bearer ${token}` } });
  assert.strictEqual((await chamar(resp)).status, 200);
  assert.strictEqual((await chamar(prof)).status, 403);
  api.fechar();
  mini.fechar();
});

test('S-14: acesso concedido grava log_acesso com usuário, criança e ação', async () => {
  const api = iniciar();
  const mini = appDeTeste();
  const prof = await tokenDe(api, '/api/auth/login-clinica', { codigo_clinica: 'AURORA', identificador: 'carlos@laco.test', senha: '123456' });
  const antes = mini.banco.prepare('SELECT COUNT(*) AS n FROM log_acesso').get().n;
  await fetch(mini.url + '/crianca/abc', { headers: { Authorization: `Bearer ${prof}` } });
  // o log é gravado quando a resposta termina; dá um instante
  await new Promise((r) => setTimeout(r, 50));
  const linhas = mini.banco.prepare('SELECT * FROM log_acesso ORDER BY id DESC LIMIT 1').get();
  const total = mini.banco.prepare('SELECT COUNT(*) AS n FROM log_acesso').get().n;
  assert.strictEqual(total, antes + 1);
  assert.strictEqual(linhas.acao, 'VER_PERFIL');
  assert.strictEqual(linhas.crianca_id, 'abc');
  assert.ok(linhas.usuario_id);
  api.fechar();
  mini.fechar();
});

test('acesso negado (404) não grava log de acesso', async () => {
  const api = iniciar();
  const mini = appDeTeste();
  const prof = await tokenDe(api, '/api/auth/login-clinica', { codigo_clinica: 'AURORA', identificador: 'carlos@laco.test', senha: '123456' });
  const antes = mini.banco.prepare('SELECT COUNT(*) AS n FROM log_acesso').get().n;
  await fetch(mini.url + '/crianca/proibida', { headers: { Authorization: `Bearer ${prof}` } });
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(mini.banco.prepare('SELECT COUNT(*) AS n FROM log_acesso').get().n, antes);
  api.fechar();
  mini.fechar();
});

test('erro inesperado dá 500 sem vazar a mensagem interna', async () => {
  const mini = appDeTeste();
  const silenciar = console.error;
  console.error = () => {}; // não poluir a saída do teste
  const r = await fetch(mini.url + '/quebra');
  console.error = silenciar;
  const texto = await r.text();
  assert.strictEqual(r.status, 500);
  assert.ok(!texto.includes('segredo-interno-123'));
  mini.fechar();
});

test('JSON quebrado dá 400 e rota desconhecida dá 404, ambos no formato { erro }', async () => {
  const api = iniciar({ comSeed: false });
  const quebrado = await fetch(api.url + '/api/auth/login-responsavel', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{ nao e json',
  });
  assert.strictEqual(quebrado.status, 400);
  assert.ok((await quebrado.json()).erro);
  const desconhecida = await api.chamar('GET', '/api/nao-existe');
  assert.strictEqual(desconhecida.status, 404);
  assert.ok(desconhecida.corpo.erro);
  api.fechar();
});
