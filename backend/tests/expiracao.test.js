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
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return formatar(d); };

test('RF-36: pedido pendente há mais de 7 dias expira, não pode ser aprovado e o profissional é avisado', async () => {
  const api = iniciar();
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test');
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  api.banco.prepare('UPDATE vinculos SET solicitado_em = ? WHERE id = ?').run(diasAtras(8), vinculo.id);

  const r = await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, {}, await mae(api));
  assert.strictEqual(r.status, 409);
  assert.match(r.corpo.erro, /expirou/);
  assert.strictEqual(api.banco.prepare('SELECT status FROM vinculos WHERE id = ?').get(vinculo.id).status, 'EXPIRADO');
  // sem acesso, e a Ana recebeu o aviso
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}`, null, ana)).status, 404);
  const avisos = (await api.chamar('GET', '/api/notificacoes', null, ana)).corpo.dados.avisos;
  assert.ok(avisos.some((a) => a.texto.includes('expirou')));
  api.fechar();
});

test('RF-36: pedido com menos de 7 dias continua pendente', async () => {
  const api = iniciar();
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  api.banco.prepare('UPDATE vinculos SET solicitado_em = ? WHERE id = ?').run(diasAtras(6), vinculo.id);
  const lista = await api.chamar('GET', '/api/vinculos', null, await mae(api));
  assert.ok(lista.corpo.dados.some((v) => v.id === vinculo.id && v.status === 'PENDENTE'));
  api.fechar();
});

test('RF-46: lembrete de confirmação aparece uma vez só por consulta', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const lembretes = async () =>
    (await api.chamar('GET', '/api/notificacoes', null, familia)).corpo.dados.avisos.filter((a) => a.texto.startsWith('Confirme a presença'));
  const primeiro = await lembretes();
  assert.ok(primeiro.length >= 2); // as consultas amarela e vermelha do seed
  assert.strictEqual((await lembretes()).length, primeiro.length);
  api.fechar();
});
