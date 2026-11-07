-- Esquema do LAÇO (doc 05). Datas em texto ISO (ex.: 2026-11-07T14:00:00).
-- Booleanos são 0/1. Chaves estrangeiras ficam ligadas em config/banco.js.

CREATE TABLE clinicas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  codigo_acesso TEXT NOT NULL UNIQUE,   -- usado no login da equipe
  cnpj TEXT,
  email_contato TEXT,
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinica_id INTEGER REFERENCES clinicas(id),  -- nulo para responsável
  papel TEXT NOT NULL CHECK (papel IN ('RESPONSAVEL','PROFISSIONAL','ADMIN_CLINICA','RECEPCAO')),
  nome TEXT NOT NULL,
  email TEXT,                 -- a Recepção não tem e-mail
  codigo_usuario TEXT,        -- login da Recepção
  senha_hash TEXT NOT NULL,
  especialidade TEXT,
  especialidade_outro TEXT,
  registro_conselho TEXT,
  registro_numero TEXT,
  registro_uf TEXT,
  registro_profissional TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  desativado_em TEXT,
  motivo_desativacao TEXT,
  senha_temporaria INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
-- E-mail único por clínica para a equipe
CREATE UNIQUE INDEX ux_usuarios_clinica_email ON usuarios(clinica_id, email)
  WHERE clinica_id IS NOT NULL AND email IS NOT NULL;
-- E-mail único no sistema para responsáveis (clinica_id nulo não entra no índice acima)
CREATE UNIQUE INDEX ux_usuarios_responsavel_email ON usuarios(email)
  WHERE papel = 'RESPONSAVEL';
-- Código de usuário único por clínica
CREATE UNIQUE INDEX ux_usuarios_clinica_codigo ON usuarios(clinica_id, codigo_usuario)
  WHERE codigo_usuario IS NOT NULL;

CREATE TABLE consentimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  versao_termo TEXT NOT NULL,
  aceito_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  revogado_em TEXT
);

CREATE TABLE criancas (
  id TEXT PRIMARY KEY,   -- UUID, para não ser adivinhável
  clinica_origem_id INTEGER NOT NULL REFERENCES clinicas(id),
  status_cadastro TEXT NOT NULL DEFAULT 'PRE_CADASTRO'
    CHECK (status_cadastro IN ('PRE_CADASTRO','PRE_CADASTRO_INATIVO','ATIVA')),
  inativado_em TEXT,
  nome TEXT NOT NULL,
  data_nascimento TEXT NOT NULL,
  contato_responsavel_nome TEXT,
  contato_responsavel_parentesco TEXT CHECK (contato_responsavel_parentesco IN ('MAE','PAI','OUTRO')),
  contato_responsavel_parentesco_outro TEXT,
  contato_responsavel_email TEXT,
  contato_responsavel_telefone TEXT,
  nivel_suporte TEXT,
  comunicacao TEXT,
  sensibilidades TEXT,
  observacoes TEXT,
  criada_por INTEGER REFERENCES usuarios(id),
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  anonimizada_em TEXT
);

-- Profissionais indicados no pré-cadastro. Viram vínculos PENDENTES quando a família ativa a conta (RF-30).
-- (Tabela extra, não estava no doc 05: antes da ativação ainda não há responsável para aprovar.)
CREATE TABLE pre_cadastro_profissionais (
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  PRIMARY KEY (crianca_id, profissional_id)
);

CREATE TABLE codigos_ativacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  codigo_hash TEXT NOT NULL,   -- só o hash é guardado
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  expira_em TEXT NOT NULL,
  usado_em TEXT,
  cancelado_em TEXT,
  tentativas_falhas INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE convites_compartilhamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  codigo_hash TEXT NOT NULL,
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  expira_em TEXT NOT NULL,
  usado_em TEXT
);

CREATE TABLE responsaveis_crianca (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
  parentesco TEXT NOT NULL CHECK (parentesco IN ('MAE','PAI','OUTRO')),
  parentesco_outro TEXT,
  entrou_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  saiu_em TEXT   -- o limite de 2 ativos por criança é conferido no código
);

