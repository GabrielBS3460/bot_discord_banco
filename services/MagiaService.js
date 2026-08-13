const prisma = require("../database.js");

const CUSTO_PONTOS_FORJA = {
    1: 2,
    2: 4,
    3: 8,
    4: 16,
    5: 32
};

class MagiaService {
    getCustoPontos(circulo) {
        return CUSTO_PONTOS_FORJA[circulo] || 0;
    }

    async aprenderMagiaComPergaminho(personagemId, circulo, custoKwanzas, itemId) {
        const charAtual = await prisma.personagens.findUnique({
            where: { id: personagemId }
        });

        if (!charAtual) {
            throw new Error("PERSONAGEM_NAO_ENCONTRADO");
        }

        const custoPontos = this.getCustoPontos(circulo);
        if (custoPontos === 0) {
            throw new Error("CIRCULO_INVALIDO");
        }

        if (charAtual.pontos_forja_atual < custoPontos) {
            throw new Error("PONTOS_INSUFICIENTES");
        }

        if (charAtual.saldo < custoKwanzas) {
            throw new Error("SALDO_INSUFICIENTE");
        }

        const itemPergaminho = await prisma.item.findFirst({
            where: { id: itemId, personagem_id: personagemId }
        });

        if (!itemPergaminho || itemPergaminho.quantidade < 1) {
            throw new Error("PERGAMINHO_NAO_ENCONTRADO");
        }

        const nomePergaminho = itemPergaminho.nome;

        const operacoes = [
            prisma.personagens.update({
                where: { id: charAtual.id },
                data: {
                    saldo: { decrement: custoKwanzas },
                    pontos_forja_atual: { decrement: custoPontos }
                }
            }),
            prisma.transacao.create({
                data: {
                    personagem_id: charAtual.id,
                    descricao: `Aprendeu magia de ${circulo}º Círculo usando o pergaminho ${nomePergaminho}`,
                    valor: custoKwanzas,
                    tipo: "GASTO",
                    categoria: "MAGIA"
                }
            })
        ];

        if (itemPergaminho.quantidade <= 1) {
            operacoes.push(prisma.item.delete({ where: { id: itemId } }));
        } else {
            operacoes.push(
                prisma.item.update({
                    where: { id: itemId },
                    data: { quantidade: { decrement: 1 } }
                })
            );
        }

        await prisma.$transaction(operacoes);

        return {
            saldoAnterior: charAtual.saldo,
            saldoAtualizado: charAtual.saldo - custoKwanzas,
            pontosAnteriores: charAtual.pontos_forja_atual,
            pontosAtualizados: charAtual.pontos_forja_atual - custoPontos,
            custoPontos,
            custoKwanzas,
            nomePergaminho
        };
    }
}

module.exports = new MagiaService();
