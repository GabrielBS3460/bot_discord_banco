-- CreateTable
CREATE TABLE "Dominio" (
    "id" SERIAL NOT NULL,
    "personagem_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "terreno" TEXT NOT NULL,
    "mistico" BOOLEAN NOT NULL DEFAULT false,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "tesouro_lo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "corte" TEXT NOT NULL DEFAULT 'Inexistente',
    "popularidade" TEXT NOT NULL DEFAULT 'Tolerado',
    "acoes_disponiveis" INTEGER NOT NULL DEFAULT 2,
    "mes_ultimo_turno" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dominio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DominioConstrucao" (
    "id" SERIAL NOT NULL,
    "dominio_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "beneficio" TEXT NOT NULL,

    CONSTRAINT "DominioConstrucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DominioTropa" (
    "id" SERIAL NOT NULL,
    "dominio_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DominioTropa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dominio_personagem_id_key" ON "Dominio"("personagem_id");

-- AddForeignKey
ALTER TABLE "Dominio" ADD CONSTRAINT "Dominio_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "Personagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DominioConstrucao" ADD CONSTRAINT "DominioConstrucao_dominio_id_fkey" FOREIGN KEY ("dominio_id") REFERENCES "Dominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DominioTropa" ADD CONSTRAINT "DominioTropa_dominio_id_fkey" FOREIGN KEY ("dominio_id") REFERENCES "Dominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
