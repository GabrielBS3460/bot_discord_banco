const prisma = require("../database.js");

class ApostaRepository {
    async criarApostaBicho(dados, tx = prisma) {
        return tx.apostasBicho.create({
            data: dados
        });
    }
}

module.exports = new ApostaRepository();
