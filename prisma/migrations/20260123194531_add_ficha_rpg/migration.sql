-- AlterTable
ALTER TABLE "Personagens" ADD COLUMN     "mana_temp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "vida_temp" INTEGER NOT NULL DEFAULT 0;
