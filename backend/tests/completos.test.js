// T-38: casos F-xx e S-xx que ainda não tinham teste próprio.
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
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return formatar(d); };

test('F-23: reativar profissional devolve a conta, mas NÃO os vínculos', async () => {
  const api = iniciar();
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const carlos = idDe(api, 'carlos@laco.test');
  await api.chamar('POST', `/api/clinica/profissionais/${carlos}/desativar`, {}, adm);
  assert.strictEqual(await clinica(api, 'AURORA', 'carlos@laco.test').catch(() => undefined), undefined);

  const r = await api.chamar('POST', `/api/clinica/profissionais/${carlos}/reativar`, {}, adm);
  assert.strictEqual(r.status, 200);
  const novo = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: 'AURORA', identificador: 'carlos@laco.test', senha: r.corpo.dados.senha_temporaria });
  assert.strictEqual(novo.status, 200);
  const token = novo.corpo.dados.token;
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, token)).corpo.dados.length, 0);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, token)).status, 404);
  assert.strictEqual(api.banco.prepare("SELECT status FROM vinculos WHERE profissional_id = ? AND crianca_id = ?").get(carlos, theo(api)).status, 'ENCERRADO');
  // quem não é ADM não reativa; ativo não reativa de novo
  assert.strictEqual((await api.chamar('POST', `/api/clinica/profissionais/${carlos}/reativar`, {}, adm)).status, 409);
  assert.strictEqual((await api.chamar('POST', `/api/clinica/profissionais/${carlos}/reativar`, {}, token)).status, 403);
  api.fechar();
});

// Cria uma profissional da Horizonte com o MESMO registro da Ana, que já atendeu o Theo lá
function atendimentoAnteriorDaAna(api, { mesmoRegistro = true } = {}) {
  const horizonte = api.banco.prepare("SELECT id FROM clinicas WHERE codigo_acesso = 'HORIZONTE'").get().id;
  const numero = mesmoRegistro ? '12345' : '99999';
  const id = api.banco
    .prepare(`INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash, especialidade, registro_conselho, registro_numero, registro_uf, ativo)
              VALUES (?, 'PROFISSIONAL', 'Ana Souza (antes)', 'ana.antes@horizonte.test', 'x', 'FONOAUDIOLOGO', 'CRFa', ?, 'SP', 0)`)
    .run(horizonte, numero).lastInsertRowid;
  api.banco
    .prepare("INSERT INTO vinculos (crianca_id, profissional_id, origem, status, solicitado_em, aprovado_em, encerrado_em) VALUES (?, ?, 'CONVITE_RESPONSAVEL', 'ENCERRADO', ?, ?, ?)")
    .run(theo(api), id, diasAtras(300), diasAtras(299), diasAtras(120));
}

test('F-46: o responsável vê "já atendeu" quando o mesmo registro profissional atendeu em outra clínica', async () => {
  const api = iniciar();
  atendimentoAnteriorDaAna(api);
  const lista = (await api.chamar('GET', '/api/vinculos', null, await mae(api))).corpo.dados;
  const pedidoDaAna = lista.find((v) => v.status === 'PENDENTE');
  assert.strictEqual(pedidoDaAna.ja_atendeu.clinica_nome, 'Clínica Horizonte');
  assert.ok(pedidoDaAna.ja_atendeu.de && pedidoDaAna.ja_atendeu.ate);
  api.fechar();
});

test('F-46: registro diferente ou sem registro informado não gera reconhecimento', async () => {
  const api = iniciar();
  atendimentoAnteriorDaAna(api, { mesmoRegistro: false });
  const pedido = (await api.chamar('GET', '/api/vinculos', null, await mae(api))).corpo.dados.find((v) => v.status === 'PENDENTE');
  assert.strictEqual(pedido.ja_atendeu, null);
  // sem registro
  api.banco.prepare("UPDATE usuarios SET registro_conselho = NULL, registro_numero = NULL WHERE email = 'profissional@laco.test'").run();
  const sem = (await api.chamar('GET', '/api/vinculos', null, await mae(api))).corpo.dados.find((v) => v.status === 'PENDENTE');
  assert.strictEqual(sem.ja_atendeu, null);
  api.fechar();
});

test('S-44: o reconhecimento chega só ao responsável — a clínica nova nunca recebe', async () => {
  const api = iniciar();
  atendimentoAnteriorDaAna(api);
  for (const token of [await clinica(api, 'AURORA', 'profissional@laco.test'), await clinica(api, 'AURORA', 'carlos@laco.test'),
    await clinica(api, 'AURORA', 'admin@laco.test'), await clinica(api, 'AURORA', 'recepcao')]) {
    for (const rota of ['/api/vinculos', '/api/painel/profissional', '/api/painel/clinica', '/api/consultas/opcoes', '/api/clinica/pre-cadastros']) {
      const r = await api.chamar('GET', rota, null, token);
      const texto = JSON.stringify(r.corpo);
      assert.ok(!texto.includes('ja_atendeu') && !texto.includes('Horizonte'), `${rota} vazou o reconhecimento`);
    }
  }
  api.fechar();
});

