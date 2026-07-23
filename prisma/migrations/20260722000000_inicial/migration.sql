-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('ALA', 'RAMO');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMINISTRADOR', 'ORGANIZADOR', 'LIDER_ORGANIZACAO', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "Organizacao" AS ENUM ('QUORUM_ELDERES', 'SOCIEDADE_SOCORRO', 'MOCAS', 'RAPAZES', 'PRIMARIA');

-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('MEMBRO', 'PESQUISADOR', 'CONVIDADO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "RecomendacaoTipo" AS ENUM ('NENHUMA', 'USO_LIMITADO', 'MEMBRO_INVESTIDO', 'ORDENANCAS_PROPRIAS');

-- CreateEnum
CREATE TYPE "StatusRecomendacao" AS ENUM ('VALIDA', 'VENCIDA', 'NAO_POSSUI', 'NAO_SE_APLICA');

-- CreateEnum
CREATE TYPE "Ordenanca" AS ENUM ('BATISTERIO', 'INICIATORIA', 'INVESTIDURA', 'PRIMEIRA_INVESTIDURA', 'SELAMENTO_CONJUGE', 'SELAMENTO_FAMILIA');

-- CreateEnum
CREATE TYPE "TipoParticipacao" AS ENUM ('ORDENANCA', 'ACOMPANHANTE_JARDINS');

-- CreateEnum
CREATE TYPE "StatusSimples" AS ENUM ('SIM', 'NAO', 'NAO_SE_APLICA');

-- CreateEnum
CREATE TYPE "NomesDeFamilia" AS ENUM ('PROPRIOS_PRONTOS', 'USARA_NOMES_DO_TEMPLO', 'PRECISA_DE_AJUDA');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO', 'ISENTO', 'BENEFICIO_AREA');

-- CreateEnum
CREATE TYPE "StatusCaravana" AS ENUM ('PLANEJAMENTO', 'CONFIRMADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SituacaoInscricao" AS ENUM ('CONFIRMADA', 'FILA_ESPERA', 'DESISTIU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CanalAgendamento" AS ENUM ('EMAIL', 'TELEFONE', 'ONLINE');

-- CreateEnum
CREATE TYPE "Tema" AS ENUM ('CLARO', 'ESCURO', 'SISTEMA');

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoUnidade" NOT NULL DEFAULT 'ALA',
    "estaca" TEXT,
    "ehPropria" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "papel" "Papel" NOT NULL DEFAULT 'VISUALIZADOR',
    "organizacaoEscopo" "Organizacao",
    "unidadeId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tema" "Tema" NOT NULL DEFAULT 'SISTEMA',
    "escalaFonte" INTEGER NOT NULL DEFAULT 100,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoLoginEm" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "membros" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "apelido" TEXT,
    "unidadeId" TEXT NOT NULL,
    "organizacao" "Organizacao",
    "tipoVinculo" "TipoVinculo" NOT NULL DEFAULT 'MEMBRO',
    "sexo" "Sexo",
    "anoNascimento" INTEGER,
    "telefone" TEXT,
    "recemConverso" BOOLEAN NOT NULL DEFAULT false,
    "ehInvestido" BOOLEAN NOT NULL DEFAULT false,
    "recomendacaoTipo" "RecomendacaoTipo" NOT NULL DEFAULT 'NENHUMA',
    "recomendacaoValidaAte" TIMESTAMP(3),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "anonimizadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caravanas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "templo" TEXT NOT NULL,
    "unidadeOrganizadoraId" TEXT NOT NULL,
    "horaSaida" TEXT,
    "horaRetornoPrevista" TEXT,
    "pontoEncontro" TEXT,
    "capacidadeAssentos" INTEGER NOT NULL,
    "valorPorPessoa" DECIMAL(10,2),
    "custoTotalTransporte" DECIMAL(10,2),
    "responsavelId" TEXT,
    "status" "StatusCaravana" NOT NULL DEFAULT 'PLANEJAMENTO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caravanas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricoes" (
    "id" TEXT NOT NULL,
    "caravanaId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "situacao" "SituacaoInscricao" NOT NULL DEFAULT 'CONFIRMADA',
    "ordem" INTEGER NOT NULL,
    "posicaoFila" INTEGER,
    "participacao" "TipoParticipacao" NOT NULL DEFAULT 'ORDENANCA',
    "ordenanca" "Ordenanca",
    "recomendacaoStatus" "StatusRecomendacao",
    "agendamentoStatus" "StatusSimples",
    "nomesDeFamilia" "NomesDeFamilia",
    "incluidoNoAgendamentoGrupo" BOOLEAN NOT NULL DEFAULT false,
    "pagamentoStatus" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "valorPago" DECIMAL(10,2),
    "valorBeneficioArea" DECIMAL(10,2),
    "precisaAjudaEntrevista" BOOLEAN NOT NULL DEFAULT false,
    "precisaAjudaNomes" BOOLEAN NOT NULL DEFAULT false,
    "acompanhanteId" TEXT,
    "checkinIda" TIMESTAMP(3),
    "checkinVolta" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists_primeira_investidura" (
    "inscricaoId" TEXT NOT NULL,
    "requisitosVerificadosPeloBispo" BOOLEAN NOT NULL DEFAULT false,
    "entrevistaBispoFeita" BOOLEAN NOT NULL DEFAULT false,
    "entrevistaEstacaFeita" BOOLEAN NOT NULL DEFAULT false,
    "agendamentoProprioFeito" BOOLEAN NOT NULL DEFAULT false,
    "roupasDoTemploProvidenciadas" BOOLEAN NOT NULL DEFAULT false,
    "acompanhanteDesignado" BOOLEAN NOT NULL DEFAULT false,
    "orientacaoRecebida" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklists_primeira_investidura_pkey" PRIMARY KEY ("inscricaoId")
);

-- CreateTable
CREATE TABLE "pedidos_agendamento" (
    "id" TEXT NOT NULL,
    "caravanaId" TEXT NOT NULL,
    "canal" "CanalAgendamento" NOT NULL DEFAULT 'EMAIL',
    "enviadoEm" TIMESTAMP(3),
    "confirmadoEm" TIMESTAMP(3),
    "referencia" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vagas_agendamento_grupo" (
    "id" TEXT NOT NULL,
    "pedidoAgendamentoId" TEXT NOT NULL,
    "ordenanca" "Ordenanca" NOT NULL,
    "vagasConfirmadas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vagas_agendamento_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioEmail" TEXT,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidades_nome_estaca_key" ON "unidades"("nome", "estaca");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_unidadeId_idx" ON "usuarios"("unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "membros_unidadeId_nomeNormalizado_idx" ON "membros"("unidadeId", "nomeNormalizado");

-- CreateIndex
CREATE INDEX "membros_unidadeId_organizacao_idx" ON "membros"("unidadeId", "organizacao");

-- CreateIndex
CREATE INDEX "caravanas_data_idx" ON "caravanas"("data");

-- CreateIndex
CREATE INDEX "inscricoes_caravanaId_situacao_idx" ON "inscricoes"("caravanaId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_caravanaId_membroId_key" ON "inscricoes"("caravanaId", "membroId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_agendamento_caravanaId_key" ON "pedidos_agendamento"("caravanaId");

-- CreateIndex
CREATE UNIQUE INDEX "vagas_agendamento_grupo_pedidoAgendamentoId_ordenanca_key" ON "vagas_agendamento_grupo"("pedidoAgendamentoId", "ordenanca");

-- CreateIndex
CREATE INDEX "registros_auditoria_entidade_entidadeId_idx" ON "registros_auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "registros_auditoria_criadoEm_idx" ON "registros_auditoria"("criadoEm");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caravanas" ADD CONSTRAINT "caravanas_unidadeOrganizadoraId_fkey" FOREIGN KEY ("unidadeOrganizadoraId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caravanas" ADD CONSTRAINT "caravanas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_caravanaId_fkey" FOREIGN KEY ("caravanaId") REFERENCES "caravanas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_acompanhanteId_fkey" FOREIGN KEY ("acompanhanteId") REFERENCES "inscricoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists_primeira_investidura" ADD CONSTRAINT "checklists_primeira_investidura_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_agendamento" ADD CONSTRAINT "pedidos_agendamento_caravanaId_fkey" FOREIGN KEY ("caravanaId") REFERENCES "caravanas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas_agendamento_grupo" ADD CONSTRAINT "vagas_agendamento_grupo_pedidoAgendamentoId_fkey" FOREIGN KEY ("pedidoAgendamentoId") REFERENCES "pedidos_agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
