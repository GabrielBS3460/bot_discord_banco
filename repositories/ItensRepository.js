const prisma = require("../database.js");

class ItensRepository {
    async adicionarItem(personagemId, nome, tipo, quantidade = 1, descricao = null) {
        const itemExistente = await prisma.item.findFirst({
            where: { 
                personagem_id: personagemId, 
                nome: { equals: nome, mode: "insensitive" },
                tipo: tipo 
            }
        });

        if (itemExistente) {
            return prisma.item.update({
                where: { id: itemExistente.id },
                data: { quantidade: { increment: quantidade } }
            });
        }

        return prisma.item.create({
            data: {
                personagem_id: personagemId,
                nome,
                tipo,
                quantidade,
                descricao
            }
        });
    }

    async buscarInventario(personagemId) {
        return prisma.item.findMany({
            where: { personagem_id: personagemId },
            orderBy: { tipo: 'asc' }
        });
    }

    async removerItem(itemId, quantidadeParaRemover = 1) {
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (!item) return null;

        if (item.quantidade <= quantidadeParaRemover) {
            return prisma.item.delete({ where: { id: itemId } });
        }

        return prisma.item.update({
            where: { id: itemId },
            data: { quantidade: { decrement: quantidadeParaRemover } }
        });
    }
}

module.exports = new ItensRepository();