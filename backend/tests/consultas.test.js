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
const theo = (api) => api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
const idDe = (api, email) => api.banco.prepare('SELECT id FROM usuarios WHERE email = ?').get(email).id;

// Data daqui a N dias, na hora indicada, no formato do sistema
function emDias(dias, hora, minuto = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return formatar(d);
}

test('F-34: Carlos agenda para o Theo e a família recebe o aviso', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const r = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: emDias(20, 8), tipo: 'Sessão de T.O.' }, carlos);
  assert.strictEqual(r.status, 201);
  const marianaId = idDe(api, 'responsavel@laco.test');
  assert.ok(api.banco.prepare("SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto LIKE 'Nova consulta%'").get(marianaId));
  // mesmo horário de novo: o profissional já está ocupado
  assert.strictEqual((await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: emDias(20, 8) }, carlos)).status, 409);
  // horário no passado
  assert.strictEqual((await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: emDias(-1, 8) }, carlos)).status, 400);
  api.fechar();
});

test('RF-48 / S-31: conflito com outra clínica responde só { conflito: true } e fica no log', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const outra = api.banco.prepare("SELECT inicio FROM consultas WHERE tipo = 'Psicopedagogia'").get().inicio;

  const r = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: outra }, carlos);
  assert.strictEqual(r.status, 409);
  assert.deepStrictEqual(r.corpo, { conflito: true }); // nada de clínica, profissional, tipo ou horário

  const carlosId = idDe(api, 'carlos@laco.test');
  assert.ok(api.banco.prepare("SELECT 1 FROM log_acesso WHERE usuario_id = ? AND acao = 'VERIFICAR_CONFLITO_AGENDA'").get(carlosId));

  // confirmando, agenda mesmo assim (aviso, não bloqueio)
  const ok = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: outra, confirmar_conflito: true }, carlos);
  assert.strictEqual(ok.status, 201);
  api.fechar();
});

test('RF-49: com o escopo desligado pela família, não há aviso de conflito', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);
  const vinculo = api.banco.prepare('SELECT id FROM vinculos WHERE profissional_id = ? AND crianca_id = ?').get(idDe(api, 'carlos@laco.test'), theo(api));
  await api.chamar('PUT', `/api/vinculos/${vinculo.id}/escopo`, { ver_horarios_outras_clinicas: false }, familia);
  const outra = api.banco.prepare("SELECT inicio FROM consultas WHERE tipo = 'Psicopedagogia'").get().inicio;
  assert.strictEqual((await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: outra }, carlos)).status, 201);
  api.fechar();
});

test('S-26: sem vínculo aprovado dá 404, igual a criança inexistente (não revela conflito)', async () => {
  const api = iniciar();
  const paulo = await clinica(api, 'AURORA', 'paulo@laco.test');
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test'); // vínculo ainda pendente
  const outra = api.banco.prepare("SELECT inicio FROM consultas WHERE tipo = 'Psicopedagogia'").get().inicio;
  const inexistente = await api.chamar('POST', '/api/consultas', { crianca_id: '00000000-0000-0000-0000-000000000000', inicio: outra }, paulo);
  for (const token of [paulo, ana]) {
    const r = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: outra }, token);
    assert.strictEqual(r.status, 404);
    assert.deepStrictEqual(r.corpo, inexistente.corpo);
  }
  api.fechar();
});

test('F-34 / F-35: Recepção agenda com vínculo aprovado ou pendente, mas não sem vínculo', async () => {
  const api = iniciar();
  const bia = await clinica(api, 'AURORA', 'recepcao');
  const familia = await mae(api);
  const ana = idDe(api, 'profissional@laco.test');
  const paulo = idDe(api, 'paulo@laco.test');

  // sem vínculo com o Paulo: recusado
  assert.strictEqual((await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), profissional_id: paulo, inicio: emDias(15, 9) }, bia)).status, 404);
  // vínculo pendente com a Ana: agenda "aguardando aprovação", sem aviso de conflito
  const r = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), profissional_id: ana, inicio: emDias(15, 9) }, bia);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.corpo.dados.aguardando_aprovacao, true);

  // quando a família aprova, a consulta deixa de aguardar
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE profissional_id = ? AND status = 'PENDENTE'").get(ana);
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, {}, familia);
  assert.strictEqual(api.banco.prepare('SELECT aguardando_aprovacao AS a FROM consultas WHERE id = ?').get(r.corpo.dados.id).a, 0);
  api.fechar();
});

