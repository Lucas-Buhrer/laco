// T-43 / T-44: estados da agenda e ações da consulta (F-49 a F-49d)
const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');
const { formatar } = require('../src/utils/datas');

async function clinica(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
async function mae(api) {
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  return r.corpo.dados.token;
}
const idDe = (api, email) => api.banco.prepare('SELECT id FROM usuarios WHERE email = ?').get(email).id;
const theo = (api) => api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;

// Consulta que já começou (uma hora atrás) e ainda está "agendada"
function consultaQueJaPassou(api) {
  const d = new Date();
  d.setHours(d.getHours() - 1);
  const aurora = api.banco.prepare("SELECT id FROM clinicas WHERE codigo_acesso = 'AURORA'").get().id;
  return api.banco
    .prepare("INSERT INTO consultas (crianca_id, profissional_id, clinica_id, criada_por, inicio, tipo) VALUES (?, ?, ?, ?, ?, 'Sessão de T.O.')")
    .run(theo(api), idDe(api, 'carlos@laco.test'), aurora, idDe(api, 'carlos@laco.test'), formatar(d)).lastInsertRowid;
}

test('F-49: a agenda traz azul, amarela, vermelha e verde conforme os dias que faltam', async () => {
  const api = iniciar();
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const agenda = (await api.chamar('GET', '/api/clinica/agenda', null, adm)).corpo.dados;
  const cores = new Set(agenda.filter((c) => c.status === 'AGENDADA').map((c) => c.cor));
  for (const cor of ['AZUL', 'AMARELA', 'VERMELHA', 'VERDE']) assert.ok(cores.has(cor), `falta a cor ${cor}`);
  const azul = agenda.find((c) => c.cor === 'AZUL');
  assert.ok(azul.dias_restantes >= 4);
  assert.ok(agenda.find((c) => c.cor === 'VERMELHA').dias_restantes <= 1);
  api.fechar();
});

test('F-49c: consultas passadas mostram a situação final em todas as agendas', async () => {
  const api = iniciar();
  const todas = [
    (await api.chamar('GET', '/api/clinica/agenda', null, await clinica(api, 'AURORA', 'admin@laco.test'))).corpo.dados,
    (await api.chamar('GET', '/api/clinica/agenda', null, await clinica(api, 'AURORA', 'recepcao'))).corpo.dados,
    (await api.chamar('GET', '/api/consultas', null, await clinica(api, 'AURORA', 'carlos@laco.test'))).corpo.dados,
    (await api.chamar('GET', '/api/consultas', null, await mae(api))).corpo.dados,
  ];
  for (const agenda of todas) {
    const estados = new Set(agenda.map((c) => c.status));
    for (const s of ['REALIZADA', 'REMARCADA', 'CANCELADA', 'FALTA']) assert.ok(estados.has(s), `falta o estado ${s}`);
    // a remarcada aponta para a nova data
    assert.ok(agenda.find((c) => c.status === 'REMARCADA').remarcada_para);
    // consulta que não está agendada não tem cor
    assert.ok(agenda.filter((c) => c.status !== 'AGENDADA').every((c) => c.cor === null));
  }
  api.fechar();
});

test('RF-42: só o profissional marca realizada/falta, e só depois do horário', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const bia = await clinica(api, 'AURORA', 'recepcao');
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const passou = consultaQueJaPassou(api);
  // Consulta futura do próprio Carlos (outra pessoa daria 404, não 409)
  const futura = api.banco.prepare("SELECT id FROM consultas WHERE status = 'AGENDADA' AND profissional_id = (SELECT id FROM usuarios WHERE email = 'carlos@laco.test') ORDER BY inicio DESC").get().id;

  assert.strictEqual((await api.chamar('POST', `/api/consultas/${futura}/realizada`, {}, carlos)).status, 409); // ainda não chegou a hora
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${passou}/realizada`, {}, bia)).status, 403);
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${passou}/falta`, {}, adm)).status, 403);
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${passou}/realizada`, {}, carlos)).status, 200);
  // situação final: não muda de novo
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${passou}/falta`, {}, carlos)).status, 409);
  assert.strictEqual(api.banco.prepare('SELECT status FROM consultas WHERE id = ?').get(passou).status, 'REALIZADA');
  api.fechar();
});

test('RF-42: falta também fica registrada, e consulta passada sem situação continua pendente (nada é automático)', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const passou = consultaQueJaPassou(api);
  // ler a agenda várias vezes não muda a situação sozinha
  await api.chamar('GET', '/api/consultas', null, carlos);
  assert.strictEqual(api.banco.prepare('SELECT status FROM consultas WHERE id = ?').get(passou).status, 'AGENDADA');
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${passou}/falta`, {}, carlos)).status, 200);
  assert.strictEqual(api.banco.prepare('SELECT status FROM consultas WHERE id = ?').get(passou).status, 'FALTA');
  api.fechar();
});

test('F-49b: consulta de amanhã sem confirmação continua agendada e vermelha, nunca é cancelada sozinha', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const antes = (await api.chamar('GET', '/api/consultas', null, familia)).corpo.dados.find((c) => c.cor === 'VERMELHA');
  await api.chamar('GET', '/api/painel/responsavel', null, familia);
  await api.chamar('GET', '/api/notificacoes', null, familia);
  const depois = (await api.chamar('GET', '/api/consultas', null, familia)).corpo.dados.find((c) => c.id === antes.id);
  assert.strictEqual(depois.status, 'AGENDADA');
  assert.strictEqual(depois.cor, 'VERMELHA');
  // ainda dá para confirmar no app (prazo = fim de hoje)
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${antes.id}/confirmar`, {}, familia)).status, 200);
  api.fechar();
});

test('RF-41: cancelar e remarcar avisam a família; ADM não mexe nas consultas', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const alvo = api.banco.prepare("SELECT id, inicio FROM consultas WHERE status = 'AGENDADA' AND profissional_id = ? ORDER BY inicio").get(idDe(api, 'carlos@laco.test'));
  const marianaId = idDe(api, 'responsavel@laco.test');

  assert.strictEqual((await api.chamar('POST', `/api/consultas/${alvo.id}/cancelar`, {}, adm)).status, 403);
  assert.strictEqual((await api.chamar('PUT', `/api/consultas/${alvo.id}/remarcar`, { inicio: '2099-01-01T10:00' }, adm)).status, 403);

  const r = await api.chamar('POST', `/api/consultas/${alvo.id}/cancelar`, { motivo: 'Profissional indisponível', recado: 'Ligaremos.' }, carlos);
  assert.strictEqual(r.status, 200);
  const aviso = api.banco.prepare("SELECT texto FROM notificacoes WHERE usuario_id = ? AND texto LIKE '%foi cancelada%'").get(marianaId);
  assert.ok(aviso.texto.includes('Profissional indisponível') && aviso.texto.includes('Ligaremos.'));
  // consulta cancelada não confirma nem remarca
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${alvo.id}/confirmar-contato`, {}, carlos)).status, 409);
  assert.strictEqual((await api.chamar('PUT', `/api/consultas/${alvo.id}/remarcar`, { inicio: '2099-01-01T10:00' }, carlos)).status, 409);
  api.fechar();
});
