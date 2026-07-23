# Caravana ao Templo

App para organizar as caravanas da ala ao templo: quem vai, quem falta resolver
o quê, quem está na fila de espera, quem já pagou e quem embarcou.

Substitui a planilha de controle, e resolve o que a planilha não conseguia:
saber **o que falta resolver hoje**, quantos assentos ainda existem, e gerar o
pedido de agendamento que a ala envia ao templo.

---

## O que este app é — e o que ele não é

**É** uma ferramenta de **logística**: assentos, fila de espera, pendências,
pagamento, embarque.

**Não é** registro eclesiástico. A preparação de membros para ordenanças e o
registro das entrevistas de recomendação vivem no **Sistema de Preparação de
Ordenanças, dentro do LCR** — o sistema oficial da Igreja. Este app nunca
duplica isso.

Na prática, isso significa que aqui **não existe** campo para motivo de
indignidade, conteúdo de entrevista, nem nada parecido. Da recomendação
guardamos apenas o tipo e a data de validade impressa nela. Se alguém pedir
para acrescentar um campo desses, a resposta é não — a informação pertence ao
LCR.

O app também **não decide nada**: quando encontra uma inconsistência (por
exemplo, alguém marcado para investidura com recomendação de uso limitado), ele
mostra um **aviso**. Quem decide é o bispo.

---

## Como colocar para funcionar

Você precisa de três coisas gratuitas: **Node.js**, uma conta no **Neon** (o
banco de dados) e uma conta na **Vercel** (onde o site fica no ar).

### 1. Instalar o Node.js

