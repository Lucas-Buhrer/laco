// Acrescenta ao banco da demonstração UM MÊS de uso simulado (tudo fictício):
// 7 profissionais na Aurora, 20 crianças, famílias, consultas, registros, atividades, avisos e log de acessos.
// Rode DEPOIS do seed normal:  npm run seed   e depois   npm run seed:mes
// Os dados são sempre relativos a hoje (de 30 dias atrás até 14 dias à frente) e repetíveis (mesma "semente").
const crypto = require('node:crypto');
const { abrirBanco } = require('../config/banco');
const { gerarCodigo, hashCodigo } = require('../utils/codigos');
const { formatar } = require('../utils/datas');

// ---------- números "aleatórios" repetíveis: a mesma execução gera sempre o mesmo mês ----------
function criarSorteio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
const dia = (data) => formatar(data).slice(0, 10);
const somarDias = (data, n) => { const d = new Date(data); d.setDate(d.getDate() + n); return d; };
const comHora = (data, h, m = 0) => new Date(data.getFullYear(), data.getMonth(), data.getDate(), h, m, 0);

// ---------- equipe nova (Aurora): o texto do atendimento acompanha o desenho da agenda ----------
const EQUIPE_NOVA = [
  { nome: 'Marta Dias', email: 'marta@aurora.test', esp: 'PSICOPEDAGOGO', conselho: 'ABPp', numero: '51001', tipo: 'Psicopedagogia' },
  { nome: 'Rui Alves', email: 'rui@aurora.test', esp: 'FISIOTERAPEUTA', conselho: 'CREFITO', numero: '51002', tipo: 'Fisioterapia' },
  { nome: 'Sara Melo', email: 'sara@aurora.test', esp: 'PSICOMOTRICISTA', conselho: 'ABP', numero: '51003', tipo: 'Psicomotricidade' },
  { nome: 'Tiago Nunes', email: 'tiago@aurora.test', esp: 'MUSICOTERAPEUTA', conselho: 'UBAM', numero: '51004', tipo: 'Musicoterapia' },
];

// ---------- famílias e crianças (nomes inventados) ----------
const F = (resp, par, filhos, outro = null) => ({ resp, par, filhos, outro });
const C = (nome, nasc, nivel, com, sens) => ({ nome, nasc, nivel, com, sens });
const FAMILIAS = [
  F('Mariana Alves', 'MAE', [C('Alice', '2021-09-02', 'Nível 1', 'Fala frases curtas', 'Luz forte')]), // Mariana já existe no seed
  F('Patrícia Gomes', 'MAE', [C('Miguel', '2018-05-21', 'Nível 2', 'Fala algumas palavras e usa figuras', 'Barulhos altos')], { nome: 'Rogério Gomes', par: 'PAI' }),
  F('Fernando Lima', 'PAI', [C('Pedro', '2020-02-11', 'Nível 1', 'Fala bem, evita contato visual', 'Etiquetas de roupa')]),
  F('Camila Rocha', 'MAE', [C('Júlia', '2017-08-30', 'Nível 1', 'Fala e lê', 'Cheiros fortes')]),
  F('Renata Martins', 'MAE', [C('Lara', '2019-11-05', 'Nível 2', 'Usa figuras e gestos', 'Barulho de liquidificador')], { nome: 'Caio Martins', par: 'PAI' }),
  F('Larissa Teixeira', 'MAE', [C('Enzo', '2018-01-17', 'Nível 2', 'Fala poucas palavras', 'Multidões'), C('Duda', '2020-07-09', 'Nível 1', 'Fala frases curtas', 'Texturas de comida')]),
  F('Gustavo Prado', 'PAI', [C('Rafa', '2019-04-25', 'Nível 3', 'Usa figuras', 'Sons agudos'), C('Gabi', '2022-01-13', 'Nível 1', 'Balbucia e aponta', 'Luz forte')], { nome: 'Helena Prado', par: 'MAE' }),
  F('Débora Nascimento', 'MAE', [C('Nina', '2020-10-03', 'Nível 1', 'Fala frases curtas', 'Barulho de secador')]),
  F('Eduardo Farias', 'PAI', [C('Bruno', '2016-12-19', 'Nível 2', 'Fala com apoio de figuras', 'Mudanças de rotina')]),
  F('Simone Ribeiro', 'MAE', [C('Lia', '2021-03-28', 'Nível 2', 'Usa gestos', 'Água no rosto')]),
  F('Aline Barros', 'MAE', [C('Bento', '2018-09-14', 'Nível 1', 'Fala e canta', 'Sons de sirene'), C('Helena', '2021-06-06', 'Nível 1', 'Fala frases curtas', 'Escuro')]),
  F('Marcos Vieira', 'PAI', [C('Joaquim', '2017-02-08', 'Nível 3', 'Usa tablet com figuras', 'Barulhos altos')], { nome: 'Tânia Vieira', par: 'MAE' }),
  F('Bianca Torres', 'MAE', [C('Valentina', '2019-08-22', 'Nível 2', 'Fala algumas palavras', 'Abraços apertados')]),
  F('Ricardo Moura', 'PAI', [C('Arthur', '2020-05-16', 'Nível 1', 'Fala bem', 'Cheiro de tinta')]),
  F('Vanessa Cardoso', 'MAE', [C('Cecília', '2018-11-30', 'Nível 2', 'Usa figuras e fala poucas palavras', 'Sons de moto')]),
  F('Tatiane Lopes', 'MAE', [C('Maya', '2020-09-12', 'Nível 1', 'Fala frases curtas', 'Barulho de chuva')]),
  F('Paulo Henrique Dias', 'PAI', [C('Samuel', '2019-01-07', 'Nível 1', 'Fala frases curtas', 'Escovar o cabelo')], { nome: 'Luciana Dias', par: 'MAE' }),
];

