# 03 — Personas e Jornadas

## 1. Personas

### Persona 1 — Renata, 41 anos (ADM)
- **Papel:** Administradora da Clínica Aurora (6 profissionais).
- **Dores:** Cadastro manual de crianças e equipe; profissionais que entram e saem; medo de um ex-funcionário continuar com acesso a dados das crianças.
- **Objetivos:** Cadastrar a equipe, pré-cadastrar crianças, ver a agenda da clínica, desligar um profissional com segurança.
- **Frase:** "Quando alguém sai da clínica, o acesso dele às crianças tem que acabar no mesmo dia."
- **Limite do perfil:** gerencia a clínica, mas **não vê dados clínicos** das crianças.

### Persona 2 — Dra. Ana, 38 anos (PROF)
- **Papel:** Fonoaudióloga da Clínica Aurora. Atende 25 crianças com TEA por semana.
- **Dores:** Histórico incompleto de crianças vindas de outras clínicas; pais não fazem as tarefas de casa.
- **Objetivos:** Registrar sessões rápido, ver se a família pratica em casa, saber o que já foi trabalhado antes (se a família permitir).
- **Frase:** "Eu preciso saber o que já foi trabalhado antes, mas só se a família quiser compartilhar."

### Persona 3 — Carlos, 29 anos (PROF)
- **Papel:** Terapeuta ocupacional. Atende na Clínica Aurora e na Clínica Horizonte, com **uma conta em cada**.
- **Dores:** Reescrever relatórios; pouco tempo entre sessões; marcar consulta sem saber que a criança já está ocupada em outro lugar.
- **Objetivos:** Registro de sessão curto; agenda sem conflito; ver só as crianças que a família autorizou.
- **Frase:** "Tenho 10 minutos entre uma sessão e outra."

### Persona 4 — Mariana, 34 anos (RESP)
- **Papel:** Mãe do Theo (5 anos, TEA nível 2 de suporte). Trabalha o dia todo.
- **Dores:** Esquece orientações; não sabe quem vê os dados do filho; vários profissionais, cada um com um caderno.
- **Objetivos:** Ver consultas de todas as clínicas, saber o que fazer em casa, controlar quem tem acesso.
- **Frase:** "Eu só quero ter certeza de que ninguém vê o Theo sem eu deixar."
- **Contexto de uso:** Celular, à noite, cansada. Precisa de telas simples.

### Persona 5 — Bia, 24 anos (REC)
- **Papel:** Recepcionista da Clínica Aurora.
- **Dores:** Cadastrar crianças em papel; remarcar consultas por telefone; medo de ver ou mostrar dado clínico sem querer.
- **Objetivos:** Pré-cadastrar, entregar o código aos pais e manter a agenda em dia.
- **Limite do perfil:** nunca vê registros, atividades ou pareceres.

### Persona 6 — Thiago, 36 anos (RESP)
- **Papel:** Pai do Theo, segundo responsável, convidado pela Mariana.
- **Objetivos:** Acompanhar consultas e atividades, aprovar profissionais junto com a Mariana, ler o relatório de evolução.

### Persona 7 (anti-persona) — Pessoa mal-intencionada
- Tenta acessar crianças sem vínculo, adivinhando IDs; usa conta de **ex-funcionário** desativado; tenta ver dados de outra clínica; tenta adivinhar o código de ativação.
- **Uso:** guia os testes de segurança (doc 08).

## 2. Jornadas

### J1 — Clínica entra na plataforma (Renata)
1. Cadastra a clínica e a si mesma como ADM; recebe o **código da clínica**.
2. Cadastra Dra. Ana e Carlos como profissionais (cada conta vale só para esta clínica).
3. Passa a eles o código da clínica, o e-mail e a senha temporária.
4. Passa a pré-cadastrar as crianças que a clínica atende (J2).
**Sucesso:** equipe cadastrada em menos de 5 minutos.

### J2 — Clínica traz a família; família autoriza (Renata/Dra. Ana e Mariana)
1. A clínica pré-cadastra o Theo (nome, nascimento, contato da Mariana) e indica Carlos como profissional.
2. O sistema gera um **código de ativação**; a clínica entrega à Mariana (pessoalmente ou WhatsApp, fora do sistema).
3. Mariana abre o app, informa o código e a data de nascimento do Theo, cria a senha e aceita o Termo.
4. Mariana vê o pedido de acesso do Carlos (profissional, clínica, especialidade), escolhe se compartilha o histórico anterior e se permite avisar conflitos de horário com outras clínicas, e aprova.
**Sucesso:** a clínica só vê dados cadastrais até o passo 4; o acesso clínico começa somente após a aprovação.

