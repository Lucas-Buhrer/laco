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

test('RF-72 / F-14: painel "quem acessou" mostra o que o profissional fez, em português', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  await api.chamar('GET', `/api/criancas/${theo(api)}`, null, carlos);
  await api.chamar('GET', `/api/criancas/${theo(api)}/registros`, null, carlos);
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/acessos`, null, await mae(api));
  assert.strictEqual(r.status, 200);
  const frases = r.corpo.dados.acessos.map((a) => `${a.quem} ${a.acao}`);
  assert.ok(frases.some((f) => f.includes('Carlos') && f.includes('abriu o perfil')));
  assert.ok(frases.some((f) => f.includes('abriu o histórico de sessões')));
  assert.ok(r.corpo.dados.profissionais.length >= 1);
  // abrir o próprio painel não vira "acesso"
  const de_novo = await api.chamar('GET', `/api/criancas/${theo(api)}/acessos`, null, await mae(api));
  assert.ok(!de_novo.corpo.dados.acessos.some((a) => a.quem === 'Mariana Alves' && a.acao.includes('painel')));
  api.fechar();
});

test('S-31: a verificação de conflito de agenda aparece no painel da família', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const outra = api.banco.prepare("SELECT inicio FROM consultas WHERE tipo = 'Psicopedagogia'").get().inicio;
  await api.chamar('POST', '/api/consultas', { crianca_id: theo(api), inicio: outra }, carlos);
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/acessos`, null, await mae(api));
  assert.ok(r.corpo.dados.acessos.some((a) => a.acao.includes('conflito de horário')));
  api.fechar();
});

test('Painel de acessos e exportação: só a família da criança (profissional, ADM e outra família não)', async () => {
  const api = iniciar();
  const quem = [await clinica(api, 'AURORA', 'carlos@laco.test'), await clinica(api, 'AURORA', 'admin@laco.test'), await clinica(api, 'AURORA', 'recepcao')];
  for (const token of quem) {
    for (const rota of ['acessos', 'exportar']) {
      const r = await api.chamar('GET', `/api/criancas/${theo(api)}/${rota}`, null, token);
      assert.ok([403, 404].includes(r.status), `${rota}: ${r.status}`);
    }
  }
  // o profissional barrado não gera linha "EXPORTAR_PRE" no log
  assert.ok(!api.banco.prepare("SELECT 1 FROM log_acesso WHERE acao = 'EXPORTAR_PRE'").get());
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}/exportar`)).status, 401);
  api.fechar();
});

test('RF-73 / RN-05: exportação traz os dados da criança, mas nunca a observação "Só para mim"', async () => {
  const api = iniciar();
  const r = await api.chamar('GET', `/api/criancas/${theo(api)}/exportar`, null, await mae(api));
  assert.strictEqual(r.status, 200);
  const d = r.corpo.dados;
  assert.strictEqual(d.crianca.nome, 'Theo');
  assert.ok(d.registros_de_sessao.length >= 10 && d.consultas.length > 0 && d.atividades.length > 0 && d.pareceres_publicados.length === 1);
  const texto = JSON.stringify(r.corpo);
  assert.ok(!texto.includes('Anotação minha'));
  assert.ok(!texto.includes('senha') && !texto.includes('codigo_hash'));
  // fica registrado
  assert.ok(api.banco.prepare("SELECT 1 FROM solicitacoes_lgpd WHERE tipo = 'EXPORTACAO'").get());
  assert.ok(api.banco.prepare("SELECT 1 FROM log_acesso WHERE acao = 'EXPORTAR_DADOS'").get());
  api.fechar();
});

test('RF-75: revogar o consentimento encerra todos os acessos, e o profissional perde a criança na hora', async () => {
  const api = iniciar();
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const familia = await mae(api);
  // sem confirmar, não faz nada
  assert.strictEqual((await api.chamar('POST', '/api/lgpd/solicitacoes', { tipo: 'REVOGACAO', crianca_id: theo(api) }, familia)).status, 400);
  const r = await api.chamar('POST', '/api/lgpd/solicitacoes', { tipo: 'REVOGACAO', crianca_id: theo(api), confirmar: true }, familia);
  assert.strictEqual(r.status, 201);
  assert.match(r.corpo.dados.protocolo, /^LACO-\d{8}-[0-9A-F]{6}$/);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo(api)}`, null, carlos)).status, 404);
  assert.strictEqual(api.banco.prepare("SELECT COUNT(*) AS n FROM vinculos WHERE status IN ('APROVADO','PENDENTE')").get().n, 0);
  assert.ok(api.banco.prepare('SELECT revogado_em FROM consentimentos WHERE revogado_em IS NOT NULL').get());
  api.fechar();
});

