# 10 — Roteiro da Apresentação do LAÇO (10 minutos no total)

> Tempo máximo: **10 min entre slides e software**. Plano: 7 slides (≈4 min) + demonstração (4:30) + folga (≈1 min).
> A versão longa (14 slides) está guardada em `10b-roteiro-extendido.md`.

## 1. Divisão do tempo

| Bloco | Tempo | Acumulado |
|---|---|---|
| Slide 1: o problema e o LAÇO | 0:30 | 0:30 |
| Slide 2: propósito (consultas com avisos, atividades com lembretes, histórico) | 0:40 | 1:10 |
| Slide 3: para a clínica (agenda que se confirma, financeiro como próxima etapa) | 0:40 | 1:50 |
| Slide 4: como funciona | 0:30 | 2:20 |
| Slide 5: LGPD | 0:45 | 3:05 |
| Slide 6: segurança no back-end | 0:45 | 3:50 |
| **Demonstração do software** | **4:30** | 8:20 |
| Slide 7: encerramento e próximos passos | 0:30 | 8:50 |
| Folga para imprevistos | 1:10 | 10:00 |

Regra de ouro: **se atrasar, corte a demonstração, não os slides de LGPD e segurança** (são o diferencial).

---

## 2. Slides (texto curto na tela; fale o resto)

### Slide 1 — O problema e o LAÇO (0:30)
- **Título:** LAÇO: a família no centro do cuidado
- **Na tela:**
  - Vários profissionais, clínicas e anos de história espalhados
  - A família repete tudo, perde orientações e não sabe quem vê os dados
  - **LAÇO:** software para clínicas, com app para os pais
- **Fala:** uma frase de abertura sobre a mãe que repete a história a cada novo profissional; apresentar o LAÇO em uma frase.

### Slide 2 — Propósito (0:40)
- **Título:** Mais controle para os pais
- **Na tela (3 cartões):** **Consultas** (avisos no app e confirmação de presença) · **Atividades de casa** (com lembretes) · **Histórico de anos e profissionais** (com relatório de evolução)
- **Fala:** o app mostra o que foi marcado, o que fazer em casa e a história completa da criança; tudo em poucos toques, no celular.

### Slide 3 — Para a clínica (0:40)
- **Título:** Para a clínica: gestão completa
- **Na tela (3 cartões):** **Agenda viva** (consulta amarela até os pais confirmarem a presença no app, no máximo 1 dia antes; depois verde) · **Financeiro integrado** (*visão de produto, não faz parte da demonstração*) · **Famílias mais próximas** (informação e histórico simplificados, lembretes das atividades)
- **Fala:** o atrativo para a clínica contratar é gerenciar tudo em um lugar; o diferencial para os pais é o acesso simples à informação e o app que lembra de fazer as atividades com os filhos.
- **Atenção:** o módulo financeiro **não foi construído**; dizer que é a visão do produto, apresentada para a banca conhecer.

### Slide 4 — Como funciona (0:30)
- **Título:** A clínica traz a família; a família decide
- **Na tela (4 passos):**
  1. Clínica pré-cadastra a criança
  2. Entrega um **código de ativação** aos pais
  3. Pais criam a conta e aceitam o termo
  4. Pais **aprovam cada profissional**
- **Fala:** sem autocadastro; antes da aprovação a clínica só vê dados cadastrais. Outra clínica só entra por convite dos pais. Se o profissional sai da clínica, o acesso acaba na hora.

### Slide 5 — LGPD (0:45)
- **Título:** Privacidade por projeto
- **Na tela:**
  - **Consentimento** registrado (pai e mãe)
  - **Aprovação por profissional**, revogável a qualquer momento
  - **Dados mínimos** (sem CPF) e pré-cadastro excluído se não ativado
  - Os pais veem **quem acessou** os dados do filho
  - Exportar dados, pedir exclusão, revogar consentimento
- **Fala:** dados de saúde de crianças são sensíveis (Lei 13.709/2018). Dizer "projetado para aderir à LGPD"; a revisão jurídica dos textos é um próximo passo.

### Slide 6 — Segurança no back-end (0:45)
- **Título:** O servidor confere tudo, sempre
- **Na tela:**
  - **Permissão validada no servidor** em toda requisição (não depende da tela)
  - Sem acesso: o sistema **não revela** que a criança existe
  - Senhas com **hash**; sessão com expiração; **limite de tentativas**
  - Códigos de uso único, com validade
  - **Admin e recepção** nunca veem dado clínico
  - **Log de auditoria** de cada acesso
