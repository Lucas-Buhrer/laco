# 01 — Visão do Produto e Escopo

## 1. Problema

Crianças com TEA costumam passar por vários profissionais e clínicas (fonoaudiologia, TO, psicologia/ABA, psicopedagogia). O histórico fica espalhado, a família repete a mesma história a cada novo atendimento, e as orientações para casa se perdem. Ao mesmo tempo, dados de saúde de crianças são extremamente sensíveis: não pode haver acesso livre de qualquer clínica.

## 2. Proposta de valor

Um software **vendido para clínicas** (modelo B2B, multi-clínica) onde:
- a **clínica** cadastra a criança e entrega à família um **código de ativação** do app;
- **a família é a dona do dado**: o acesso clínico só começa quando ela aprova **cada profissional**;
- profissionais de clínicas diferentes enxergam um **histórico unificado** (somente com aprovação);
- a família acompanha consultas e executa **atividades de casa** com orientação clara.

## 3. Objetivos

| # | Objetivo | Como medir |
|---|---|---|
| O1 | Nenhum profissional acessa criança sem aprovação do responsável | 0 falhas nos testes de permissão |
| O2 | Responsável vê quem acessou os dados da criança | Painel de acessos funcionando |
| O3 | Profissional registra sessão em menos de 2 minutos | Teste de usabilidade |
| O4 | Família consegue marcar atividade de casa em até 3 toques | Teste de usabilidade |
| O5 | Aderência à LGPD documentada e testável | Checklist do doc 04 100% |
| O6 | Clínica pré-cadastra a criança e entrega o código em menos de 2 minutos | Teste de usabilidade |

## 4. Escopo — DENTRO

- Cadastro de clínicas, **administrador da clínica** (perfil separado) e profissionais; responsáveis entram **somente por código de ativação** fornecido pela clínica.
- **Aviso de conflito entre clínicas** na hora de agendar: o sistema só avisa que a criança já tem horário em outra clínica nesse intervalo, sem mostrar clínica, profissional ou tipo. A agenda de cada clínica mostra apenas as suas próprias consultas.
- Até dois responsáveis por criança (pai e mãe); o segundo entra por código de convite.
- Perfil **Recepção** (cadastros e agenda, sem acesso clínico).
- Limpeza automática de pré-cadastros nunca ativados (inativo e depois excluído).
- **Relatório de evolução** para os pais, com parecer opcional do profissional.
- Gestão de profissionais por clínica.
- Pré-cadastro da criança pela clínica (dados mínimos) e geração do código de ativação.
- **Vínculo profissional ↔ criança com aprovação individual, permissões e revogação.**
- Convite gerado pelo responsável para outra clínica acessar a mesma criança.
- Agenda de consultas (profissional e família).
- Registro de sessão / evolução e linha do tempo (histórico).
- Atividades de casa e acompanhamento de execução.
- Recursos LGPD: consentimento, log de acessos, exportação, solicitação de exclusão, revogação.
- Notificações dentro do sistema.
- Painéis iniciais para profissional e responsável.

## 5. Escopo — FORA (versão 1)

- **Módulo financeiro da clínica** (cobranças, pagamentos, faturamento, relatórios, convênios): **não será criado neste projeto**. Aparece **somente nos slides**, como visão de produto e atrativo comercial, para a banca conhecer o plano.
- Cobrança e planos de licenciamento das clínicas (comercial, fora do sistema).
- Autocadastro de responsáveis (sem código de uma clínica).
- Aprovação do responsável pela clínica inteira (decidido: sempre por profissional).
- Envio real de e-mail/SMS/WhatsApp (será simulado na tela).
- Teleconsulta/videochamada.
- Aplicativo nativo (Android/iOS).
- Mais de dois responsáveis por criança e mediação de disputas entre responsáveis.
- Assinatura digital com validade jurídica de prontuário.
- Inteligência artificial.

## 6. Glossário

| Termo | Significado |
|---|---|
| TEA | Transtorno do Espectro Autista |
| Responsável | Pai/mãe/tutor legal; titular dos dados da criança no sistema |
| Profissional | Terapeuta/clínico; a conta pertence a **uma única clínica** |
| Admin da clínica | Perfil de gestão da clínica (equipe, pré-cadastros, agenda); **não** acessa dados clínicos da criança |
| Vínculo | Autorização do responsável para um profissional acessar uma criança |
| Escopo do vínculo | O que o profissional pode ver/fazer (ex.: ver histórico anterior) |
| Atividade de casa | Tarefa prescrita pelo profissional para a família executar |
| Linha do tempo | Histórico cronológico de sessões e eventos da criança |
| Log de acesso | Registro de quem viu/alterou dados da criança e quando |
| Conflito de horário | Aviso, dado só ao agendar, de que a criança já tem consulta em outra clínica no intervalo; sem horário exato, clínica, profissional ou tipo |
| Recepção | Perfil da clínica que cadastra crianças e cuida da agenda; **não** acessa dados clínicos |
| Convite de responsável | Código gerado por um responsável para o outro (pai/mãe) entrar na mesma criança |
| Parecer | Texto opcional do profissional, publicado para a família dentro do relatório de evolução |
| Relatório de evolução | Resumo por período com consultas, faltas, adesão às atividades, humor e objetivos |
| Pré-cadastro | Cadastro inicial da criança feito pela clínica, só com dados mínimos (nome, nascimento, contato do responsável) |
| Código de ativação | Código de uso único que a clínica entrega ao responsável para criar a conta no app |
| Convite de compartilhamento | Código gerado pelo responsável para que outra clínica peça acesso à criança |

## 7. Premissas

1. Até dois responsáveis por criança (pai e mãe), cada um com sua conta.
2. Cada conta de profissional pertence a uma única clínica; quem atende em duas clínicas tem uma conta em cada uma e precisa da aprovação dos pais para cada uma.
3. A plataforma é usada em navegador (computador e celular).
4. Dados de demonstração são fictícios.
5. A clínica é o canal de entrada: o responsável só cria conta com o código de uma clínica cliente.
6. A aprovação do responsável é sempre por profissional; profissional novo na clínica exige nova aprovação.

## 8. Riscos principais

| Risco | Impacto | Mitigação |
|---|---|---|
| Escopo completo em 2 dias | Alto | Prioridades P0/P1/P2 como ordem de execução (sem cortes), no doc 07 |
| Ex-funcionário manter acesso às crianças | Crítico | Desativação encerra vínculos na hora e invalida a sessão |
| Vazamento de dado sensível | Crítico | Permissão checada no servidor em toda consulta + testes |
| Aviso de conflito revelar que a criança tem outro atendimento | Médio | Só dia/hora, só para vínculo aprovado, escopo ligado por padrão mas desligável pelos pais, acesso registrado em log |
| Código de ativação vazado ou usado por pessoa errada | Alto | Uso único, vence em 7 dias, exige data de nascimento da criança, limite de tentativas |
| Interpretação jurídica da LGPD | Alto | Validar documentos com advogado antes de uso real |
| SQLite sem criptografia em repouso | Médio | Aceito para demo; produção exige banco gerenciado com criptografia |
| Usabilidade para famílias sobrecarregadas | Médio | Telas simples, textos curtos, poucos toques |
