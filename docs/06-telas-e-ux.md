# 06 — Telas, Fluxos e UX

## 1. Princípios de UX (público: famílias e clínicas de TEA)

- Visual calmo: fundo claro, cores suaves (azul/verde-água), **sem animações piscantes**.
- Fonte legível (≥16px), botões grandes (≥44px), muito espaço em branco.
- Uma ação principal por tela; textos curtos e diretos, sem jargão.
- Confirmação clara antes de ações sensíveis (aprovar, revogar, excluir).
- Contraste adequado, foco visível, formulários com rótulos.
- Área do responsável: pensada primeiro para **360px de largura**.

## 2. Mapa de telas

### Públicas
| Tela | Conteúdo |
|---|---|
| Login | Duas entradas: **Sou da clínica** (código da clínica + e-mail + senha) e **Sou responsável** (e-mail + senha); links "Cadastrar clínica" e "Tenho um código" |
| Cadastro de clínica | Dados da clínica + admin |
| Ativar conta / aceitar convite (responsável) | Parentesco (mãe, pai ou outro; "Outro" abre um campo para escrever qual é), código (da clínica ou convite do outro responsável), data de nascimento da criança, nome, e-mail, senha, leitura e aceite do Termo; quem já tem conta pode só informar o código |
| Política de privacidade | Texto público |

### Profissional (menu: Painel · Crianças · Pré-cadastros · Agenda · Código da família · Conta)
| Tela | Conteúdo |
|---|---|
| Painel | Consultas de hoje, vínculos pendentes de resposta, atalhos |
| Lista de crianças | Somente vinculadas; busca por nome |
| Pré-cadastros | Cadastrar criança (nome, nascimento, contato do responsável, profissionais), gerar/reemitir/cancelar código, ver status; **só dados cadastrais** |
| Perfil da criança | Dados, linha do tempo, atividades, próximas consultas |
| Novo registro de sessão | Resumo, objetivos e humor (**sempre visíveis à família**, com aviso na tela) e um campo de **observação** com a chave "Mostrar para a família" / "Só para mim" |
| Atividades da criança | Lista, criar, ver adesão |
| Parecer | Escrever e **publicar** parecer do período para a família (não editável depois) |
| Nova consulta | **Tela própria de agendamento**, aberta após encerrar uma sessão ("Vamos marcar a próxima?") ou pelo botão da agenda. Campos: criança, profissional, data, horário, tipo. **Ao selecionar a criança, aparecem os responsáveis** (nome, mãe/pai/outro e telefone, até 2), para a clínica combinar com a família. **Só aqui**, depois de escolher data e horário, o sistema avisa (sem detalhes) se a criança já tem compromisso nesse intervalo em outra clínica; botões "Agendar mesmo assim" e "Escolher outro horário". Profissional e Recepção usam a mesma tela |
| Agenda | Dia/semana, criar/remarcar/cancelar, marcar realizada/falta; **consultas que já passaram mostram Realizada, Remarcada (para quando), Cancelada ou Faltou** e o dia de hoje fica em verde-claro; **cada consulta mostra o profissional que atende e uma frase de status** (verde "Confirmada pelos responsáveis", amarelo "Sem confirmação dos responsáveis", azul "Restam X dias · sem confirmação", vermelho "Falta 1 dia: ligar para os responsáveis"); na agenda da recepção a visão do dia tem **uma coluna por profissional**, porque vários atendimentos acontecem ao mesmo tempo; a cor depende dos dias que faltam, como acima; mostra **só as consultas da própria clínica**, sem nenhum aviso de outras clínicas; o botão "Nova consulta" abre a tela de agendamento |
| Código da família | Os pais geram o código no app e entregam ao profissional; ele digita aqui para pedir acesso à criança (os pais aprovam). Mostra o status dos pedidos |
| Conta | Alterar senha |

### Administrador da clínica (menu: Painel · Equipe · Pré-cadastros · Agenda da clínica · Clínica · Conta)
| Tela | Conteúdo |
|---|---|
| Painel da clínica | Resumo: profissionais ativos, pré-cadastros aguardando ativação, consultas do dia |
| Equipe | Lista, cadastrar (especialidade escolhida em lista) , editar e **desativar** profissionais (com aviso do que acontece: vínculos encerrados, consultas canceladas) e usuários de **Recepção** (nome, **código de usuário**, senha temporária; **redefinir senha** da Recepção); código da clínica |
| Pré-cadastros | Mesmo conteúdo da tela do profissional: só dados cadastrais |
| Agenda da clínica | Consultas da clínica (criança, horário, profissional), **sem dados clínicos** |
| Clínica | Dados da clínica e administradores |
| Conta | Alterar senha |

*O ADM não vê perfil clínico, linha do tempo, registros, atividades nem pareceres; nesses links recebe "sem permissão".*

### Recepção (menu: Painel · Pré-cadastros · Agenda · Sair; **sem tela de conta: a senha é redefinida pelo ADM**; login com código da clínica + código de usuário + senha)
| Tela | Conteúdo |
|---|---|
| Painel | **Alerta vermelho com as consultas que precisam de confirmação** (ligar para a família), pré-cadastros aguardando ativação, **inativos** (com aviso de exclusão), consultas do dia e o campo **"Código da família"** (a família traz o código; a Recepção escolhe o profissional e já agenda) |
| Pré-cadastros | Cadastrar criança, gerar/reemitir/cancelar código, reativar inativos; só dados cadastrais |
| Agenda | Ver agenda da clínica; criar, remarcar e cancelar consultas de crianças com vínculo aprovado com o profissional escolhido (sem ver dados clínicos) |
| Sair | Encerrar a sessão |

