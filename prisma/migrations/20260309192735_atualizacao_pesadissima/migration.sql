-- AlterTable
ALTER TABLE "Personagens" ADD COLUMN     "agenda" JSONB,
ADD COLUMN     "ultima_missao" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Base" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "porte" TEXT NOT NULL DEFAULT 'Mínima',
    "seguranca" INTEGER NOT NULL DEFAULT 0,
    "dono_id" INTEGER NOT NULL,
    "manutencao_paga" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseResidente" (
    "id" SERIAL NOT NULL,
    "base_id" INTEGER NOT NULL,
    "personagem_id" INTEGER NOT NULL,

    CONSTRAINT "BaseResidente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseComodo" (
    "id" SERIAL NOT NULL,
    "base_id" INTEGER NOT NULL,
    "nome_comodo" TEXT NOT NULL,
    "danificado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BaseComodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseMobilia" (
    "id" SERIAL NOT NULL,
    "base_id" INTEGER NOT NULL,
    "comodo_id" INTEGER,
    "nome_item" TEXT NOT NULL,

    CONSTRAINT "BaseMobilia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Base_dono_id_key" ON "Base"("dono_id");

-- CreateIndex
CREATE UNIQUE INDEX "BaseResidente_base_id_personagem_id_key" ON "BaseResidente"("base_id", "personagem_id");

-- AddForeignKey
ALTER TABLE "Base" ADD CONSTRAINT "Base_dono_id_fkey" FOREIGN KEY ("dono_id") REFERENCES "Personagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseResidente" ADD CONSTRAINT "BaseResidente_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseResidente" ADD CONSTRAINT "BaseResidente_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "Personagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseComodo" ADD CONSTRAINT "BaseComodo_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseMobilia" ADD CONSTRAINT "BaseMobilia_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseMobilia" ADD CONSTRAINT "BaseMobilia_comodo_id_fkey" FOREIGN KEY ("comodo_id") REFERENCES "BaseComodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
