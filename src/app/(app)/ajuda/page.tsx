import type { Metadata } from "next";
import { VERSAO } from "@/lib/versao";

export const metadata: Metadata = { title: "Ajuda" };

/**
 * Manual do app, dentro do próprio app — é onde os líderes de fato vão ler.
 * O mesmo conteúdo está no MANUAL.md do repositório.
 */

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="border-b pb-1 text-xl font-semibold">{titulo}</h2>
      <div className="space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PaginaDeAjuda() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-semibold">Como usar o app</h1>
        <p className="text-muted-foreground mt-1">
          Passo a passo de tudo, na ordem em que você vai precisar. Versão {VERSAO}.
        </p>
      </div>

      <Secao titulo="Em uma frase">
        <p>
          Este app organiza a caravana da ala ao templo: quem vai, o que falta
          resolver para cada um, quem está na fila de espera, quem já pagou e
          quem embarcou. Ele substitui a planilha.
        </p>
        <p>
          <strong>Não há senha nem login.</strong> Quem tem o endereço usa. Por
          isso, guarde o link com a liderança e não o divulgue em grupos.
        </p>
      </Secao>

      <Secao titulo="Como o app pensa (3 ideias)">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Membro</strong> é um cadastro permanente. Você cadastra a
            pessoa uma vez; ela serve para todas as caravanas.
          </li>
          <li>
            <strong>Caravana</strong> é uma viagem: data, templo, ônibus, valor.
          </li>
          <li>
            <strong>Inscrição</strong> liga um membro a uma caravana e guarda o
            que muda a cada viagem (ordenança, recomendação, pagamento…).
          </li>
        </ul>
        <p>
          Quando o app encontra algo estranho (ex.: recomendação que não serve
          para a ordenança escolhida), ele mostra um <strong>aviso</strong> — mas
          nunca bloqueia. Quem decide é o bispo.
        </p>
      </Secao>

      <Secao titulo="1. Primeiro acesso: cadastrar a unidade">
        <p>
          Na primeira vez, ao criar uma caravana ou um membro, o app pede o nome
          da sua <strong>unidade</strong> (a ala ou ramo) e, opcionalmente, a
          estaca. Preencha e salve. Isso só acontece uma vez.
        </p>
      </Secao>

      <Secao titulo="2. Diga quem está usando (opcional)">
        <p>
          No canto superior direito, no ícone de pessoa, você pode escrever seu
          nome. Não é login e não impede ninguém — serve só para o histórico
          registrar quem alterou o quê. Fica salvo naquele aparelho.
        </p>
      </Secao>

      <Secao titulo="3. Cadastrar membros">
        <p>Menu <strong>Membros → Novo membro</strong>. Os campos:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Vínculo:</strong> Membro da Ala, Pesquisador (quem está
            conhecendo a Igreja) ou Convidado.
          </li>
          <li>
            <strong>Organização:</strong> Quórum, Sociedade de Socorro, Moças,
            Rapazes ou Primária.
          </li>
          <li>
            <strong>Sexo:</strong> usado para o pedido ao templo (que pede a
            contagem de homens e mulheres) e para a regra de acompanhante.
          </li>
          <li>
            <strong>Ano de nascimento:</strong> só o ano. A regra do batistério
            vale a partir de janeiro do ano em que a pessoa completa 12.
          </li>
          <li>
            <strong>Investidura:</strong> &quot;Sem investidura&quot; ou
            &quot;Já recebeu a investidura&quot;.
          </li>
          <li>
            <strong>Recém-converso:</strong> marque se foi batizado há menos de
            2 anos (um recém-converso também pode já ser investido).
          </li>
          <li>
            <strong>Recomendação:</strong> guarde apenas o tipo e a data de
            validade impressa na recomendação. O app nunca pede motivo de
            dignidade nem conteúdo de entrevista — isso é do LCR.
          </li>
        </ul>
      </Secao>

      <Secao titulo="4. Criar a caravana">
        <p>
          Menu <strong>Caravanas → Nova caravana</strong>. Informe título, data,
          o <strong>nome completo do templo</strong> (ex.: &quot;Templo do Rio de
          Janeiro&quot;), <strong>quantos assentos o ônibus tem</strong>, valor por
          pessoa e custo do transporte. A capacidade é importante: quando as
          inscrições passam dela, o app manda as próximas para a fila de espera
          automaticamente.
        </p>
        <p>
          <strong>Situação da caravana:</strong> Em planejamento e Confirmada
          contam como <strong>Ativa</strong> (aparecem na lista principal).
          Realizada e Cancelada contam como <strong>Inativo</strong> (somem da
          lista, mas continuam no filtro). Na lista de Caravanas há um filtro
          Ativas / Inativas / Todas.
        </p>
      </Secao>

      <Secao titulo="5. Inscrever pessoas">
        <p>
          Na caravana, botão <strong>Inscrever</strong>. Busque pelo nome e
          toque em Inscrever. Se ainda há assento, a pessoa entra confirmada; se
          o ônibus está cheio, vai para a fila de espera — o app cuida disso.
        </p>
      </Secao>

      <Secao titulo="6. O resumo: toque no quadrinho, depois no nome">
        <p>
          No alto da caravana ficam os quadrinhos do resumo (Inscritos, Fila de
          espera, Precisam de atenção, Ordenança a definir…).{" "}
          <strong>Toque num quadrinho</strong> para ver exatamente quem está por
          trás daquele número. Depois, <strong>toque num nome</strong>: abre ali
          mesmo o que resolve aquela pendência.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Fila de espera:</strong> botão para promover a pessoa para o
            ônibus (o app avisa se já estiver lotado).
          </li>
          <li>
            <strong>Precisam de atenção:</strong> troque a ordenança ou corrija a
            recomendação registrada na ficha (tipo e data impressa).
          </li>
          <li>
            <strong>Ordenança, Recomendação e Agendamento:</strong> a etiqueta
            daquele item, para escolher ali mesmo.
          </li>
          <li>
            <strong>Inscritos:</strong> todas as etiquetas da pessoa, e o link
            para a ficha completa.
          </li>
        </ul>
        <p>
          Quem você resolve <strong>fica na lista com um ✓</strong> — ela não
          pula debaixo do dedo — e o topo mostra quantos ainda faltam. Os
          quadrinhos &quot;No pedido ao templo&quot; e &quot;Arrecadado&quot;
          levam direto às telas de Agendamento e Financeiro.
        </p>
      </Secao>

      <Secao titulo="7. A lista de inscritos (o dia a dia)">
        <p>
          É a tela principal da caravana. Cada pessoa tem etiquetas coloridas
          (ordenança, recomendação, agendamento, nomes, pagamento). Para mudar
          qualquer uma: <strong>toque na etiqueta e escolha</strong> — dois
          toques, salva sozinho. Em &quot;Ordenança&quot;, a opção{" "}
          <strong>Só acompanha (jardins)</strong> serve para quem vai no ônibus
          mas não entra no templo — e dá para voltar atrás a qualquer hora.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Use os filtros para ver <strong>só quem tem pendência</strong> ou
            <strong> só quem tem aviso</strong>.
          </li>
          <li>
            Avisos em vermelho significam que a pessoa pode ser barrada no
            templo (ex.: recomendação vencida, ou que não serve para a
            ordenança). Resolva antes da viagem.
          </li>
          <li>
            No menu de cada pessoa (três pontinhos): promover da fila, mover
            para a fila ou registrar desistência. Ao registrar uma desistência,
            o app promove o primeiro da fila e avisa o nome de quem subiu — essa
            pessoa precisa ser comunicada.
          </li>
        </ul>
      </Secao>

      <Secao titulo="8. Agendar com o templo">
        <p>
          Botão <strong>Agendamento</strong>. O app monta o texto pronto — com a
          contagem por ordenança e por sexo — para você copiar e enviar por
          e-mail ou ler por telefone ao templo. Depois da resposta, registre o
          protocolo e as vagas confirmadas.
        </p>
        <p>
          Ordenanças próprias (1ª investidura, selamento) não entram nesse
          pedido: elas se agendam à parte, por telefone. O app lista quem está
          nesse caso.
        </p>
      </Secao>

      <Secao titulo="9. Financeiro">
        <p>
          Botão <strong>Financeiro</strong> (no menu &quot;Mais ações&quot;).
          Mostra total em caixa, custo do ônibus, saldo e o que falta receber.
          Marcar &quot;Pago&quot; na lista já preenche o valor por pessoa; ajuste
          aqui quem pagou diferente. Há um relatório em texto para copiar e
          entregar ao secretário.
        </p>
      </Secao>

      <Secao titulo="10. Mensagens de WhatsApp">
        <p>
          Botão <strong>Mensagens de cobrança</strong>. O app agrupa quem tem
          cada pendência e escreve o texto pronto, um por vez, com o link para
          abrir a conversa. <strong>Nenhuma mensagem menciona recomendação</strong>
          {" "}— a de entrevista apenas convida a marcar um horário com o bispo.
          O app não envia nada sozinho: você confere e envia.
        </p>
      </Secao>

      <Secao titulo="11. Preparação e acompanhantes">
        <p>
          Botão <strong>Preparação e acompanhantes</strong>. Traz o checklist da
          primeira investidura (lembrete de logística, não registro de
          dignidade) e ajuda a designar acompanhante para quem o Manual pede —
          primeira investidura e recém-convertidos indo ao batistério. Os
          sugeridos são do mesmo sexo e já investidos, mas a escolha é sua.
        </p>
      </Secao>

      <Secao titulo="12. Embarque (no dia)">
        <p>
          Botão <strong>Embarque</strong>. Toque no nome de cada pessoa para
          marcar quem está no ônibus, na <strong>ida</strong> e na
          <strong> volta</strong>. Um contador mostra quem falta. Esta tela
          <strong> funciona sem internet</strong>: se marcar sem sinal, as
          marcações ficam guardadas no aparelho e sobem sozinhas quando a rede
          volta.
        </p>
      </Secao>

      <Secao titulo="13. Lista de presença e planilha">
        <p>
          No menu &quot;Mais ações&quot;: <strong>Lista de presença</strong> gera
          uma folha para imprimir (ou salvar em PDF) e levar no ônibus, com
          quadradinhos de ida e volta para marcar à caneta.
          <strong> Exportar planilha</strong> baixa tudo em .xlsx.
        </p>
      </Secao>

      <Secao titulo="14. Repetir uma caravana">
        <p>
          Botão <strong>Duplicar</strong> traz as mesmas pessoas para uma nova
          caravana, com os status zerados — o que é permanente (recomendação,
          telefone) fica no cadastro e não precisa ser redigitado. O botão
          <strong> Situação</strong>, ao lado, muda a caravana entre planejamento,
          confirmada, realizada e cancelada.
        </p>
      </Secao>

      <Secao titulo="15. Aparência e atualizações">
        <p>
          No ícone de letra (canto superior), ajuste <strong>tema</strong>
          {" "}(claro/escuro/sistema) e o <strong>tamanho da letra</strong> — útil
          para quem enxerga menos. O app se <strong>atualiza sozinho</strong>:
          quando uma versão nova é publicada, ele carrega a nova em pouco tempo,
          sem você fazer nada.
        </p>
      </Secao>

      <Secao titulo="Privacidade">
        <p>
          Os dados ficam no banco da ala. O app não guarda motivo de dignidade
          nem conteúdo de entrevista. Um membro pode ser anonimizado, se
          necessário. Como não há login, o cuidado principal é <strong>manter o
          endereço do app só com a liderança</strong>.
        </p>
      </Secao>
    </div>
  );
}
