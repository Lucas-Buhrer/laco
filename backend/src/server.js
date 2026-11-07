const app = require('./app');
const ambiente = require('./config/ambiente');

app.listen(ambiente.porta, () => {
  console.log(`LAÇO back-end rodando em http://localhost:${ambiente.porta}`);
});
