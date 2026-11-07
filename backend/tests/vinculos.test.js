const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');
const { inicioDoEscopo } = require('../src/middlewares/acessoCrianca');

async function equipe(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
async function mariana(api) {
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  return r.corpo.dados.token;
}
const theo = (api) => api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
const vinculoDe = (api, email) =>
  api.banco.prepare('SELECT v.* FROM vinculos v JOIN usuarios u ON u.id = v.profissional_id WHERE u.email = ? ORDER BY v.id DESC').get(email);

test('F-09 / S-02: vínculo pendente não vê nada; depois de aprovado, vê e gera log', async () => {
  const api = iniciar();
  const ana = await equipe(api, 'AURORA', 'profissional@laco.test');
  const mae = await mariana(api);

  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, ana)).status, 404);
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, ana)).corpo.dados.length, 0);

  const v = vinculoDe(api, 'profissional@laco.test');
  const r = await api.chamar('POST', `/api/vinculos/${v.id}/aprovar`, { ver_historico_anterior: false }, mae);
  assert.strictEqual(r.status, 200);

  const perfil = await api.chamar('GET', `/api/criancas/${theo(api)}`, null, ana);
  assert.strictEqual(perfil.status, 200);
  assert.strictEqual(perfil.corpo.dados.nome, 'Theo');
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, ana)).corpo.dados.length, 1);

  // S-14: o acesso da Ana ficou registrado
  const anaId = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'profissional@laco.test'").get().id;
  const log = api.banco.prepare("SELECT * FROM log_acesso WHERE usuario_id = ? AND acao = 'VER_PERFIL'").get(anaId);
  assert.ok(log);
  // a Ana foi avisada
  assert.ok(api.banco.prepare('SELECT 1 FROM notificacoes WHERE usuario_id = ?').get(anaId));
  // aprovar de novo não é permitido
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${v.id}/aprovar`, {}, mae)).status, 409);
  api.fechar();
});

test('S-01: profissional sem vínculo recebe 404 igual ao de criança inexistente', async () => {
  const api = iniciar();
  const paulo = await equipe(api, 'AURORA', 'paulo@laco.test');
  const semVinculo = await api.chamar('GET', `/api/criancas/${theo(api)}`, null, paulo);
  const inexistente = await api.chamar('GET', '/api/criancas/00000000-0000-0000-0000-000000000000', null, paulo);
  assert.strictEqual(semVinculo.status, 404);
  assert.deepStrictEqual(semVinculo.corpo, inexistente.corpo);
  api.fechar();
});

test('S-03: vínculo recusado continua sem acesso', async () => {
  const api = iniciar();
  const ana = await equipe(api, 'AURORA', 'profissional@laco.test');
  const mae = await mariana(api);
  const v = vinculoDe(api, 'profissional@laco.test');
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${v.id}/recusar`, null, mae)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, ana)).status, 404);
  api.fechar();
});

test('S-04: aprovado → revogado → 404 na hora, com o mesmo token', async () => {
  const api = iniciar();
  const carlos = await equipe(api, 'AURORA', 'carlos@laco.test');
  const mae = await mariana(api);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, carlos)).status, 200);
  const v = vinculoDe(api, 'carlos@laco.test');
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${v.id}/revogar`, null, mae)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, carlos)).status, 404);
  // registros já feitos continuam (RN-03)
  assert.ok(api.banco.prepare('SELECT COUNT(*) AS n FROM registros_sessao WHERE profissional_id = ?').get(v.profissional_id).n > 0);
  api.fechar();
});

test('S-05: profissional aprovado para o Theo não acessa outra criança', async () => {
  const api = iniciar();
  const carlos = await equipe(api, 'AURORA', 'carlos@laco.test');
  const davi = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Davi'").get().id;
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${davi}`, null, carlos)).status, 404);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${davi}/convites`, null, carlos)).status, 404);
  api.fechar();
});

test('S-06 / S-41: responsável de outra família não vê o Theo nem decide sobre os vínculos dele', async () => {
  const api = iniciar();
  const ativ = await api.chamar('POST', '/api/auth/ativar-conta', {
    codigo: api.info.codigoDavi, data_nascimento: '2020-08-02', nome: 'Fernanda', email: 'fernanda@exemplo.test',
    senha: 'senha-forte-1', parentesco: 'MAE', aceitou_termo: true,
  });
  const fernanda = ativ.corpo.dados.token;
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, fernanda)).status, 404);
  const v = vinculoDe(api, 'profissional@laco.test');
  const ana = api.banco.prepare("SELECT * FROM vinculos WHERE crianca_id = ? AND status = 'PENDENTE'").get(theo(api));
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${ana.id}/aprovar`, {}, fernanda)).status, 404);
  // e a lista de vínculos dela não mostra os do Theo
  const lista = await api.chamar('GET', '/api/vinculos', null, fernanda);
  assert.ok(lista.corpo.dados.every((x) => x.crianca_id !== theo(api)));
  assert.ok(v);
  api.fechar();
});

