-- CreateTable
CREATE TABLE "ApostasBicho" (
    "id" TEXT NOT NULL,
    "personagem_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "posicao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApostasBicho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SorteiosBicho" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultados" TEXT[],

    CONSTRAINT "SorteiosBicho_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApostasBicho" ADD CONSTRAINT "ApostasBicho_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "Personagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
