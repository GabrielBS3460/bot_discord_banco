const prisma = require('../../../shared/database/prisma');

async function descansar(id) {
  return prisma.$transaction(async (tx) => {

    const personagem = await tx.personagens.findUnique({
      where: { id }
    });

    const vidaNova = personagem.vida_max;
    const manaNova = personagem.mana_max;

    return tx.personagens.update({
      where: { id },
      data: {
        vida_atual: vidaNova,
        mana_atual: manaNova,
        ultimo_descanso: new Date()
      }
    });
  });
}

module.exports = { descansar };