test('S-09 / S-25 / S-33: profissional, admin e recepção não aprovam, recusam nem revogam (403)', async () => {
  const api = iniciar();
  const v = vinculoDe(api, 'profissional@laco.test');
  for (const [cod, quem] of [['AURORA', 'profissional@laco.test'], ['AURORA', 'admin@laco.test'], ['AURORA', 'recepcao']]) {
    const token = await equipe(api, cod, quem);
    for (const acao of ['aprovar', 'recusar', 'revogar']) {
      assert.strictEqual((await api.chamar('POST', `/api/vinculos/${v.id}/${acao}`, {}, token)).status, 403, `${quem} ${acao}`);
    }
    assert.strictEqual((await api.chamar('PUT', `/api/vinculos/${v.id}/escopo`, {}, token)).status, 403);
  }
  assert.strictEqual(vinculoDe(api, 'profissional@laco.test').status, 'PENDENTE');
  api.fechar();
});

test('S-24 / S-32: admin e recepção não abrem o perfil da criança (404)', async () => {
  const api = iniciar();
  for (const quem of ['admin@laco.test', 'recepcao']) {
    const token = await equipe(api, 'AURORA', quem);
    assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, token)).status, 404);
    assert.strictEqual((await api.chamar('GET', '/api/criancas', null, token)).status, 403);
  }
  api.fechar();
});

test('S-22: profissional novo na clínica, sem aprovação, não vê a criança já ativa', async () => {
  const api = iniciar();
  api.banco.prepare(
    `INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash)
     SELECT clinica_id, 'PROFISSIONAL', 'Novo', 'novo@laco.test', senha_hash FROM usuarios WHERE email = 'carlos@laco.test'`
  ).run();
  const novo = await equipe(api, 'AURORA', 'novo@laco.test');
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, novo)).status, 404);
  api.fechar();
});

test('F-18: convite da família → profissional de outra clínica pede acesso e não vê nada até aprovar', async () => {
  const api = iniciar();
  const mae = await mariana(api);
  const convite = await api.chamar('POST', `/api/criancas/${theo(api)}/convites`, null, mae);
  assert.strictEqual(convite.status, 201);

  const marina = await equipe(api, 'HORIZONTE', 'marina@horizonte.test');
  const pedido = await api.chamar('POST', '/api/vinculos/solicitar', { codigo: convite.corpo.dados.codigo }, marina);
  assert.strictEqual(pedido.status, 201);
  assert.deepStrictEqual(Object.keys(pedido.corpo.dados).sort(), ['id', 'status']); // nada da criança

  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, marina)).status, 404);
  const meus = await api.chamar('GET', '/api/vinculos', null, marina);
  assert.strictEqual(meus.corpo.dados[0].crianca_nome, null);
  assert.strictEqual(meus.corpo.dados[0].crianca_id, null);

  // convite é de uso único
  const paulo = await equipe(api, 'AURORA', 'paulo@laco.test');
  assert.strictEqual((await api.chamar('POST', '/api/vinculos/solicitar', { codigo: convite.corpo.dados.codigo }, paulo)).status, 400);

  // a família vê o pedido com nome, clínica e especialidade (RF-32) e aprova
  const pedidos = await api.chamar('GET', '/api/vinculos', null, mae);
  const p = pedidos.corpo.dados.find((x) => x.id === pedido.corpo.dados.id);
  assert.strictEqual(p.clinica_nome, 'Clínica Horizonte');
  assert.ok(p.especialidade);
  await api.chamar('POST', `/api/vinculos/${p.id}/aprovar`, {}, mae);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, marina)).status, 200);
  api.fechar();
});

