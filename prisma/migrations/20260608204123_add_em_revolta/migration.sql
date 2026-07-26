-- This migration was previously applied via db push

-- AlterTable
ALTER TABLE "Avaliacao" ADD COLUMN "feedback" TEXT;

-- AlterTable
ALTER TABLE "Dominio" ADD COLUMN "em_revolta" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Personagens" ADD COLUMN "titulo_ativo" TEXT,
ADD COLUMN "titulos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Usuarios" ADD COLUMN "ultimo_check_nota" TIMESTAMP(3);
