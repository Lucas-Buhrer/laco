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
const idDe = (api, email) => api.banco.prepare('SELECT id FROM usuarios WHERE email = ?').get(email).id;

const PRIVADA = 'Anotação minha: avaliar encaminhamento.';

test('RN-05 / RF-54: a família lê todos os registros, mas nunca a observação "Só para mim"', async () => {
  const api = iniciar();
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, await mae(api));
  assert.strictEqual(r.status, 200);
  assert.ok(r.corpo.dados.length >= 10);
  assert.ok(!JSON.stringify(r.corpo).includes(PRIVADA));
  // as observações marcadas como visíveis aparecem
  assert.ok(r.corpo.dados.some((x) => x.observacao && x.observacao.includes('lanche')));
  // linha do tempo e exportação também não vazam
  const lt = await api.chamar('GET', `/api/criancas/${theo(api)}/linha-do-tempo`, null, await mae(api));
  assert.ok(!JSON.stringify(lt.corpo).includes(PRIVADA));
  api.fechar();
});

test('RN-05: só o autor lê a própria observação privada; outro profissional aprovado não', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const doCarlos = await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, carlos);
  assert.ok(JSON.stringify(doCarlos.corpo).includes(PRIVADA));

  // a família aprova a Ana COM histórico: ela vê os registros do Carlos, mas sem as observações privadas
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE profissional_id = ? AND status = 'PENDENTE'").get(idDe(api, 'profissional@laco.test'));
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, { ver_historico_anterior: true }, await mae(api));
  const daAna = await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, ana);
  assert.ok(daAna.corpo.dados.length >= 10);
  assert.ok(!JSON.stringify(daAna.corpo).includes(PRIVADA));
  api.fechar();
});

test('RN-04: sem "histórico anterior", a Ana aprovada hoje não vê registros antigos', async () => {
  const api = iniciar();
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE profissional_id = ? AND status = 'PENDENTE'").get(idDe(api, 'profissional@laco.test'));
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, { ver_historico_anterior: false }, await mae(api));
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, ana);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.corpo.dados.length, 0);
  const lt = await api.chamar('GET', `/api/criancas/${theo(api)}/linha-do-tempo`, null, ana);
  assert.strictEqual(lt.corpo.dados.length, 0);
  api.fechar();
});

test('RF-50 / RF-51: registrar sessão — observação é "Só para mim" por padrão e a família é avisada', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);

  const privado = await api.chamar('POST', `/api/criancas/${theo(api)}/registros`,
    { resumo: 'Sessão boa.', objetivos: 'Comunicação', humor: 4, observacao: 'segredo-do-carlos' }, carlos);
  assert.strictEqual(privado.status, 201);
  const aberto = await api.chamar('POST', `/api/criancas/${theo(api)}/registros`,
    { resumo: 'Outra sessão.', humor: 3, observacao: 'pode-mostrar', observacao_visivel_familia: true }, carlos);
  assert.strictEqual(aberto.status, 201);

  const vistoPelaFamilia = JSON.stringify((await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, familia)).corpo);
  assert.ok(!vistoPelaFamilia.includes('segredo-do-carlos'));
  assert.ok(vistoPelaFamilia.includes('pode-mostrar'));
  assert.ok(vistoPelaFamilia.includes('Sessão boa.')); // o resumo nunca fica escondido

  assert.ok(api.banco.prepare("SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto LIKE '%registrou uma sessão%'").get(idDe(api, 'responsavel@laco.test')));
  // validações
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/registros`, { resumo: '' }, carlos)).status, 400);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/registros`, { resumo: 'x', humor: 9 }, carlos)).status, 400);
  // a família não registra sessão
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/registros`, { resumo: 'x' }, familia)).status, 403);
  api.fechar();
});

test('RN-06 / RF-53: registro não se edita nem se apaga; correção é adendo do próprio autor', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const familia = await mae(api);
  const reg = api.banco.prepare('SELECT id FROM registros_sessao ORDER BY id DESC').get().id;

  for (const metodo of ['PUT', 'PATCH', 'DELETE']) {
    assert.strictEqual((await api.chamar(metodo, `/api/registros/${reg}`, { resumo: 'x' }, carlos)).status, 404);
  }
  assert.strictEqual((await api.chamar('POST', `/api/registros/${reg}/adendos`, { texto: 'Correção: eram 3 de 5.' }, carlos)).status, 201);
  // quem não tem vínculo aprovado (Ana) e a família não acrescentam adendo
  assert.strictEqual((await api.chamar('POST', `/api/registros/${reg}/adendos`, { texto: 'x' }, ana)).status, 404);
  assert.strictEqual((await api.chamar('POST', `/api/registros/${reg}/adendos`, { texto: 'x' }, familia)).status, 403);

  const lista = await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, familia);
  const comAdendo = lista.corpo.dados.find((r) => r.id === reg);
  assert.strictEqual(comAdendo.adendos.length, 1);
  api.fechar();
});

test('S-19 / S-24: ADM e Recepção recebem 404 em registros e linha do tempo', async () => {
  const api = iniciar();
  for (const [codigo, ident] of [['AURORA', 'admin@laco.test'], ['AURORA', 'recepcao']]) {
    const token = await clinica(api, codigo, ident);
    assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, token)).status, 404);
    assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/linha-do-tempo`, null, token)).status, 404);
    assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/registros`, { resumo: 'x' }, token)).status, 404);
  }
  api.fechar();
});

test('RF-52 / RN-25: a linha do tempo do profissional não traz consultas de outra clínica', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const lt = await api.chamar('GET', `/api/criancas/${theo(api)}/linha-do-tempo`, null, carlos);
  assert.strictEqual(lt.status, 200);
  const texto = JSON.stringify(lt.corpo);
  assert.ok(!texto.includes('Psicopedagogia') && !texto.includes('Horizonte') && !texto.includes('Marina'));
  assert.ok(lt.corpo.dados.some((i) => i.tipo === 'REGISTRO') && lt.corpo.dados.some((i) => i.tipo === 'CONSULTA'));
  // abrir a linha do tempo fica no log que a família vê
  assert.ok(api.banco.prepare("SELECT 1 FROM log_acesso WHERE usuario_id = ? AND acao = 'VER_LINHA_DO_TEMPO'").get(idDe(api, 'carlos@laco.test')));
  api.fechar();
});
