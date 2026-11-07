// Ajuda dos testes: sobe um app com banco em memória + seed, numa porta livre.
const criarApp = require('../src/app');
const { abrirBanco } = require('../src/config/banco');
const { criarTabelas } = require('../src/database/criar');
const { popular } = require('../src/database/seed');

function iniciar({ comSeed = true } = {}) {
  const banco = abrirBanco(':memory:');
  criarTabelas(banco);
  const info = comSeed ? popular(banco) : null;
  const servidor = criarApp(banco).listen(0);
  const url = `http://localhost:${servidor.address().port}`;

  // Chamada à API: devolve { status, corpo }
  async function chamar(metodo, rota, corpo, token) {
    const resposta = await fetch(url + rota, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { status: resposta.status, corpo: await resposta.json() };
  }

  return { banco, info, url, chamar, fechar: () => servidor.close() };
}

module.exports = { iniciar };
