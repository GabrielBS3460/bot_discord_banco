const prisma = require("../database.js");

class PersonagemRepository {
    async obterFichaCompleta(id) {
        return prisma.personagens.findUnique({
            where: { id },
            include: { classes: true }
        });
    }

    async atualizar(id, dados) {
        return prisma.personagens.update({
            where: { id },
            data: dados,
            include: { classes: true }
        });
    }

    async removerClasse(personagem_id, nome_classe) {
        return prisma.personagemClasse.deleteMany({
            where: { personagem_id, nome_classe }
        });
    }

    async upsertClasse(personagem_id, nome_classe, nivel) {
        const existe = await prisma.personagemClasse.findFirst({
            where: { personagem_id, nome_classe }
        });

        if (existe) {
            return prisma.personagemClasse.update({
                where: { id: existe.id },
                data: { nivel }
            });
        }

        return prisma.personagemClasse.create({
            data: { personagem_id, nome_classe, nivel }
        });
    }

    async registrarLogDescanso(personagem_id, curouVida, curouMana, nomeTipo) {
        return prisma.transacao.create({
            data: {
                personagem_id,
                descricao: `Descanso ${nomeTipo}: +${curouVida} PV, +${curouMana} PM`,
                valor: 0,
                tipo: "LOG"
            }
        });
    }

    async buscarAltsDoJogador(discordId, personagemAtivoId) {
        return prisma.personagens.findMany({
            where: {
                usuario_id: discordId,
                id: { not: personagemAtivoId }
            }
        });
    }

    async buscarPorId(id) {
        return prisma.personagens.findUnique({
            where: { id }
        });
    }

    async contarPorUsuario(discordId) {
        return prisma.personagens.count({
            where: { usuario_id: discordId }
        });
    }

    async criar(dados) {
        return prisma.personagens.create({
            data: dados
        });
    }

    async buscarTodosDoJogador(discordId) {
        return prisma.personagens.findMany({
            where: { usuario_id: discordId }
        });
    }

    async buscarPorNomeEJogador(nome, discordId) {
        return prisma.personagens.findFirst({
            where: {
                nome: { equals: nome, mode: "insensitive" },
                usuario_id: discordId
            }
        });
    }

    async apagarPersonagemCompleto(personagemId) {
        return prisma.$transaction([
            prisma.transacao.deleteMany({ where: { personagem_id: personagemId } }),
            prisma.personagens.delete({ where: { id: personagemId } })
        ]);
    }
}

module.exports = new PersonagemRepository();
