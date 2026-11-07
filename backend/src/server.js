const criarApp = require('./app');
const ambiente = require('./config/ambiente');
const { abrirBanco } = require('./config/banco');

const app = criarApp(abrirBanco());

app.listen(ambiente.porta, () => {
  console.log(`LAÇO back-end rodando em http://localhost:${ambiente.porta}`);
});
