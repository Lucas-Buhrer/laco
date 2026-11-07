const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');
const { hashCodigo } = require('../src/utils/codigos');

async function entrarClinica(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
async function entrarResp(api) {
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' });
  return r.corpo.dados.token;
}

const novoPre = (extra = {}) => ({
  nome: 'Lia', data_nascimento: '2022-05-10', responsavel_nome: 'Paula Dias', parentesco: 'MAE',
  email: 'paula@exemplo.test', profissionais: [], ...extra,
});

// Dados de ativação válidos para um código
const ativacao = (codigo, extra = {}) => ({
  codigo, data_nascimento: '2020-08-02', nome: 'Fernanda Rocha', email: 'fernanda@exemplo.test',
  senha: 'senha-forte-1', parentesco: 'MAE', aceitou_termo: true, ...extra,
});

test('F-06: recepção pré-cadastra, recebe o código, e a lista traz só dados cadastrais', async () => {
  const api = iniciar();
  const rec = await entrarClinica(api, 'AURORA', 'recepcao');
  const r = await api.chamar('POST', '/api/clinica/pre-cadastros', novoPre(), rec);
  assert.strictEqual(r.status, 201);
  assert.match(r.corpo.dados.codigo, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.strictEqual(r.corpo.dados.status, 'AGUARDANDO_ATIVACAO');

  // no banco só existe o hash do código
  const guardado = api.banco.prepare('SELECT codigo_hash FROM codigos_ativacao ORDER BY id DESC LIMIT 1').get();
  assert.strictEqual(guardado.codigo_hash, hashCodigo(r.corpo.dados.codigo));
  assert.ok(!guardado.codigo_hash.includes(r.corpo.dados.codigo));

  const lista = await api.chamar('GET', '/api/clinica/pre-cadastros', null, rec);
  assert.strictEqual(lista.status, 200);
  const theo = lista.corpo.dados.find((c) => c.nome === 'Theo');
  assert.ok(theo);
  // nada clínico na lista, e o código nunca volta
  for (const proibido of ['nivel_suporte', 'comunicacao', 'sensibilidades', 'observacoes', 'codigo', 'codigo_hash']) {
    assert.ok(!(proibido in theo), `a lista não pode trazer ${proibido}`);
  }
  api.fechar();
});

test('pré-cadastro: dados inválidos e profissional de outra clínica são recusados', async () => {
  const api = iniciar();
  const rec = await entrarClinica(api, 'AURORA', 'recepcao');
  assert.strictEqual((await api.chamar('POST', '/api/clinica/pre-cadastros', novoPre({ data_nascimento: '31/02/2022' }), rec)).status, 400);
  assert.strictEqual((await api.chamar('POST', '/api/clinica/pre-cadastros', novoPre({ parentesco: 'OUTRO' }), rec)).status, 400);
  const marina = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'marina@horizonte.test'").get().id;
  assert.strictEqual((await api.chamar('POST', '/api/clinica/pre-cadastros', novoPre({ profissionais: [marina] }), rec)).status, 400);
  api.fechar();
});

test('responsável não usa as rotas de pré-cadastro (403) e sem login dá 401', async () => {
  const api = iniciar();
  const resp = await entrarResp(api);
  assert.strictEqual((await api.chamar('GET', '/api/clinica/pre-cadastros', null, resp)).status, 403);
  assert.strictEqual((await api.chamar('GET', '/api/clinica/pre-cadastros')).status, 401);
  api.fechar();
});

test('S-20/S-34: outra clínica não vê nem mexe no pré-cadastro', async () => {
  const api = iniciar();
  const hor = await entrarClinica(api, 'HORIZONTE', 'admin@horizonte.test');
  const lista = await api.chamar('GET', '/api/clinica/pre-cadastros', null, hor);
  assert.strictEqual(lista.corpo.dados.length, 0);
  const davi = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Davi'").get().id;
  assert.strictEqual((await api.chamar('POST', `/api/clinica/pre-cadastros/${davi}/reemitir-codigo`, null, hor)).status, 404);
  assert.strictEqual((await api.chamar('POST', `/api/clinica/pre-cadastros/${davi}/cancelar-codigo`, null, hor)).status, 404);
  api.fechar();
});

test('F-07: ativar conta cria o responsável, ativa a criança e cria vínculo PENDENTE (sem acesso)', async () => {
  const api = iniciar();
  const r = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi));
  assert.strictEqual(r.status, 201);
  const davi = api.banco.prepare("SELECT * FROM criancas WHERE nome = 'Davi'").get();
  assert.strictEqual(davi.status_cadastro, 'ATIVA');

  const vinculos = api.banco.prepare('SELECT status, origem FROM vinculos WHERE crianca_id = ?').all(davi.id);
  assert.deepStrictEqual(vinculos, [{ status: 'PENDENTE', origem: 'CLINICA_ORIGEM' }]); // só o Paulo, indicado no pré-cadastro

  const me = await api.chamar('GET', '/api/auth/me', null, r.corpo.dados.token);
  assert.strictEqual(me.corpo.dados.papel, 'RESPONSAVEL');
  assert.ok(api.banco.prepare('SELECT 1 FROM consentimentos c JOIN usuarios u ON u.id = c.usuario_id WHERE u.email = ?').get('fernanda@exemplo.test'));
  assert.ok(api.banco.prepare('SELECT 1 FROM responsaveis_crianca WHERE crianca_id = ?').get(davi.id));
  // a Recepção passa a ver "aguardando aprovação"
  const rec = await entrarClinica(api, 'AURORA', 'recepcao');
  const lista = await api.chamar('GET', '/api/clinica/pre-cadastros', null, rec);
  assert.strictEqual(lista.corpo.dados.find((c) => c.nome === 'Davi').status, 'AGUARDANDO_APROVACAO');
  api.fechar();
});

