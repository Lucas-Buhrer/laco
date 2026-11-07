# 02 — PRD (Documento de Requisitos do Produto)

Prioridades: **P0** = essencial para a apresentação · **P1** = importante · **P2** = desejável.
Perfis: **RESP** (responsável), **PROF** (profissional), **ADM** (administrador da clínica) e **REC** (recepção): ADM e REC são perfis separados, **sem acesso a dados clínicos**.

## 1. Requisitos funcionais

### Autenticação (AUT)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-01 | Cadastrar clínica criando automaticamente o primeiro **ADM** e o **código da clínica** usado no login da equipe | ADM | P0 |
| RF-02 | Responsável **ativa a conta** com o código da clínica + data de nascimento da criança, define senha e aceita o Termo de Consentimento (não existe autocadastro) | RESP | P0 |
| RF-03 | Login do responsável (e-mail + senha) e login da equipe (código da clínica + e-mail + senha). A **Recepção** não usa e-mail: entra com código da clínica + **código de usuário** + senha | Todos | P0 |
| RF-04 | Logout e expiração de sessão (8h) | Todos | P0 |
| RF-05 | Alterar a própria senha | Todos | P1 |
| RF-06 | Recuperar senha (simulada, sem e-mail real) | Todos | P2 |
| RF-07 | O mesmo login pode ser usado em **vários aparelhos ao mesmo tempo** (sem limite de sessões) | RESP | P0 |
| RF-08 | Responsável gera **convite de responsável** (uso único, 7 dias); o outro responsável cria conta (ou usa a que já tem) com código + data de nascimento da criança e aceita o Termo | RESP | P1 |
| RF-09 | Responsável pode **sair** da criança (perde o acesso; o outro permanece) | RESP | P1 |

### Clínica e equipe (CLI)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-10 | ADM cadastra profissionais; a conta fica **vinculada somente a essa clínica** (senha temporária) | ADM | P0 |
| RF-11a | A especialidade do profissional é escolhida em uma **lista fixa** (ver doc 00, decisão "Especialidades"); "Outro" permite texto livre. A especialidade aparece para o responsável no pedido de acesso e na lista de acessos | ADM | P0 |
| RF-11 | ADM lista, edita e **desativa** profissionais (ex.: saída da clínica) | ADM | P0 |
| RF-12 | ADM edita dados da clínica | ADM | P2 |
| RF-13 | ADM cadastra outros administradores da clínica | ADM | P2 |
| RF-14 | Ao desativar um profissional, o sistema **encerra todos os vínculos dele**, cancela consultas futuras, invalida a sessão e avisa as famílias e o ADM | Sistema | P0 |
| RF-15 | ADM cadastra e desativa usuários de **Recepção** (conta vinculada só à clínica) com **código de usuário** (sem e-mail) e senha temporária | ADM | P1 |
| RF-15a | **A senha da Recepção é controlada só pelo ADM**: a Recepção não tem tela de alterar senha; o ADM redefine a senha (nova senha temporária) quando necessário | ADM | P1 |

