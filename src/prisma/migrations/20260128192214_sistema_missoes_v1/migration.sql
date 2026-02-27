/*
  Warnings:

  - You are about to drop the column `ultimo_resgate_manavitra` on the `Personagens` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_resgate_recompensa` on the `Personagens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Personagens" DROP COLUMN "ultimo_resgate_manavitra",
DROP COLUMN "ultimo_resgate_recompensa",
ADD COLUMN     "nivel_personagem" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "pontos_missao" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Missoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nd" INTEGER NOT NULL,
    "vagas" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "criador_id" TEXT NOT NULL,

    CONSTRAINT "Missoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscricoes" (
    "id" SERIAL NOT NULL,
    "missao_id" TEXT NOT NULL,
    "personagem_id" INTEGER NOT NULL,
    "selecionado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Missoes_nome_key" ON "Missoes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Inscricoes_missao_id_personagem_id_key" ON "Inscricoes"("missao_id", "personagem_id");

-- AddForeignKey
ALTER TABLE "Inscricoes" ADD CONSTRAINT "Inscricoes_missao_id_fkey" FOREIGN KEY ("missao_id") REFERENCES "Missoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscricoes" ADD CONSTRAINT "Inscricoes_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "Personagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
