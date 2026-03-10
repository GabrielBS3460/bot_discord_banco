const prisma = require("../database.js");

class SorteioRepository {
    async buscarUltimo() {
        return prisma.sorteiosBicho.findFirst({
            orderBy: { data: "desc" }
        });
    }

    async buscarApostasPendentes() {
        return prisma.apostasBicho.findMany({
            where: { status: "PENDENTE" },
            include: { personagem: true }
        });
    }

    async registrarSorteio(resultados, tx = prisma) {
        return tx.sorteiosBicho.create({
            data: { resultados }
        });
    }
}

module.exports = new SorteioRepository();