### Crianças (CRI)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-20 | Clínica **pré-cadastra** a criança (nome, nascimento, nome, **parentesco (mãe, pai ou outro)** e contato do responsável, profissional(is) que atenderão) e gera o código de ativação | PROF/ADM/REC | P0 |
| RF-21 | Responsável completa e edita os dados da criança (nível de suporte, comunicação, sensibilidades, observações) | RESP | P0 |
| RF-22 | Responsável vê a lista dos seus filhos | RESP | P0 |
| RF-23 | Profissional vê **somente** crianças com vínculo aprovado | PROF | P0 |
| RF-24 | Perfil da criança com resumo, vínculos, próximas consultas e atividades | PROF/RESP | P0 |
| RF-25 | Clínica acompanha seus pré-cadastros (aguardando ativação, ativa, aguardando aprovação) vendo **somente dados cadastrais** | PROF/ADM/REC | P0 |
| RF-26 | Reemitir ou cancelar código de ativação | PROF/ADM/REC | P1 |
| RF-27 | Ao ativar, responsável pode ligar o código a um filho já cadastrado (evita duplicidade entre clínicas) | RESP | P2 |
| RF-27a | **Mais de um filho:** a mesma conta de responsável acompanha vários filhos. Para adicionar o segundo filho, a clínica pré-cadastra a criança, gera um código e entrega ao responsável, que usa **"Adicionar outro filho"** no app (código + data de nascimento da criança), sem criar nova conta. Cada filho tem vínculos, escopos e dados próprios | RESP, clínica | P0 |
| RF-27d | O **parentesco** (Mãe, Pai ou Outro) é informado pela clínica no pré-cadastro, confirmado pelo responsável ao criar a conta ou aceitar o convite, e exibido ao lado do nome nas telas da clínica e do app | RESP, clínica | P1 |
| RF-27e | Ao escolher **Outro** no parentesco, abre um campo de texto para escrever qual é (ex.: avó, tutor). O texto pode ser **corrigido depois**: pela clínica até a ativação da conta e pelo próprio responsável a qualquer momento ("Editar parentesco" na tela Responsáveis) | RESP, clínica | P1 |
| RF-27c | Ao agendar uma consulta, depois de escolher a criança, o profissional ou a recepção vê o **nome e o contato dos responsáveis** (dados cadastrais; só de crianças com vínculo aprovado) | PROF, REC | P1 |
| RF-27b | Tela "Hoje" mostra por padrão a **visão de todos os filhos** (próximas consultas e atividades juntas, com o nome da criança em cada item); o seletor filtra por uma criança | RESP | P0 |
| RF-28 | Pré-cadastro não ativado fica **INATIVO aos 30 dias** (clínica avisada, pode gerar novo código) e é **excluído definitivamente aos 90 dias**; a exclusão fica registrada sem dados pessoais | Sistema | P1 |

### Vínculos (VIN) — núcleo do produto
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-30 | Ao ativar a conta, o sistema cria solicitações **PENDENTE** para os profissionais indicados no pré-cadastro | Sistema | P0 |
| RF-31 | Clínica solicita vínculo de outro profissional da própria clínica com uma criança ativa, a qualquer momento | PROF/ADM/REC | P0 |
| RF-32 | Responsável vê solicitações pendentes mostrando profissional, clínica e especialidade | RESP | P0 |
| RF-32a | **Reconhecimento do profissional:** se o profissional que pede acesso (pelo **registro profissional**: conselho + número + UF) já atendeu a criança em outra clínica, a tela de aprovação mostra "já atendeu o(a) [criança] na [clínica], [período]" e explica que o "histórico anterior" inclui as sessões que ele mesmo fez. O aviso é mostrado **só ao responsável**, nunca à clínica nova | RESP | P1 |
| RF-32b | O registro profissional é informado no cadastro do profissional pelo ADM (conselho, número e UF; "Não se aplica" para funções sem conselho). Na versão atual **não é verificado** junto ao conselho (próximo passo) | ADM | P1 |
| RF-33 | Responsável aprova (definindo o escopo) ou recusa | RESP | P0 |
| RF-34 | Escopo configurável: "ver histórico anterior" (sim/não), "ver registros compartilhados" e "avisar conflito com consultas em outras clínicas" (**sim por padrão**) | RESP | P0 |
| RF-35 | Responsável **revoga** o vínculo a qualquer momento; efeito imediato | RESP | P0 |
| RF-36 | Solicitação pendente expira em 7 dias | Sistema | P1 |
| RF-37 | Histórico de vínculos (aprovados, recusados, revogados) visível ao responsável | RESP | P1 |
| RF-38 | ~~Aprovação pela clínica inteira~~ — **descartado**: a aprovação é sempre por profissional | — | — |
| RF-39 | Responsável gera **convite de compartilhamento** (uso único, 7 dias); profissional de **outra clínica** informa o código e cria uma solicitação PENDENTE | RESP/PROF | P0 |

