// Monta o Express. Fica separado do server.js para os testes subirem o app sem abrir porta.
// Recebe o banco por parâmetro: os testes passam um banco temporário.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ambiente = require('./config/ambiente');
const criarRotasAuth = require('./routes/auth');

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

  // Rota desconhecida: mesmo padrão de erro do resto da API
  app.use((req, res) => {
    res.status(404).json({ erro: 'Não encontrado.' });
  });

  // Erro inesperado: não vaza detalhes para quem chamou (RNF-04)
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    console.error('Erro inesperado:', erro.message);
    res.status(500).json({ erro: 'Algo deu errado. Tente de novo.' });
  });

  return app;
}

module.exports = criarApp;
