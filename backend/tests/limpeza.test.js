const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');
const { executarLimpeza } = require('../src/utils/limpeza');
const { formatar } = require('../src/utils/datas');

async function clinica(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return formatar(d); };
const davi = (api) => api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Davi'").get().id;

// Faz o Davi parecer antigo: criação e códigos "n dias atrás"
function envelhecer(api, dias) {
  api.banco.prepare('UPDATE criancas SET criada_em = ? WHERE id = ?').run(diasAtras(dias), davi(api));
  api.banco.prepare('UPDATE codigos_ativacao SET criado_em = ? WHERE crianca_id = ?').run(diasAtras(dias), davi(api));
}

test('F-36: sem ativação por 30 dias o pré-cadastro fica INATIVO e a clínica é avisada', async () => {
  const api = iniciar();
  envelhecer(api, 31);
  const r = executarLimpeza(api.banco);
  assert.strictEqual(r.inativados, 1);
  assert.strictEqual(api.banco.prepare('SELECT status_cadastro AS s FROM criancas WHERE id = ?').get(davi(api)).s, 'PRE_CADASTRO_INATIVO');
  const adminId = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'admin@laco.test'").get().id;
  assert.ok(api.banco.prepare("SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto LIKE '%Davi ficou inativo%'").get(adminId));
  // rodar de novo não avisa duas vezes
  assert.strictEqual(executarLimpeza(api.banco).inativados, 0);
  api.fechar();
});

test('F-36: a Sofia (já inativa no seed) continua inativa, e novo código reativa o pré-cadastro', async () => {
  const api = iniciar();
  const bia = await clinica(api, 'AURORA', 'recepcao');
  executarLimpeza(api.banco);
  const sofia = api.banco.prepare("SELECT id, status_cadastro AS s FROM criancas WHERE nome = 'Sofia'").get();
  assert.strictEqual(sofia.s, 'PRE_CADASTRO_INATIVO');
  const r = await api.chamar('POST', `/api/clinica/pre-cadastros/${sofia.id}/reemitir-codigo`, {}, bia);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(api.banco.prepare('SELECT status_cadastro AS s FROM criancas WHERE id = ?').get(sofia.id).s, 'PRE_CADASTRO');
  // com código novo, a contagem recomeça: a limpeza não inativa de novo
  executarLimpeza(api.banco);
  assert.strictEqual(api.banco.prepare('SELECT status_cadastro AS s FROM criancas WHERE id = ?').get(sofia.id).s, 'PRE_CADASTRO');
  api.fechar();
});

test('F-37 / RN-33: aos 90 dias o pré-cadastro é excluído e o log não guarda dado pessoal', async () => {
  const api = iniciar();
  const id = davi(api);
  envelhecer(api, 91);
  const r = executarLimpeza(api.banco);
  assert.ok(r.excluidos >= 1);
  assert.strictEqual(api.banco.prepare('SELECT COUNT(*) AS n FROM criancas WHERE id = ?').get(id).n, 0);
  assert.strictEqual(api.banco.prepare('SELECT COUNT(*) AS n FROM codigos_ativacao WHERE crianca_id = ?').get(id).n, 0);
  assert.strictEqual(api.banco.prepare('SELECT COUNT(*) AS n FROM pre_cadastro_profissionais WHERE crianca_id = ?').get(id).n, 0);

  const log = api.banco.prepare('SELECT * FROM log_exclusoes').all();
  assert.ok(log.length >= 1);
  const texto = JSON.stringify(log);
  for (const pessoal of ['Davi', 'Fernanda', 'exemplo.test', '2020-08-02', id]) assert.ok(!texto.includes(pessoal), `o log guardou "${pessoal}"`);
  assert.match(log[0].protocolo, /^EXC-\d{8}-[0-9A-F]{6}$/);
  api.fechar();
});

test('A limpeza nunca mexe em criança ativa (Theo) e roda ao abrir a lista de pré-cadastros', async () => {
  const api = iniciar();
  const bia = await clinica(api, 'AURORA', 'recepcao');
  api.banco.prepare("UPDATE criancas SET criada_em = ? WHERE nome = 'Theo'").run(diasAtras(500));
  envelhecer(api, 31);
  const lista = await api.chamar('GET', '/api/clinica/pre-cadastros', null, bia);
  assert.strictEqual(lista.status, 200);
  assert.strictEqual(lista.corpo.dados.find((c) => c.nome === 'Davi').status, 'INATIVO');
  assert.ok(lista.corpo.dados.find((c) => c.nome === 'Davi').dias_sem_ativacao >= 31);
  assert.strictEqual(api.banco.prepare("SELECT status_cadastro AS s FROM criancas WHERE nome = 'Theo'").get().s, 'ATIVA');
  api.fechar();
});

test('Código de uma criança inativa não ativa a conta, e a lista não traz dado clínico', async () => {
  const api = iniciar();
  const bia = await clinica(api, 'AURORA', 'recepcao');
  const r = await api.chamar('POST', '/api/clinica/pre-cadastros', {
    nome: 'Lia', data_nascimento: '2022-05-10', responsavel_nome: 'Paula Dias', parentesco: 'MAE', email: 'paula@exemplo.test', profissionais: [],
  }, bia);
  const { id, codigo } = r.corpo.dados;
  api.banco.prepare('UPDATE criancas SET criada_em = ? WHERE id = ?').run(diasAtras(31), id);
  api.banco.prepare('UPDATE codigos_ativacao SET criado_em = ? WHERE crianca_id = ?').run(diasAtras(31), id);
  executarLimpeza(api.banco);
  const ativar = await api.chamar('POST', '/api/auth/ativar-conta', {
    codigo, data_nascimento: '2022-05-10', nome: 'Paula Dias', email: 'paula@exemplo.test', senha: 'senha-forte-1', parentesco: 'MAE', aceitou_termo: true,
  });
  assert.strictEqual(ativar.status, 400);
  api.fechar();
});
