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

test('RF-80: painel do profissional traz crianças aprovadas e pedidos aguardando os pais', async () => {
  const api = iniciar();
  const carlos = (await api.chamar('GET', '/api/painel/profissional', null, await clinica(api, 'AURORA', 'carlos@laco.test'))).corpo.dados;
  assert.strictEqual(carlos.criancas_aprovadas, 1);
  const ana = (await api.chamar('GET', '/api/painel/profissional', null, await clinica(api, 'AURORA', 'profissional@laco.test'))).corpo.dados;
  assert.strictEqual(ana.criancas_aprovadas, 0);
  assert.strictEqual(ana.pedidos_pendentes.length, 1);
  api.fechar();
});

test('RF-81: painel do responsável traz próxima consulta, atividades de hoje e pedidos', async () => {
  const api = iniciar();
  const p = (await api.chamar('GET', '/api/painel/responsavel', null, await mae(api))).corpo.dados;
  assert.strictEqual(p.filhos.length, 1);
  assert.ok(p.proximas_consultas.length > 0);
  assert.ok(p.atividades.length >= 1);
  assert.strictEqual(p.pedidos_pendentes.length, 1);
  api.fechar();
});

test('Painel da clínica: ADM e Recepção veem agenda e cadastro, e nada clínico', async () => {
  const api = iniciar();
  for (const ident of ['admin@laco.test', 'recepcao']) {
    const r = await api.chamar('GET', '/api/painel/clinica', null, await clinica(api, 'AURORA', ident));
    assert.strictEqual(r.status, 200);
    assert.ok(r.corpo.dados.sem_resposta.length >= 1); // as consultas amarela e vermelha do seed
    assert.strictEqual(r.corpo.dados.pre_cadastros_sem_ativacao, 1); // o Davi
    const texto = JSON.stringify(r.corpo);
    for (const proibido of ['resumo', 'observacao', 'objetivos', 'humor', 'telefone']) assert.ok(!texto.includes(proibido));
  }
  api.fechar();
});

test('Painéis: cada papel só abre o seu (403) e sem login dá 401', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const prof = await clinica(api, 'AURORA', 'carlos@laco.test');
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  assert.strictEqual((await api.chamar('GET', '/api/painel/profissional', null, familia)).status, 403);
  assert.strictEqual((await api.chamar('GET', '/api/painel/responsavel', null, prof)).status, 403);
  assert.strictEqual((await api.chamar('GET', '/api/painel/profissional', null, adm)).status, 403);
  assert.strictEqual((await api.chamar('GET', '/api/painel/clinica', null, prof)).status, 403);
  assert.strictEqual((await api.chamar('GET', '/api/painel/clinica')).status, 401);
  api.fechar();
});