### Responsável (menu inferior no celular: Hoje · Agenda · Atividades · Acessos · Mais)
| Tela | Conteúdo |
|---|---|
| Hoje | Com mais de um filho: visão "Todos" (consultas e atividades juntas, com o nome da criança em cada item) e filtro por criança; próxima consulta, atividades do dia, solicitações pendentes. Seletor de criança com a opção **"Adicionar outro filho"** (código da clínica + data de nascimento) |
| Meus filhos | Lista; completar/editar dados da criança |
| Perfil da criança | Resumo, sessões compartilhadas, convite |
| Convidar outra clínica | Gera código (7 dias, uso único) para entregar a um profissional de outra clínica |
| Solicitações | Quem pede acesso (nome, clínica, especialidade); se o mesmo registro profissional já atendeu a criança em outra clínica, aparece "já atendeu o Theo na Clínica X, período" e a explicação de que o histórico anterior inclui as sessões dele; escolher escopo; Aprovar/Recusar |
| Quem tem acesso | Vínculos ativos com botão Revogar e chave "Avisar conflitos de horário com outras clínicas"; histórico (inclui vínculos **encerrados** por saída do profissional) |
| Painel de acessos | Lista: quem viu, o quê, quando |
| Agenda | Consultas dos filhos; **confirmar presença até 1 dia antes**; depois, "fale com a clínica" com botão de ligar (mostra o prazo); avisos de nova consulta, remarcação e lembrete |
| Atividades | Lista do dia; marcar feita + 😀🙂😐 + observação |
| Privacidade e dados | Exportar, solicitar exclusão, revogar consentimento |
| Responsáveis | Convidar o outro responsável (código), ver quem já tem acesso, sair da criança; aviso de que ninguém remove o outro |
| Relatório de evolução | Escolher período; ver consultas e faltas, adesão, humor e objetivos; pareceres publicados; botão **Imprimir / salvar PDF** |
| Avisos | Notificações |

## 3. Wireframes principais (texto)

**Responsável — Hoje (celular)**
```
┌────────────────────────┐
│ Olá, Mariana           │
│ [Theo ▾]              │
│ ── Próxima consulta ── │
│ Qua 10/11 · 15:00      │
│ Carlos · T.O.  [Confirmo]
│ ── Para fazer hoje ──  │
│ ☐ Pedir objeto c/ figura│
│ ☐ Rotina de escovar    │
│ ── Atenção ──          │
│ 1 pedido de acesso  >  │
├────────────────────────┤
│ Hoje Agenda Ativ Acessos Mais│
└────────────────────────┘
```

**Responsável — Aprovar vínculo**
```
┌────────────────────────┐
│ Dr. Carlos Souza       │
│ T.O. · Clínica Aurora  │
│ quer acompanhar Theo  │
│                        │
│ Compartilhar histórico │
│ anterior?  (•) Não ( ) Sim
│ Mostrar horários       │
│ conflitos com outras      │
│ clínicas?  (•) Sim ( ) Não
│                        │
│ [Aprovar]  [Recusar]   │
└────────────────────────┘
```

**Profissional — Perfil da criança (desktop)**
```
┌ Theo, 5 anos ─────────────────────────────┐
│ Dados │ Linha do tempo │ Atividades │ Agenda│
│ ───────────────────────────────────────────│
│ [+ Novo registro]                          │
│ 03/11  Sessão — humor 4                    │
│ 27/10  Sessão — humor 3 — (obs. privada)   │
└────────────────────────────────────────────┘
```

**Responsável — Relatório de evolução (celular)**
```
┌────────────────────────┐
│ Theo · Jul a Set      │
│ Consultas: 18  Faltas: 2│
│ Atividades feitas: 76% │
│ Humor ▁▃▄▅▅▆  (média 4)│
│ Objetivos: pedir com   │
│ figura, rotina de      │
│ escovar                │
│ ── Parecer (Dra. Ana)──│
│ "Avanço na comunicação"│
│ [Imprimir / PDF]       │
└────────────────────────┘
```

**Profissional — Agenda do Theo (desktop)**
```
┌ Agenda · Theo · semana 09/11 ─────────────┐
│        Seg    Ter    Qua    Qui    Sex     │
│ 14:00                       [Consulta]     │
│ 15:00         [Consulta]                   │
│ (só consultas desta clínica, sem avisos)   │
└────────────────────────────────────────────┘
```

**Profissional — Pré-cadastro (desktop)**
```
┌ Novo pré-cadastro ─────────────────────────┐
│ Nome da criança      [______________]      │
│ Nascimento           [__/__/____]          │
│ Responsável (nome)   [______________]      │
│ Contato (e-mail/tel) [______________]      │
│ Quem vai atender     [x] Carlos  [ ] Ana   │
│                                            │
│ [Cadastrar e gerar código]                 │
│                                            │
│ Código: K7M2-Q9XP  (vale 7 dias)  [Copiar] │
└────────────────────────────────────────────┘
```

## 4. Fluxos de navegação

- **Login → papel** decide a área: ADM/REC → Painel da clínica; PROF → Painel do profissional; RESP → Hoje.
- Rotas protegidas: sem token → Login. Papel errado → mensagem "sem permissão".
- Token expirado → volta ao Login com aviso.
- Ativação: "Tenho um código" → conta criada → tela inicial já mostra as solicitações pendentes da clínica.

## 5. Estados obrigatórios em toda tela

Carregando · Vazio (com orientação do que fazer) · Erro (mensagem amigável) · Sucesso (confirmação curta).

## 6. Identidade visual (provisória)

| Uso | Cor |
|---|---|
| Primária | Azul suave `#4A7FB5` |
| Secundária | Verde-água `#5FB3A8` |
| Fundo | `#F7FAFC` |
| Texto | `#1F2933` |
| Alerta/ação sensível | Âmbar `#C77D1A` |
| Erro | `#B3382C` |
