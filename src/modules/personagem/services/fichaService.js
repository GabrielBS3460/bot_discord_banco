const prisma = require('../../../shared/database/prisma');

async function atualizarAtributo(id, campo, valor) {
  return prisma.personagens.update({
    where: { id },
    data: { [campo]: valor }
  });
}

async function atualizarPericias(id, lista) {
  return prisma.personagens.update({
    where: { id },
    data: { pericias: lista }
  });
}

async function atualizarBanner(id, url) {
  return prisma.personagens.update({
    where: { id },
    data: { banner_url: url }
  });
}

module.exports = {
  atualizarAtributo,
  atualizarPericias,
  atualizarBanner
};