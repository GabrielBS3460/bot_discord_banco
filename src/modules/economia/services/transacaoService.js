const prisma = require('../../../shared/database/prisma');

async function executarTransacao({
  personagemId,
  valor,
  tipo,
  descricao,
  categoria
}) {
  if (!personagemId || !valor || !tipo)
    throw new Error("Dados inválidos.");

  return prisma.$transaction(async (tx) => {

    const personagem = await tx.personagens.findUnique({
      where: { id: personagemId }
    });

    if (!personagem)
      throw new Error("Personagem não encontrado.");

    if (valor < 0 && personagem.saldo < Math.abs(valor))
      throw new Error("Saldo insuficiente.");

    const atualizado = await tx.personagens.update({
      where: { id: personagemId },
      data: {
        saldo: { increment: valor }
      }
    });

    await tx.transacao.create({
      data: {
        personagem_id: personagemId,
        valor,
        tipo,
        descricao,
        categoria
      }
    });

    return atualizado;
  });
}

module.exports = { executarTransacao };