const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');

async function clinica(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
async function mae(api) {
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  return r.corpo.dados.token;
}

test('RF-90: o responsável recebe o aviso do pedido da Ana e marca como lido', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const lista = await api.chamar('GET', '/api/notificacoes', null, familia);
  assert.strictEqual(lista.status, 200);
  assert.strictEqual(lista.corpo.dados.nao_lidas, 1);
  assert.strictEqual(lista.corpo.dados.avisos[0].link, '/familia/solicitacoes');

  const id = lista.corpo.dados.avisos[0].id;
  assert.strictEqual((await api.chamar('POST', `/api/notificacoes/${id}/ler`, {}, familia)).status, 200);
  assert.strictEqual((await api.chamar('GET', '/api/notificacoes', null, familia)).corpo.dados.nao_lidas, 0);
  api.fechar();
});

test('cada pessoa só lê e marca os próprios avisos (404 para os dos outros)', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const idDaMae = (await api.chamar('GET', '/api/notificacoes', null, familia)).corpo.dados.avisos[0].id;
  assert.strictEqual((await api.chamar('POST', `/api/notificacoes/${idDaMae}/ler`, {}, carlos)).status, 404);
  const doCarlos = (await api.chamar('GET', '/api/notificacoes', null, carlos)).corpo.dados.avisos;
  assert.ok(!doCarlos.some((a) => a.id === idDaMae));
  assert.strictEqual(api.banco.prepare('SELECT lida FROM notificacoes WHERE id = ?').get(idDaMae).lida, 0);
  assert.strictEqual((await api.chamar('GET', '/api/notificacoes')).status, 401);
  api.fechar();
});

test('avisos nascem das ações: aprovar avisa o profissional; ler todas zera o contador', async () => {
  const api = iniciar();
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, {}, await mae(api));
  const antes = (await api.chamar('GET', '/api/notificacoes', null, ana)).corpo.dados;
  assert.strictEqual(antes.nao_lidas, 1);
  assert.match(antes.avisos[0].texto, /aprovou o seu acesso/);
  assert.strictEqual((await api.chamar('POST', '/api/notificacoes/ler-todas', {}, ana)).corpo.dados.marcadas, 1);
  assert.strictEqual((await api.chamar('GET', '/api/notificacoes', null, ana)).corpo.dados.nao_lidas, 0);
  api.fechar();
});