CREATE TABLE convites_responsavel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  codigo_hash TEXT NOT NULL,
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  expira_em TEXT NOT NULL,
  usado_em TEXT,
  tentativas_falhas INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE vinculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  origem TEXT NOT NULL CHECK (origem IN ('CLINICA_ORIGEM','MESMA_CLINICA','CONVITE_RESPONSAVEL')),
  solicitado_por INTEGER REFERENCES usuarios(id),
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','APROVADO','RECUSADO','REVOGADO','EXPIRADO','ENCERRADO')),
  ver_historico_anterior INTEGER NOT NULL DEFAULT 0,
  ver_horarios_outras_clinicas INTEGER NOT NULL DEFAULT 1,
  solicitado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  respondido_em TEXT,
  aprovado_em TEXT,
  revogado_em TEXT,
  encerrado_em TEXT,
  motivo_encerramento TEXT
);
CREATE INDEX ix_vinculos_crianca ON vinculos(crianca_id, profissional_id, status);

CREATE TABLE consultas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  clinica_id INTEGER NOT NULL REFERENCES clinicas(id),
  criada_por INTEGER NOT NULL REFERENCES usuarios(id),
  inicio TEXT NOT NULL,
  duracao_min INTEGER NOT NULL DEFAULT 50,
  tipo TEXT,
  status TEXT NOT NULL DEFAULT 'AGENDADA'
    CHECK (status IN ('AGENDADA','REALIZADA','CANCELADA','REMARCADA','FALTA')),
  remarcada_para_id INTEGER REFERENCES consultas(id),
  presenca_confirmada INTEGER NOT NULL DEFAULT 0,
  confirmada_em TEXT,
  confirmada_por TEXT CHECK (confirmada_por IN ('RESPONSAVEL','CONTATO')),  -- "Confirmada por contato" (RN-35)
  aguardando_aprovacao INTEGER NOT NULL DEFAULT 0,   -- vínculo ainda pendente
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
-- O prazo de confirmação (1 dia antes) e a cor da agenda são calculados na leitura, não guardados.
CREATE INDEX ix_consultas_crianca ON consultas(crianca_id, inicio);
CREATE INDEX ix_consultas_clinica ON consultas(clinica_id, inicio);

CREATE TABLE registros_sessao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  consulta_id INTEGER REFERENCES consultas(id),
  resumo TEXT NOT NULL,
  objetivos TEXT,
  humor INTEGER CHECK (humor BETWEEN 1 AND 5),
  observacao TEXT,                                   -- privada por padrão
  observacao_visivel_familia INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE adendos_registro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registro_id INTEGER NOT NULL REFERENCES registros_sessao(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE pareceres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  periodo_inicio TEXT NOT NULL,
  periodo_fim TEXT NOT NULL,
  texto TEXT NOT NULL,
  publicado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))   -- não editável depois
);

CREATE TABLE atividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  instrucoes TEXT,
  frequencia TEXT,
  prazo TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','ENCERRADA')),
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE execucoes_atividade (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atividade_id INTEGER NOT NULL REFERENCES atividades(id),
  data TEXT NOT NULL,
  como_foi INTEGER NOT NULL CHECK (como_foi BETWEEN 1 AND 3),
  observacao TEXT,
  registrada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

-- Log de auditoria: só inserção (nenhuma rota atualiza ou apaga)
CREATE TABLE log_acesso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id),
  crianca_id TEXT,
  acao TEXT NOT NULL,
  recurso TEXT,
  recurso_id TEXT,
  ip TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
CREATE INDEX ix_log_crianca ON log_acesso(crianca_id, criado_em);

CREATE TABLE solicitacoes_lgpd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
  crianca_id TEXT NOT NULL REFERENCES criancas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('EXPORTACAO','EXCLUSAO','REVOGACAO')),
  protocolo TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'REGISTRADA',
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  concluida_em TEXT
);

-- Avisos dentro do app (os "avisos" e "notificacoes" do doc 05 são esta mesma tabela)
CREATE TABLE notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  texto TEXT NOT NULL,
  link TEXT,
  lida INTEGER NOT NULL DEFAULT 0,
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

-- Sem dados pessoais (RN-33)
CREATE TABLE log_exclusoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('PRE_CADASTRO_NAO_ATIVADO')),
  protocolo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  excluido_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