// ---------- textos das sessões, por tipo de atendimento ----------
const SESSAO = {
  Fonoaudiologia: {
    resumo: ['Trabalhamos pedido de objetos com figuras. Teve boa resposta no começo e cansou perto do fim.', 'Brincamos com sons de animais e nomeação de objetos. Imitou três sons novos.', 'Treinamos frases de duas palavras durante o lanche de brinquedo.'],
    objetivos: ['Pedir objeto com figura', 'Nomear objetos', 'Imitar sons', 'Formar frases de duas palavras'],
  },
  'Terapia ocupacional': {
    resumo: ['Atividades de coordenação fina com massinha e pegadores. Aceitou bem a troca de atividade.', 'Treinamos a rotina de higiene com a sequência de figuras. Fez quase tudo sozinho.', 'Circuito sensorial com texturas. Tolerou melhor o contato com areia.'],
    objetivos: ['Coordenação fina', 'Rotina de higiene', 'Troca de atividade', 'Integração sensorial'],
  },
  'Psicologia ABA': {
    resumo: ['Trabalhamos esperar a vez em jogos de tabuleiro. Teve duas frustrações e se recuperou com pausa.', 'Treino de seguir instruções de dois passos. Acertou a maioria com apoio.', 'Reforço positivo para pedir ajuda em vez de gritar. Boa evolução hoje.'],
    objetivos: ['Esperar a vez', 'Seguir instruções', 'Pedir ajuda', 'Tolerância à frustração'],
  },
  Psicopedagogia: {
    resumo: ['Leitura compartilhada de um livro curto e jogo de memória. Manteve a atenção por 15 minutos.', 'Atividades de contagem com blocos. Reconheceu os números até 10.', 'Escrita do nome com apoio. Mais firmeza no traço.'],
    objetivos: ['Atenção sustentada', 'Contagem até 10', 'Escrita do nome', 'Reconhecer letras'],
  },
  Fisioterapia: {
    resumo: ['Exercícios de equilíbrio e alongamento com música. Ficou animado com o circuito.', 'Treino de subir e descer degraus alternando os pés. Precisou de menos apoio.', 'Fortalecimento do tronco com bola. Tolerou bem os 20 minutos.'],
    objetivos: ['Equilíbrio', 'Força do tronco', 'Marcha', 'Coordenação global'],
  },
  Psicomotricidade: {
    resumo: ['Jogos de lateralidade com bambolês. Acertou direita e esquerda na maior parte.', 'Brincadeira de imitar movimentos. Mais atenção ao corpo do colega.', 'Percurso com obstáculos. Planejou o caminho sozinho.'],
    objetivos: ['Lateralidade', 'Imitação de movimentos', 'Planejamento motor', 'Consciência corporal'],
  },
  Musicoterapia: {
    resumo: ['Cantamos a música do bom dia e tocamos chocalho no ritmo. Sorriu e participou do início ao fim.', 'Improvisação com tambor. Começou a alternar sons fortes e fracos.', 'Música para transições: aceitou melhor o fim da sessão.'],
    objetivos: ['Ritmo', 'Interação em grupo', 'Transições', 'Expressão com instrumentos'],
  },
};
const OBS_PRIVADA = ['Anotação minha: rever objetivos na próxima reunião com a família.', 'Observar sono e alimentação nas próximas semanas.', 'Anotação minha: considerar encaminhamento para avaliação complementar.', 'Pareceu mais ansioso com a mudança de sala.'];
const OBS_VISIVEL = ['Pode treinar o pedido com figura no lanche.', 'Vale repetir a música em casa antes de dormir.', 'Peçam para ele escolher a roupa com duas figuras.', 'Elogiem quando esperar a vez.'];
const EXECUCAO_OBS = ['Ficou cansado no fim.', 'Pediu para repetir!', 'Só fez com ajuda.', 'Fez sozinho.', 'Irmã participou junto.'];

