const prisma = require('../../../shared/database/prisma');

async function obterExtrato(personagemId, limite = 10) {
  return prisma.transacao.findMany({
    where: { personagem_id: personagemId },
    orderBy: { data: 'desc' },
    take: limite
  });
}

module.exports = { obterExtrato };