test('F-02: sem aceitar o Termo é recusado e o código não é gasto', async () => {
  const api = iniciar();
  const sem = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi, { aceitou_termo: false }));
  assert.strictEqual(sem.status, 400);
  const curta = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi, { senha: '1234567' }));
  assert.strictEqual(curta.status, 400);
  assert.strictEqual((await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi))).status, 201);
  api.fechar();
});

test('F-08: código usado, vencido, cancelado, inexistente ou data errada dão a MESMA resposta', async () => {
  const api = iniciar();
  const rec = await entrarClinica(api, 'AURORA', 'recepcao');
  const tentar = (codigo, extra) => api.chamar('POST', '/api/auth/ativar-conta', ativacao(codigo, extra));

  const dataErrada = await tentar(api.info.codigoDavi, { data_nascimento: '2019-01-01' });
  const inexistente = await tentar('ZZZZ-ZZZZ');

  // vencido
  api.banco.prepare("UPDATE codigos_ativacao SET expira_em = '2000-01-01T00:00:00' WHERE codigo_hash = ?").run(hashCodigo(api.info.codigoDavi));
  const vencido = await tentar(api.info.codigoDavi);

  // cancelado
  const nova = await api.chamar('POST', '/api/clinica/pre-cadastros', novoPre({ data_nascimento: '2020-08-02' }), rec);
  await api.chamar('POST', `/api/clinica/pre-cadastros/${nova.corpo.dados.id}/cancelar-codigo`, null, rec);
  const cancelado = await tentar(nova.corpo.dados.codigo);

  // usado
  const outra = await api.chamar('POST', '/api/clinica/pre-cadastros', novoPre({ nome: 'Rui', data_nascimento: '2020-08-02' }), rec);
  assert.strictEqual((await tentar(outra.corpo.dados.codigo)).status, 201);
  const usado = await tentar(outra.corpo.dados.codigo, { email: 'outro@exemplo.test' });

  for (const r of [dataErrada, inexistente, vencido, cancelado, usado]) {
    assert.strictEqual(r.status, 400);
    assert.deepStrictEqual(r.corpo, dataErrada.corpo);
  }
  api.fechar();
});

test('F-19: reemitir código faz o antigo parar de funcionar', async () => {
  const api = iniciar();
  const rec = await entrarClinica(api, 'AURORA', 'recepcao');
  const davi = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Davi'").get().id;
  const novo = await api.chamar('POST', `/api/clinica/pre-cadastros/${davi}/reemitir-codigo`, null, rec);
  assert.strictEqual(novo.status, 200);
  assert.strictEqual((await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi))).status, 400);
  assert.strictEqual((await api.chamar('POST', '/api/auth/ativar-conta', ativacao(novo.corpo.dados.codigo))).status, 201);
  api.fechar();
});

