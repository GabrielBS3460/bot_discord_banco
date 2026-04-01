-- CreateTable
CREATE TABLE "Mercado" (
    "id" SERIAL NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "vendedor_nome" TEXT NOT NULL,
    "item_nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "descricao" TEXT,
    "preco" DOUBLE PRECISION NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mercado_pkey" PRIMARY KEY ("id")
);
