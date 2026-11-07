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
const theo = (api) => api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;

test('RF-60 / RF-61: profissional cria atividade, a família é avisada e a vê na lista', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);
  const r = await api.chamar('POST', `/api/criancas/${theo(api)}/atividades`,
    { titulo: 'Soprar bolhas', instrucoes: 'Peça "mais" com a figura.', frequencia: '1 vez ao dia', prazo: '2030-01-31' }, carlos);
  assert.strictEqual(r.status, 201);
  const lista = await api.chamar('GET', `/api/criancas/${theo(api)}/atividades`, null, familia);
  assert.ok(lista.corpo.dados.some((a) => a.titulo === 'Soprar bolhas'));
  assert.ok(api.banco.prepare("SELECT 1 FROM notificacoes WHERE texto LIKE 'Nova atividade%'").get());
  // título obrigatório e a família não cria
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/atividades`, { titulo: '' }, carlos)).status, 400);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/atividades`, { titulo: 'x' }, familia)).status, 403);
  api.fechar();
});

test('RF-62 / RF-63: a família marca a execução; o profissional vê adesão e observações', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);
  const ativ = api.banco.prepare("SELECT id FROM atividades WHERE titulo = 'Pedir objeto com figura'").get().id;

  const r = await api.chamar('POST', `/api/atividades/${ativ}/execucoes`, { como_foi: 2, observacao: 'Ficou cansado no fim' }, familia);
  assert.strictEqual(r.status, 201);
  assert.strictEqual((await api.chamar('POST', `/api/atividades/${ativ}/execucoes`, { como_foi: 9 }, familia)).status, 400);
  // profissional não marca execução
  assert.strictEqual((await api.chamar('POST', `/api/atividades/${ativ}/execucoes`, { como_foi: 1 }, carlos)).status, 403);

  const exec = await api.chamar('GET', `/api/atividades/${ativ}/execucoes`, null, carlos);
  assert.strictEqual(exec.status, 200);
  assert.ok(exec.corpo.dados.some((e) => e.observacao === 'Ficou cansado no fim'));

  const lista = await api.chamar('GET', `/api/criancas/${theo(api)}/atividades`, null, carlos);
  const a = lista.corpo.dados.find((x) => x.id === ativ);
  assert.ok(a.adesao_4_semanas >= 0 && a.adesao_4_semanas <= 100);
  assert.strictEqual(a.feitas_hoje, 1);
  // a adesão detalhada não vai para a família
  const daFamilia = (await api.chamar('GET', `/api/criancas/${theo(api)}/atividades`, null, familia)).corpo.dados[0];
  assert.strictEqual(daFamilia.adesao_4_semanas, undefined);
  api.fechar();
});

test('D10: o profissional vê só as atividades que criou, mesmo se outro profissional for aprovado', async () => {
  const api = iniciar();
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, { ver_historico_anterior: true }, await mae(api));
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/atividades`, null, ana)).corpo.dados.length, 0);
  // e não lê nem edita as execuções de atividade do Carlos
  const ativ = api.banco.prepare('SELECT id FROM atividades').get().id;
  assert.strictEqual((await api.chamar('GET', `/api/atividades/${ativ}/execucoes`, null, ana)).status, 404);
  assert.strictEqual((await api.chamar('PUT', `/api/atividades/${ativ}`, { status: 'ENCERRADA' }, ana)).status, 404);
  api.fechar();
});

test('S-05 / S-19: quem não tem vínculo ou é da administração não mexe em atividades (404)', async () => {
  const api = iniciar();
  const ativ = api.banco.prepare('SELECT id FROM atividades').get().id;
  const quem = [
    await clinica(api, 'AURORA', 'paulo@laco.test'),
    await clinica(api, 'AURORA', 'admin@laco.test'),
    await clinica(api, 'AURORA', 'recepcao'),
    await clinica(api, 'HORIZONTE', 'marina@horizonte.test'),
  ];
  for (const token of quem) {
    assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/atividades`, null, token)).status, 404);
    assert.ok([403, 404].includes((await api.chamar('GET', `/api/atividades/${ativ}/execucoes`, null, token)).status));
    assert.ok([403, 404].includes((await api.chamar('POST', `/api/atividades/${ativ}/execucoes`, { como_foi: 1 }, token)).status));
  }
  api.fechar();
});

test('encerrar atividade: some da lista da família e não aceita mais execução', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);
  const ativ = api.banco.prepare("SELECT id FROM atividades WHERE titulo = 'Rotina de escovar os dentes'").get().id;
  assert.strictEqual((await api.chamar('PUT', `/api/atividades/${ativ}`, { status: 'ENCERRADA' }, carlos)).status, 200);
  const lista = (await api.chamar('GET', `/api/criancas/${theo(api)}/atividades`, null, familia)).corpo.dados;
  assert.ok(!lista.some((a) => a.id === ativ));
  assert.strictEqual((await api.chamar('POST', `/api/atividades/${ativ}/execucoes`, { como_foi: 1 }, familia)).status, 409);
  api.fechar();
});
