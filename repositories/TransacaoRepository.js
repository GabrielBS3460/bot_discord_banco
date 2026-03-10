const prisma = require("../database.js");

class TransacaoRepository {
    async buscarUltimasTransacoes(personagemId, limite = 5) {
        return prisma.transacao.findMany({
            where: { personagem_id: personagemId },
            orderBy: { data: "desc" },
            take: limite
        });
    }

    async criar(dados) {
        return prisma.transacao.create({ data: dados });
    }

    async buscarUltimasPorPersonagem(personagemId, limite = 10) {
        return prisma.transacao.findMany({
            where: { personagem_id: personagemId },
            orderBy: { data: "desc" },
            take: limite
        });
    }
}

module.exports = new TransacaoRepository();
