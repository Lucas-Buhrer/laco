const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');

async function entrar(api, codigo, identificador, senha = '123456') {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha });
  return r.corpo.dados?.token;
}

test('ADM vê e edita os dados da própria clínica; o código de acesso não muda', async () => {
  const api = iniciar();
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const antes = (await api.chamar('GET', '/api/clinica', null, adm)).corpo.dados;
  assert.strictEqual(antes.codigo_acesso, 'AURORA');
  assert.ok(antes.administradores.some((a) => a.email === 'admin@laco.test' && a.voce));
  // só da própria clínica
  assert.ok(!JSON.stringify(antes).includes('horizonte'));

  const r = await api.chamar('PUT', '/api/clinica', { nome: 'Clínica Aurora Centro', email_contato: 'contato@aurora.test', codigo_acesso: 'OUTRO' }, adm);
  assert.strictEqual(r.status, 200);
  const depois = (await api.chamar('GET', '/api/clinica', null, adm)).corpo.dados;
  assert.strictEqual(depois.nome, 'Clínica Aurora Centro');
  assert.strictEqual(depois.codigo_acesso, 'AURORA');
  assert.strictEqual((await api.chamar('PUT', '/api/clinica', { nome: '' }, adm)).status, 400);
  // a outra clínica não mudou
  assert.strictEqual(api.banco.prepare("SELECT nome FROM clinicas WHERE codigo_acesso = 'HORIZONTE'").get().nome, 'Clínica Horizonte');
  api.fechar();
});

test('Só o ADM mexe nos dados da clínica: profissional e recepção levam 403', async () => {
  const api = iniciar();
  for (const ident of ['carlos@laco.test', 'recepcao']) {
    const token = await entrar(api, 'AURORA', ident);
    assert.strictEqual((await api.chamar('GET', '/api/clinica', null, token)).status, 403);
    assert.strictEqual((await api.chamar('PUT', '/api/clinica', { nome: 'X' }, token)).status, 403);
    assert.strictEqual((await api.chamar('POST', '/api/clinica/administradores', { nome: 'X', email: 'x@y.test' }, token)).status, 403);
  }
  assert.strictEqual((await api.chamar('GET', '/api/clinica')).status, 401);
  api.fechar();
});

test('ADM adiciona outro administrador, que entra com a senha temporária e fica só na própria clínica', async () => {
  const api = iniciar();
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const r = await api.chamar('POST', '/api/clinica/administradores', { nome: 'Eduardo Pires', email: 'eduardo@aurora.test' }, adm);
  assert.strictEqual(r.status, 201);
  const novo = await entrar(api, 'AURORA', 'eduardo@aurora.test', r.corpo.dados.senha_temporaria);
  assert.ok(novo);
  assert.strictEqual(await entrar(api, 'HORIZONTE', 'eduardo@aurora.test', r.corpo.dados.senha_temporaria), undefined);
  assert.strictEqual((await api.chamar('POST', '/api/clinica/administradores', { nome: 'Eduardo', email: 'eduardo@aurora.test' }, adm)).status, 409);
  // o novo administrador também não acessa dados clínicos
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}`, null, novo)).status, 404);
  api.fechar();
});

test('RF-05: alterar a própria senha exige a atual; Recepção não tem a rota', async () => {
  const api = iniciar();
  const prof = await entrar(api, 'AURORA', 'carlos@laco.test');
  assert.strictEqual((await api.chamar('POST', '/api/auth/alterar-senha', { senha_atual: 'errada', senha_nova: 'nova-senha-1' }, prof)).status, 400);
  assert.strictEqual((await api.chamar('POST', '/api/auth/alterar-senha', { senha_atual: '123456', senha_nova: 'curta' }, prof)).status, 400);
  assert.strictEqual((await api.chamar('POST', '/api/auth/alterar-senha', { senha_atual: '123456', senha_nova: 'nova-senha-1' }, prof)).status, 200);
  assert.ok(await entrar(api, 'AURORA', 'carlos@laco.test', 'nova-senha-1'));
  assert.strictEqual(await entrar(api, 'AURORA', 'carlos@laco.test', '123456'), undefined);
  const rec = await entrar(api, 'AURORA', 'recepcao');
  assert.strictEqual((await api.chamar('POST', '/api/auth/alterar-senha', { senha_atual: '123456', senha_nova: 'nova-senha-1' }, rec)).status, 404);
  api.fechar();
});
