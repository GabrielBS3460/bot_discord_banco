/*
  Warnings:

  - You are about to drop the column `link_missao` on the `Avaliacao` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Avaliacao" DROP COLUMN "link_missao",
ADD COLUMN     "nome_missao" TEXT NOT NULL DEFAULT 'Missão Antiga';