### Consultas (CON)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-40 | Profissional ou Recepção agenda consulta para criança com vínculo **aprovado** (Profissional) ou **aprovado ou pendente** (Recepção) com o profissional escolhido; consulta com vínculo pendente fica marcada "Aguardando aprovação da família" | PROF/REC | P0 |
| RF-40a | **Recepção insere o "Código da família"** (gerado pelo responsável) para dar entrada na criança e escolhe o profissional que vai atendê-la; cria vínculo PENDENTE para a família aprovar, e a Recepção já pode agendar. Antes da aprovação, a Recepção vê só dados cadastrais (nome, nascimento, responsáveis e contato) | REC | P1 |
| RF-41 | Profissional ou Recepção remarca ou cancela | PROF/REC | P0 |
| RF-42 | Profissional marca como realizada / falta | PROF | P0 |
| RF-42a | **Consultas que já passaram** mostram a situação final: **Realizada**, **Remarcada** (com a nova data), **Cancelada** ou **Faltou**, na agenda da clínica, do profissional, do administrador e no app dos pais (aba "Anteriores"); o dia de hoje fica destacado em verde-claro | PROF, REC, ADM, RESP | P0 |
| RF-43 | Responsável vê agenda dos filhos | RESP | P0 |
| RF-44 | Responsável **confirma a presença** no app, no máximo até **1 dia antes** da consulta; depois disso o app esconde o botão e orienta a falar com a clínica | RESP | P0 |
| RF-46 | **Avisos no app dos responsáveis** sobre consultas: ao agendar, ao remarcar ou cancelar, e lembrete antes do prazo de confirmação | RESP | P0 |
| RF-47a | **Agenda dinâmica da clínica:** consulta sem confirmação dos responsáveis muda de cor conforme os dias que faltam: **azul** (4 dias ou mais, "Restam X dias"), **amarelo** (2 ou 3 dias), **vermelho** (falta 1 dia: a clínica liga para os responsáveis); **verde** quando confirmada. Nenhuma consulta é cancelada sozinha. Cada consulta mostra o profissional e uma frase de status; a visão do dia da Recepção tem uma coluna por profissional | PROF, REC, ADM | P0 |
| RF-48a | **Lembrete das atividades de casa** no app: aviso diário das atividades pendentes. Nesta versão os avisos ficam dentro do app; push, e-mail e WhatsApp são próximo passo | RESP | P1 |
| RF-45 | Agenda do dia do profissional | PROF | P0 |
| RF-46 | Bloquear conflito de horário do mesmo profissional | Sistema | P1 |
| RF-47 | ADM e Recepção veem a agenda completa da clínica (criança, horário, profissional), **sem dados clínicos** | ADM/REC | P1 |
| RF-48 | **Aviso de conflito entre clínicas:** a agenda mostra só as consultas da própria clínica. Somente **ao agendar** uma consulta para a criança, se ela já tiver consulta em outra clínica no mesmo intervalo, o sistema exibe um aviso genérico (sem clínica, profissional, tipo ou horário exato) e pede confirmação | PROF, REC | P0 |
| RF-49 | Responsável liga/desliga o aviso de conflito por vínculo, com efeito imediato | RESP | P0 |

