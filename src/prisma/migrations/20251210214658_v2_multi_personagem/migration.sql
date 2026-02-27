/*
  Warnings:

  - You are about to drop the column `usuario_id` on the `Transacao` table. All the data in the column will be lost.
  - You are about to drop the column `personagem` on the `Usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `saldo` on the `Usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_resgate_manavitra` on the `Usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `ultimo_resgate_recompensa` on the `Usuarios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[personagem_ativo_id]` on the table `Usuarios` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `personagem_id` to the `Transacao` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Transacao" DROP CONSTRAINT "Transacao_usuario_id_fkey";

-- AlterTable
ALTER TABLE "Transacao" DROP COLUMN "usuario_id",
ADD COLUMN     "personagem_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Usuarios" DROP COLUMN "personagem",
DROP COLUMN "saldo",
DROP COLUMN "ultimo_resgate_manavitra",
DROP COLUMN "ultimo_resgate_recompensa",
ADD COLUMN     "personagem_ativo_id" INTEGER;

-- CreateTable
CREATE TABLE "Personagens" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "Personagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Personagens_nome_key" ON "Personagens"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_personagem_ativo_id_key" ON "Usuarios"("personagem_ativo_id");

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_personagem_ativo_id_fkey" FOREIGN KEY ("personagem_ativo_id") REFERENCES "Personagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personagens" ADD CONSTRAINT "Personagens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuarios"("discord_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "Personagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
