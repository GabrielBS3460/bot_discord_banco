-- AlterTable
ALTER TABLE "Dominio" ADD COLUMN     "conselheiros" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "imposto_atual" TEXT NOT NULL DEFAULT 'Médio';