### Registro de sessão e histórico (SES)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-50 | Registrar evolução da sessão (resumo, objetivos trabalhados, humor/comportamento 1–5, observações) | PROF | P0 |
| RF-51 | O registro da sessão (resumo, objetivos, humor) é **sempre visível à família**; o profissional não pode ocultá-lo. Ele tem um campo próprio de **observação**, em que escolhe entre "Mostrar para a família" ou "Só para mim" (anotação privada; padrão: só para mim) | PROF | P0 |
| RF-52 | Linha do tempo da criança respeitando o escopo do vínculo | PROF/RESP | P0 |
| RF-53 | Registros não podem ser apagados; correções por **adendo** | PROF | P1 |
| RF-54 | Responsável lê **todos** os registros de sessão e as observações que o profissional marcou como visíveis | RESP | P0 |
| RF-55 | **Relatório de evolução:** responsável escolhe criança e período e vê consultas realizadas e faltas, adesão às atividades, humor ao longo do tempo e objetivos trabalhados (só registros compartilhados) | RESP | P1 |
| RF-56 | Profissional com vínculo escreve e **publica um parecer** em texto para o período; ele aparece no relatório | PROF | P1 |
| RF-57 | Relatório com **folha de impressão** (imprimir ou salvar em PDF pelo navegador) | RESP | P1 |

### Atividades de casa (ATV)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-60 | Criar atividade (título, instruções, frequência, prazo) | PROF | P0 |
| RF-61 | Responsável vê atividades ativas da criança | RESP | P0 |
| RF-62 | Responsável marca execução com "como foi" (😀🙂😐) e observação | RESP | P0 |
| RF-63 | Profissional vê adesão e observações | PROF | P0 |
| RF-64 | Encerrar atividade | PROF | P1 |

### LGPD (LGP)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-70 | Termo de consentimento versionado, aceito no cadastro | RESP | P0 |
| RF-71 | Log automático de todo acesso a dados da criança | Sistema | P0 |
| RF-72 | Painel "Quem acessou os dados da minha criança" | RESP | P0 |
| RF-73 | Exportar todos os dados da criança | RESP | P1 |
| RF-74 | Solicitar exclusão/anonimização dos dados | RESP | P1 |
| RF-75 | Revogar consentimento (encerra todos os vínculos) | RESP | P1 |
| RF-76 | Página pública de Política de Privacidade | Todos | P0 |

### Painéis e avisos (DSH / NOT)
| ID | Requisito | Perfil | Prio |
|---|---|---|---|
| RF-80 | Painel do profissional (agenda do dia, pendências, crianças) | PROF | P0 |
| RF-81 | Painel do responsável (próxima consulta, atividades de hoje, solicitações) | RESP | P0 |
| RF-90 | Notificações internas (nova solicitação, consulta, atividade) | Todos | P1 |

