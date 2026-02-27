const prisma = require('../../../shared/database/prisma');

async function transferir(remetenteId, destinatarioId, valor) {

  if (remetenteId === destinatarioId)
    throw new Error("Não pode transferir para si mesmo.");

  return prisma.$transaction(async (tx) => {

    const remetente =
      await tx.personagens.findUnique({
        where: { id: remetenteId }
      });

    if (remetente.saldo < valor)
      throw new Error("Saldo insuficiente.");

    await tx.personagens.update({
      where: { id: remetenteId },
      data: { saldo: { decrement: valor } }
    });

    await tx.personagens.update({
      where: { id: destinatarioId },
      data: { saldo: { increment: valor } }
    });

    await tx.transacao.createMany({
      data: [
        {
          personagem_id: remetenteId,
          valor: -valor,
          tipo: "SAIDA",
          descricao: "Transferência enviada",
          categoria: "TRANSFERENCIA"
        },
        {
          personagem_id: destinatarioId,
          valor,
          tipo: "ENTRADA",
          descricao: "Transferência recebida",
          categoria: "TRANSFERENCIA"
        }
      ]
    });

  });
}

module.exports = { transferir };