const test = require('node:test');
const assert = require('node:assert');
const { iniciar } = require('./ajuda');

test('a API responde na rota de saúde', async () => {
  const api = iniciar({ comSeed: false });
  const { status, corpo } = await api.chamar('GET', '/api/saude');
  api.fechar();
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(corpo, { dados: { ok: true } });
});
