-- CreateTable
CREATE TABLE "catarse_assinantes" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "email" TEXT NOT NULL,
    "pagamentoMensal" DOUBLE PRECISION,
    "totalPago" DOUBLE PRECISION,
    "status" TEXT,
    "dataDeInicio" TEXT,
    "mesesAssinante" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catarse_assinantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catarse_emails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catarse_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catarse_assinantes_email_key" ON "catarse_assinantes"("email");
