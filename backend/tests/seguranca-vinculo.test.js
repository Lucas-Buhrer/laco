// T-21: matriz de segurança do vínculo. Complementa os testes S-xx já feitos em vinculos/auth/precadastro.
// As rotas de consultas, registros e atividades ainda não existem: hoje a resposta é 404, e este teste
// vai continuar valendo (e vigiando) quando elas forem criadas nas tarefas T-30 a T-32.
const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');

async function clinica(api, codigo, identificador) {
  const r = await api.chamar('POST', '/api/auth/login-clinica', { codigo_clinica: codigo, identificador, senha: '123456' });
  return r.corpo.dados.token;
}
async function responsavel(api, email) {
  const r = await api.chamar('POST', '/api/auth/login-responsavel', { email, senha: '123456' });
  return r.corpo.dados.token;
}

// Todas as formas de ler dados do Theo
function rotasDoTheo(id) {
  return [
    `/api/criancas/${id}`,
    `/api/criancas/${id}/consultas`,
    `/api/criancas/${id}/registros`,
    `/api/criancas/${id}/atividades`,
    `/api/criancas/${id}/linha-do-tempo`,
    `/api/criancas/${id}/exportar`,
    `/api/criancas/${id}/acessos`,
  ];
}

test('S-19 / S-24 / S-05: quem não tem vínculo aprovado não lê nada do Theo por nenhuma rota', async () => {
  const api = iniciar();
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;

  const quemNaoPode = {
    'Ana (vínculo pendente)': await clinica(api, 'AURORA', 'profissional@laco.test'),
    'Paulo (sem vínculo)': await clinica(api, 'AURORA', 'paulo@laco.test'),
    'Admin da Aurora': await clinica(api, 'AURORA', 'admin@laco.test'),
    'Recepção da Aurora': await clinica(api, 'AURORA', 'recepcao'),
    'Marina (outra clínica)': await clinica(api, 'HORIZONTE', 'marina@horizonte.test'),
    'Admin da Horizonte': await clinica(api, 'HORIZONTE', 'admin@horizonte.test'),
  };
  for (const [quem, token] of Object.entries(quemNaoPode)) {
    for (const rota of rotasDoTheo(theo)) {
      const r = await api.chamar('GET', rota, null, token);
      assert.ok([403, 404].includes(r.status), `${quem} abriu ${rota} (status ${r.status})`);
    }
  }
  api.fechar();
});

test('S-04: depois de revogar, TODAS as rotas do Theo fecham na hora para o profissional', async () => {
  const api = iniciar();
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const mae = await responsavel(api, 'responsavel@laco.test');
  const vinculo = api.banco
    .prepare("SELECT v.id FROM vinculos v JOIN usuarios u ON u.id = v.profissional_id WHERE u.email = 'carlos@laco.test' AND v.crianca_id = ?")
    .get(theo);

  // Antes: o perfil abre (o Carlos já tem vínculo aprovado na demo)
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}`, null, carlos)).status, 200);
  assert.strictEqual((await api.chamar('POST', `/api/vinculos/${vinculo.id}/revogar`, {}, mae)).status, 200);
  for (const rota of rotasDoTheo(theo)) {
    const r = await api.chamar('GET', rota, null, carlos);
    assert.ok([403, 404].includes(r.status), `${rota} continuou aberta depois da revogação (status ${r.status})`);
  }
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, carlos)).corpo.dados.length, 0);
  api.fechar();
});

test('S-24: o perfil devolvido ao profissional aprovado não traz campos de bastidores', async () => {
  const api = iniciar();
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
  const carlos = await clinica(api, 'AURORA', 'carlos@laco.test');
  const r = await api.chamar('GET', `/api/criancas/${theo}`, null, carlos);
  assert.strictEqual(r.status, 200);
  // nada de contato do responsável, e-mail, telefone ou códigos
  const texto = JSON.stringify(r.corpo);
  for (const proibido of ['contato_responsavel', 'telefone', 'codigo_hash', 'senha', 'email']) {
    assert.ok(!texto.includes(proibido), `a resposta trouxe "${proibido}"`);
  }
  api.fechar();
});

test('S-08: papéis trocados dão 403 nas rotas do outro lado', async () => {
  const api = iniciar();
  const mae = await responsavel(api, 'responsavel@laco.test');
  const prof = await clinica(api, 'AURORA', 'profissional@laco.test');
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  // responsável não usa rotas da clínica
  for (const rota of ['/api/clinica/pre-cadastros', '/api/clinica/profissionais']) {
    assert.strictEqual((await api.chamar('GET', rota, null, mae)).status, 403, rota);
  }
  assert.strictEqual((await api.chamar('POST', '/api/vinculos/solicitar', { codigo: 'XXXX-XXXX' }, mae)).status, 403);
  // equipe não usa rotas do responsável
  assert.strictEqual((await api.chamar('POST', '/api/criancas/adicionar', {}, prof)).status, 403);
  assert.strictEqual((await api.chamar('POST', '/api/criancas/adicionar', {}, adm)).status, 403);
  // ADM não lista crianças nem vínculos
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, adm)).status, 403);
  assert.strictEqual((await api.chamar('GET', '/api/vinculos', null, adm)).status, 403);
  api.fechar();
});

test('S-22: profissional cadastrado hoje pelo ADM não vê crianças que já existiam', async () => {
  const api = iniciar();
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const novo = await api.chamar('POST', '/api/clinica/profissionais',
    { nome: 'Lia Prado', email: 'lia@exemplo.test', especialidade: 'PSICOLOGO' }, adm);
  const lia = await api.chamar('POST', '/api/auth/login-clinica',
    { codigo_clinica: 'AURORA', identificador: 'lia@exemplo.test', senha: novo.corpo.dados.senha_temporaria });
  const token = lia.corpo.dados.token;
  assert.strictEqual((await api.chamar('GET', '/api/criancas', null, token)).corpo.dados.length, 0);
  const theo = api.banco.prepare("SELECT id FROM criancas WHERE nome = 'Theo'").get().id;
  assert.strictEqual((await api.chamar('GET', `/api/criancas/${theo}`, null, token)).status, 404);
  api.fechar();
});

test('S-25: aprovar vínculo "em nome" da família com o token do ADM, ou de outro responsável, não funciona', async () => {
  const api = iniciar();
  const adm = await clinica(api, 'AURORA', 'admin@laco.test');
  const pendente = api.banco.prepare("SELECT id FROM vinculos WHERE status = 'PENDENTE'").get();
  for (const acao of ['aprovar', 'recusar', 'revogar']) {
    assert.strictEqual((await api.chamar('POST', `/api/vinculos/${pendente.id}/${acao}`, {}, adm)).status, 403);
  }
  assert.strictEqual((await api.chamar('PUT', `/api/vinculos/${pendente.id}/escopo`, { ver_historico_anterior: true }, adm)).status, 403);
  assert.strictEqual(api.banco.prepare('SELECT status FROM vinculos WHERE id = ?').get(pendente.id).status, 'PENDENTE');
  api.fechar();
});
