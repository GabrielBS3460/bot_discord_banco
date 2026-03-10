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
}

module.exports = new ContratoRepository();
