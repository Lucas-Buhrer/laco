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
const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return formatar(d).slice(0, 10); };
const periodo = `inicio=${dia(-90)}&fim=${dia(0)}`;

test('F-38 / RF-55: o relatório traz consultas, faltas, adesão, humor e objetivos', async () => {
  const api = iniciar();
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${periodo}`, null, await mae(api));
  assert.strictEqual(r.status, 200);
  const d = r.corpo.dados;
  assert.strictEqual(d.crianca, 'Theo');
  assert.ok(d.consultas_realizadas >= 5);
  assert.ok(d.faltas >= 1);
  assert.ok(d.adesao_percentual > 0 && d.adesao_percentual <= 100);
  assert.ok(d.adesao_por_mes.length >= 3);
  assert.ok(d.humor_medio >= 1 && d.humor_medio <= 5);
  assert.ok(d.humor_por_semana.length >= 4);
  assert.ok(d.objetivos.includes('Pedir objeto com figura'));
  api.fechar();
});

test('F-40 / RN-34: observação privada e qualquer observação ficam fora do relatório', async () => {
  const api = iniciar();
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${periodo}`, null, await mae(api));
  const texto = JSON.stringify(r.corpo);
  assert.ok(!texto.includes('Anotação minha'));
  assert.ok(!texto.includes('lanche')); // nem a observação visível: o relatório só usa números e objetivos
  assert.ok(!texto.includes('observacao'));
  api.fechar();
});

test('F-38: o período filtra os dados (um período vazio dá zeros)', async () => {
  const api = iniciar();
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?inicio=2020-01-01&fim=2020-01-31`, null, await mae(api));
  assert.strictEqual(r.corpo.dados.consultas_realizadas, 0);
  assert.strictEqual(r.corpo.dados.humor_medio, null);
  assert.deepStrictEqual(r.corpo.dados.objetivos, []);
  // período inválido ou grande demais
  for (const q of ['inicio=2026-13-01&fim=2026-01-01', `inicio=${dia(0)}&fim=${dia(-5)}`, 'inicio=2020-01-01&fim=2023-01-01', '']) {
    assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${q}`, null, await mae(api))).status, 400);
  }
  api.fechar();
});

test('F-39 / RN-34: o parecer só aparece no relatório depois de publicado, e não se edita', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);
  api.banco.prepare('DELETE FROM pareceres').run(); // parte sem o parecer do seed
  const antes = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${periodo}`, null, familia);
  assert.strictEqual(antes.corpo.dados.pareceres.length, 0);

  const pub = await api.chamar('POST', `/api/criancas/${theo(api)}/pareceres`,
    { periodo_inicio: dia(-60), periodo_fim: dia(-1), texto: 'Avanço na comunicação.' }, carlos);
  assert.strictEqual(pub.status, 201);
  const depois = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${periodo}`, null, familia);
  assert.strictEqual(depois.corpo.dados.pareceres.length, 1);
  assert.strictEqual(depois.corpo.dados.pareceres[0].texto, 'Avanço na comunicação.');
  assert.ok(api.banco.prepare("SELECT 1 FROM notificacoes WHERE texto LIKE '%publicou um parecer%'").get());

  // não há como editar nem apagar
  for (const metodo of ['PUT', 'PATCH', 'DELETE']) {
    assert.strictEqual((await api.chamar(metodo, `/api/criancas/${theo(api)}/pareceres/${pub.corpo.dados.id}`, { texto: 'x' }, carlos)).status, 404);
  }
  // período fora do relatório não aparece
  const outro = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?inicio=2020-01-01&fim=2020-02-01`, null, familia);
  assert.strictEqual(outro.corpo.dados.pareceres.length, 0);
  api.fechar();
});

test('RF-56: só profissional com vínculo aprovado publica; texto obrigatório; respeita o corte do escopo', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const ana = await clinica(api, 'AURORA', 'profissional@laco.test'); // vínculo pendente
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const familia = await mae(api);
  const corpo = { periodo_inicio: dia(-30), periodo_fim: dia(-1), texto: 'Texto.' };

  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/pareceres`, corpo, ana)).status, 404);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/pareceres`, corpo, adm)).status, 403);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/pareceres`, corpo, familia)).status, 403);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo(api)}/pareceres`, { ...corpo, texto: '' }, carlos)).status, 400);

  // sem "histórico anterior", o período não pode começar antes da aprovação
  const vinculo = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  await api.chamar('POST', `/api/vinculos/${vinculo.id}/aprovar`, { ver_historico_anterior: false }, familia);
  const antigo = await api.chamar('POST', `/api/criancas/${theo(api)}/pareceres`, { ...corpo, periodo_inicio: dia(-30) }, ana);
  assert.strictEqual(antigo.status, 400);
  api.fechar();
});

test('Relatório é só da família: profissional, ADM, recepção e outra família não abrem', async () => {
  const api = iniciar();
  for (const token of [await clinica(api, 'AURORA', 'carlos@laco.test'), await clinica(api, 'AURORA', 'admin@laco.test'), await clinica(api, 'AURORA', 'recepcao')]) {
    const r = await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${periodo}`, null, token);
    assert.ok([403, 404].includes(r.status));
  }
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/relatorio?${periodo}`)).status, 401);
  // o profissional lê só os próprios pareceres; a família lê todos
  const lista = await api.chamar('GET', `/api/criancas/${theo(api)}/pareceres`, null, await mae(api));
  assert.strictEqual(lista.corpo.dados.length, 1);
  api.fechar();
});
