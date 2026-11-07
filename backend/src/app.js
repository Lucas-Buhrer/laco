// Monta o Express. Fica separado do server.js para os testes subirem o app sem abrir porta.
// Recebe o banco por parâmetro: os testes passam um banco temporário.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ambiente = require('./config/ambiente');
const criarRotasAuth = require('./routes/auth');
const { naoEncontrado, tratarErro } = require('./middlewares/erros');

function criarApp(banco) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: ambiente.origemFront })); // só o nosso front pode chamar
  app.use(express.json());

  // Rota simples para conferir que o servidor está de pé
  app.get('/api/saude', (req, res) => {
    res.json({ dados: { ok: true } });
  });

  app.use('/api/auth', criarRotasAuth(banco));

  // Sempre por último: rota desconhecida e erros inesperados
  app.use(naoEncontrado);
  app.use(tratarErro);

  return app;
}

module.exports = criarApp;
