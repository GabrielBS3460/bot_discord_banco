const prisma = require("../database.js");

class AgendaRepository {
    async buscarAgendasGlobais(nd = null) {
        const where = nd !== null ? { nivel_personagem: nd } : {};
        return prisma.personagens.findMany({
            where,
            select: { usuario_id: true, agenda: true, nivel_personagem: true }
        });
    }

    async atualizarAgenda(userId, novaAgenda) {
        return prisma.personagens.updateMany({
            where: { usuario_id: userId },
            data: { agenda: novaAgenda }
        });
    }
}

module.exports = new AgendaRepository();
