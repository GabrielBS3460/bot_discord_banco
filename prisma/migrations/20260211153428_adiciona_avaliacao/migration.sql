-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" SERIAL NOT NULL,
    "mestre_id" TEXT NOT NULL,
    "avaliador_id" TEXT NOT NULL,
    "link_missao" TEXT NOT NULL,
    "nota_ritmo" INTEGER NOT NULL,
    "nota_imersao" INTEGER NOT NULL,
    "nota_preparo" INTEGER NOT NULL,
    "nota_conhecimento" INTEGER NOT NULL,
    "nota_geral" INTEGER NOT NULL,
    "data_avaliacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);
