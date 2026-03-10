const prisma = require("../database.js");

class AltService {
    async transferirDinheiro(origemId, destinoId, valor, nomeOrigem, nomeDestino) {
        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: origemId },
                data: { saldo: { decrement: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: origemId,
                    descricao: `Enviou para Alt (${nomeDestino})`,
                    valor: valor,
                    tipo: "GASTO"
                }
            }),
            prisma.personagens.update({
                where: { id: destinoId },
                data: { saldo: { increment: valor } }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: destinoId,
                    descricao: `Recebeu do Alt (${nomeOrigem})`,
                    valor: valor,
                    tipo: "GANHO"
                }
            })
        ]);
    }

    async transferirItemDiverso(origemId, destinoId, nomeItem, nomeOrigem, nomeDestino) {
        return prisma.$transaction([
            prisma.transacao.create({
                data: {
                    personagem_id: origemId,
                    descricao: `Enviou o item [${nomeItem}] para o Alt (${nomeDestino})`,
                    valor: 0,
                    tipo: "LOG"
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: destinoId,
                    descricao: `Recebeu o item [${nomeItem}] do Alt (${nomeOrigem})`,
                    valor: 0,
                    tipo: "LOG"
                }
            })
        ]);
    }

    async transferirIngredientes(
        origemId,
        destinoId,
        itemEscolhido,
        qtdEnviar,
        estOrigemAtualizado,
        estDestinoAtualizado
    ) {
        return prisma.$transaction([
            prisma.personagens.update({
                where: { id: origemId },
                data: { estoque_ingredientes: estOrigemAtualizado }
            }),
            prisma.personagens.update({
                where: { id: destinoId },
                data: { estoque_ingredientes: estDestinoAtualizado }
            })
        ]);
    }
}

module.exports = new AltService();