const ATIVIDADES = {
  Fonoaudiologia: [['Pedir objeto usando a figura', 'Mostre a figura e espere antes de entregar o objeto.', '3 vezes ao dia'], ['Nomear 3 objetos da casa', 'Aponte e peça para dizer o nome.', '1 vez ao dia']],
  'Terapia ocupacional': [['Rotina de escovar os dentes', 'Use a sequência de figuras do banheiro.', '2 vezes ao dia'], ['Abotoar e desabotoar', 'Treine com uma camisa velha.', '1 vez ao dia']],
  'Psicologia ABA': [['Esperar a vez em brincadeiras', 'Use um cartão de "minha vez / sua vez".', '1 vez ao dia'], ['Guardar os brinquedos', 'Cante a música de guardar.', '1 vez ao dia']],
  Psicopedagogia: [['Leitura de 10 minutos', 'Leiam juntos um livro curto.', '1 vez ao dia'], ['Jogo de memória', 'Jogue com 6 cartas.', '3 vezes por semana']],
  Fisioterapia: [['Alongamento com música', 'Faça os 5 alongamentos da folha.', '1 vez ao dia'], ['Circuito de almofadas', 'Monte um caminho com almofadas.', '3 vezes por semana']],
  Psicomotricidade: [['Brincar de equilíbrio', 'Andar sobre uma linha de fita no chão.', '3 vezes por semana'], ['Jogo da amarelinha', 'Desenhe no chão e pule junto.', '2 vezes por semana']],
  Musicoterapia: [['Cantar a música do bom dia', 'Cantem juntos ao acordar.', '1 vez ao dia'], ['Tocar chocalho no ritmo', 'Acompanhe a música com o chocalho.', '3 vezes por semana']],
};

