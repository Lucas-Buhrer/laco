// Dados da própria clínica e de quem a administra (só o ADM). Nada clínico passa por aqui.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const criarAuditoria = require('../middlewares/auditoria');

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const texto = (v) => (typeof v === 'string' ? v.trim() : '');

function criarControladorClinica(banco) {
  const { registrar } = criarAuditoria(banco);

  // GET /clinica
  function obter(req, res) {
    const clinica = banco.prepare('SELECT id, nome, codigo_acesso, cnpj, email_contato FROM clinicas WHERE id = ?').get(req.usuario.clinica_id);
    const administradores = banco
      .prepare("SELECT id, nome, email, ativo FROM usuarios WHERE clinica_id = ? AND papel = 'ADMIN_CLINICA' ORDER BY ativo DESC, nome")
      .all(req.usuario.clinica_id)
      .map((a) => ({ ...a, voce: a.id === req.usuario.id }));
    res.json({ dados: { ...clinica, administradores } });
  }

  // PUT /clinica — o código de acesso não muda por aqui (é o que a equipe usa para entrar)
  function atualizar(req, res) {
    const nome = texto(req.body?.nome);
    const cnpj = texto(req.body?.cnpj);
    const email = texto(req.body?.email_contato).toLowerCase();
    if (!nome || nome.length > 120) return res.status(400).json({ erro: 'Escreva o nome da clínica.' });
    if (email && !email.includes('@')) return res.status(400).json({ erro: 'Confira o e-mail de contato.' });
    if (cnpj.length > 30) return res.status(400).json({ erro: 'Confira o CNPJ.' });
    banco.prepare('UPDATE clinicas SET nome = ?, cnpj = ?, email_contato = ? WHERE id = ?')
      .run(nome, cnpj || null, email || null, req.usuario.clinica_id);
    registrar(req, 'EDITAR_CLINICA', { recurso: 'clinica', recursoId: req.usuario.clinica_id });
    res.json({ dados: { nome, cnpj: cnpj || null, email_contato: email || null } });
  }

  // POST /clinica/administradores — outro administrador da mesma clínica, com senha temporária
  function adicionarAdministrador(req, res) {
    const nome = texto(req.body?.nome);
    const email = texto(req.body?.email).toLowerCase();
    if (!nome || !email.includes('@')) return res.status(400).json({ erro: 'Preencha o nome e um e-mail válido.' });
    if (banco.prepare('SELECT 1 FROM usuarios WHERE clinica_id = ? AND email = ?').get(req.usuario.clinica_id, email)) {
      return res.status(409).json({ erro: 'Já existe alguém com este e-mail na clínica.' });
    }
    let senha = '';
    for (let i = 0; i < 10; i++) senha += ALFABETO[crypto.randomInt(ALFABETO.length)];
    const id = banco
      .prepare("INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash, senha_temporaria) VALUES (?, 'ADMIN_CLINICA', ?, ?, ?, 1)")
      .run(req.usuario.clinica_id, nome, email, bcrypt.hashSync(senha, 10)).lastInsertRowid;
    registrar(req, 'CRIAR_ADMINISTRADOR', { recurso: 'usuario', recursoId: id });
    res.status(201).json({ dados: { id, senha_temporaria: senha } });
  }

  return { obter, atualizar, adicionarAdministrador };
}

module.exports = criarControladorClinica;
