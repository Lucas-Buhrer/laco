const test = require('node:test');
const assert = require('node:assert');
const { abrirBanco } = require('../src/config/banco');
const { criarTabelas } = require('../src/database/criar');

function bancoNovo() {
  const banco = abrirBanco(':memory:');
  criarTabelas(banco);
  return banco;
}

test('cria todas as tabelas do doc 05', () => {
  const banco = bancoNovo();
  const nomes = banco.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
  const esperadas = [
    'clinicas', 'usuarios', 'consentimentos', 'criancas', 'codigos_ativacao',
    'convites_compartilhamento', 'responsaveis_crianca', 'convites_responsavel',
    'pareceres', 'log_exclusoes', 'vinculos', 'consultas', 'registros_sessao',
    'adendos_registro', 'atividades', 'execucoes_atividade', 'log_acesso',
    'solicitacoes_lgpd', 'notificacoes',
  ];
  for (const t of esperadas) assert.ok(nomes.includes(t), `falta a tabela ${t}`);
});

test('mesmo e-mail pode existir em duas clínicas, mas não duas vezes na mesma', () => {
  const banco = bancoNovo();
  banco.exec("INSERT INTO clinicas (nome, codigo_acesso) VALUES ('A','A1'), ('B','B1')");
  const inserir = banco.prepare(
    "INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash) VALUES (?, 'PROFISSIONAL', 'X', 'x@t.test', 'h')"
  );
  inserir.run(1);
  inserir.run(2); // outra clínica: permitido (F-21)
  assert.throws(() => inserir.run(1));
});

test('e-mail de responsável é único no sistema', () => {
  const banco = bancoNovo();
  const inserir = banco.prepare(
    "INSERT INTO usuarios (papel, nome, email, senha_hash) VALUES ('RESPONSAVEL', 'R', 'r@t.test', 'h')"
  );
  inserir.run();
  assert.throws(() => inserir.run());
});

test('chave estrangeira está ligada', () => {
  const banco = bancoNovo();
  assert.throws(() =>
    banco.prepare("INSERT INTO vinculos (crianca_id, profissional_id, origem) VALUES ('nao-existe', 1, 'CLINICA_ORIGEM')").run()
  );
});