function popularMes(banco) {
  const sorteio = criarSorteio(20261107);
  const chance = (p) => sorteio() < p;
  const sortear = (lista) => lista[Math.floor(sorteio() * lista.length)];
  const entre = (a, b) => a + Math.floor(sorteio() * (b - a + 1));

  if (banco.prepare("SELECT 1 FROM usuarios WHERE email = 'marta@aurora.test'").get()) {
    throw new Error('Os dados do mês já foram adicionados. Para recomeçar, rode: npm run seed');
  }
  const um = (sql, ...args) => banco.prepare(sql).get(...args);
  const aurora = um("SELECT id FROM clinicas WHERE codigo_acesso = 'AURORA'")?.id;
  const horizonte = um("SELECT id FROM clinicas WHERE codigo_acesso = 'HORIZONTE'")?.id;
  if (!aurora || !horizonte) throw new Error('Rode primeiro: npm run seed');

  const recepcao = um("SELECT id FROM usuarios WHERE codigo_usuario = 'recepcao'").id;
  const admin = um("SELECT id FROM usuarios WHERE email = 'admin@laco.test'").id;
  const senhaHash = um("SELECT senha_hash FROM usuarios WHERE email = 'admin@laco.test'").senha_hash; // a mesma senha da demonstração
  const marina = um("SELECT id FROM usuarios WHERE email = 'marina@horizonte.test'").id;
  const mariana = um("SELECT id FROM usuarios WHERE email = 'responsavel@laco.test'").id;

  const agora = new Date();
  const hoje = comHora(agora, 0);
  const iso = (d) => formatar(d);

  // ---------- 1. equipe: 7 profissionais na Aurora (os 3 do seed + 4 novos) ----------
  const novoUsuario = banco.prepare(`INSERT INTO usuarios
    (clinica_id, papel, nome, email, senha_hash, especialidade, registro_conselho, registro_numero, registro_uf, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SP', ?)`);
  const profs = [
    { id: um("SELECT id FROM usuarios WHERE email = 'profissional@laco.test'").id, nome: 'Dra. Ana Souza', tipo: 'Fonoaudiologia' },
    { id: um("SELECT id FROM usuarios WHERE email = 'carlos@laco.test'").id, nome: 'Carlos Pereira', tipo: 'Terapia ocupacional' },
    { id: um("SELECT id FROM usuarios WHERE email = 'paulo@laco.test'").id, nome: 'Paulo Mendes', tipo: 'Psicologia ABA' },
  ];
  for (const p of EQUIPE_NOVA) {
    const id = novoUsuario.run(aurora, 'PROFISSIONAL', p.nome, p.email, senhaHash, p.esp, p.conselho, p.numero, iso(somarDias(hoje, -60))).lastInsertRowid;
    profs.push({ id, nome: p.nome, tipo: p.tipo });
  }

  // ---------- 2. famílias e crianças ----------
  const novaCrianca = banco.prepare(`INSERT INTO criancas
    (id, clinica_origem_id, status_cadastro, nome, data_nascimento, contato_responsavel_nome, contato_responsavel_parentesco,
     contato_responsavel_email, contato_responsavel_telefone, nivel_suporte, comunicacao, sensibilidades, observacoes, criada_por, criada_em)
    VALUES (?, ?, 'ATIVA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const novoCodigo = banco.prepare('INSERT INTO codigos_ativacao (crianca_id, codigo_hash, criado_por, criado_em, expira_em, usado_em) VALUES (?, ?, ?, ?, ?, ?)');
  const novoResp = banco.prepare('INSERT INTO responsaveis_crianca (crianca_id, responsavel_id, parentesco, entrou_em) VALUES (?, ?, ?, ?)');
  const novoConsent = banco.prepare('INSERT INTO consentimentos (usuario_id, versao_termo, aceito_em) VALUES (?, ?, ?)');

  const criancas = []; // { id, nome, famIdx, responsaveis: [ids] }
  let telefone = 1000;
  FAMILIAS.forEach((fam, fi) => {
    let principal;
    const emails = [];
    const criarPessoa = (nome) => {
      const email = `${semAcento(nome)}@exemplo.test`;
      emails.push(email);
      const id = banco.prepare("INSERT INTO usuarios (papel, nome, email, senha_hash, criado_em) VALUES ('RESPONSAVEL', ?, ?, ?, ?)")
        .run(nome, email, senhaHash, iso(somarDias(hoje, -45))).lastInsertRowid;
      novoConsent.run(id, '1.0-rascunho', iso(somarDias(hoje, -44)));
      return id;
    };
    principal = fi === 0 ? mariana : criarPessoa(fam.resp);
    const segundo = fam.outro ? criarPessoa(fam.outro.nome) : null;

    for (const filho of fam.filhos) {
      const id = crypto.randomUUID();
      telefone += 7;
      novaCrianca.run(id, aurora, filho.nome, filho.nasc, fam.resp, fam.par, `${semAcento(fam.resp)}@exemplo.test`, `(11) 9${telefone}-${String(2000 + telefone).slice(-4)}`,
        filho.nivel, filho.com, filho.sens, chance(0.6) ? 'Gosta de blocos de montar e de rotina previsível.' : null, recepcao, iso(somarDias(hoje, -46)));
      novoCodigo.run(id, hashCodigo(gerarCodigo()), recepcao, iso(somarDias(hoje, -46)), iso(somarDias(hoje, -39)), iso(somarDias(hoje, -44)));
      const donos = [principal];
      novoResp.run(id, principal, fam.par, iso(somarDias(hoje, -44)));
      if (segundo) {
        novoResp.run(id, segundo, fam.outro.par, iso(somarDias(hoje, -30)));
        donos.push(segundo);
      }
      criancas.push({ id, nome: filho.nome, fi, responsaveis: donos });
    }
  });

  // ---------- 3. vínculos ----------
  const novoVinculo = banco.prepare(`INSERT INTO vinculos
    (crianca_id, profissional_id, origem, solicitado_por, status, ver_historico_anterior, ver_horarios_outras_clinicas,
     solicitado_em, respondido_em, aprovado_em, revogado_em, encerrado_em, motivo_encerramento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const pares = []; // vínculos que geram sessões
  const pendentes = []; // pedidos esperando a família
  const avisosVinculo = []; // { usuario, texto, link, quando }

  criancas.forEach((c, i) => {
    const primaria = i % profs.length;
    const aprovadoEm = somarDias(hoje, -(i % 5 === 0 ? 20 : 36)); // alguns começaram no meio do mês
    const registrarAprovado = (p, origem, aprovado, quinzenal) => {
      const hist = chance(0.2) ? 1 : 0;
      const id = novoVinculo.run(c.id, p.id, origem, recepcao, 'APROVADO', hist, 1, iso(somarDias(aprovado, -1)), iso(aprovado), iso(aprovado), null, null, null).lastInsertRowid;
      pares.push({ vinculoId: id, c, p, desde: aprovado, ate: null, quinzenal, hist });
      avisosVinculo.push({ usuario: p.id, texto: `A família aprovou o seu acesso a ${c.nome}.`, link: '/clinica/criancas', quando: aprovado, lida: 1 });
    };
    registrarAprovado(profs[primaria], 'CLINICA_ORIGEM', aprovadoEm, false);
    if (i % 3 === 1) registrarAprovado(profs[(primaria + 3) % profs.length], 'MESMA_CLINICA', somarDias(hoje, -22), true); // segundo profissional, de 15 em 15 dias

    // alguns casos de vínculos que não são "aprovado e funcionando"
    if (i === 3 || i === 9 || i === 14) { // pedidos esperando a família
      const p = profs[(primaria + 1 + (i % 2)) % profs.length];
      const quando = somarDias(hoje, -(2 + (i % 4)));
      const id = novoVinculo.run(c.id, p.id, 'MESMA_CLINICA', recepcao, 'PENDENTE', 0, 1, iso(quando), null, null, null, null, null).lastInsertRowid;
      pendentes.push({ vinculoId: id, c, p });
      for (const r of c.responsaveis) avisosVinculo.push({ usuario: r, texto: `${p.nome} pediu acesso aos dados de ${c.nome}.`, link: '/familia/solicitacoes', quando, lida: 0 });
    }
    if (i === 5) novoVinculo.run(c.id, profs[6].id, 'MESMA_CLINICA', recepcao, 'RECUSADO', 0, 1, iso(somarDias(hoje, -12)), iso(somarDias(hoje, -11)), null, null, null, null);
    if (i === 11) novoVinculo.run(c.id, profs[5].id, 'MESMA_CLINICA', recepcao, 'EXPIRADO', 0, 1, iso(somarDias(hoje, -12)), iso(somarDias(hoje, -5)), null, null, null, null);
    if (i === 7) { // a família retirou o acesso de um profissional há 10 dias
      const p = profs[4];
      const aprov = somarDias(hoje, -34);
      const rev = somarDias(hoje, -10);
      const id = novoVinculo.run(c.id, p.id, 'MESMA_CLINICA', recepcao, 'REVOGADO', 0, 1, iso(somarDias(aprov, -1)), iso(aprov), iso(aprov), iso(rev), null, null).lastInsertRowid;
      pares.push({ vinculoId: id, c, p, desde: aprov, ate: rev, quinzenal: false, hist: 0 });
      avisosVinculo.push({ usuario: p.id, texto: `A família encerrou o seu acesso a ${c.nome}.`, link: null, quando: rev, lida: 1 });
    }
  });

  // Horizonte: 3 crianças também são atendidas por lá (dá conflito de horário de verdade)
  const paresHorizonte = [];
  [1, 2, 6].forEach((i) => {
    const c = criancas[i];
    const aprov = somarDias(hoje, -33);
    const id = novoVinculo.run(c.id, marina, 'CONVITE_RESPONSAVEL', c.responsaveis[0], 'APROVADO', 0, 1, iso(somarDias(aprov, -1)), iso(aprov), iso(aprov), null, null, null).lastInsertRowid;
    paresHorizonte.push({ vinculoId: id, c, p: { id: marina, nome: 'Marina Costa', tipo: 'Psicopedagogia' }, desde: aprov, ate: null, quinzenal: false, clinica: horizonte, criador: marina });
  });

  // ---------- 4. consultas ----------
  const novaConsulta = banco.prepare(`INSERT INTO consultas
    (crianca_id, profissional_id, clinica_id, criada_por, inicio, duracao_min, tipo, status, remarcada_para_id,
     presenca_confirmada, confirmada_em, confirmada_por, aguardando_aprovacao, criada_em)
    VALUES (?, ?, ?, ?, ?, 50, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const ocupado = new Set(); // "profissional|dia|hora" e "crianca|dia|hora"
  const marca = (chave) => ocupado.add(chave);
  for (const e of banco.prepare("SELECT profissional_id, crianca_id, inicio FROM consultas WHERE status <> 'CANCELADA'").all()) {
    marca(`p${e.profissional_id}|${e.inicio.slice(0, 13)}`);
    marca(`c${e.crianca_id}|${e.inicio.slice(0, 13)}`);
  }
  const livre = (p, c, d, h) => {
    const chave = `${dia(d)}T${String(h).padStart(2, '0')}`;
    return !ocupado.has(`p${p}|${chave}`) && !ocupado.has(`c${c}|${chave}`);
  };
  const reservar = (p, c, d, h) => {
    const chave = `${dia(d)}T${String(h).padStart(2, '0')}`;
    marca(`p${p}|${chave}`);
    marca(`c${c}|${chave}`);
  };

  const segundaDaSemana = somarDias(hoje, -((hoje.getDay() + 6) % 7));
  const realizadas = []; // consultas feitas, para os registros
  let totalConsultas = 0;
  const contagem = { REALIZADA: 0, FALTA: 0, CANCELADA: 0, REMARCADA: 0, AGENDADA: 0 };

  const sessoes = (par) => {
    // procura um horário semanal fixo livre em todas as semanas do mês
    const datasDoPar = (diaSemana) => {
      const lista = [];
      for (let semana = -5; semana <= 2; semana++) {
        if (par.quinzenal && semana % 2 !== 0) continue;
        const d = somarDias(segundaDaSemana, semana * 7 + diaSemana);
        if (d < somarDias(hoje, -30) || d > somarDias(hoje, 14)) continue;
        if (d < par.desde || (par.ate && d >= par.ate)) continue;
        lista.push(d);
      }
      return lista;
    };
    for (let tentativa = 0; tentativa < 300; tentativa++) {
      const diaSemana = entre(0, 4);
      const hora = entre(8, 16);
      const datas = datasDoPar(diaSemana);
      if (datas.every((d) => livre(par.p.id, par.c.id, d, hora))) return datas.map((d) => ({ d, hora }));
    }
    return [];
  };

  const clinicaDoPar = (par) => par.clinica || aurora;
  const criadorDoPar = (par) => par.criador || (chance(0.7) ? recepcao : par.p.id);
  const todosOsPares = [...pares, ...paresHorizonte];
  const dadosDoMes = new Map(); // criança → { humorBase, inicio }
  criancas.forEach((c) => dadosDoMes.set(c.id, { humorBase: entre(2, 3) }));

  for (const par of todosOsPares) {
    for (const { d, hora } of sessoes(par)) {
      const inicio = comHora(d, hora);
      reservar(par.p.id, par.c.id, d, hora);
      const passou = inicio < agora;
      const criadaEm = iso(somarDias(inicio, -entre(3, 10)));
      const linha = (status, ini, remarcadaPara = null, conf = 0, por = null, em = null) =>
        novaConsulta.run(par.c.id, par.p.id, clinicaDoPar(par), criadorDoPar(par), iso(ini), par.p.tipo, status, remarcadaPara, conf, em, por, 0, criadaEm).lastInsertRowid;

      if (passou) {
        const sorte = sorteio();
        if (sorte < 0.82 || par.clinica) {
          const id = linha('REALIZADA', inicio, null, 1, 'RESPONSAVEL', iso(somarDias(inicio, -2)));
          contagem.REALIZADA++;
          if (!par.clinica) realizadas.push({ id, par, inicio });
        } else if (sorte < 0.90) { linha('FALTA', inicio); contagem.FALTA++; }
        else if (sorte < 0.96) { linha('CANCELADA', inicio); contagem.CANCELADA++; }
        else { // remarcada para o dia seguinte, no mesmo horário, se estiver livre
          const novoDia = somarDias(d, 1);
          if (livre(par.p.id, par.c.id, novoDia, hora) && novoDia.getDay() !== 0) {
            reservar(par.p.id, par.c.id, novoDia, hora);
            const novaIni = comHora(novoDia, hora);
            const novoId = novaIni < agora
              ? linha('REALIZADA', novaIni, null, 1, 'RESPONSAVEL', iso(somarDias(novaIni, -2)))
              : linha('AGENDADA', novaIni);
            linha('REMARCADA', inicio, novoId);
            contagem.REMARCADA++;
            if (novaIni < agora) { contagem.REALIZADA++; realizadas.push({ id: novoId, par, inicio: novaIni }); } else contagem.AGENDADA++;
          } else { linha('CANCELADA', inicio); contagem.CANCELADA++; }
        }
      } else {
        // futura: metade já confirmada (algumas por telefone)
        const confirmada = chance(0.5);
        const porContato = confirmada && chance(0.2);
        linha('AGENDADA', inicio, null, confirmada ? 1 : 0, confirmada ? (porContato ? 'CONTATO' : 'RESPONSAVEL') : null, confirmada ? iso(somarDias(inicio, -entre(2, 5))) : null);
        contagem.AGENDADA++;
      }
      totalConsultas++;
    }
  }

  // consultas "aguardando aprovação da família" dos pedidos pendentes (marcadas pela recepção)
  for (const pend of pendentes) {
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      const d = somarDias(hoje, entre(2, 12));
      const hora = entre(8, 16);
      if (d.getDay() === 0 || d.getDay() === 6 || !livre(pend.p.id, pend.c.id, d, hora)) continue;
      reservar(pend.p.id, pend.c.id, d, hora);
      novaConsulta.run(pend.c.id, pend.p.id, aurora, recepcao, iso(comHora(d, hora)), pend.p.tipo, 'AGENDADA', null, 0, null, null, 1, iso(somarDias(hoje, -1)));
      contagem.AGENDADA++;
      totalConsultas++;
      break;
    }
  }

  // ---------- 5. registros de sessão, adendos e log de acesso ----------
  const novoRegistro = banco.prepare(`INSERT INTO registros_sessao
    (crianca_id, profissional_id, consulta_id, resumo, objetivos, humor, observacao, observacao_visivel_familia, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const novoAdendo = banco.prepare('INSERT INTO adendos_registro (registro_id, profissional_id, texto, criado_em) VALUES (?, ?, ?, ?)');
  const novoLog = banco.prepare('INSERT INTO log_acesso (usuario_id, crianca_id, acao, recurso, recurso_id, ip, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const novoAviso = banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, lida, criada_em) VALUES (?, ?, ?, ?, ?)');
  let totalRegistros = 0;
  let totalAdendos = 0;
  const limite = (n) => Math.max(1, Math.min(5, n));

  for (const r of realizadas) {
    const modelo = SESSAO[r.par.p.tipo];
    const dias = (r.inicio - somarDias(hoje, -30)) / 86400000;
    const base = dadosDoMes.get(r.par.c.id).humorBase;
    const humor = limite(Math.round(base + (dias / 30) * 1.5 + (sorteio() - 0.5) * 1.6));
    const objetivos = [sortear(modelo.objetivos), ...(chance(0.4) ? [sortear(modelo.objetivos)] : [])].filter((o, i, a) => a.indexOf(o) === i).join(', ');
    const temObs = chance(0.4);
    const visivel = temObs && chance(0.5) ? 1 : 0;
    const obs = temObs ? sortear(visivel ? OBS_VISIVEL : OBS_PRIVADA) : null;
    const quando = new Date(r.inicio.getTime() + 55 * 60000);
    const regId = novoRegistro.run(r.par.c.id, r.par.p.id, r.id, `${sortear(modelo.resumo)}`, objetivos, humor, obs, visivel, iso(quando)).lastInsertRowid;
    totalRegistros++;
    novoLog.run(r.par.p.id, r.par.c.id, 'CRIAR_REGISTRO', 'registro_sessao', regId, '127.0.0.1', iso(quando));
    novoLog.run(r.par.p.id, r.par.c.id, 'VER_LINHA_DO_TEMPO', 'registros', null, '127.0.0.1', iso(new Date(r.inicio.getTime() - 10 * 60000)));
    if (chance(0.15)) novoLog.run(r.par.p.id, r.par.c.id, 'VER_PERFIL', 'crianca', r.par.c.id, '127.0.0.1', iso(new Date(r.inicio.getTime() - 12 * 60000)));
    if (chance(0.06)) { novoAdendo.run(regId, r.par.p.id, 'Correção: o número de acertos foi 4 de 5, não 3 de 5.', iso(new Date(quando.getTime() + 3600000))); totalAdendos++; }
    // a família é avisada dos registros mais recentes (os dos últimos 2 dias ainda não foram lidos)
    if (r.inicio > somarDias(agora, -7)) {
      const recente = r.inicio > somarDias(agora, -2);
      for (const resp of r.par.c.responsaveis) novoAviso.run(resp, `${r.par.p.nome} registrou uma sessão de ${r.par.c.nome}.`, '/familia/linha-do-tempo', recente ? 0 : 1, iso(quando));
    }
  }

  // aprovações e pedidos no log e nos avisos
  for (const a of avisosVinculo) novoAviso.run(a.usuario, a.texto, a.link, a.lida, iso(a.quando));
  for (const par of pares) novoLog.run(par.c.responsaveis[0], par.c.id, 'APROVAR_VINCULO', 'vinculo', par.vinculoId, '127.0.0.1', iso(par.desde));
  for (const par of pares.filter((p) => p.ate)) novoLog.run(par.c.responsaveis[0], par.c.id, 'REVOGAR_VINCULO', 'vinculo', par.vinculoId, '127.0.0.1', iso(par.ate));

  // ---------- 6. atividades de casa e execuções ----------
  const novaAtividade = banco.prepare('INSERT INTO atividades (crianca_id, profissional_id, titulo, instrucoes, frequencia, prazo, status, criada_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const novaExecucao = banco.prepare('INSERT INTO execucoes_atividade (atividade_id, data, como_foi, observacao, registrada_em) VALUES (?, ?, ?, ?, ?)');
  let totalAtividades = 0;
  let totalExecucoes = 0;
  const primarios = pares.filter((p) => !p.ate).slice(0, 14);
  for (const par of primarios) {
    const modelos = ATIVIDADES[par.p.tipo];
    const quantas = chance(0.5) ? 2 : 1;
    for (let k = 0; k < quantas; k++) {
      const [titulo, instrucoes, freq] = modelos[k];
      const criada = par.desde > somarDias(hoje, -28) ? par.desde : somarDias(hoje, -28 + entre(0, 4));
      const encerrada = chance(0.1);
      const atividadeId = novaAtividade.run(par.c.id, par.p.id, titulo, instrucoes, freq, null, encerrada ? 'ENCERRADA' : 'ATIVA', iso(comHora(criada, 10))).lastInsertRowid;
      totalAtividades++;
      novoLog.run(par.p.id, par.c.id, 'CRIAR_ATIVIDADE', 'atividade', atividadeId, '127.0.0.1', iso(comHora(criada, 10)));
      for (const resp of par.c.responsaveis) novoAviso.run(resp, `Nova atividade de casa para ${par.c.nome}: ${titulo}.`, '/familia/atividades', 1, iso(comHora(criada, 10)));

      const adesao = 0.5 + sorteio() * 0.45; // cada família tem o seu ritmo
      const porDia = /dia/.test(freq) ? parseInt(freq, 10) : 0;
      const porSemana = /semana/.test(freq) ? parseInt(freq, 10) : 0;
      const diasDaSemana = { 1: [3], 2: [2, 4], 3: [1, 3, 5] }[porSemana] || [];
      for (let d = new Date(criada); d <= hoje; d = somarDias(d, 1)) {
        if (encerrada && d > somarDias(hoje, -8)) break;
        const previstas = porDia || (diasDaSemana.includes(d.getDay()) ? 1 : 0);
        for (let n = 0; n < previstas; n++) {
          if (!chance(adesao)) continue;
          const hora = 8 + n * 5 + entre(0, 2);
          const quando = comHora(d, Math.min(hora, 21), entre(0, 50));
          if (quando > agora) continue;
          const comoFoi = sorteio() < 0.55 ? 1 : sorteio() < 0.65 ? 2 : 3;
          novaExecucao.run(atividadeId, dia(d), comoFoi, chance(0.1) ? sortear(EXECUCAO_OBS) : null, iso(quando));
          totalExecucoes++;
        }
      }
    }
  }

  // ---------- 7. pareceres publicados ----------
  const novoParecer = banco.prepare('INSERT INTO pareceres (crianca_id, profissional_id, periodo_inicio, periodo_fim, texto, publicado_em) VALUES (?, ?, ?, ?, ?, ?)');
  const TEXTOS_PARECER = [
    'Houve avanço consistente na comunicação com figuras, em casa e nas sessões. Próximo passo: combinar duas figuras na mesma frase.',
    'Mais tolerância às mudanças de atividade e menos episódios de frustração. Seguimos com reforço positivo.',
    'A atenção sustentada aumentou de 5 para cerca de 15 minutos. Vale manter a leitura diária em casa.',
  ];
  primarios.filter((p) => p.desde < somarDias(hoje, -25)).slice(0, 3).forEach((par, i) => {
    novoParecer.run(par.c.id, par.p.id, dia(somarDias(hoje, -30)), dia(somarDias(hoje, -3)), TEXTOS_PARECER[i], iso(comHora(somarDias(hoje, -2 - i), 17)));
    for (const resp of par.c.responsaveis) novoAviso.run(resp, `${par.p.nome} publicou um parecer sobre ${par.c.nome}. Veja no relatório de evolução.`, '/familia/relatorio', 0, iso(comHora(somarDias(hoje, -2 - i), 17)));
  });

  // ---------- 8. pré-cadastros em andamento (recepção) ----------
  const novoPre = banco.prepare(`INSERT INTO criancas
    (id, clinica_origem_id, status_cadastro, inativado_em, nome, data_nascimento, contato_responsavel_nome, contato_responsavel_parentesco,
     contato_responsavel_email, contato_responsavel_telefone, criada_por, criada_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const indicar = banco.prepare('INSERT INTO pre_cadastro_profissionais (crianca_id, profissional_id) VALUES (?, ?)');
  const preCadastros = [
    ['Heitor', '2020-12-01', 'Isabela Freitas', 'MAE', 3, 'PRE_CADASTRO', profs[1]],
    ['Manuela', '2019-06-18', 'Jorge Santana', 'PAI', 24, 'PRE_CADASTRO', profs[0]],
    ['Otávio', '2021-02-26', 'Daniela Pires', 'MAE', 34, 'PRE_CADASTRO_INATIVO', profs[2]],
  ];
  for (const [nome, nasc, resp, par, diasAtras, status, prof] of preCadastros) {
    const id = crypto.randomUUID();
    const criada = somarDias(hoje, -diasAtras);
    novoPre.run(id, aurora, status, status === 'PRE_CADASTRO_INATIVO' ? iso(somarDias(hoje, -4)) : null, nome, nasc, resp, par,
      `${semAcento(resp)}@exemplo.test`, `(11) 9${5000 + diasAtras}-${1000 + diasAtras}`, recepcao, iso(comHora(criada, 9)));
    indicar.run(id, prof.id);
    novoCodigo.run(id, hashCodigo(gerarCodigo()), recepcao, iso(comHora(criada, 9)), iso(comHora(somarDias(criada, 7), 23)), null);
    if (status === 'PRE_CADASTRO_INATIVO') novoAviso.run(admin, `O pré-cadastro de ${nome} ficou inativo: a família não ativou em 30 dias. Gere um novo código para reativar.`, '/clinica/pre-cadastros', 1, iso(somarDias(hoje, -4)));
  }

  return {
    profissionaisAurora: profs.length,
    criancasAtivasNovas: criancas.length,
    familias: FAMILIAS.length,
    consultas: totalConsultas,
    porSituacao: contagem,
    registros: totalRegistros,
    adendos: totalAdendos,
    atividades: totalAtividades,
    execucoes: totalExecucoes,
    pedidosPendentes: pendentes.length,
  };
}

module.exports = { popularMes };

if (require.main === module) {
  const banco = abrirBanco();
  try {
    const r = banco.transaction(() => popularMes(banco))();
    console.log('Um mês de uso simulado foi adicionado ao banco:');
    console.log(`  ${r.profissionaisAurora} profissionais na Aurora · ${r.criancasAtivasNovas} crianças · ${r.familias} famílias`);
    console.log(`  ${r.consultas} consultas (${JSON.stringify(r.porSituacao)})`);
    console.log(`  ${r.registros} registros de sessão · ${r.adendos} adendos · ${r.atividades} atividades · ${r.execucoes} execuções · ${r.pedidosPendentes} pedidos esperando a família`);
    console.log('Os novos profissionais e famílias usam a mesma senha da demonstração (veja README).');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    banco.close();
  }
}
