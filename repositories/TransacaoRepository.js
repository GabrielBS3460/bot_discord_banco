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
    async buscarTransacoesPaginadas(personagemId, pagina = 1, limite = 10) {
        return prisma.transacao.findMany({
            where: { personagem_id: personagemId },
            orderBy: { data: "desc" },
            skip: (pagina - 1) * limite,
            take: limite
        });
    }

    async contarTransacoes(personagemId) {
        return prisma.transacao.count({
            where: { personagem_id: personagemId }
        });
    }
}

module.exports = new TransacaoRepository();
