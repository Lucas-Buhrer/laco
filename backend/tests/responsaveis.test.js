const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { iniciar } = require('./ajuda');

async function clinica(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
async function login(api, email, senha = '123456') {
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email, senha });
  return r.corpo.dados.token;
}
const theo = (api) => api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
const NASC = '2021-03-14'; // data de nascimento do Theo no seed
const entrada = (codigo, extra = {}) => ({
  codigo, data_nascimento: NASC, nome: 'Thiago Alves', email: 'thiago@exemplo.test', senha: 'senha-forte-1',
  parentesco: 'PAI', aceitou_termo: true, ...extra,
});

async function convite(api, token) {
  const r = await api.chamar('POST', `/api/criancas/${theo(api)}/convites-responsavel`, {}, token);
  assert.strictEqual(r.status, 201);
  return r.corpo.dados.codigo;
}

test('F-29: a mãe gera o convite e o pai cria conta com código + data + Termo', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  const codigo = await convite(api, mae);

  const r = await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo));
  assert.strictEqual(r.status, 201, JSON.stringify(r.corpo));
  const pai = r.corpo.dados.token;
  // o pai já enxerga o Theo e a mãe foi avisada
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, pai)).status, 200);
  const avisos = (await api.chamar('GET', '/api/notificacoes', null, mae)).corpo.dados.avisos;
  assert.ok(avisos.some((a) => a.texto.includes('Thiago Alves entrou como responsável')));
  // o Termo foi guardado e o convite é de uso único
  assert.ok(api.banco.prepare("SELECT 1 FROM consentimentos c JOIN usuarios u ON u.id = c.usuario_id WHERE u.email = 'thiago@exemplo.test'").get());
  const outra = await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo, { email: 'outro@exemplo.test' }));
  assert.strictEqual(outra.status, 400);
  api.fechar();
});

