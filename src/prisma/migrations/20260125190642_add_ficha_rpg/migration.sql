/*
  Warnings:

  - You are about to drop the column `nivel` on the `Personagens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Personagens" DROP COLUMN "nivel",
ADD COLUMN     "pontos_forja_atual" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pontos_forja_diarios" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ultimo_resgate_forja" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PersonagemClasse" (
    "id" SERIAL NOT NULL,
    "nome_classe" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "personagem_id" INTEGER NOT NULL,

    CONSTRAINT "PersonagemClasse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonagemClasse_personagem_id_nome_classe_key" ON "PersonagemClasse"("personagem_id", "nome_classe");

-- AddForeignKey
ALTER TABLE "PersonagemClasse" ADD CONSTRAINT "PersonagemClasse_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "Personagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
