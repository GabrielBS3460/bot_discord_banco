const prisma = require('../../../shared/database/prisma');

async function criarPersonagem(usuarioId, nome) {
  return prisma.personagens.create({
    data: {
      nome,
      usuario_id: usuarioId
    }
  });
}

async function deletarPersonagem(id) {
  return prisma.personagens.delete({
    where: { id }
  });
}

async function listarPersonagens(usuarioId) {
  return prisma.personagens.findMany({
    where: { usuario_id: usuarioId }
  });
}

async function trocarPersonagem(usuarioId, personagemId) {
  return prisma.usuarios.update({
    where: { discord_id: usuarioId },
    data: { personagem_ativo_id: personagemId }
  });
}

async function buscarAtivo(usuarioId) {
  return prisma.usuarios.findUnique({
    where: { discord_id: usuarioId },
    include: { personagemAtivo: true }
  });
}

module.exports = {
  criarPersonagem,
  deletarPersonagem,
  listarPersonagens,
  trocarPersonagem,
  buscarAtivo
};