test('F-30: um terceiro responsável é recusado (limite de 2)', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  const primeiro = await convite(api, mae);
  await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(primeiro));
  // com 2 responsáveis, nem dá para gerar outro convite
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/convites-responsavel`, {}, mae)).status, 409);
  // convite gerado antes do segundo entrar também não vale para um terceiro
  api.banco.prepare("INSERT INTO convites_responsavel (crianca_id, codigo_hash, criado_por, expira_em) VALUES (?, ?, ?, '2099-01-01T00:00:00')")
    .run(theo(api), require('../src/utils/codigos').hashCodigo('TEST-0001'), 1);
  const r = await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada('TEST-0001', { email: 'terceiro@exemplo.test' }));
  assert.strictEqual(r.status, 409);
  api.fechar();
});

test('Convite: código ou data errados dão a mesma resposta; 5 datas erradas bloqueiam o convite', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  const codigo = await convite(api, mae);
  const inexistente = await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada('ZZZZ-9999'));
  const dataErrada = await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo, { data_nascimento: '2000-01-01' }));
  assert.strictEqual(inexistente.status, 400);
  assert.deepStrictEqual(inexistente.corpo, dataErrada.corpo);
  for (let i = 0; i < 4; i++) await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo, { data_nascimento: '2000-01-01' }));
  // agora nem a data certa funciona
  assert.strictEqual((await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo))).status, 400);
  // sem Termo e convite vencido
  const novo = await convite(api, mae);
  assert.strictEqual((await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(novo, { aceitou_termo: false }))).status, 400);
  api.banco.prepare("UPDATE convites_responsavel SET expira_em = '2020-01-01T00:00:00' WHERE usado_em IS NULL").run();
  assert.strictEqual((await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(novo))).status, 400);
  api.fechar();
});

test('RF-08: quem já tem conta usa o convite logado, sem criar outra', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  api.banco.prepare("INSERT INTO usuarios (papel, nome, email, senha_hash) VALUES ('RESPONSAVEL', 'Rafael Dias', 'rafael@exemplo.test', ?)")
    .run(bcrypt.hashSync('123456', 4));
  const rafael = await login(api, 'rafael@exemplo.test');
  const codigo = await convite(api, mae);
  const r = await api.chamar('POST', '/api/responsaveis/aceitar-convite', { codigo, data_nascimento: NASC, parentesco: 'OUTRO', parentesco_outro: 'Tio' }, rafael);
  assert.strictEqual(r.status, 201);
  const lista = await api.chamar('GET', `/api/criancas/${theo(api)}/responsaveis`, null, mae);
  assert.strictEqual(lista.corpo.dados.responsaveis.length, 2);
  assert.strictEqual(lista.corpo.dados.vagas, 0);
  // o mesmo convite não vale duas vezes
  assert.strictEqual((await api.chamar('POST', '/api/responsaveis/aceitar-convite', { codigo, data_nascimento: NASC, parentesco: 'PAI' }, rafael)).status, 400);
  api.fechar();
});

test('F-32 / RN-29: um responsável aprova, o outro é avisado e o painel mostra quem agiu', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  const codigo = await convite(api, mae);
  const pai = (await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo))).corpo.dados.token;

  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, {}, pai)).status, 200); // mesmo poder
  const avisosDaMae = (await api.chamar('GET', '/api/notificacoes', null, mae)).corpo.dados.avisos;
  assert.ok(avisosDaMae.some((a) => a.texto.includes('Thiago Alves aprovou o acesso')));

  const painel = (await api.chamar('GET', `/api/criancas/${theo(api)}/acessos`, null, mae)).corpo.dados.acessos;
  assert.ok(painel.some((a) => a.quem === 'Thiago Alves' && a.acao.includes('aprovou o acesso')));
  api.fechar();
});

test('F-33 / RF-09: sair tira o acesso de quem saiu e o outro mantém; ninguém remove o outro', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  const codigo = await convite(api, mae);
  const pai = (await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', entrada(codigo))).corpo.dados.token;

  // não existe rota para remover o outro
  for (const metodo of ['DELETE', 'PUT', 'POST']) {
    const r = await api.chamar(metodo, `/api/criancas/${theo(api)}/responsaveis/1`, {}, mae);
    assert.strictEqual(r.status, 404);
  }
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/sair`, {}, pai)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, pai)).status, 404);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, mae)).status, 200);
  assert.ok((await api.chamar('GET', '/api/notificacoes', null, mae)).corpo.dados.avisos.some((a) => a.texto.includes('saiu como responsável')));
  // a mãe agora é a única: não pode sair, e a vaga reabre
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/sair`, {}, mae)).status, 409);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/convites-responsavel`, {}, mae)).status, 201);
  api.fechar();
});

test('Quem não é da família não gera convite, não vê convite aberto e não sai por ninguém', async () => {
  const api = iniciar();
  const mae = await login(api, 'responsavel@laco.test');
  await convite(api, mae);
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  for (const token of [carlos, adm]) {
    for (const [metodo, rota] of [['POST', 'convites-responsavel'], ['POST', 'sair'], ['PUT', 'meu-parentesco']]) {
      const r = await api.chamar(metodo, `/api/criancas/${theo(api)}/${rota}`, {}, token);
      assert.ok([403, 404].includes(r.status), `${rota}: ${r.status}`);
    }
  }
  // o profissional aprovado vê os responsáveis (nome e parentesco), mas nada de e-mail nem do convite
  const lista = await api.chamar('GET', `/api/criancas/${theo(api)}/responsaveis`, null, carlos);
  assert.strictEqual(lista.status, 200);
  assert.ok(!JSON.stringify(lista.corpo).includes('@'));
  assert.strictEqual(lista.corpo.dados.convite_aberto, null);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/responsaveis`, null, adm)).status, 404);
  api.fechar();
});

test('RF-31 / F-31: o mesmo login funciona em dois aparelhos e o parentesco pode ser corrigido', async () => {
  const api = iniciar();
  const a = await login(api, 'responsavel@laco.test');
  const b = await login(api, 'responsavel@laco.test');
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, a)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, b)).status, 200);
  const r = await api.chamar('PUT', `/api/criancas/${theo(api)}/meu-parentesco`, { parentesco: 'OUTRO', parentesco_outro: 'Avó' }, a);
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await api.chamar('PUT', `/api/criancas/${theo(api)}/meu-parentesco`, { parentesco: 'OUTRO' }, a)).status, 400);
  api.fechar();
});