## 2. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | Profissional só acessa dados de uma criança com vínculo **APROVADO** e não expirado/revogado |
| RN-02 | Só os responsáveis da criança aprovam, recusam ou revogam vínculos |
| RN-03 | Revogação bloqueia o acesso imediatamente; registros já criados permanecem (autoria do profissional) |
| RN-04 | Sem "ver histórico anterior", o profissional vê apenas registros criados após a aprovação |
| RN-05 | A **observação marcada "Só para mim"** nunca é exibida à família, a outros profissionais, à administração ou à recepção. O registro da sessão em si não pode ser ocultado da família |
| RN-06 | Registros de sessão não são editados nem apagados; apenas recebem adendos |
| RN-07 | Todo acesso a dados de criança gera log (quem, o quê, quando) |
| RN-08 | Código de convite é de uso único e expira em 7 dias |
| RN-09 | Profissional desativado perde acesso a tudo, mas seus registros permanecem (ver RN-21) |
| RN-10 | Responsável só enxerga seus próprios filhos |
| RN-11 | ADM só gerencia profissionais da própria clínica |
| RN-12 | Consulta só pode ser criada para criança com vínculo aprovado **com o profissional da consulta** |
| RN-13 | Senha mínima de 8 caracteres, armazenada apenas como hash |
| RN-14 | Responsável só cria conta com código de ativação válido; não há autocadastro |
| RN-15 | Código de ativação é de uso único, vence em 7 dias e pode ser cancelado/reemitido pela clínica |
| RN-16 | A ativação exige o código **e** a data de nascimento da criança; tentativas são limitadas |
| RN-17 | Até a aprovação, a clínica vê apenas dados cadastrais e **não** pode agendar nem registrar nada clínico |
| RN-18 | A aprovação vale para **um profissional**; profissional novo da clínica exige nova aprovação |
| RN-19 | Outra clínica só chega à criança pelo convite do responsável; a busca de crianças de outras clínicas não existe |
| RN-20 | A conta de profissional/ADM/Recepção pertence a **uma única clínica**; o mesmo e-mail pode existir em clínicas diferentes como contas independentes |
| RN-21 | Ao desativar o profissional, seus vínculos viram **ENCERRADO** imediatamente; reativar a conta **não** restaura vínculos |
| RN-22 | Profissional que entra em outra clínica usa a nova conta e precisa de **nova aprovação** do responsável; nada é herdado |
| RN-23 | O ADM gerencia equipe, pré-cadastros e agenda da clínica, e a Recepção cuida de pré-cadastros e agenda; **nenhum dos dois** vê registros, atividades, linha do tempo, pareceres ou dados clínicos, e nenhum aprova vínculos |
| RN-24 | Detalhes de uma consulta: apenas o profissional da consulta, o ADM e a Recepção da clínica (sem clínico) e os responsáveis |
| RN-25 | Nenhuma tela de clínica lista consultas de outra clínica. A verificação de conflito responde apenas **sim/não** (há sobreposição), sem nome da clínica, profissional, tipo, status ou horário |
| RN-26 | A verificação de conflito só ocorre para profissional com vínculo APROVADO e escopo ligado, e só no momento de agendar; cada verificação é registrada em log |
| RN-27 | Conflito com consulta de outra clínica gera **aviso com confirmação**, não bloqueio |
| RN-28 | Até **2 responsáveis** por criança; o segundo só entra por convite (uso único, 7 dias) gerado por um responsável ativo |
| RN-29 | Os dois responsáveis têm o **mesmo poder** (aprovar, recusar, revogar, escopo, exportar, pedir exclusão, revogar consentimento); cada ação grava **quem fez** e o outro é **avisado** nas ações sensíveis |
| RN-30 | Nenhum responsável remove o outro; cada um só pode **sair**. Disputas entre responsáveis ficam fora do sistema (orientação jurídica pendente) |
| RN-31 | Cada responsável aceita o Termo. Usar o **mesmo login em dois aparelhos** é permitido, mas o log não distingue quem agiu; contas separadas são recomendadas |
| RN-32 | A Recepção nunca vê dados de outras clínicas; ao agendar, o aviso de conflito é calculado pelo servidor com o vínculo do profissional escolhido e exibido sem detalhes. Agenda para criança com vínculo aprovado ou pendente com esse profissional (pendente: consulta "Aguardando aprovação da família"). A verificação de conflito só ocorre com vínculo aprovado e escopo ligado, portanto **não há aviso de conflito enquanto o vínculo estiver pendente** |
| RN-33 | Pré-cadastro não ativado: INATIVO aos 30 dias, excluído aos 90 (valores configuráveis, **sujeitos a validação jurídica**); a clínica pode reativar com novo código antes da exclusão |
| RN-34 | O relatório usa apenas dados que o responsável já pode ver (registros de sessão, observações visíveis, consultas, atividades) e respeita o escopo; o parecer só aparece depois de **publicado** e não é editado (correção = novo parecer) |
| RN-35 | A confirmação de presença é feita pelo responsável até 1 dia antes da consulta; a consulta não confirmada muda de cor conforme os dias que faltam (azul 4+, amarelo 2 a 3, vermelho 1 dia) e a clínica liga para os responsáveis; depois do prazo o responsável só confirma falando com a clínica, e a Recepção/profissional registra "Confirmada por contato" (telefone) |

