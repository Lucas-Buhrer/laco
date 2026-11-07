// Recria o banco com os dados de DEMONSTRAÇÃO (tudo fictício). Doc 09, seção 2.
// Todas as datas são relativas a hoje, então rode o seed no dia da apresentação.
const fs = require('node:fs');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { abrirBanco, arquivoPadrao } = require('../config/banco');
const { criarTabelas } = require('./criar');
const { gerarCodigo, hashCodigo } = require('../utils/codigos');

// ---------- ajudantes de data ----------
const pad = (n) => String(n).padStart(2, '0');
// Data/hora local no formato ISO sem fuso: 2026-11-07T14:00:00
function dataHora(data, hora = 0) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(hora)}:00:00`;
}
function somarDias(data, dias) {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}
// Dia da semana mais recente (0=dom ... 6=sáb) estritamente antes de `base`
function ultimoDiaDaSemana(base, diaSemana) {
  let d = somarDias(base, -1);
  while (d.getDay() !== diaSemana) d = somarDias(d, -1);
  return d;
}
// Próxima ocorrência do dia da semana, a partir de amanhã
function proximoDiaDaSemana(base, diaSemana) {
  let d = somarDias(base, 1);
  while (d.getDay() !== diaSemana) d = somarDias(d, 1);
  return d;
}

function popular(banco) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  // Só a demo usa senha de 6 caracteres; o sistema exige 8 (RN-13)
  const senhaHash = bcrypt.hashSync('123456', 10);
  const agora = dataHora(new Date(), new Date().getHours());

  // ---------- clínicas ----------
  const novaClinica = banco.prepare('INSERT INTO clinicas (nome, codigo_acesso, email_contato) VALUES (?, ?, ?)');
  const aurora = novaClinica.run('Clínica Aurora', 'AURORA', 'contato@aurora.test').lastInsertRowid;
  const horizonte = novaClinica.run('Clínica Horizonte', 'HORIZONTE', 'contato@horizonte.test').lastInsertRowid;

  // ---------- equipe ----------
  const novoUsuario = banco.prepare(`INSERT INTO usuarios
    (clinica_id, papel, nome, email, codigo_usuario, senha_hash, especialidade, registro_conselho, registro_numero, registro_uf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const criarUsuario = (clinica, papel, nome, email, codigo, especialidade, conselho, numero, uf) =>
    novoUsuario.run(clinica, papel, nome, email, codigo, senhaHash, especialidade, conselho, numero, uf).lastInsertRowid;

  const admin = criarUsuario(aurora, 'ADMIN_CLINICA', 'Renata Lima', 'admin@laco.test', null, null, null, null, null);
  const recepcao = criarUsuario(aurora, 'RECEPCAO', 'Bia Santos', null, 'recepcao', null, null, null, null);
  // profissional@ = Dra. Ana: tem o pedido de vínculo pendente, para aprovar ao vivo
  const ana = criarUsuario(aurora, 'PROFISSIONAL', 'Dra. Ana Souza', 'profissional@laco.test', null, 'FONOAUDIOLOGO', 'CRFa', '12345', 'SP');
  const carlos = criarUsuario(aurora, 'PROFISSIONAL', 'Carlos Pereira', 'carlos@laco.test', null, 'TERAPEUTA_OCUPACIONAL', 'CREFITO', '23456', 'SP');
  const paulo = criarUsuario(aurora, 'PROFISSIONAL', 'Paulo Mendes', 'paulo@laco.test', null, 'PSICOLOGO_ABA', 'CRP', '34567', 'SP');
  criarUsuario(horizonte, 'ADMIN_CLINICA', 'Admin Horizonte', 'admin@horizonte.test', null, null, null, null, null);
  const marina = criarUsuario(horizonte, 'PROFISSIONAL', 'Marina Costa', 'marina@horizonte.test', null, 'PSICOPEDAGOGO', 'ABPp', '45678', 'SP');

  // ---------- família ----------
  const mariana = criarUsuario(null, 'RESPONSAVEL', 'Mariana Alves', 'responsavel@laco.test', null, null, null, null, null);
  banco.prepare('INSERT INTO consentimentos (usuario_id, versao_termo, aceito_em) VALUES (?, ?, ?)')
    .run(mariana, '1.0-rascunho', dataHora(somarDias(hoje, -90), 10));

  // ---------- Theo ----------
  const theoId = crypto.randomUUID();
  banco.prepare(`INSERT INTO criancas
    (id, clinica_origem_id, status_cadastro, nome, data_nascimento, contato_responsavel_nome, contato_responsavel_parentesco,
     contato_responsavel_email, contato_responsavel_telefone, nivel_suporte, comunicacao, sensibilidades, criada_por, criada_em)
    VALUES (?, ?, 'ATIVA', 'Theo', '2021-03-14', 'Mariana Alves', 'MAE', 'responsavel@laco.test', '(11) 90000-0001',
            'Nível 2', 'Fala algumas palavras e usa figuras', 'Sons altos', ?, ?)`)
    .run(theoId, aurora, admin, dataHora(somarDias(hoje, -95), 9));
  banco.prepare("INSERT INTO responsaveis_crianca (crianca_id, responsavel_id, parentesco, entrou_em) VALUES (?, ?, 'MAE', ?)")
    .run(theoId, mariana, dataHora(somarDias(hoje, -90), 10));

  // ---------- vínculos ----------
  const novoVinculo = banco.prepare(`INSERT INTO vinculos
    (crianca_id, profissional_id, origem, solicitado_por, status, ver_historico_anterior, solicitado_em, respondido_em, aprovado_em)
    VALUES (?, ?, 'CLINICA_ORIGEM', ?, ?, 1, ?, ?, ?)`);
  const quandoAprovou = dataHora(somarDias(hoje, -90), 11);
  novoVinculo.run(theoId, carlos, admin, 'APROVADO', quandoAprovou, quandoAprovou, quandoAprovou);
  novoVinculo.run(theoId, ana, admin, 'PENDENTE', agora, null, null); // a aprovar ao vivo

  // ---------- consultas passadas do Theo com Carlos (Aurora): uma de cada estado ----------
  const novaConsulta = banco.prepare(`INSERT INTO consultas
    (crianca_id, profissional_id, clinica_id, criada_por, inicio, tipo, status, remarcada_para_id, presenca_confirmada, confirmada_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const novoRegistro = banco.prepare(`INSERT INTO registros_sessao
    (crianca_id, profissional_id, consulta_id, resumo, objetivos, humor, observacao, observacao_visivel_familia, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const quartaBase = ultimoDiaDaSemana(hoje, 3); // última quarta
  const objetivos = ['Pedir objeto com figura', 'Rotina de escovar os dentes', 'Esperar a vez em brincadeira'];
  for (let i = 11; i >= 0; i--) {
    const dia = somarDias(quartaBase, -7 * i);
    const inicio = dataHora(dia, 15);
    if (i === 8) { // faltou
      novaConsulta.run(theoId, carlos, aurora, admin, inicio, 'Sessão de T.O.', 'FALTA', null, 0, null);
      continue;
    }
    if (i === 6) { // cancelada
      novaConsulta.run(theoId, carlos, aurora, admin, inicio, 'Sessão de T.O.', 'CANCELADA', null, 0, null);
      continue;
    }
    if (i === 4) { // remarcada: aponta para a consulta do dia seguinte
      const nova = novaConsulta.run(theoId, carlos, aurora, admin, dataHora(somarDias(dia, 1), 15), 'Sessão de T.O.', 'REALIZADA', null, 1, 'RESPONSAVEL').lastInsertRowid;
      novaConsulta.run(theoId, carlos, aurora, admin, inicio, 'Sessão de T.O.', 'REMARCADA', nova, 0, null);
      novoRegistro.run(theoId, carlos, nova, 'Boa sessão, aceitou a mudança de dia.', objetivos[0], 4, null, 0, dataHora(somarDias(dia, 1), 16));
      continue;
    }
    const id = novaConsulta.run(theoId, carlos, aurora, admin, inicio, 'Sessão de T.O.', 'REALIZADA', null, 1, 'RESPONSAVEL').lastInsertRowid;
    const humor = Math.min(5, 2 + Math.floor((11 - i) / 3)); // evolui devagar de 2 a 5
    // Algumas observações privadas e outras visíveis, para mostrar a diferença (RN-05)
    const privada = i % 3 === 0;
    const visivel = i % 3 === 1;
    const obs = privada ? 'Anotação minha: avaliar encaminhamento.' : visivel ? 'Pode treinar o pedido com figura no lanche.' : null;
    novoRegistro.run(theoId, carlos, id, `Sessão ${12 - i}: trabalhamos comunicação e rotina.`, objetivos[i % 3], humor, obs, visivel ? 1 : 0, dataHora(dia, 16));
  }

  // ---------- consultas futuras do Theo (Aurora): azul, amarela, vermelha, verde ----------
  const futura = (dias, hora, confirmada) =>
    novaConsulta.run(theoId, carlos, aurora, recepcao, dataHora(somarDias(hoje, dias), hora), 'Sessão de T.O.', 'AGENDADA', null,
      confirmada ? 1 : 0, confirmada ? 'RESPONSAVEL' : null);
  futura(5, 10, false); // azul (4+ dias)
  futura(3, 10, false); // amarela (2 ou 3 dias)
  futura(1, 10, false); // vermelha (1 dia): a clínica liga
  futura(6, 10, true);  // verde (confirmada)

  // ---------- conflito: Theo na Clínica Horizonte na próxima quinta, 14h ----------
  const quinta = proximoDiaDaSemana(hoje, 4);
  novaConsulta.run(theoId, marina, horizonte, marina, dataHora(quinta, 14), 'Psicopedagogia', 'AGENDADA', null, 0, null);

  // ---------- atividades e execuções ----------
  const novaAtividade = banco.prepare(`INSERT INTO atividades
    (crianca_id, profissional_id, titulo, instrucoes, frequencia, criada_em) VALUES (?, ?, ?, ?, ?, ?)`);
  const ativ1 = novaAtividade.run(theoId, carlos, 'Pedir objeto com figura',
    'Mostre a figura e espere o Theo entregar antes de dar o objeto.', '3x ao dia', dataHora(somarDias(hoje, -56), 10)).lastInsertRowid;
  const ativ2 = novaAtividade.run(theoId, carlos, 'Rotina de escovar os dentes',
    'Use a sequência de figuras da parede do banheiro.', '2x ao dia', dataHora(somarDias(hoje, -28), 10)).lastInsertRowid;
  const novaExecucao = banco.prepare('INSERT INTO execucoes_atividade (atividade_id, data, como_foi, observacao, registrada_em) VALUES (?, ?, ?, ?, ?)');
  for (let d = 56; d >= 1; d--) {
    if (d % 4 === 0) continue; // dias sem fazer, para a adesão não ser 100%
    const dia = somarDias(hoje, -d);
    novaExecucao.run(ativ1, dataHora(dia).slice(0, 10), 1 + (d % 3), null, dataHora(dia, 19));
    if (d <= 28 && d % 3 !== 0) novaExecucao.run(ativ2, dataHora(dia).slice(0, 10), 1 + (d % 2), null, dataHora(dia, 20));
  }

  // ---------- pareceres: um publicado, para o relatório ----------
  banco.prepare('INSERT INTO pareceres (crianca_id, profissional_id, periodo_inicio, periodo_fim, texto, publicado_em) VALUES (?, ?, ?, ?, ?, ?)')
    .run(theoId, carlos, dataHora(somarDias(hoje, -84)).slice(0, 10), dataHora(somarDias(hoje, -7)).slice(0, 10),
      'Avanço na comunicação com figuras e mais tolerância às mudanças de rotina.', dataHora(somarDias(hoje, -6), 17));

  // ---------- log de acesso (para o painel "quem acessou") ----------
  const novoLog = banco.prepare('INSERT INTO log_acesso (usuario_id, crianca_id, acao, recurso, criado_em) VALUES (?, ?, ?, ?, ?)');
  novoLog.run(carlos, theoId, 'VER_PERFIL', 'crianca', dataHora(somarDias(hoje, -7), 14));
  novoLog.run(carlos, theoId, 'VER_LINHA_DO_TEMPO', 'registros', dataHora(somarDias(hoje, -7), 14));
  novoLog.run(carlos, theoId, 'CRIAR_REGISTRO', 'registro_sessao', dataHora(somarDias(hoje, -7), 16));

  // ---------- aviso para a mãe sobre o pedido da Ana ----------
  banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, criada_em) VALUES (?, ?, ?, ?)')
    .run(mariana, 'Dra. Ana Souza pediu acesso aos dados do Theo.', '/solicitacoes', agora);

  // ---------- Davi: pré-cadastro com código de ativação (impresso no terminal) ----------
  const daviId = crypto.randomUUID();
  banco.prepare(`INSERT INTO criancas
    (id, clinica_origem_id, nome, data_nascimento, contato_responsavel_nome, contato_responsavel_parentesco,
     contato_responsavel_email, contato_responsavel_telefone, criada_por)
    VALUES (?, ?, 'Davi', '2020-08-02', 'Fernanda Rocha', 'MAE', 'fernanda@exemplo.test', '(11) 90000-0002', ?)`)
    .run(daviId, aurora, recepcao);
  banco.prepare('INSERT INTO pre_cadastro_profissionais (crianca_id, profissional_id) VALUES (?, ?)').run(daviId, paulo);
  const codigoDavi = gerarCodigo();
  banco.prepare('INSERT INTO codigos_ativacao (crianca_id, codigo_hash, criado_por, expira_em) VALUES (?, ?, ?, ?)')
    .run(daviId, hashCodigo(codigoDavi), recepcao, dataHora(somarDias(hoje, 7), 23));

  // ---------- Sofia: pré-cadastro já INATIVO (31 dias) para mostrar a limpeza ----------
  const sofiaId = crypto.randomUUID();
  banco.prepare(`INSERT INTO criancas
    (id, clinica_origem_id, status_cadastro, inativado_em, nome, data_nascimento, contato_responsavel_nome,
     contato_responsavel_parentesco, contato_responsavel_email, criada_por, criada_em)
    VALUES (?, ?, 'PRE_CADASTRO_INATIVO', ?, 'Sofia', '2019-11-20', 'Ricardo Gomes', 'PAI', 'ricardo@exemplo.test', ?, ?)`)
    .run(sofiaId, aurora, dataHora(hoje, 8), recepcao, dataHora(somarDias(hoje, -31), 9));
  banco.prepare('INSERT INTO codigos_ativacao (crianca_id, codigo_hash, criado_por, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)')
    .run(sofiaId, hashCodigo(gerarCodigo()), recepcao, dataHora(somarDias(hoje, -31), 9), dataHora(somarDias(hoje, -24), 9));

  return { codigoDavi, nascimentoDavi: '2020-08-02' };
}

module.exports = { popular };

if (require.main === module) {
  for (const sufixo of ['', '-wal', '-shm']) fs.rmSync(arquivoPadrao + sufixo, { force: true });
  const banco = abrirBanco();
  criarTabelas(banco);
  const info = popular(banco);
  banco.close();
  console.log('Banco recriado com os dados de demonstração.');
  console.log(`Código de ativação do Davi: ${info.codigoDavi} (nascimento ${info.nascimentoDavi})`);
}
