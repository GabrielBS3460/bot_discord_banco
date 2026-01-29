-- AlterTable
ALTER TABLE "Personagens" ADD COLUMN     "estoque_ingredientes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "feira_data_geracao" TIMESTAMP(3),
ADD COLUMN     "feira_itens" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "receitas_conhecidas" TEXT[] DEFAULT ARRAY[]::TEXT[];
