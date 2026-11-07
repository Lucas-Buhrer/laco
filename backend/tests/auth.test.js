const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const ambiente = require('../src/config/ambiente');
const { iniciar } = require('./ajuda');

const loginEquipe = (api, codigo, identificador, senha = '123456') =>
  api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha });

test('F-01: cadastrar clínica cria clínica + admin e o login funciona', async () => {
  const api = iniciar({ comSeed: false });
  const r = await api.chamar('POST', '/api/auth/cadastro-clinica', {
    nome_clinica: 'Clínica Teste', nome_admin: 'Admin', email: 'a@teste.test', senha: 'senha-forte-1',
  });
  assert.strictEqual(r.status, 201);
  const codigo = r.corpo.dados.codigo_clinica;
  assert.ok(codigo);
  const l = await loginEquipe(api, codigo, 'a@teste.test', 'senha-forte-1');
  assert.strictEqual(l.status, 200);
  assert.strictEqual(l.corpo.dados.usuario.papel, 'ADMIN_CLINICA');
  api.fechar();
});

test('F-05: senha com menos de 8 caracteres é recusada', async () => {
  const api = iniciar({ comSeed: false });
  const r = await api.chamar('POST', '/api/auth/cadastro-clinica', {
    nome_clinica: 'X', nome_admin: 'Y', email: 'y@teste.test', senha: '1234567',
  });
  assert.strictEqual(r.status, 400);
  api.fechar();
});

test('F-03: senha errada dá 401 com mensagem genérica, igual a e-mail inexistente', async () => {
  const api = iniciar();
  const errada = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: 'x' });
  const inexistente = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'ninguem@laco.test', senha: 'x' });
  assert.strictEqual(errada.status, 401);
  assert.deepStrictEqual(errada.corpo, inexistente.corpo);
  api.fechar();
});

test('F-04: depois de 5 erros seguidos, a 6ª tentativa dá 429', async () => {
  const api = iniciar();
  for (let i = 0; i < 5; i++) {
    const r = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: 'errada' });
    assert.strictEqual(r.status, 401);
  }
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  assert.strictEqual(r.status, 429);
  api.fechar();
});

test('responsável entra, /me funciona, e a resposta não traz o hash da senha (S-16)', async () => {
  const api = iniciar();
  const l = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  assert.strictEqual(l.status, 200);
  assert.ok(!JSON.stringify(l.corpo).includes('senha_hash'));
  const me = await api.chamar('GET', '/api/auth/me', null, l.corpo.dados.token);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.corpo.dados.papel, 'RESPONSAVEL');
  assert.ok(!JSON.stringify(me.corpo).includes('senha_hash'));
  api.fechar();
});

test('F-20: equipe entra com código da clínica + e-mail; código errado dá 401', async () => {
  const api = iniciar();
  assert.strictEqual((await loginEquipe(api, 'AURORA', 'profissional@laco.test')).status, 200);
  assert.strictEqual((await loginEquipe(api, 'ERRADO', 'profissional@laco.test')).status, 401);
  api.fechar();
});

test('F-43: Recepção entra com código da clínica + código de usuário, sem e-mail', async () => {
  const api = iniciar();
  const r = await loginEquipe(api, 'AURORA', 'recepcao');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.corpo.dados.usuario.papel, 'RECEPCAO');
  api.fechar();
});

test('S-30: código da clínica A com credenciais da clínica B dá 401', async () => {
  const api = iniciar();
  // marina@ só existe na Horizonte
  assert.strictEqual((await loginEquipe(api, 'AURORA', 'marina@horizonte.test')).status, 401);
  assert.strictEqual((await loginEquipe(api, 'HORIZONTE', 'marina@horizonte.test')).status, 200);
  api.fechar();
});

test('F-21: mesmo e-mail em duas clínicas são contas independentes', async () => {
  const api = iniciar();
  api.banco.prepare(
    `INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash)
     SELECT 2, 'PROFISSIONAL', 'Outro Carlos', email, senha_hash FROM usuarios WHERE email = 'carlos@laco.test'`
  ).run();
  const a = await loginEquipe(api, 'AURORA', 'carlos@laco.test');
  const h = await loginEquipe(api, 'HORIZONTE', 'carlos@laco.test');
  assert.strictEqual(a.status, 200);
  assert.strictEqual(h.status, 200);
  assert.notStrictEqual(a.corpo.dados.usuario.id, h.corpo.dados.usuario.id);
  api.fechar();
});

test('S-07: sem token, token adulterado e token expirado dão 401', async () => {
  const api = iniciar();
  assert.strictEqual((await api.chamar('GET', '/api/auth/me')).status, 401);
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, 'lixo.lixo.lixo')).status, 401);
  const assinadoErrado = jwt.sign({ id: 1 }, 'outro-segredo');
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, assinadoErrado)).status, 401);
  const expirado = jwt.sign({ id: 1 }, ambiente.segredoJwt, { expiresIn: -10 });
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, expirado)).status, 401);
  api.fechar();
});

test('token forjado com o segredo do .env.example antigo é recusado', async () => {
  const api = iniciar();
  assert.notStrictEqual(ambiente.segredoJwt, 'troque-este-segredo');
  const forjado = jwt.sign({ id: 3 }, 'troque-este-segredo', { expiresIn: '8h' });
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, forjado)).status, 401);
  api.fechar();
});

test('S-11/S-29: profissional desativado perde o acesso na hora, com o token antigo', async () => {
  const api = iniciar();
  const l = await loginEquipe(api, 'AURORA', 'carlos@laco.test');
  const token = l.corpo.dados.token;
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, token)).status, 200);
  api.banco.prepare("UPDATE usuarios SET ativo = 0 WHERE email = 'carlos@laco.test'").run();
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, token)).status, 401);
  // e não consegue entrar de novo
  assert.strictEqual((await loginEquipe(api, 'AURORA', 'carlos@laco.test')).status, 401);
  api.fechar();
});

test('RF-07: o mesmo login funciona em dois aparelhos ao mesmo tempo', async () => {
  const api = iniciar();
  const dados = { email: 'responsavel@laco.test', senha: '123456' };
  const a = await api.chamar('POST', '/api/auth/login-responsavel', dados);
  const b = await api.chamar('POST', '/api/auth/login-responsavel', dados);
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, a.corpo.dados.token)).status, 200);
  assert.strictEqual((await api.chamar('GET', '/api/auth/me', null, b.corpo.dados.token)).status, 200);
  api.fechar();
});

test('alterar senha: exige a atual e 8+ caracteres; a nova passa a valer', async () => {
  const api = iniciar();
  const l = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  const token = l.corpo.dados.token;
  const alterar = (corpo) => api.chamar('POST', '/api/auth/alterar-senha', corpo, token);
  assert.strictEqual((await alterar({ senha_atual: 'errada', senha_nova: 'nova-senha-1' })).status, 400);
  assert.strictEqual((await alterar({ senha_atual: '123456', senha_nova: 'curta' })).status, 400);
  assert.strictEqual((await alterar({ senha_atual: '123456', senha_nova: 'nova-senha-1' })).status, 200);
  const novo = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: 'nova-senha-1' });
  assert.strictEqual(novo.status, 200);
  api.fechar();
});

test('S-42: Recepção não tem rota de trocar senha', async () => {
  const api = iniciar();
  const l = await loginEquipe(api, 'AURORA', 'recepcao');
  const r = await api.chamar('POST', '/api/auth/alterar-senha', { senha_atual: '123456', senha_nova: 'nova-senha-1' }, l.corpo.dados.token);
  assert.strictEqual(r.status, 404);
  api.fechar();
});
