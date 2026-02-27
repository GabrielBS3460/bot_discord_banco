const prisma = require('../../../shared/database/prisma');

async function configurarForja(char, poderesFabricacao) {
  const OFICIOS_VALIDOS = [
    "Ofício Armeiro", 
    "Ofício Artesão", 
    "Ofício Alquimista", 
    "Ofício Cozinheiro", 
    "Ofício Alfaiate", 
    "Ofício Escriba"
  ];

  const oficiosTreinados = (char.pericias || [])
    .filter(p => OFICIOS_VALIDOS.includes(p));

  const limite = (poderesFabricacao + oficiosTreinados.length) * 2;

  await prisma.personagens.update({
    where: { id: char.id },
    data: { pontos_forja_max: limite }
  });

  return {
    limite,
    quantidadeOficios: oficiosTreinados.length
  };
}

module.exports = {
  configurarForja
};