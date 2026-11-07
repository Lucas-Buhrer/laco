// T-39: ensaio da demonstração curta (doc 09, seção 3.1), cena por cena, pela API.
// Se este teste passa, o roteiro da apresentação funciona de ponta a ponta com o seed.
const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');
const { formatar } = require('../src/utils/datas');

test('ensaio da demo curta: recepção → família → aprovação → profissional → conflito → família → controle', async () => {
  const api = iniciar();
  const entrar = async (codigo, identificador) =>
    (await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' })).corpo.dados.token;
  const bia = await entrar('AURORA', 'recepcao');
  const ana = await entrar('AURORA', 'profissional@laco.test');
  const mae = (await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' })).corpo.dados.token;
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;

  // 1. Recepção: pré-cadastra uma criança nova e gera o código (só dados cadastrais)
  const paulo = (await api.chamar('GET', '/api/clinica/profissionais', null, bia)).corpo.dados.find((p) => p.nome.includes('Paulo'));
  const pre = await api.chamar('POST', '/api/clinica/pre-cadastros', {
    nome: 'Bruno', data_nascimento: '2020-06-01', responsavel_nome: 'Rita Lopes', parentesco: 'MAE', email: 'rita@exemplo.test', profissionais: [paulo.id],
  }, bia);
  assert.strictEqual(pre.status, 201);
  assert.ok(!JSON.stringify(pre.corpo).includes('nivel_suporte'));

  // 2. Família: ativa a conta com código + data de nascimento
  const ativ = await api.chamar('POST', '/api/auth/ativar-conta', {
    codigo: pre.corpo.dados.codigo, data_nascimento: '2020-06-01', nome: 'Rita Lopes', email: 'rita@exemplo.test',
    senha: 'senha-forte-1', parentesco: 'MAE', aceitou_termo: true,
  });
  assert.strictEqual(ativ.status, 201);

  // 3. Aprovação: a mãe do Theo vê o pedido da Ana e aprova sem histórico anterior
  const pedido = (await api.chamar('GET', '/api/vinculos', null, mae)).corpo.dados.find((v) => v.status === 'PENDENTE');
  assert.strictEqual(pedido.profissional_nome, 'Dra. Ana Souza');
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${pedido.id}/aprovar`, { ver_historico_anterior: false, ver_horarios_outras_clinicas: true }, mae)).status, 200);

  // 4. Profissional: vê o Theo, registra sessão (obs visível + privada) e cria atividade
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, ana)).corpo.dados[0].nome, 'Theo');
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo}/registros`, { resumo: 'Sessão de hoje.', humor: 4, observacao: 'Para a família', observacao_visivel_familia: true }, ana)).status, 201);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo}/registros`, { resumo: 'Outra parte.', observacao: 'Só minha' }, ana)).status, 201);
  const ativ2 = await api.chamar('POST', `/api/criancas/${theo}/atividades`, { titulo: 'Soprar bolhas', frequencia: '1 vez ao dia' }, ana);
  assert.strictEqual(ativ2.status, 201);

  // 5. Aviso de conflito: quinta 14h na outra clínica → só { conflito: true }
  const quinta = api.banco.prepare("SELECT inicio FROM consultas WHERE tipo = 'Psicopedagogia'").get().inicio;
  const conflito = await api.chamar('POST', '/api/consultas', { crianca_id: theo, inicio: quinta }, ana);
  assert.deepStrictEqual(conflito.corpo, { conflito: true });
  assert.strictEqual((await api.chamar('POST', '/api/consultas', { crianca_id: theo, inicio: quinta, confirmar_conflito: true }, ana)).status, 201);

  // 6. Família: marca a atividade e abre o relatório (sem a observação privada)
  assert.strictEqual((await api.chamar('POST', `/api/atividades/${ativ2.corpo.dados.id}/execucoes`, { como_foi: 1 }, mae)).status, 201);
  const hoje = formatar(new Date()).slice(0, 10);
  const antes = new Date(); antes.setDate(antes.getDate() - 90);
  const relatorio = await api.chamar('GET', `/api/criancas/${theo}/relatorio?inicio=${formatar(antes).slice(0, 10)}&fim=${hoje}`, null, mae);
  assert.strictEqual(relatorio.status, 200);
  assert.ok(!JSON.stringify(relatorio.corpo).includes('Só minha'));
  const registros = JSON.stringify((await api.chamar('GET', `/api/criancas/${theo}/registros`, null, mae)).corpo);
  assert.ok(registros.includes('Para a família') && !registros.includes('Só minha'));

  // 7. Transparência e controle: "quem acessou" mostra a Ana; revogar fecha o acesso na hora
  const acessos = (await api.chamar('GET', `/api/criancas/${theo}/acessos`, null, mae)).corpo.dados.acessos;
  assert.ok(acessos.some((a) => a.quem === 'Dra. Ana Souza'));
  assert.ok(acessos.some((a) => a.acao.includes('conflito')));
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${pedido.id}/revogar`, {}, mae)).status, 200);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}`, null, ana)).status, 404);
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}/registros`, null, ana)).status, 404);
  api.fechar();
});

test('ensaio da demo completa: pai e mãe, parecer, desativar profissional e exportação', async () => {
  const api = iniciar();
  const entrar = async (identificador) =>
    (await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: 'AURORA', identificador, senha: '123456' })).corpo.dados.token;
  const adm = await entrar('admin@laco.test');
  const carlos = await entrar('carlos@laco.test');
  const mae = (await api.chamar('POST', '/api/auth/login-responsavel', { email: 'responsavel@laco.test', senha: '123456' })).corpo.dados.token;
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;

  // 6. Pai e mãe: convite, segundo aparelho, aviso ao outro
  const convite = (await api.chamar('POST', `/api/criancas/${theo}/convites-responsavel`, {}, mae)).corpo.dados.codigo;
  const pai = await api.chamar('POST', '/api/auth/aceitar-convite-responsavel', {
    codigo: convite, data_nascimento: '2021-03-14', nome: 'Thiago Alves', email: 'thiago@exemplo.test', senha: 'senha-forte-1', parentesco: 'PAI', aceitou_termo: true,
  });
  assert.strictEqual(pai.status, 201);
  // 9. Parecer
  const hoje = formatar(new Date()).slice(0, 10);
  const antes = new Date(); antes.setDate(antes.getDate() - 30);
  assert.strictEqual((await api.chamar('POST', `/api/criancas/${theo}/pareceres`, { periodo_inicio: formatar(antes).slice(0, 10), periodo_fim: hoje, texto: 'Bom avanço.' }, carlos)).status, 201);
  // 13. Exportação
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}/exportar`, null, pai.corpo.dados.token)).status, 200);
  // 12. Saída de profissional: o vínculo fica encerrado e a família vê isso
  const carlosId = api.banco.prepare("SELECT id FROM usuarios WHERE email = 'carlos@laco.test'").get().id;
  assert.strictEqual((await api.chamar('POST', `/api/clinica/profissionais/${carlosId}/desativar`, {}, adm)).status, 200);
  const vinculos = (await api.chamar('GET', '/api/vinculos', null, pai.corpo.dados.token)).corpo.dados;
  assert.ok(vinculos.some((v) => v.profissional_nome === 'Carlos Pereira' && v.status === 'ENCERRADO'));
  api.fechar();
});
