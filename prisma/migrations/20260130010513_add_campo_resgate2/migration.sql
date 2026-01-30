/*
  Warnings:

  - You are about to drop the column `recompensa_resgatada` on the `Personagens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inscricoes" ADD COLUMN     "recompensa_resgatada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Personagens" DROP COLUMN "recompensa_resgatada";