test('reemitir para criança inativa (Sofia) reativa o pré-cadastro', async () => {
  const api = iniciar();
  const rec = await entrarClinica(api, 'AURORA', 'recepcao');
  const sofia = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Sofia'").get().id;
  const r = await api.chamar('POST', `/api/clinica/pre-cadastros/${sofia}/reemitir-codigo`, null, rec);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(api.banco.prepare('SELECT status_cadastro FROM criancas WHERE id = ?').get(sofia).status_cadastro, 'PRE_CADASTRO');
  api.fechar();
});

test('S-21: depois de 5 datas erradas o código fica bloqueado, mesmo com a data certa', async () => {
  const api = iniciar();
  for (let i = 0; i < 5; i++) {
    const r = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi, { data_nascimento: '2019-01-01' }));
    assert.strictEqual(r.status, 400);
  }
  const certa = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi));
  assert.strictEqual(certa.status, 400);
  api.fechar();
});

test('S-21: força bruta de códigos pelo mesmo IP leva a 429', async () => {
  const api = iniciar();
  let ultimo;
  for (let i = 0; i < 11; i++) {
    ultimo = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(`AAAA-${String(1000 + i)}`));
  }
  assert.strictEqual(ultimo.status, 429);
  api.fechar();
});

test('ativar com e-mail que já tem conta dá 409 e não gasta o código', async () => {
  const api = iniciar();
  const r = await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi, { email: 'responsavel@laco.test' }));
  assert.strictEqual(r.status, 409);
  assert.strictEqual((await api.chamar('POST', '/api/auth/ativar-conta', ativacao(api.info.codigoDavi))).status, 201);
  api.fechar();
});

test('S-23: não existe autocadastro de responsável', async () => {
  const api = iniciar({ comSeed: false });
  for (const rota of ['/api/auth/cadastro-responsavel', '/api/auth/registrar', '/api/auth/cadastro']) {
    assert.strictEqual((await api.chamar('POST', rota, { nome: 'x', email: 'x@x.test', senha: '12345678' })).status, 404);
  }
  api.fechar();
});

test('F-41: responsável logado adiciona outro filho com código + nascimento; vínculo PENDENTE', async () => {
  const api = iniciar();
  const resp = await entrarResp(api);
  const r = await api.chamar('POST', '/api/criancas/adicionar',
    { codigo: api.info.codigoDavi, data_nascimento: '2020-08-02', parentesco: 'MAE' }, resp);
  assert.strictEqual(r.status, 201);
  const mariana = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'responsavel@laco.test'").get().id;
  const filhos = api.banco.prepare('SELECT COUNT(*) AS n FROM responsaveis_crianca WHERE responsavel_id = ?').get(mariana).n;
  assert.strictEqual(filhos, 2);
  assert.strictEqual(api.banco.prepare("SELECT COUNT(*) AS n FROM vinculos WHERE crianca_id = ? AND status = 'PENDENTE'").get(r.corpo.dados.crianca.id).n, 1);
  api.fechar();
});

test('S-40: adicionar filho com código errado, usado ou sem login é rejeitado', async () => {
  const api = iniciar();
  const resp = await entrarResp(api);
  const adicionar = (corpo, token) => api.chamar('POST', '/api/criancas/adicionar', { parentesco: 'MAE', ...corpo }, token);
  assert.strictEqual((await adicionar({ codigo: 'ZZZZ-ZZZZ', data_nascimento: '2020-08-02' }, resp)).status, 400);
  assert.strictEqual((await adicionar({ codigo: api.info.codigoDavi, data_nascimento: '2018-01-01' }, resp)).status, 400);
  assert.strictEqual((await adicionar({ codigo: api.info.codigoDavi, data_nascimento: '2020-08-02' }, resp)).status, 201);
  assert.strictEqual((await adicionar({ codigo: api.info.codigoDavi, data_nascimento: '2020-08-02' }, resp)).status, 400); // já usado
  assert.strictEqual((await adicionar({ codigo: api.info.codigoDavi, data_nascimento: '2020-08-02' })).status, 401);
  const prof = await entrarClinica(api, 'AURORA', 'carlos@laco.test');
  assert.strictEqual((await adicionar({ codigo: api.info.codigoDavi, data_nascimento: '2020-08-02' }, prof)).status, 403);
  api.fechar();
});
