-- CreateTable
CREATE TABLE "public"."Usuarios" (
    "discord_id" TEXT NOT NULL,
    "personagem" TEXT,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ultimo_resgate_recompensa" TIMESTAMP(3),
    "ultimo_resgate_manavitra" TIMESTAMP(3),

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("discord_id")
);

-- CreateTable
CREATE TABLE "public"."Transacao" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Transacao" ADD CONSTRAINT "Transacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."Usuarios"("discord_id") ON DELETE RESTRICT ON UPDATE CASCADE;
