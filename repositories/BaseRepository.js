const prisma = require("../database.js");

class BaseRepository {
    async buscarPorDono(donoId) {
        return prisma.base.findFirst({
            where: { dono_id: donoId },
            include: { comodos: true, mobilias: true }
        });
    }

    async buscarBaseCompleta(personagemId) {
        return prisma.base.findFirst({
            where: {
                OR: [{ dono_id: personagemId }, { residentes: { some: { personagem_id: personagemId } } }]
            },
            include: {
                dono: true,
                residentes: { include: { personagem: true } },
                comodos: { include: { mobilias: true } },
                mobilias: true
            }
        });
    }

    async criarBase(dados, tx = prisma) {
        return tx.base.create({ data: dados });
    }

    async adicionarComodo(baseId, nomeComodo, tx = prisma) {
        return tx.baseComodo.create({ data: { base_id: baseId, nome_comodo: nomeComodo } });
    }

    async adicionarMobilia(baseId, comodoId, nomeItem, tx = prisma) {
        return tx.baseMobilia.create({
            data: { base_id: baseId, comodo_id: comodoId, nome_item: nomeItem }
        });
    }

    async atualizarSeguranca(baseId, incremento, tx = prisma) {
        return tx.base.update({
            where: { id: baseId },
            data: { seguranca: { increment: incremento } }
        });
    }

    async buscarResidentes(baseId) {
        return prisma.baseResidente.findMany({
            where: { base_id: baseId },
            include: { personagem: true }
        });
    }

    async adicionarResidente(baseId, personagemId) {
        return prisma.baseResidente.create({
            data: { base_id: baseId, personagem_id: personagemId }
        });
    }

    async removerResidente(baseId, personagemId) {
        return prisma.baseResidente.deleteMany({
            where: { base_id: baseId, personagem_id: personagemId }
        });
    }

    async buscarTodasParaManutencao() {
        return prisma.base.findMany({
            include: { comodos: true, dono: true }
        });
    }

    async atualizarStatusManutencao(baseId, status) {
        return prisma.base.update({
            where: { id: baseId },
            data: { manutencao_paga: status }
        });
    }

    async danificarComodoAleatorio(baseId) {
        const comodos = await prisma.baseComodo.findMany({
            where: { base_id: baseId, danificado: false }
        });

        if (comodos.length > 0) {
            const sorteado = comodos[Math.floor(Math.random() * comodos.length)];
            return prisma.baseComodo.update({
                where: { id: sorteado.id },
                data: { danificado: true }
            });
        }
    }
}

module.exports = new BaseRepository();
