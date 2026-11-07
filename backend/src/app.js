// Monta o Express. Fica separado do server.js para os testes subirem o app sem abrir porta.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ambiente = require('./config/ambiente');

const app = express();

app.use(helmet());
app.use(cors({ origin: ambiente.origemFront })); // só o nosso front pode chamar
app.use(express.json());

// Rota simples para conferir que o servidor está de pé
app.get('/api/saude', (req, res) => {
  res.json({ dados: { ok: true } });
});

// Rota desconhecida: mesmo padrão de erro do resto da API
app.use((req, res) => {
  res.status(404).json({ erro: 'Não encontrado.' });
});

module.exports = app;
