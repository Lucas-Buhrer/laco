# 04 — LGPD e Segurança

> ⚠️ Este documento é um guia técnico de planejamento, **não é parecer jurídico**. Antes de uso real com pacientes, validar com advogado especializado em proteção de dados e saúde.

## 1. Enquadramento legal (resumo)

- **Lei 13.709/2018 (LGPD).**
- Dados de saúde e de TEA são **dados pessoais sensíveis** (art. 11).
- Titular é uma **criança**: tratamento no seu melhor interesse e com **consentimento específico e em destaque de pelo menos um dos pais ou responsável legal** (art. 14).
- Verificar com o jurídico legislação complementar sobre proteção de crianças em ambiente digital (ex.: ECA Digital) e normas dos conselhos profissionais sobre prontuário.

## 2. Papéis (a confirmar com o jurídico)

| Papel LGPD | Quem | Observação |
|---|---|---|
| Titular | A criança (representada pelo responsável) | |
| Controlador | **Clínica cliente** (dados do pré-cadastro e do atendimento) | Definir em contrato |
| Operador | O **LAÇO** (fornecedor do software) e a hospedagem, tratando dados em nome da clínica | Contrato de operação a redigir |
| Encarregado (DPO) | A designar | Contato exibido na Política de Privacidade |

## 3. Princípios aplicados no produto

| Princípio | Como aparece no sistema |
|---|---|
| Finalidade | Dados usados só para acompanhamento terapêutico; texto no Termo |
| Necessidade | Formulários pedem só o essencial; CPF **não** é coletado na v1; o pré-cadastro tem só nome, nascimento e contato do responsável |
| Livre acesso | Responsável exporta tudo (RF-73) e vê painel de acessos (RF-72) |
| Segurança | Seção 6 deste documento |
| Transparência | Política de Privacidade pública (RF-76) e log visível |
| Prevenção | Permissão no servidor + testes de segurança |
| Não discriminação | Dados não são usados para outra finalidade |

## 4. Inventário de dados

| Dado | Titular | Sensível? | Finalidade | Quem acessa | Retenção |
|---|---|---|---|---|---|
| Nome, e-mail, senha (hash) | Responsável/Profissional | Não | Conta e login | Próprio usuário | Enquanto a conta existir |
| Nome e nascimento da criança | Criança | Pessoal | Identificação | Responsável + profissional vinculado | A definir pelo jurídico |
| Nível de suporte, comunicação, sensibilidades | Criança | **Sim** | Personalizar atendimento | Responsável + vinculado | A definir |
| Registros de sessão | Criança | **Sim** | Evolução clínica | Registro: responsáveis + vinculados conforme escopo; observação privada: só o autor | Prontuário: prazo legal a confirmar |
| Atividades e execuções | Criança | **Sim** | Terapia em casa | Responsável + profissional vinculado | A definir |
| Log de acesso | Todos | Não | Auditoria e transparência | Responsável (sobre sua criança) | Mínimo 6 meses (sugestão) |
| Consentimentos | Responsável | Não | Prova de base legal | Responsável + operador | Enquanto houver tratamento + prazo de prova |
| Pré-cadastro (nome, nascimento, contato do responsável) | Criança/Responsável | Pessoal | Identificar a criança e entregar o acesso ao app | Clínica que cadastrou | Inativo aos 30 dias e **excluído aos 90** se não ativado (sugestão a validar com o jurídico) |
| Código de ativação | Responsável | Não | Entrada segura do responsável | Clínica que gerou (só o status) | Vence em 7 dias; guardar apenas o hash |
| Parecer do profissional | Criança | **Sim** | Informar a família sobre a evolução | Profissional autor + responsáveis (após publicado) | Como o prontuário: prazo legal a confirmar |
| Relatório de evolução (gerado, não armazenado) | Criança | **Sim** | Transparência para os responsáveis | Somente responsáveis | Gerado sob demanda a partir de dados já existentes |
| Conflito de horário (existência de consulta em outra clínica no intervalo) | Criança | Pessoal (revela que há atendimento) | Evitar conflito de agenda | Só profissional com vínculo aprovado e escopo ligado | Enquanto a consulta existir; sem identificar clínica ou profissional |

## 5. Direitos do titular (art. 18) → funcionalidades

| Direito | Funcionalidade |
|---|---|
| Confirmação e acesso | Telas de perfil, linha do tempo e painel de acessos |
| Correção | Edição dos dados da criança (RF-21) |
| Portabilidade / cópia | Exportação (RF-73) |
| Eliminação / anonimização | Solicitação de exclusão (RF-74); registros clínicos com obrigação legal de guarda ficam retidos e o motivo é informado |
| Informação sobre compartilhamento | Painel de vínculos e acessos |
| Revogação do consentimento | RF-75 |

## 6. Medidas de segurança

