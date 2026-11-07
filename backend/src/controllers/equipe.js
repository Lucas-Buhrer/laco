// Equipe da clínica: profissionais e Recepção (RF-10, RF-11, RF-14, RF-15, RN-21 a RN-23).
// O ADM só mexe em cadastro: nada aqui lê dado clínico das crianças.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { agoraIso } = require('../utils/datas');
const { ESPECIALIDADES } = require('../utils/especialidades');
const criarAuditoria = require('../middlewares/auditoria');
const criarAvisos = require('../utils/avisos');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Senha temporária de 10 caracteres, aparece uma única vez para o ADM
function gerarSenhaTemporaria() {
  let senha = '';
  for (let i = 0; i < 10; i++) senha += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return senha;
}

function criarControladorEquipe(banco) {
  const { registrar } = criarAuditoria(banco);
  const { avisar } = criarAvisos(banco);

  // Profissional/recepção DESTA clínica ou undefined (de outra clínica vira 404)
  const buscarProfissional = (req) =>
    banco.prepare("SELECT * FROM usuarios WHERE id = ? AND clinica_id = ? AND papel = 'PROFISSIONAL'")
      .get(req.params.id, req.usuario.clinica_id);
  const buscarRecepcao = (req) =>
    banco.prepare("SELECT * FROM usuarios WHERE id = ? AND clinica_id = ? AND papel = 'RECEPCAO'")
      .get(req.params.id, req.usuario.clinica_id);

  // Confere os campos do profissional; devolve { erro } ou { dados }
  function lerProfissional(b) {
    const especialidade = texto(b.especialidade);
    const outro = texto(b.especialidade_outro);
    const dados = {
      nome: texto(b.nome),
      email: texto(b.email).toLowerCase(),
      especialidade,
      especialidade_outro: especialidade === 'OUTRO' ? outro : null,
      registro_conselho: texto(b.registro_conselho) || null,
      registro_numero: texto(b.registro_numero) || null,
      registro_uf: texto(b.registro_uf).toUpperCase() || null,
    };
    if (!dados.nome || !dados.email.includes('@')) return { erro: 'Preencha o nome e um e-mail válido.' };
    if (!ESPECIALIDADES[especialidade]) return { erro: 'Escolha a especialidade na lista.' };
    if (especialidade === 'OUTRO' && !outro) return { erro: 'Escreva qual é a especialidade.' };
    return { dados };
  }

  // GET /clinica/profissionais — o ADM vê também desativados e quantas crianças cada um acompanha
  function listarProfissionais(req, res) {
    const ehAdmin = req.usuario.papel === 'ADMIN_CLINICA';
    const colunasAdmin = 'email, ativo, senha_temporaria, desativado_em, registro_conselho, registro_numero, registro_uf,';
    const linhas = banco
      .prepare(
        `SELECT id, nome, ${ehAdmin ? colunasAdmin : ''} especialidade, especialidade_outro,
                (SELECT COUNT(*) FROM vinculos v WHERE v.profissional_id = usuarios.id AND v.status = 'APROVADO') AS criancas
         FROM usuarios WHERE clinica_id = ? AND papel = 'PROFISSIONAL' ${ehAdmin ? '' : 'AND ativo = 1'} ORDER BY ativo DESC, nome`
      )
      .all(req.usuario.clinica_id);
    // Quem não é ADM não precisa saber quantas crianças cada colega acompanha
    res.json({ dados: ehAdmin ? linhas : linhas.map(({ criancas, ...resto }) => resto) });
  }

  // POST /clinica/profissionais
  function criarProfissional(req, res) {
    const { erro, dados } = lerProfissional(req.body || {});
    if (erro) return res.status(400).json({ erro });
    const repetido = banco.prepare('SELECT 1 FROM usuarios WHERE clinica_id = ? AND email = ?').get(req.usuario.clinica_id, dados.email);
    if (repetido) return res.status(409).json({ erro: 'Já existe alguém com este e-mail na clínica.' });

    const senha = gerarSenhaTemporaria();
    const id = banco
      .prepare(`INSERT INTO usuarios (clinica_id, papel, nome, email, senha_hash, especialidade, especialidade_outro,
                registro_conselho, registro_numero, registro_uf, senha_temporaria)
                VALUES (?, 'PROFISSIONAL', ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(req.usuario.clinica_id, dados.nome, dados.email, bcrypt.hashSync(senha, 10), dados.especialidade,
        dados.especialidade_outro, dados.registro_conselho, dados.registro_numero, dados.registro_uf).lastInsertRowid;
    registrar(req, 'CRIAR_PROFISSIONAL', { recurso: 'usuario', recursoId: id });
    res.status(201).json({ dados: { id, senha_temporaria: senha } });
  }

  // PUT /clinica/profissionais/:id
  function editarProfissional(req, res) {
    const prof = buscarProfissional(req);
    if (!prof) return res.status(404).json(NAO_ENCONTRADO);
    const { erro, dados } = lerProfissional(req.body || {});
    if (erro) return res.status(400).json({ erro });
    const repetido = banco
      .prepare('SELECT 1 FROM usuarios WHERE clinica_id = ? AND email = ? AND id <> ?')
      .get(req.usuario.clinica_id, dados.email, prof.id);
    if (repetido) return res.status(409).json({ erro: 'Já existe alguém com este e-mail na clínica.' });

    banco
      .prepare(`UPDATE usuarios SET nome = ?, email = ?, especialidade = ?, especialidade_outro = ?,
                registro_conselho = ?, registro_numero = ?, registro_uf = ? WHERE id = ?`)
      .run(dados.nome, dados.email, dados.especialidade, dados.especialidade_outro,
        dados.registro_conselho, dados.registro_numero, dados.registro_uf, prof.id);
    registrar(req, 'EDITAR_PROFISSIONAL', { recurso: 'usuario', recursoId: prof.id });
    res.json({ dados: { id: prof.id } });
  }

  // POST /clinica/profissionais/:id/desativar — regra 4.2, tudo numa transação só (RN-21)
  function desativarProfissional(req, res) {
    const prof = buscarProfissional(req);
    if (!prof) return res.status(404).json(NAO_ENCONTRADO);
    if (!prof.ativo) return res.status(409).json({ erro: 'Este profissional já está desativado.' });

    const agora = agoraIso();
    const resumo = banco.transaction(() => {
      banco.prepare('UPDATE usuarios SET ativo = 0, desativado_em = ?, motivo_desativacao = ? WHERE id = ?')
        .run(agora, texto(req.body?.motivo) || null, prof.id);

      // Pedidos pendentes também terminam: ninguém poderia aprovar um profissional desativado
      const vinculos = banco
        .prepare("SELECT id, crianca_id FROM vinculos WHERE profissional_id = ? AND status IN ('APROVADO','PENDENTE')")
        .all(prof.id);
      const encerrar = banco.prepare(
        "UPDATE vinculos SET status = 'ENCERRADO', encerrado_em = ?, motivo_encerramento = 'PROFISSIONAL_DESATIVADO' WHERE id = ?"
      );
      for (const v of vinculos) encerrar.run(agora, v.id);

      const canceladas = banco
        .prepare("UPDATE consultas SET status = 'CANCELADA' WHERE profissional_id = ? AND status = 'AGENDADA' AND inicio > ?")
        .run(prof.id, agora).changes;

      // Cada responsável é avisado uma vez por criança
      const familias = banco
        .prepare(
          `SELECT DISTINCT r.responsavel_id, c.nome AS crianca_nome FROM responsaveis_crianca r
           JOIN criancas c ON c.id = r.crianca_id
           WHERE r.saiu_em IS NULL AND r.crianca_id IN (SELECT crianca_id FROM vinculos WHERE profissional_id = ? AND encerrado_em = ?)`
        )
        .all(prof.id, agora);
      for (const f of familias) {
        avisar(f.responsavel_id, `${prof.nome} saiu da clínica. O acesso a ${f.crianca_nome} foi encerrado e as consultas futuras dele(a) foram canceladas.`, '/familia/acessos');
      }
      avisar(req.usuario.id, `${prof.nome} foi desativado: ${vinculos.length} acessos encerrados, ${canceladas} consultas canceladas.`);
      registrar(req, 'DESATIVAR_PROFISSIONAL', { recurso: 'usuario', recursoId: prof.id });
      return { vinculos_encerrados: vinculos.length, consultas_canceladas: canceladas, familias_avisadas: familias.length };
    })();
    res.json({ dados: resumo });
  }

  // POST /clinica/profissionais/:id/reativar — a conta volta, mas os vínculos NÃO voltam (RN-21):
  // a família precisa aprovar de novo
  function reativarProfissional(req, res) {
    const prof = buscarProfissional(req);
    if (!prof) return res.status(404).json(NAO_ENCONTRADO);
    if (prof.ativo) return res.status(409).json({ erro: 'Este profissional já está ativo.' });
    // Nova senha temporária: a antiga pode estar na mão de quem não deve
    const senha = gerarSenhaTemporaria();
    banco.prepare('UPDATE usuarios SET ativo = 1, desativado_em = NULL, motivo_desativacao = NULL, senha_hash = ?, senha_temporaria = 1 WHERE id = ?')
      .run(bcrypt.hashSync(senha, 10), prof.id);
    registrar(req, 'REATIVAR_PROFISSIONAL', { recurso: 'usuario', recursoId: prof.id });
    res.json({ dados: { id: prof.id, senha_temporaria: senha } });
  }

  // GET /clinica/recepcao
  function listarRecepcao(req, res) {
    const linhas = banco
      .prepare("SELECT id, nome, codigo_usuario, ativo, senha_temporaria FROM usuarios WHERE clinica_id = ? AND papel = 'RECEPCAO' ORDER BY ativo DESC, nome")
      .all(req.usuario.clinica_id);
    res.json({ dados: linhas });
  }

  // POST /clinica/recepcao — login por código de usuário, sem e-mail (RF-15)
  function criarRecepcao(req, res) {
    const nome = texto(req.body?.nome);
    const codigo = texto(req.body?.codigo_usuario).toLowerCase();
    if (!nome) return res.status(400).json({ erro: 'Preencha o nome.' });
    if (!/^[a-z0-9._-]{3,30}$/.test(codigo)) {
      return res.status(400).json({ erro: 'O código de usuário usa de 3 a 30 letras minúsculas, números, ponto, traço ou sublinhado.' });
    }
    if (banco.prepare('SELECT 1 FROM usuarios WHERE clinica_id = ? AND codigo_usuario = ?').get(req.usuario.clinica_id, codigo)) {
      return res.status(409).json({ erro: 'Este código de usuário já existe na clínica.' });
    }
    const senha = gerarSenhaTemporaria();
    const id = banco
      .prepare("INSERT INTO usuarios (clinica_id, papel, nome, codigo_usuario, senha_hash, senha_temporaria) VALUES (?, 'RECEPCAO', ?, ?, ?, 1)")
      .run(req.usuario.clinica_id, nome, codigo, bcrypt.hashSync(senha, 10)).lastInsertRowid;
    registrar(req, 'CRIAR_RECEPCAO', { recurso: 'usuario', recursoId: id });
    res.status(201).json({ dados: { id, senha_temporaria: senha } });
  }

  // POST /clinica/recepcao/:id/desativar
  function desativarRecepcao(req, res) {
    const rec = buscarRecepcao(req);
    if (!rec) return res.status(404).json(NAO_ENCONTRADO);
    banco.prepare('UPDATE usuarios SET ativo = 0, desativado_em = ? WHERE id = ?').run(agoraIso(), rec.id);
    registrar(req, 'DESATIVAR_RECEPCAO', { recurso: 'usuario', recursoId: rec.id });
    res.json({ dados: { ok: true } });
  }

  // POST /clinica/recepcao/:id/redefinir-senha — só o ADM controla a senha da Recepção (RF-15a)
  function redefinirSenhaRecepcao(req, res) {
    const rec = buscarRecepcao(req);
    if (!rec || !rec.ativo) return res.status(404).json(NAO_ENCONTRADO);
    const senha = gerarSenhaTemporaria();
    banco.prepare('UPDATE usuarios SET senha_hash = ?, senha_temporaria = 1 WHERE id = ?').run(bcrypt.hashSync(senha, 10), rec.id);
    registrar(req, 'REDEFINIR_SENHA_RECEPCAO', { recurso: 'usuario', recursoId: rec.id });
    res.json({ dados: { senha_temporaria: senha } });
  }

  return {
    listarProfissionais, criarProfissional, editarProfissional, desativarProfissional, reativarProfissional,
    listarRecepcao, criarRecepcao, desativarRecepcao, redefinirSenhaRecepcao,
  };
}

module.exports = criarControladorEquipe;
