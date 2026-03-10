const prisma = require("../database.js");

class AgendaRepository {
    async buscarAgendasGlobais() {
        return prisma.personagens.findMany({
            select: { usuario_id: true, agenda: true },
            distinct: ["usuario_id"]
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