**Técnicas**
1. Senhas com bcrypt (custo ≥ 10); nunca registrar senha em log.
2. JWT assinado, expiração de 8h, segredo em variável de ambiente.
3. **Controle de acesso no servidor:** toda rota de criança passa por um middleware que verifica (a) se é o responsável dono ou (b) se há vínculo aprovado ativo, e aplica o escopo.
4. Respostas 403/404 que não revelam se a criança existe.
5. IDs não sequenciais previsíveis para criança (usar UUID).
6. `helmet` (cabeçalhos seguros), `cors` restrito, limite de tentativas de login.
7. Validação de entrada e SQL parametrizado.
8. Log de auditoria imutável (somente inserção) para acessos a dados de criança.
9. HTTPS obrigatório em qualquer ambiente fora do notebook.
10. Backup do banco com acesso restrito.
11. **Código de ativação:** gerado de forma aleatória, uso único, vence em 7 dias, exige a data de nascimento da criança e tem limite de tentativas; ao ser usado, é invalidado.
12. **Conta por clínica:** profissional e ADM só existem dentro de uma clínica; o login exige o código da clínica.
13. **Desligamento imediato:** ao desativar a conta, vínculos são encerrados e a sessão deixa de valer na mesma hora (o servidor confere se o usuário está ativo a cada requisição).
14. **ADMIN_CLINICA sem acesso clínico:** o perfil nunca passa pela regra de acesso de dados clínicos da criança.
15. **Aviso de conflito minimizado:** a resposta é só "há conflito: sim/não"; sem clínica, profissional, tipo, status ou horário; a agenda de uma clínica nunca lista consultas de outra; cada verificação é registrada em log.
16. **Recepção e ADM:** nenhuma rota clínica (registros, atividades, linha do tempo, pareceres, relatório) é acessível a esses perfis.
17. **Dois responsáveis:** cada ação sensível grava quem agiu e avisa o outro; ninguém remove o outro; convite de responsável tem uso único, 7 dias e limite de tentativas.
18. **Exclusão de pré-cadastros inativos:** exclusão física dos dados pessoais e registro mínimo (protocolo, data, motivo) sem dados da criança.

**Organizacionais (para a clínica/operação real)**
- Política de privacidade e Termo revisados por advogado.
- Treinamento de profissionais sobre sigilo.
- Plano de resposta a incidentes (item 8).
- Relatório de Impacto (RIPD) — roteiro no item 9.

**Limitação conhecida:** SQLite não criptografa o arquivo. Aceitável na demonstração com dados fictícios; em produção usar banco gerenciado com criptografia em repouso.

## 7. Fluxo de consentimento

1. A clínica faz o **pré-cadastro** só com dados cadastrais. A base legal dessa etapa deve ser definida com o jurídico (ex.: procedimentos preliminares ligados a contrato, art. 7º, V). **Nenhum dado clínico** existe antes dos passos 2 e 4.
2. Na ativação da conta (código + data de nascimento), o responsável lê o Termo (versão registrada) e marca o aceite — caixa **desmarcada por padrão**.
3. Sistema grava: responsável, versão do termo, data/hora.
4. Ao aprovar **cada profissional**, o responsável faz uma **autorização específica** (profissional, clínica, escopo).
5. Revogar consentimento (RF-75) encerra todos os vínculos e bloqueia novos.
6. **Segundo responsável:** também lê e aceita o Termo (consentimento próprio, versionado) ao entrar pelo convite.

## 8. Plano de resposta a incidentes (resumo)

1. Detectar e conter (desativar contas/tokens, trocar segredo JWT).
2. Avaliar: quais dados, quantos titulares, risco.
3. Comunicar a ANPD e os titulares quando houver risco relevante, em prazo razoável (confirmar prazo atual com o jurídico).
4. Registrar causa e correção.

## 9. Roteiro do RIPD

Descrição do tratamento · Finalidades · Dados envolvidos · Riscos (acesso indevido, vazamento, uso secundário) · Medidas de mitigação (seção 6) · Parecer do encarregado.

## 10. Checklist LGPD (usado nos testes)

- [ ] Termo aceito e versionado na ativação, antes de qualquer dado clínico
- [ ] Clínica só vê dados cadastrais até a aprovação do responsável
- [ ] Código de ativação é de uso único, vence e exige data de nascimento
- [ ] ADM nunca acessa dados clínicos nem aprova vínculos
- [ ] Desativar profissional encerra vínculos e sessão imediatamente
- [ ] Mesmo e-mail em duas clínicas gera contas independentes, sem vínculos herdados
- [ ] O aviso de conflito traz só sim/não, respeita o escopo e gera log
- [ ] Segundo responsável aceita o Termo; ações sensíveis avisam o outro e gravam o autor
- [ ] Recepção e ADM não acessam nenhum dado clínico
- [ ] Pré-cadastro não ativado é inativado e excluído nos prazos, com registro sem dados pessoais
- [ ] Relatório e parecer só mostram o que os responsáveis já podem ver
- [ ] Nenhum profissional acessa criança sem vínculo aprovado
- [ ] Revogação bloqueia acesso imediatamente
- [ ] Todo acesso gera log e o responsável o enxerga
- [ ] Observação marcada "Só para mim" não aparece para a família nem para outros profissionais
- [ ] Exportação contém todos os dados da criança
- [ ] Solicitação de exclusão é registrada com protocolo
- [ ] Política de privacidade acessível sem login
- [ ] Nenhuma senha/dado sensível em logs do servidor

## 11. Pendências para o jurídico (sem responsável definido por enquanto)

Estas decisões ficaram com **valores sugeridos** e devem ser validadas quando houver advogado:
1. Base legal do pré-cadastro feito pela clínica antes do consentimento dos pais.
2. Prazos de inativação (30 dias) e exclusão (90 dias) dos pré-cadastros; prazo de guarda de prontuário e pareceres.
3. **Divergência entre os dois responsáveis** (ex.: pais separados, guarda): hoje cada um tem o mesmo poder e ninguém remove o outro.
4. Divisão de papéis entre a clínica (controladora) e o LAÇO (operador) e contrato de operação.
5. Texto final do Termo de Consentimento e da Política de Privacidade.