### J3 — Rotina de atendimento (Carlos)
1. Entra com o código da clínica + e-mail + senha e vê as consultas do dia.
2. Atende e registra a sessão (o registro é sempre visível à família; ele escolhe se a observação vai para a família ou fica só com ele).
3. Cria atividade de casa "Pedir objeto com figura, 3x ao dia".
**Sucesso:** registro em menos de 2 minutos.

### J4 — Rotina da família (Mariana)
1. Abre o app no celular e vê "Hoje".
2. Marca a atividade como feita e escolhe 🙂.
3. Lê o resumo da última sessão.
**Sucesso:** até 3 toques para marcar atividade.

### J5 — Família retira o acesso (Mariana)
1. Vai em "Quem tem acesso".
2. Revoga o vínculo de um profissional.
3. Confere no painel de acessos que o último acesso foi anterior à revogação.
**Sucesso:** profissional perde acesso imediatamente.

### J6 — Exercício de direitos LGPD (Mariana)
1. Exporta os dados do Theo.
2. Solicita exclusão; sistema registra o pedido e avisa o prazo.

### J7 — Segunda clínica pede acesso (Mariana)
1. Mariana, no app, gera um **convite de compartilhamento** para o Theo.
2. Entrega o código a um terapeuta de outra clínica.
3. O terapeuta informa o código; Mariana recebe o pedido, decide o escopo e aprova (ou recusa).
**Sucesso:** a outra clínica não encontra o Theo sozinha e não vê nada antes da aprovação.

### J8 — Profissional sai da clínica (Renata, Carlos e Mariana)
1. Carlos deixa a Clínica Aurora; Renata **desativa** a conta dele.
2. Na hora: vínculos de Carlos com todas as crianças da Aurora viram ENCERRADO, sessão invalidada, consultas futuras canceladas.
3. Mariana recebe aviso e vê o vínculo como encerrado.
4. Carlos continua na Clínica Horizonte com a **outra conta**; para atender o Theo lá, a Mariana precisa aprovar de novo.
**Sucesso:** o ex-funcionário não acessa nenhuma criança da clínica antiga.

### J9 — Aviso de conflito entre clínicas (Carlos)
1. Carlos encerra a sessão do Theo e o sistema pergunta: "Vamos marcar a próxima?" (a Recepção também pode agendar pela mesma tela).
2. Na tela **Nova consulta**, ele escolhe quinta, 14h. A agenda da clínica dele mostra só as consultas dele, sem avisos.
3. O sistema avisa: "O Theo já tem um horário nesse intervalo em outra clínica", sem dizer qual clínica, quem ou o quê.
4. Carlos escolhe outro horário (ou confirma mesmo assim).
**Sucesso:** evita conflito sem expor nenhum dado de outra clínica.

### J10 — Pai e mãe no mesmo cuidado (Mariana e Thiago)
1. Mariana gera um **convite de responsável** para o Theo.
2. Thiago informa o código e a data de nascimento do Theo, cria a conta e aceita o Termo.
3. Os dois passam a ver tudo; quando um aprova ou revoga um profissional, o outro é avisado e o log mostra quem fez.
4. Se preferirem, usam o mesmo login nos dois aparelhos (sem limite de sessões).
**Sucesso:** os dois acompanham a criança sem se atrapalhar e sem que um remova o outro.

### J11 — Recepção no dia a dia (Bia)
1. Pré-cadastra uma criança nova e entrega o código de ativação.
2. Quando uma família de outra clínica traz o **código da família**, Bia o digita no painel, escolhe o profissional e já agenda a primeira consulta (que fica "aguardando aprovação da família").
3. Agenda e remarca consultas de crianças aprovadas com o profissional.
4. Entra com código de usuário e senha; se esquecer a senha, pede a Renata (admin) para redefinir.
5. Pré-cadastro que ninguém ativou fica **inativo** em 30 dias; Bia gera novo código ou deixa expirar (exclusão aos 90 dias).
**Sucesso:** Bia trabalha sem nunca ver dado clínico.

### J12 — Relatório de evolução (Mariana e Dra. Ana)
1. Dra. Ana escreve e publica um **parecer** do trimestre.
2. Mariana escolhe o período e vê consultas, faltas, adesão às atividades, humor e objetivos, junto com o parecer.
3. Imprime ou salva em PDF para levar à escola ou a outro profissional.
**Sucesso:** relatório claro, sem observações privadas.

### J13 — Segundo filho (Mariana)
1. A clínica pré-cadastra a segunda criança e entrega um novo código à Mariana.
2. No app, ela abre o seletor de criança e toca em "Adicionar outro filho".
3. Digita o código e a data de nascimento da criança; sem criar nova conta.
4. A tela "Hoje" passa a mostrar os dois filhos juntos, com filtro por criança.
5. Os pedidos de acesso dos profissionais da nova criança chegam para aprovação, separados dos do primeiro filho.
**Sucesso:** uma conta, vários filhos, aprovação separada por criança.
