const prisma = require("../database.js");

class AvaliacaoRepository {
    async criar(dados) {
        return prisma.avaliacao.create({
            data: dados
        });
    }

    async buscarMediaMestre(mestreId) {
        return prisma.avaliacao.aggregate({
            where: { mestre_id: mestreId },
            _avg: {
                nota_geral: true,
                nota_ritmo: true,
                nota_imersao: true
            }
        });
    }

    async buscarTodasPorMestre(mestreId) {
        return prisma.avaliacao.findMany({
            where: { mestre_id: mestreId }
        });
    }
}

module.exports = new AvaliacaoRepository();
