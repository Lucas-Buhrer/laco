// O "mês de uso simulado" (npm run seed:mes) precisa ser coerente com as regras do sistema.
const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');
const { popularMes } = require('../src/database/seed-mes');

function comMes() {
  const api = iniciar();
  const r = api.banco.transaction(() => popularMes(api.banco))();
  return { api, r };
}
async function entrar(api, codigo, identificador) {
  return (await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' })).corpo.dados.token;
}
async function familia(api, email) {
  return (await api.chamar('POST', '/api/auth/login-responsavel', { email, senha: '123456' })).corpo.dados.token;
}
const n = (api, sql, ...args) => api.banco.prepare(sql).get(...args).n;

test('volume: 7 profissionais na Aurora, 20+ crianças ativas e um mês de movimento', () => {
  const { api, r } = comMes();
  assert.ok(n(api, "SELECT COUNT(*) AS n FROM usuarios WHERE papel = 'PROFISSIONAL' AND clinica_id = (SELECT id FROM clinicas WHERE codigo_acesso = 'AURORA')") >= 6);
  assert.ok(n(api, "SELECT COUNT(*) AS n FROM criancas WHERE status_cadastro = 'ATIVA'") >= 20);
  assert.ok(r.consultas >= 100 && r.registros >= 80 && r.atividades >= 15 && r.execucoes >= 200);
  // as consultas passadas cobrem todos os estados e as futuras têm confirmadas e não confirmadas
  for (const s of ['REALIZADA', 'FALTA', 'CANCELADA', 'REMARCADA', 'AGENDADA']) {
    assert.ok(n(api, 'SELECT COUNT(*) AS n FROM consultas WHERE status = ?', s) > 0, s);
  }
  assert.ok(n(api, "SELECT COUNT(*) AS n FROM consultas WHERE status = 'AGENDADA' AND presenca_confirmada = 1") > 0);
  assert.ok(n(api, "SELECT COUNT(*) AS n FROM consultas WHERE status = 'AGENDADA' AND presenca_confirmada = 0") > 0);
  api.fechar();
});

test('coerência: ninguém com dois atendimentos no mesmo horário e nenhuma consulta sem vínculo', () => {
  const { api } = comMes();
  assert.strictEqual(n(api, `SELECT COUNT(*) AS n FROM (SELECT 1 FROM consultas WHERE status <> 'CANCELADA'
    GROUP BY profissional_id, substr(inicio, 1, 13) HAVING COUNT(*) > 1)`), 0);
  assert.strictEqual(n(api, `SELECT COUNT(*) AS n FROM (SELECT 1 FROM consultas WHERE status <> 'CANCELADA'
    GROUP BY crianca_id, substr(inicio, 1, 13) HAVING COUNT(*) > 1)`), 0);
  // toda consulta (fora a do Theo na Horizonte, que vem do seed base) tem um vínculo com aquele profissional
  assert.strictEqual(n(api, `SELECT COUNT(*) AS n FROM consultas c WHERE c.crianca_id <> (SELECT id FROM criancas WHERE nome = 'Theo')
    AND NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.crianca_id = c.crianca_id AND v.profissional_id = c.profissional_id
                    AND v.status IN ('APROVADO','REVOGADO','PENDENTE'))`), 0);
  // depois que a família revoga, não há mais consulta marcada com aquele profissional
  assert.strictEqual(n(api, `SELECT COUNT(*) AS n FROM consultas c JOIN vinculos v ON v.crianca_id = c.crianca_id AND v.profissional_id = c.profissional_id
    WHERE v.status = 'REVOGADO' AND c.inicio >= v.revogado_em`), 0);
  // todo registro de sessão nasce de uma consulta realizada do mesmo profissional e da mesma criança
  assert.strictEqual(n(api, `SELECT COUNT(*) AS n FROM registros_sessao r JOIN consultas c ON c.id = r.consulta_id
    WHERE c.status <> 'REALIZADA' OR c.profissional_id <> r.profissional_id OR c.crianca_id <> r.crianca_id`), 0);
  api.fechar();
});

test('privacidade: nos dados do mês a observação "Só para mim" continua escondida da família e da administração', async () => {
  const { api } = comMes();
  const privadas = api.banco.prepare("SELECT observacao FROM registros_sessao WHERE observacao IS NOT NULL AND observacao_visivel_familia = 0").all().map((x) => x.observacao);
  assert.ok(privadas.length > 10);
  const miguel = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Miguel'").get().id;
  const mae = await familia(api, 'patricia.gomes@exemplo.test');
  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  for (const rota of ['registros', 'linha-do-tempo', 'exportar']) {
    const texto = JSON.stringify((await api.chamar('GET', `/api/criancas/${miguel}/${rota}`, null, mae)).corpo);
    for (const p of privadas) assert.ok(!texto.includes(p), `${rota} vazou: ${p}`);
    assert.ok([403, 404].includes((await api.chamar('GET', `/api/criancas/${miguel}/${rota}`, null, adm)).status));
  }
  // quem não tem vínculo aprovado (Tiago) não abre a criança
  const tiago = await entrar(api, 'AURORA', 'tiago@aurora.test');
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${miguel}`, null, tiago)).status, 404);
  api.fechar();
});

test('uso pela API: a Mariana tem dois filhos, a agenda tem cores e os novos profissionais entram', async () => {
  const { api } = comMes();
  const mariana = await familia(api, 'responsavel@laco.test');
  const filhos = (await api.chamar('GET', '/api/criancas', null, mariana)).corpo.dados.map((c) => c.nome).sort();
  assert.deepStrictEqual(filhos, ['Alice', 'Theo']);

  const adm = await entrar(api, 'AURORA', 'admin@laco.test');
  const agenda = (await api.chamar('GET', '/api/clinica/agenda', null, adm)).corpo.dados;
  const cores = new Set(agenda.filter((c) => c.status === 'AGENDADA').map((c) => c.cor));
  for (const cor of ['AZUL', 'AMARELA', 'VERMELHA', 'VERDE']) assert.ok(cores.has(cor), cor);

  const marta = await entrar(api, 'AURORA', 'marta@aurora.test');
  assert.ok((await api.chamar('GET', '/api/criancas', null, marta)).corpo.dados.length >= 1);
  const painel = (await api.chamar('GET', '/api/painel/clinica', null, adm)).corpo.dados;
  assert.ok(painel.profissionais_ativos >= 7);
  assert.ok(painel.pre_cadastros_sem_ativacao >= 3);
  api.fechar();
});

test('o conflito com a Clínica Horizonte aparece nas crianças atendidas nas duas clínicas', async () => {
  const { api } = comMes();
  const futuras = api.banco.prepare(`SELECT c.crianca_id, c.inicio FROM consultas c
    WHERE c.status = 'AGENDADA' AND c.clinica_id = (SELECT id FROM clinicas WHERE codigo_acesso = 'HORIZONTE')
      AND c.crianca_id <> (SELECT id FROM criancas WHERE nome = 'Theo')`).all();
  assert.ok(futuras.length > 0);
  let achou = false;
  for (const f of futuras) {
    const profs = api.banco.prepare(`SELECT u.email FROM vinculos v JOIN usuarios u ON u.id = v.profissional_id
      WHERE v.crianca_id = ? AND v.status = 'APROVADO' AND u.clinica_id = (SELECT id FROM clinicas WHERE codigo_acesso = 'AURORA') AND u.email IS NOT NULL`).all(f.crianca_id);
    for (const p of profs) {
      const token = await entrar(api, 'AURORA', p.email);
      const r = await api.chamar('POST', '/api/consultas', { crianca_id: f.crianca_id, inicio: f.inicio.slice(0, 16) }, token);
      if (r.status === 409 && r.corpo.conflito === true) { achou = true; assert.deepStrictEqual(r.corpo, { conflito: true }); }
    }
  }
  assert.ok(achou, 'nenhum aviso de conflito apareceu');
  api.fechar();
});

test('rodar o mês duas vezes não duplica nada: avisa e para', () => {
  const { api } = comMes();
  const antes = n(api, 'SELECT COUNT(*) AS n FROM consultas');
  assert.throws(() => api.banco.transaction(() => popularMes(api.banco))(), /já foram adicionados/);
  assert.strictEqual(n(api, 'SELECT COUNT(*) AS n FROM consultas'), antes);
  api.fechar();
});