test('RF-74: o responsável exclui o cadastro na hora; nada da criança sobra e fica só o protocolo sem nome', async () => {
  const api = iniciar();
  const familia = await mae(api);
  const id = theo(api);
  // segundo responsável (para ver o aviso) e quem precisa ser avisado
  const pai = api.banco.prepare("INSERT INTO usuarios (papel, nome, email, senha_hash) VALUES ('RESPONSAVEL', 'Paulo Alves', 'pai@laco.test', 'x')").run().lastInsertRowid;
  api.banco.prepare("INSERT INTO responsaveis_crianca (crianca_id, responsavel_id, parentesco) VALUES (?, ?, 'PAI')").run(id, pai);
  const carlos = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'carlos@laco.test'").get().id;
  const admin = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'admin@laco.test'").get().id;
  const davi = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Davi'").get().id;

  // sem confirmar, ou com o nome errado: não apaga
  assert.strictEqual((await api.chamar('POST', '/api/lgpd/excluir-crianca', { crianca_id: id, nome_confirmacao: 'Theo' }, familia)).status, 400);
  assert.strictEqual((await api.chamar('POST', '/api/lgpd/excluir-crianca', { crianca_id: id, confirmar: true, nome_confirmacao: 'Teo' }, familia)).status, 400);
  // criança de outra família e papel errado
  assert.strictEqual((await api.chamar('POST', '/api/lgpd/excluir-crianca', { crianca_id: davi, confirmar: true, nome_confirmacao: 'Davi' }, familia)).status, 404);
  const prof = await clinica(api, 'AURORA', 'carlos@laco.test');
  assert.strictEqual((await api.chamar('POST', '/api/lgpd/excluir-crianca', { crianca_id: id, confirmar: true, nome_confirmacao: 'Theo' }, prof)).status, 403);
  assert.ok(api.banco.prepare('SELECT 1 FROM criancas WHERE id = ?').get(id));

  const r = await api.chamar('POST', '/api/lgpd/excluir-crianca', { crianca_id: id, confirmar: true, nome_confirmacao: ' theo ' }, familia);
  assert.strictEqual(r.status, 200);
  assert.match(r.corpo.dados.protocolo, /^EXC-/);
  for (const tabela of ['criancas', 'consultas', 'registros_sessao', 'pareceres', 'atividades', 'vinculos', 'responsaveis_crianca', 'solicitacoes_lgpd', 'log_acesso']) {
    const coluna = tabela === 'criancas' ? 'id' : 'crianca_id';
    assert.strictEqual(api.banco.prepare(`SELECT COUNT(*) n FROM ${tabela} WHERE ${coluna} = ?`).get(id).n, 0, tabela);
  }
  const log = api.banco.prepare("SELECT * FROM log_exclusoes WHERE tipo = 'EXCLUSAO_PELA_FAMILIA'").get();
  assert.strictEqual(log.protocolo, r.corpo.dados.protocolo);
  assert.ok(!JSON.stringify(log).includes('Theo'));
  // avisos dentro do app: outro responsável, profissional e administração
  const avisou = (u) => api.banco.prepare("SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto LIKE '%excluiu o cadastro de Theo%'").get(u);
  assert.ok(avisou(pai) && avisou(carlos) && avisou(admin));
  // outra criança da clínica continua lá
  assert.ok(api.banco.prepare('SELECT 1 FROM criancas WHERE id = ?').get(davi));
  // o profissional perde a criança
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${id}`, null, prof)).status, 404);
  // "pedir exclusão" como pedido pendente não existe mais
  assert.strictEqual((await api.chamar('POST', '/api/lgpd/solicitacoes', { tipo: 'EXCLUSAO', crianca_id: davi, confirmar: true }, familia)).status, 400);
  api.fechar();
});