test('RN-24 / S-27 / S-28 / RN-25: cada um vê só as consultas que pode', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const marina = await clinica(api, 'HORIZONTE', 'marina@horizonte.test');
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const admHorizonte = await clinica(api, 'HORIZONTE', 'admin@horizonte.test');
  const familia = await mae(api);

  const doCarlos = api.banco.prepare('SELECT id FROM consultas WHERE profissional_id = ? ORDER BY id DESC').get(idDe(api, 'carlos@laco.test')).id;
  const daMarina = api.banco.prepare("SELECT id FROM consultas WHERE tipo = 'Psicopedagogia'").get().id;

  // o dono abre; colega da mesma clínica e profissional de outra clínica não (404)
  assert.strictEqual((await api.chamar('GET', `/api/consultas/${doCarlos}`, null, carlos)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/consultas/${doCarlos}`, null, ana)).status, 404);
  assert.strictEqual((await api.chamar('GET', `/api/consultas/${doCarlos}`, null, marina)).status, 404);
  assert.strictEqual((await api.chamar('GET', `/api/consultas/${doCarlos}`, null, admHorizonte)).status, 404);
  // ADM da própria clínica e a família abrem
  assert.strictEqual((await api.chamar('GET', `/api/consultas/${doCarlos}`, null, adm)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/consultas/${doCarlos}`, null, familia)).status, 200);

  // a agenda de cada clínica só tem as suas consultas
  const agendaAurora = (await api.chamar('GET', '/api/clinica/agenda', null, adm)).corpo.dados;
  assert.ok(agendaAurora.length > 0 && agendaAurora.every((c) => c.profissional_nome !== 'Marina Costa'));
  assert.ok(!agendaAurora.some((c) => c.id === daMarina));
  const agendaHorizonte = (await api.chamar('GET', '/api/clinica/agenda', null, admHorizonte)).corpo.dados;
  assert.deepStrictEqual(agendaHorizonte.map((c) => c.id), [daMarina]);
  const marinaVe = (await api.chamar('GET', '/api/consultas', null, marina)).corpo.dados;
  assert.ok(marinaVe.every((c) => c.id === daMarina));

  // dados clínicos não aparecem na agenda do ADM
  const texto = JSON.stringify(agendaAurora);
  for (const proibido of ['resumo', 'observacao', 'objetivos', 'humor', 'sensibilidades']) assert.ok(!texto.includes(proibido));
  // ADM não cria consulta
  assert.strictEqual((await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: emDias(9, 9) }, adm)).status, 403);
  api.fechar();
});

test('RN-35 / RF-44: família confirma até o fim do dia anterior; depois só a clínica por contato', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const bia = await clinica(api, 'AURORA', 'recepcao');

  const agenda = (await api.chamar('GET', '/api/consultas', null, familia)).corpo.dados;
  const azul = agenda.find((c) => c.cor === 'AZUL');
  const amarela = agenda.find((c) => c.cor === 'AMARELA');
  const vermelha = agenda.find((c) => c.cor === 'VERMELHA');
  const verde = agenda.find((c) => c.cor === 'VERDE');
  assert.ok(azul && amarela && vermelha && verde, 'o seed tem uma consulta de cada cor');

  assert.strictEqual((await api.chamar('POST', `/api/consultas/${azul.id}/confirmar`, {}, familia)).status, 200);
  // consulta de hoje: o prazo (fim de ontem) já passou
  const hoje = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: emDias(0, 23, 50), duracao_min: 10 }, carlos);
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${hoje.corpo.dados.id}/confirmar`, {}, familia)).status, 409);
  // a recepção registra a confirmação por telefone
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${hoje.corpo.dados.id}/confirmar-contato`, {}, bia)).status, 200);
  assert.strictEqual(api.banco.prepare('SELECT confirmada_por AS p FROM consultas WHERE id = ?').get(hoje.corpo.dados.id).p, 'CONTATO');
  // família não usa a rota de contato
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${amarela.id}/confirmar-contato`, {}, familia)).status, 403);
  api.fechar();
});

test('RN-5: "não poderei ir" avisa a clínica e NÃO cancela a consulta', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const c = (await api.chamar('GET', '/api/consultas', null, familia)).corpo.dados.find((x) => x.cor === 'AMARELA');
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${c.id}/nao-poderei`, {}, familia)).status, 200);
  assert.strictEqual(api.banco.prepare('SELECT status FROM consultas WHERE id = ?').get(c.id).status, 'AGENDADA');
  assert.ok(api.banco.prepare('SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto LIKE ?').get(idDe(api, 'carlos@laco.test'), '%não poderá ir%'));
  api.fechar();
});

test('RF-41 / RF-42: remarcar liga a consulta antiga à nova, cancelar avisa, só o profissional marca realizada', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const bia = await clinica(api, 'AURORA', 'recepcao');
  const criada = await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: emDias(25, 8) }, carlos);
  const id = criada.corpo.dados.id;

  const re = await api.chamar('PUT', `/api/consultas/${id}/remarcar`, { inicio: emDias(26, 8) }, bia);
  assert.strictEqual(re.status, 200);
  const antiga = api.banco.prepare('SELECT status, remarcada_para_id AS r FROM consultas WHERE id = ?').get(id);
  assert.strictEqual(antiga.status, 'REMARCADA');
  assert.strictEqual(antiga.r, re.corpo.dados.id);
  // consulta remarcada não remarca de novo
  assert.strictEqual((await api.chamar('PUT', `/api/consultas/${id}/remarcar`, { inicio: emDias(27, 8) }, bia)).status, 409);

  // recepção não marca realizada/falta; profissional só depois do horário
  const nova = re.corpo.dados.id;
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${nova}/realizada`, {}, bia)).status, 403);
  assert.strictEqual((await api.chamar('POST', `/api/consultas/${nova}/realizada`, {}, carlos)).status, 409);

  assert.strictEqual((await api.chamar('POST', `/api/consultas/${nova}/cancelar`, { motivo: 'Agenda' }, carlos)).status, 200);
  assert.strictEqual(api.banco.prepare('SELECT status FROM consultas WHERE id = ?').get(nova).status, 'CANCELADA');
  api.fechar();
});

test('família vê as consultas dos filhos e nenhuma outra; sem login dá 401', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const lista = (await api.chamar('GET', '/api/consultas', null, familia)).corpo.dados;
  assert.ok(lista.length > 0 && lista.every((c) => c.crianca_nome === 'Theo'));
  assert.strictEqual((await api.chamar('GET', '/api/consultas')).status, 401);
  api.fechar();
});