- **Fala:** analogia do porteiro: a cada porta ele pergunta "tem vínculo aprovado?". Mencionar que há testes automáticos de permissão.
- **Atenção:** citar só o que estiver implementado e testado na versão da demo.

### Slide 7 — Encerramento (0:30), exibido depois da demonstração
- **Título:** Próximos passos
- **Na tela:** hoje = versão de demonstração com dados fictícios · próximos = revisão jurídica, banco criptografado, e-mail/WhatsApp, 2 fatores · **convite para um piloto**
- **Fala:** agradecer e deixar o contato.

---

## 3. Demonstração (5 minutos) — ordem e tempo

Preparação: rodar o **reset do seed**, deixar **janelas já logadas** (recepção, profissional, responsável no celular ou em janela estreita) e o zoom do navegador em 125%.

| # | Cena | Tempo | O que mostrar |
|---|---|---|---|
| 1 | Recepção | 0:30 | Pré-cadastrar o Davi e gerar o código (só dados cadastrais) |
| 2 | Família | 0:40 | Ativar a conta com o código + data de nascimento (campos já abertos) |
| 3 | Aprovação | 0:40 | Pedido pendente da Dra. Ana para o Theo: escolher escopo e aprovar |
| 4 | Profissional | 1:00 | Criança aparece; registrar sessão (compartilhada) e criar atividade |
| 5 | Aviso de conflito | 0:30 | Agendar o Theo na quinta 14h: aviso de horário em outra clínica, sem nenhum outro dado |
| 6 | Família | 0:40 | Marcar atividade e abrir o **relatório de evolução** |
| 7 | Transparência e controle | 0:50 | Painel "quem acessou" e **revogar** o profissional; ele perde o acesso |

**Total ≈ 5:10.** Se estiver atrasado, corte nesta ordem: cena 6 (relatório) → cena 5 (aviso de conflito) → cena 2 (mostrar o código gerado e pular direto para a aprovação).
O roteiro completo (≈15 min) fica no doc 09, seção 3.2.

---

## 4. Plano B (demonstração ao vivo, sem vídeo)
- Decidido: a demonstração será **ao vivo**, sem vídeo de reserva.
- **Duas pessoas:** uma apresenta e narra; a outra opera o software. Combinem um sinal para "pular cena" se atrasar.
- Sem prints e sem vídeo de reserva: a demonstração roda ao vivo no próprio computador.
- Decidam antes: se algo travar por mais de 15 segundos, a operadora segue para a próxima cena ou para o slide de encerramento.
- Abrir o deck com internet antes de começar (as fontes dos slides vêm da internet; sem ela, usa-se uma fonte padrão).

## 5. Dicas para caber em 10 minutos
1. **Ensaie com cronômetro** pelo menos duas vezes e ajuste a fala, não a quantidade de slides.
2. Cada slide tem **no máximo 5 linhas**; não leia a tela.
3. Abra tudo antes de começar: sem digitar login ao vivo, sem carregar tela nova no escuro.
4. Fale primeiro o **benefício** (família no controle) e depois o técnico.
5. Reserve a última frase para o convite ao piloto.

## 6. Perguntas prováveis (respostas de 1 frase)
| Pergunta | Resposta |
|---|---|
| E se o código vazar? | Uso único, vence em 7 dias, exige a data de nascimento da criança e tem limite de tentativas. |
| Outra clínica vê o histórico? | Só se os pais convidarem e escolherem compartilhar o histórico anterior. |
| Profissional que sai da clínica? | O admin desativa a conta e os vínculos acabam na hora; em outra clínica, os pais aprovam de novo. |
| Quem responde pelos dados? | A clínica é a controladora e o LAÇO é o operador; isso será formalizado em contrato. |
| Pai e mãe divergem? | Os dois têm o mesmo poder e cada ação mostra quem agiu; divergências sérias dependem de orientação jurídica. |

## 7. A decidir antes da apresentação
- [x] **Duas pessoas:** uma apresenta, a outra opera o software (definido).
- [x] **Demo ao vivo**, sem vídeo de reserva (definido).
- [x] **Deck pronto** montado por Claude (definido; só falta preencher o contato no último slide).
- [ ] **Logotipo, cores e slogan** do LAÇO.
- [x] Sem prints reais: os slides usam o desenho das telas.
