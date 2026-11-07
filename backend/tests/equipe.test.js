const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');

async function entrar(api, codigo, identificador, senha = '123456') {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha });
  return r.corpo.dados?.token;
}

const novoProf = (extra = {}) => ({ nome: 'Lia Prado', email: 'lia@exemplo.test', especialidade: 'PSICOLOGO', ...extra });

test('ADM cadastra profissional com senha temporária e ele consegue entrar (RF-10)', async () => {
  const api = iniciar();
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const r = await api.chamar('POST', '/api/clinica/profissionais', novoProf(), adm);
  assert.strictEqual(r.status, 201);
  assert.ok(r.corpo.dados.senha_temporaria.length >= 10);
  assert.ok(await entrar(api, 'AURORA', 'lia@exemplo.test', r.corpo.dados.senha_temporaria));
  // a conta fica presa à clínica que cadastrou
  assert.strictEqual(await entrar(api, 'HORIZONTE', 'lia@exemplo.test', r.corpo.dados.senha_temporaria), undefined);
  // e-mail repetido e especialidade fora da lista
  assert.strictEqual((await api.chamar('POST', '/api/clinica/profissionais', novoProf(), adm)).status, 409);
  assert.strictEqual((await api.chamar('POST', '/api/clinica/profissionais', novoProf({ email: 'x@y.test', especialidade: 'MAGO' }), adm)).status, 400);
  api.fechar();
});

test('Só o ADM mexe na equipe: profissional e recepção recebem 403', async () => {
  const api = iniciar();
  const prof = await entrar(api, 'AURORA', 'profissional@laco.test');
  const rec = await entrar(api, 'AURORA', 'recepcao');
  for (const token of [prof, rec]) {
    assert.strictEqual((await api.chamar('POST', '/api/clinica/profissionais', novoProf(), token)).status, 403);
    assert.strictEqual((await api.chamar('POST', '/api/clinica/recepcao', { nome: 'X', codigo_usuario: 'xyz' }, token)).status, 403);
    assert.strictEqual((await api.chamar('GET', '/api/clinica/recepcao', null, token)).status, 403);
  }
  // listar profissionais é permitido, mas sem dados do ADM
  const lista = await api.chamar('GET', '/api/clinica/profissionais', null, rec);
  assert.strictEqual(lista.status, 200);
  assert.ok(lista.corpo.dados.every((p) => p.email === undefined && p.criancas === undefined));
  api.fechar();
});

test('ADM de uma clínica não enxerga nem desativa gente de outra (404)', async () => {
  const api = iniciar();
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const marina = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'marina@horizonte.test'").get().id;
  const lista = await api.chamar('GET', '/api/clinica/profissionais', null, adm);
  assert.ok(!lista.corpo.dados.some((p) => p.id === marina));
  assert.strictEqual((await api.chamar('POST', `/api/clinica/profissionais/${marina}/desativar`, {}, adm)).status, 404);
  assert.strictEqual((await api.chamar('PUT', `/api/clinica/profissionais/${marina}`, novoProf(), adm)).status, 404);
  api.fechar();
});

test('Desativar profissional encerra vínculos, avisa a família e derruba o token (RN-21, S-29)', async () => {
  const api = iniciar();
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const ana = await entrar(api, 'AURORA', 'profissional@laco.test');
  const mae = (await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' })).corpo.dados.token;
  const anaId = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'profissional@laco.test'").get().id;
  const vinculo = api.banco.prepare('SELECT id FROM vinculos WHERE profissional_id = ?').get(anaId);
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, {}, mae);

  const r = await api.chamar('POST', `/api/clinica/profissionais/${anaId}/desativar`, {}, adm);
  assert.strictEqual(r.status, 200);
  assert.ok(r.corpo.dados.vinculos_encerrados >= 1);

  assert.strictEqual(api.banco.prepare('SELECT status FROM vinculos WHERE id = ?').get(vinculo.id).status, 'ENCERRADO');
  // token antigo deixa de valer na hora e não entra de novo
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, ana)).status, 401);
  assert.strictEqual(await entrar(api, 'AURORA', 'profissional@laco.test'), undefined);
  // a família foi avisada
  const marianaId = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'responsavel@laco.test'").get().id;
  assert.ok(api.banco.prepare("SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto LIKE '%saiu da clínica%'").get(marianaId));
  // desativar de novo não faz sentido
  assert.strictEqual((await api.chamar('POST', `/api/clinica/profissionais/${anaId}/desativar`, {}, adm)).status, 409);
  api.fechar();
});

test('Recepção: ADM cria, redefine a senha e desativa (RF-15, RF-15a)', async () => {
  const api = iniciar();
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const r = await api.chamar('POST', '/api/clinica/recepcao', { nome: 'Caio Neves', codigo_usuario: 'caio' }, adm);
  assert.strictEqual(r.status, 201);
  assert.ok(await entrar(api, 'AURORA', 'caio', r.corpo.dados.senha_temporaria));
  assert.strictEqual((await api.chamar('POST', '/api/clinica/recepcao', { nome: 'Outro', codigo_usuario: 'caio' }, adm)).status, 409);

  const nova = await api.chamar('POST', `/api/clinica/recepcao/${r.corpo.dados.id}/redefinir-senha`, {}, adm);
  assert.strictEqual(nova.status, 200);
  assert.strictEqual(await entrar(api, 'AURORA', 'caio', r.corpo.dados.senha_temporaria), undefined);
  assert.ok(await entrar(api, 'AURORA', 'caio', nova.corpo.dados.senha_temporaria));

  assert.strictEqual((await api.chamar('POST', `/api/clinica/recepcao/${r.corpo.dados.id}/desativar`, {}, adm)).status, 200);
  assert.strictEqual(await entrar(api, 'AURORA', 'caio', nova.corpo.dados.senha_temporaria), undefined);
  api.fechar();
});