test('RF-40a: recepção usa o código da família escolhendo o profissional; vínculo pendente', async () => {
  const api = iniciar();
  const mae = await mariana(api);
  const convite = await api.chamar('POST', `/api/criancas/${theo(api)}/convites`, null, mae);
  const rec = await equipe(api, 'AURORA', 'recepcao');
  const paulo = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'paulo@laco.test'").get().id;
  const marina = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'marina@horizonte.test'").get().id;
  // profissional de outra clínica: recusado
  assert.strictEqual((await api.chamar('POST', '/api/vinculos/solicitar', { codigo: convite.corpo.dados.codigo, profissional_id: marina }, rec)).status, 400);
  const r = await api.chamar('POST', '/api/vinculos/solicitar', { codigo: convite.corpo.dados.codigo, profissional_id: paulo }, rec);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(vinculoDe(api, 'paulo@laco.test').status, 'PENDENTE');
  api.fechar();
});

test('RF-31: clínica pede outro profissional da casa; pedido repetido dá 409; outra clínica dá 404', async () => {
  const api = iniciar();
  const rec = await equipe(api, 'AURORA', 'recepcao');
  const paulo = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'paulo@laco.test'").get().id;
  const rota = `/api/clinica/pre-cadastros/${theo(api)}/solicitar-vinculo`;
  const r = await api.chamar('POST', rota, { profissional_id: paulo }, rec);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(vinculoDe(api, 'paulo@laco.test').origem, 'MESMA_CLINICA');
  assert.strictEqual((await api.chamar('POST', rota, { profissional_id: paulo }, rec)).status, 409);
  const hor = await equipe(api, 'HORIZONTE', 'admin@horizonte.test');
  assert.strictEqual((await api.chamar('POST', rota, { profissional_id: paulo }, hor)).status, 404);
  api.fechar();
});

test('escopo: responsável muda na hora; só vínculo aprovado', async () => {
  const api = iniciar();
  const mae = await mariana(api);
  const carlos = vinculoDe(api, 'carlos@laco.test');
  const r = await api.chamar('PUT', `/api/vinculos/${carlos.id}/escopo`, { ver_horarios_outras_clinicas: false }, mae);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(vinculoDe(api, 'carlos@laco.test').ver_horarios_outras_clinicas, 0);
  const ana = vinculoDe(api, 'profissional@laco.test');
  assert.strictEqual((await api.chamar('PUT', `/api/vinculos/${ana.id}/escopo`, {}, mae)).status, 409);
  api.fechar();
});

test('S-10 (base): sem histórico anterior, o corte é a data de aprovação', () => {
  const vinculo = { ver_historico_anterior: 0, aprovado_em: '2026-11-01T10:00:00' };
  assert.strictEqual(inicioDoEscopo({ acessoComo: 'PROFISSIONAL', vinculo }), '2026-11-01T10:00:00');
  assert.strictEqual(inicioDoEscopo({ acessoComo: 'PROFISSIONAL', vinculo: { ...vinculo, ver_historico_anterior: 1 } }), null);
  assert.strictEqual(inicioDoEscopo({ acessoComo: 'RESPONSAVEL' }), null);
});

test('RF-21: responsável edita os dados da criança; profissional não', async () => {
  const api = iniciar();
  const mae = await mariana(api);
  const carlos = await equipe(api, 'AURORA', 'carlos@laco.test');
  const r = await api.chamar('PUT', `/api/criancas/${theo(api)}`, { comunicacao: 'Usa figuras e algumas palavras' }, mae);
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await api.chamar('PUT', `/api/criancas/${theo(api)}`, { comunicacao: 'x' }, carlos)).status, 403);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/convites`, null, carlos)).status, 403);
  api.fechar();
});