test('F-50: lembrete diário das atividades pendentes, um por dia', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const lembretes = async () =>
    (await api.chamar('GET', '/api/notificacoes', null, familia)).corpo.dados.avisos.filter((a) => a.texto.includes('de casa para fazer com Theo'));
  const primeiro = await lembretes();
  assert.strictEqual(primeiro.length, 1);
  assert.strictEqual((await lembretes()).length, 1); // abrir de novo não repete
  // quem já fez tudo hoje não recebe lembrete
  const api2 = iniciar();
  const f2 = await mae(api2);
  for (const a of api2.banco.prepare("SELECT id FROM atividades WHERE status = 'ATIVA'").all()) {
    await api2.chamar('POST', `/api/atividades/${a.id}/execucoes`, { como_foi: 1 }, f2);
  }
  const sem = (await api2.chamar('GET', '/api/notificacoes', null, f2)).corpo.dados.avisos.filter((a) => a.texto.includes('de casa para fazer'));
  assert.strictEqual(sem.length, 0);
  api.fechar();
  api2.fechar();
});

test('S-13: texto com SQL malicioso é tratado como texto e as tabelas continuam inteiras', async () => {
  const api = iniciar();
  const bia = await clinica(api, 'AURORA', 'recepcao');
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const ataque = "x'); DROP TABLE criancas; --";
  const pre = await api.chamar('POST', '/api/clinica/pre-cadastros', {
    nome: ataque, data_nascimento: '2022-01-01', responsavel_nome: ataque, parentesco: 'MAE', email: 'a@b.test', profissionais: [],
  }, bia);
  assert.strictEqual(pre.status, 201);
  await api.chamar('POST', `/api/criancas/${theo(api)}/registros`, { resumo: ataque, objetivos: ataque, observacao: ataque }, carlos);
  // login com injeção não entra
  const login = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: "AURORA' OR '1'='1", identificador: "' OR 1=1 --", senha: ataque });
  assert.strictEqual(login.status, 401);
  assert.ok(api.banco.prepare('SELECT COUNT(*) AS n FROM criancas').get().n >= 4);
  const lista = (await api.chamar('GET', '/api/clinica/pre-cadastros', null, bia)).corpo.dados;
  assert.ok(lista.some((c) => c.nome === ataque)); // guardado como texto
  api.fechar();
});

test('S-17: HTML e script nos campos voltam como texto puro (o front mostra sem executar)', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const xss = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  await api.chamar('POST', `/api/criancas/${theo(api)}/registros`, { resumo: xss }, carlos);
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, await mae(api));
  assert.strictEqual(r.corpo.dados[0].resumo, xss); // devolvido igual, em JSON: nada é interpretado como página
  // o servidor responde JSON, e o cabeçalho impede que o navegador adivinhe outro tipo
  const resposta = await fetch(`${api.url}/api/saude`);
  assert.match(resposta.headers.get('content-type'), /application\/json/);
  assert.strictEqual(resposta.headers.get('x-content-type-options'), 'nosniff');
  api.fechar();
});

test('S-15 / S-36 / S-38: o log, o relatório e os pareceres são só da família da criança', async () => {
  const api = iniciar();
  // outra família, com o seu próprio filho
  api.banco.prepare("INSERT INTO usuarios (papel, nome, email, senha_hash) VALUES ('RESPONSAVEL', 'Outra Mãe', 'outra@exemplo.test', ?)")
    .run(require('bcryptjs').hashSync('123456', 4));
  const outra = (await api.chamar('POST', '/api/auth/login-responsavel', { email: 'outra@exemplo.test', senha: '123456' })).corpo.dados.token;
  const periodo = `inicio=${diasAtras(30).slice(0, 10)}&fim=${diasAtras(0).slice(0, 10)}`;
  for (const rota of ['acessos', 'exportar', `relatorio?${periodo}`, 'pareceres', 'registros', 'linha-do-tempo', 'atividades', 'responsaveis']) {
    assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/${rota}`, null, outra)).status, 404, rota);
  }
  // profissional sem vínculo (Paulo) também não lê pareceres nem relatório
  const paulo = await clinica(api, 'AURORA', 'paulo@laco.test');
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/pareceres`, null, paulo)).status, 404);
  assert.ok([403, 404].includes((await api.chamar("GET", `/api/criancas/${theo(api)}/relatorio?${periodo}`, null, paulo)).status));
  api.fechar();
});

test('S-39: depois da exclusão não há como recuperar os dados do pré-cadastro', async () => {
  const api = iniciar();
  const { executarLimpeza } = require('../src/utils/limpeza');
  const bia = await clinica(api, 'AURORA', 'recepcao');
  const davi = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Davi'").get().id;
  api.banco.prepare('UPDATE criancas SET criada_em = ? WHERE id = ?').run(diasAtras(100), davi);
  api.banco.prepare('UPDATE codigos_ativacao SET criado_em = ? WHERE crianca_id = ?').run(diasAtras(100), davi);
  executarLimpeza(api.banco);
  const lista = (await api.chamar('GET', '/api/clinica/pre-cadastros', null, bia)).corpo.dados;
  assert.ok(!lista.some((c) => c.nome === 'Davi'));
  assert.strictEqual((await api.chamar('POST', `/api/clinica/pre-cadastros/${davi}/reemitir-codigo`, {}, bia)).status, 404);
  assert.strictEqual((await api.chamar('POST', `/api/clinica/pre-cadastros/${davi}/cancelar-codigo`, {}, bia)).status, 404);
  api.fechar();
});

test('Resposta de erro nunca vaza detalhes internos nem a senha (S-16)', async () => {
  const api = iniciar();
  const r = await fetch(`${api.url}/api/auth/login-clinica`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"codigo_clinica":' });
  assert.strictEqual(r.status, 400);
  const texto = await r.text();
  assert.ok(!texto.includes('SyntaxError') && !texto.includes('node_modules') && !texto.includes('at '));
  const todos = JSON.stringify(api.banco.prepare('SELECT * FROM log_acesso').all());
  assert.ok(!todos.includes('123456'));
  api.fechar();
});
