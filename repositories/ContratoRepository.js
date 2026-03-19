const prisma = require("../database.js");

class ContratoRepository {
    async criar(dados) {
        return prisma.missoes.create({
            data: dados
        });
    }

    async buscarPorNomeCompleto(nome) {
        return prisma.missoes.findUnique({
            where: { nome: nome },
            include: { inscricoes: { include: { personagem: true } } }
        });
    }

    async atualizarStatus(missaoId, novoStatus) {
        return prisma.missoes.update({
            where: { id: missaoId },
            data: { status: novoStatus }
        });
    }

    async atualizarVagas(missaoId, totalVagas) {
        return prisma.missoes.update({
            where: { id: missaoId },
            data: { vagas: totalVagas }
        });
    }

    async vincularPersonagem(missaoId, personagemId, selecionado = true) {
        return prisma.inscricoes.upsert({
            where: {
                missao_id_personagem_id: { missao_id: missaoId, personagem_id: personagemId }
            },
            update: { selecionado: selecionado },
            create: {
                missao_id: missaoId,
                personagem_id: personagemId,
                selecionado: selecionado
            }
        });
    }

    async removerInscricao(inscricaoId) {
        return prisma.inscricoes.delete({ where: { id: inscricaoId } });
    }

    async selecionarMuitos(ids) {
        return prisma.inscricoes.updateMany({
            where: { id: { in: ids } },
            data: { selecionado: true }
        });
    }

    async buscarPorNome(nome) {
        return prisma.missoes.findUnique({
            where: { nome: nome }
        });
    }

    async deletarMissaoCompleta(missaoId) {
        return prisma.$transaction([
            prisma.inscricoes.deleteMany({ where: { missao_id: missaoId } }),
            prisma.missoes.delete({ where: { id: missaoId } })
        ]);
    }

    async buscarAltsParaTroca(userId, idsJaInscritos) {
        return prisma.personagens.findMany({
            where: {
                usuario_id: userId,
                id: { notIn: idsJaInscritos }
            }
        });
    }

    async atualizarPersonagemInscricao(inscricaoId, novoPersonagemId) {
        return prisma.inscricoes.update({
            where: { id: inscricaoId },
            data: { personagem_id: novoPersonagemId }
        });
    }
}

module.exports = new ContratoRepository();