## 3. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Segurança | Permissões validadas **no servidor** em toda rota; nunca apenas no front |
| RNF-02 | Segurança | Senhas com bcrypt; JWT com expiração; limite de tentativas de login |
| RNF-03 | Segurança | Validação de entrada em todas as rotas; SQL parametrizado |
| RNF-04 | Privacidade | Dados mínimos necessários; nada sensível em logs de console |
| RNF-05 | Usabilidade | Interface calma, sem animações piscantes, textos curtos, botões grandes |
| RNF-06 | Acessibilidade | Contraste adequado, foco visível, navegação por teclado, rótulos em formulários |
| RNF-07 | Responsividade | Telas do responsável otimizadas para 360px de largura |
| RNF-08 | Desempenho | Respostas das rotas em menos de 500 ms com dados de demonstração |
| RNF-09 | Manutenibilidade | Código comentado e estrutura de pastas conforme doc 00 |
| RNF-10 | Confiabilidade | Backup simples do arquivo `.db`; seed reproduzível |
| RNF-11 | Segurança | Isolamento entre clínicas: dado de uma clínica nunca chega a outra, exceto o aviso de conflito sem detalhes (RN-25) |
| RNF-12 | Usabilidade | Relatório legível em tela e em papel A4, sem bibliotecas de PDF |

## 4. Critérios de aceite (exemplos dos fluxos críticos)

**Aprovar vínculo (RF-31 a RF-35)**
- Dado que a clínica pré-cadastrou a criança indicando o profissional, quando o responsável ativa a conta, então aparece solicitação pendente e o profissional **ainda não** vê dados clínicos.
- Dado um convite de compartilhamento válido, quando um profissional de outra clínica o informa, então surge solicitação pendente e ele **não** vê nenhum dado da criança.
- Quando o responsável aprova com "histórico anterior = não", então o profissional vê a criança e apenas registros posteriores.
- Quando o responsável revoga, então a próxima requisição do profissional à criança retorna 404.

**Ativação de conta (RF-02, RF-20)**
- Dado um código válido e a data de nascimento correta, quando o responsável aceita o Termo e define a senha, então a conta é criada e a criança fica ATIVA.
- Código usado, vencido, cancelado ou com data de nascimento errada é recusado sem revelar qual dado falhou.

**Segundo responsável (RF-08, RN-28 a RN-31)**
- Dado que a mãe gerou um convite, quando o pai informa o código e a data de nascimento da criança e aceita o Termo, então passa a acessar a criança; um terceiro responsável é recusado.
- Quando um aprova ou revoga um profissional, então o outro é avisado e o log mostra quem agiu.

**Pré-cadastro inativo (RF-28, RN-33)**
- Aos 30 dias sem ativação, o pré-cadastro fica INATIVO e a clínica é avisada; um novo código o reativa.
- Aos 90 dias, os dados são excluídos definitivamente e fica apenas um registro sem dados pessoais.

**Relatório de evolução (RF-55 a RF-57)**
- Ao escolher o período, o responsável vê consultas, faltas, adesão, humor e objetivos, **sem** observações privadas.
- Um parecer publicado pelo profissional aparece no relatório; antes de publicar, não.

**Desligamento de profissional (RF-11, RF-14)**
- Quando o ADM desativa o profissional, então os vínculos dele ficam ENCERRADO na hora, o token dele deixa de funcionar e a família é avisada.
- Quando o mesmo profissional entra em outra clínica, então precisa de nova aprovação do responsável.

**Aviso de conflito entre clínicas (RF-48, RF-49)**
- Dado vínculo aprovado com o escopo ligado, quando o profissional ou a recepção, **na tela Nova consulta**, escolhe um horário que se sobrepõe a uma de outra clínica, então vê um aviso genérico (sem clínica, profissional, tipo ou horário) e pode confirmar. A agenda da clínica nunca exibe consultas de outra clínica.
- Quando o responsável desliga o escopo, então o aviso deixa de aparecer no próximo agendamento.

**Log de acesso (RF-71/72)**
- Toda abertura de perfil ou linha do tempo por profissional gera uma linha no painel do responsável com nome, clínica, ação e data/hora.
