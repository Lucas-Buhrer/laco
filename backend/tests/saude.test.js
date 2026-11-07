const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('a API responde na rota de saúde', async () => {
  // porta 0 = o sistema escolhe uma porta livre, sem conflito com o dev
  const servidor = app.listen(0);
  const { port } = servidor.address();
  const resposta = await fetch(`http://localhost:${port}/api/saude`);
  const corpo = await resposta.json();
  servidor.close();
  assert.strictEqual(resposta.status, 200);
  assert.deepStrictEqual(corpo, { dados: { ok: true } });
});