Baixe em [nodejs.org](https://nodejs.org) a versão **LTS** e instale. Para
conferir se deu certo, abra o terminal e rode:

```bash
node --version
```

Se aparecer um número (por exemplo `v22.x.x` ou maior), está pronto.

### 2. Instalar as dependências do projeto

```bash
npm install
```

### 3. Criar o banco no Neon

1. Entre em [neon.com](https://neon.com) e crie um projeto.
2. Na tela do projeto, procure **Connection string**.
3. Você vai copiar **duas** versões da mesma string:
   - a que tem **`-pooler`** no endereço → será a `DATABASE_URL`;
   - a que **não tem** `-pooler` → será a `DIRECT_URL`.

   As duas são necessárias: o app do dia a dia usa a primeira, e as migrações
   (que criam as tabelas) precisam da segunda, porque o pooler não aceita esses
   comandos.

### 4. Preencher o arquivo de configuração

Copie o modelo:

```bash
cp .env.example .env
```

No Windows, pelo PowerShell:

```bash
Copy-Item .env.example .env
```

Abra o `.env` e preencha:

- `DATABASE_URL` e `DIRECT_URL` — as duas strings do Neon.
- `AUTH_SECRET` — gere um valor rodando `npx auth secret`.
- `ADMIN_EMAILS` — **o seu e-mail**. Quem estiver aqui entra como administrador.
- `SEED_UNIDADE_NOME` — o nome da sua ala ou ramo (opcional; dá para cadastrar
  pela tela depois).

O `AUTH_RESEND_KEY` pode ficar vazio por enquanto — veja a seção sobre login.

### 5. Criar as tabelas e liberar o primeiro acesso

```bash
npm run db:aplicar
```

```bash
npm run db:seed
```

### 6. Rodar no seu computador

```bash
npm run dev
```

Abra <http://localhost:3000>.

---

## Como funciona o login

Não há senha. Você digita o e-mail e recebe um **link de acesso**. Clicou,
entrou. É de propósito: senha é a coisa que mais dá problema com quem não é
técnico, e link mágico elimina senha fraca, senha esquecida e senha repetida.

**No seu computador, sem configurar e-mail:** o link aparece **no terminal**
onde você rodou `npm run dev`, num quadro fácil de achar. É só copiar e colar no
navegador. Isso serve para testar sem depender de nada externo.

**Em produção, o envio de e-mail é obrigatório** — senão ninguém consegue
entrar. Crie uma conta gratuita no [Resend](https://resend.com), gere uma chave
de API e coloque em `AUTH_RESEND_KEY`. Enquanto você não verificar um domínio
próprio, use `onboarding@resend.dev` como remetente.

### Quem pode o quê

| Papel | O que faz |
|---|---|
| **Administrador** | Tudo: caravanas, membros, importação, papéis. Bispado e secretário. |
| **Organizador da caravana** | Cria e edita caravanas da própria unidade, e todas as inscrições. |
| **Líder de organização** | Vê e edita apenas os membros da própria organização. |
| **Visualizador** | Só leitura. |

Duas regras que valem a pena conhecer:

- Um **líder sem organização definida não vê ninguém**. É de propósito: na
  dúvida, o sistema fecha, não abre.
- Numa **caravana compartilhada com outra ala**, a situação de recomendação dos
  membros da outra unidade **não é exibida**. Quem organiza precisa saber que a
  pessoa tem assento, não a vida dela.

---

## Importar a planilha antiga

Menu **Importar** → escolha o `.xlsx` → confira a prévia → importe.

Nada é gravado antes da sua conferência. Vale explicar o que a importação
**traduz**, porque não é cópia campo a campo:

| Na planilha | No app | Por quê |
|---|---|---|
| `?` e célula vazia | a mesma pendência | Eram dois jeitos de dizer "não sei", e ninguém somava os dois. |
| `Ajudar a agendar entrevista` | pendência + sinalizador de ajuda | Era uma **ação** ocupando a coluna do **estado** — ao marcá-la, o status se perdia. |
| `Precisa de ajuda` (cartão) | pendência + sinalizador de ajuda | Mesmo problema. |
| `jardim` | participação "acompanhante nos jardins" | Não é ordenança: é quem ocupa assento sem entrar no templo. |
| `CARTÃO/ORD.` | preparo dos nomes de família | É o fluxo do FamilySearch: reservar nomes → Pedido de Ordenança Familiar → o templo imprime os cartões na chegada. |
| `(Pesquisador)`, `(Rosa dos Ventos)` no meio do nome | campos próprios | Metadado dentro do nome não dá para filtrar nem contar. |
| Fila numerada à mão | posição recalculada | A planilha tinha a 1ª posição vazia com quatro pessoas esperando embaixo. |

**Linhas sem nome:** a planilha original tinha 14 linhas com organização e
status preenchidos e nenhum nome — quase um terço da caravana. A importação
**não as descarta**: destaca cada uma e pede o nome ali mesmo. O que o app não
consegue inventar é justamente quem é a pessoa.

**Duplicatas:** nomes muito parecidos são apontados com o percentual de
semelhança, e você escolhe entre reaproveitar o cadastro ou criar outro. Nada é
mesclado automaticamente — juntar duas pessoas por engano é pior que ter duas
fichas.

---

## Publicar na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Na Vercel, **Add New → Project** e escolha esse repositório.
3. Em **Environment Variables**, copie as mesmas variáveis do seu `.env`, com
   duas diferenças:
   - `AUTH_URL` deve ser o endereço público (`https://...`);
   - `AUTH_SECRET` deve ser **um valor novo**, diferente do que você usa no seu
     computador.
4. Publique. Depois, aplique as migrações apontando para o banco de produção:

```bash
npm run db:aplicar
```

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Roda no seu computador, em <http://localhost:3000>. |
| `npm run build` | Monta a versão de produção. |
| `npm run teste` | Roda os testes das regras de negócio. |
| `npm run verificar` | Confere os tipos, sem gerar nada. |
| `npm run db:aplicar` | Cria/atualiza as tabelas do banco. |
| `npm run db:seed` | Cria a unidade e libera os administradores. |
| `npm run db:studio` | Abre uma tela para olhar o banco direto. |

---

## Como o código está organizado

```
prisma/schema.prisma        modelo de dados, com os porquês nos comentários
src/lib/dominio.ts          regras do Manual Geral (recomendação, idade, agendamento)
src/lib/fila.ts             capacidade do ônibus e fila de espera
src/lib/permissoes.ts       quem pode o quê — decisões puras, testáveis
src/lib/autorizacao.ts      as mesmas decisões, aplicadas contra o banco
src/lib/importacao.ts       tradução da planilha para o modelo do app
src/app/acoes/              Server Actions (tudo que grava passa por aqui)
src/app/(app)/              telas de quem está logado
```

Quatro módulos — `dominio`, `fila`, `permissoes`, `importacao` — são **puros**:
não tocam banco nem rede. É por isso que dá para testá-los inteiros em segundos,
e é neles que mora a lógica que não pode errar.

### Se você for mexer no código

- **A ordem da fila nunca é digitada.** Quem mexe na lista chama uma função de
  `fila.ts`, que devolve a lista inteira renumerada, e grava tudo dentro de uma
  transação. Foi a numeração manual que produziu a fila furada da planilha.
- **Toda gravação passa por uma Server Action** que confere permissão contra o
  banco. O `proxy.ts` só checa "está logado?" — ele roda no Edge e não alcança o
  Postgres.
- **Os campos editáveis são uma lista fechada** em `src/app/acoes/inscricoes.ts`.
  Sem isso, quem soubesse montar uma requisição poderia sobrescrever qualquer
  campo da inscrição.
- **Nada de unidade fixada em código.** A ala é um registro no banco, e o mesmo
  app serve qualquer unidade.

---

## De onde vêm as regras

As validações seguem o Manual Geral e o site da Igreja:

- **Três tipos de recomendação** — Manual Geral
  [26.1.1, 26.1.2 e 26.1.3](https://www.churchofjesuschrist.org/study/manual/general-handbook/26-temple-recommends?lang=por).
- **Validade** — regular 2 anos, uso limitado 1 ano. O app **sugere** a data,
  mas guarda a que está impressa na recomendação da pessoa: prazo é regra que
  muda, e regra que muda não deve virar cálculo escondido.
- **Batistério a partir de janeiro do ano em que a pessoa completa 12 anos**
  (26.1.1). É por isso que guardamos só o **ano** de nascimento: a regra é sobre
  o ano, e data completa de menor seria dado a mais sem necessidade.
- **Investidura própria** — 18 anos, ensino médio concluído ou fora dele, um ano
  desde a confirmação, Sacerdócio de Melquisedeque para os homens
  ([27.2.2](https://www.churchofjesuschrist.org/study/manual/general-handbook/27-temple-ordinances-for-the-living?lang=por));
  entrevista com o bispo **e** com o presidente de estaca (27.2.3.1);
  acompanhante do mesmo sexo, investido e com recomendação válida (27.2.3.3).
- **Agendamento** — alas e estacas reservam **por e-mail ou telefone** com o
  templo; o agendamento on-line em grupo atende só grupos pequenos, e o limite
  varia por templo
  ([notícia oficial](https://www.churchofjesuschrist.org/study/liahona/2023/11/news-of-the-church/group-temple-appointments-can-be-scheduled-online?lang=por)).
  O pedido informa **quantos homens e quantas mulheres** — daí o campo de sexo
  no cadastro.
- **Ordenanças próprias exigem agendamento separado, por telefone** — por isso
  não entram na contagem do pedido de grupo.

---

## Privacidade

- Os dados ficam no seu banco, na sua conta do Neon. Não há página pública.
- Cada alteração fica registrada com quem fez e quando.
- Um membro pode ser **anonimizado** (LGPD): os dados pessoais são apagados e o
  histórico de participação da unidade é preservado.
- O app não pede, não guarda e não oferece campo para motivo de indignidade nem
  conteúdo de entrevista.

---

## Sobre o `npm audit`

O `npm audit` aponta avisos em `postcss` e `sharp` (dependências internas do
próprio Next.js) e em `uuid` (via `exceljs`, usado para ler planilhas). A
correção automática sugerida pelo npm **rebaixaria o Next.js para a versão 9** —
por isso não foi aplicada. Nenhum deles é alcançável pelo caminho de código
deste app; eles se resolvem quando o Next e o exceljs atualizarem.
